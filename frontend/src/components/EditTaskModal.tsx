import React, { useEffect, useState } from 'react';
import { CalendarDropdown } from './CalendarDropdown';
import { tripService } from '../services/tripService';
import { useAuth } from '../hooks/useAuth';
import { FilteredTask, TaskAssigneeCostMember } from '../types/trips';

const toDateInputValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// `new Date("YYYY-MM-DD")` parses the string as UTC midnight, which shifts
// back a day once rendered in any timezone behind UTC. Build the Date from
// its Y/M/D components instead so it lands on local midnight, matching what
// toDateInputValue produces.
const parseDateInputValue = (value: string): Date => {
  const [year, month, day] = value.split('T')[0].split('-').map(Number);
  return new Date(year, month - 1, day);
};

interface EditTaskModalProps {
  task: FilteredTask;
  onClose: () => void;
  onSaved: (updated: FilteredTask) => void;
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({
  task,
  onClose,
  onSaved,
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState(task.taskTitle);
  const [description, setDescription] = useState(task.taskDescription);
  const [deadline, setDeadline] = useState(
    toDateInputValue(new Date(task.taskDeadline))
  );
  const [taskStatus, setTaskStatus] = useState(task.taskStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [assignees, setAssignees] = useState<TaskAssigneeCostMember[]>([]);
  const [costEnabled, setCostEnabled] = useState(false);
  const [totalCost, setTotalCost] = useState<number | null>(null);
  const [costSplitType, setCostSplitType] = useState<'direct' | 'percentage'>(
    'direct'
  );
  const [assigneeCosts, setAssigneeCosts] = useState<
    Record<string, number | null>
  >({});

  useEffect(() => {
    if (!user) return;
    tripService
      .fetchTaskAssigneeCosts({ uid: user.uid, taskId: task.taskId })
      .then((response) => {
        setAssignees(response.assignees);
        setCostEnabled(response.totalCost != null);
        setTotalCost(response.totalCost);
        setCostSplitType(response.costSplitType ?? 'direct');
        const costs: Record<string, number | null> = {};
        response.assignees.forEach((a) => {
          costs[a.uid] =
            response.costSplitType === 'percentage'
              ? a.costPercentage
              : a.costAmount;
        });
        setAssigneeCosts(costs);
      })
      .catch((err) => {
        console.error('Failed to load task assignee costs:', err);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.taskId, user]);

  const handleSave = async () => {
    if (!user) {
      setError('You must be logged in to edit a task.');
      return;
    }
    if (!title.trim() || !deadline) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await tripService.updateTask({
        uid: user.uid,
        taskId: task.taskId,
        title,
        description,
        deadline,
        status: taskStatus,
        costEnabled,
        totalCost: costEnabled ? totalCost : null,
        costSplitType: costEnabled ? costSplitType : null,
        assigneeCosts: costEnabled
          ? assignees.map((a) => ({
              uid: a.uid,
              amount:
                costSplitType === 'direct' ? assigneeCosts[a.uid] ?? null : null,
              percentage:
                costSplitType === 'percentage'
                  ? assigneeCosts[a.uid] ?? null
                  : null,
            }))
          : [],
      });

      onSaved({
        ...task,
        taskTitle: title,
        taskDescription: description,
        taskDeadline: parseDateInputValue(deadline) as unknown as Date,
        taskStatus,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Edit Task</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm px-4 py-2 text-center">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deadline Date <span className="text-red-500">*</span>
              </label>
              <CalendarDropdown
                selectedDate={deadline ? parseDateInputValue(deadline) : null}
                onChange={(date) =>
                  setDeadline(date ? toDateInputValue(date) : '')
                }
                placeholder="Select deadline"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={taskStatus}
                onChange={(e) => setTaskStatus(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={0}>Not Started</option>
                <option value={1}>Pending</option>
                <option value={2}>Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Split Costs
                </label>
                <button
                  type="button"
                  onClick={() => setCostEnabled(!costEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                    costEnabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                      costEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {costEnabled && (
                <div className="space-y-3 mt-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Total Cost
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={totalCost ?? ''}
                      onChange={(e) =>
                        setTotalCost(
                          e.target.value === '' ? null : Number(e.target.value)
                        )
                      }
                      placeholder="e.g., 200.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm w-fit">
                    <button
                      type="button"
                      onClick={() => setCostSplitType('direct')}
                      className={`px-3 py-1.5 ${
                        costSplitType === 'direct'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Direct $
                    </button>
                    <button
                      type="button"
                      onClick={() => setCostSplitType('percentage')}
                      className={`px-3 py-1.5 border-l border-gray-300 ${
                        costSplitType === 'percentage'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Percentage %
                    </button>
                  </div>

                  {assignees.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      This task has no assignees to split the cost between.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {assignees.map((a) => (
                        <div key={a.uid} className="flex items-center gap-2">
                          <span className="text-sm text-gray-700 flex-1 truncate">
                            {a.username}
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={assigneeCosts[a.uid] ?? ''}
                            onChange={(e) =>
                              setAssigneeCosts((prev) => ({
                                ...prev,
                                [a.uid]:
                                  e.target.value === ''
                                    ? null
                                    : Number(e.target.value),
                              }))
                            }
                            placeholder={
                              costSplitType === 'direct' ? '$0.00' : '0%'
                            }
                            className="w-28 px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                      ))}
                      <p className="text-xs text-gray-500">
                        {costSplitType === 'direct'
                          ? `Remaining: $${(
                              (totalCost ?? 0) -
                              Object.values(assigneeCosts).reduce(
                                (sum: number, v) => sum + (v ?? 0),
                                0
                              )
                            ).toFixed(2)}`
                          : `Remaining: ${(
                              100 -
                              Object.values(assigneeCosts).reduce(
                                (sum: number, v) => sum + (v ?? 0),
                                0
                              )
                            ).toFixed(2)}%`}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditTaskModal;
