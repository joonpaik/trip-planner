import React, { useEffect, useState } from 'react';
import '../index.css';
import NavBar from '../components/Navbar';
import Card from '../components/Card';
import { FilterDropdown } from '../components/FilterDropdown';
import { MultiSelectDropdown } from '../components/MultiSelectDropdown';
import { EditTaskModal } from '../components/EditTaskModal';
import { tripService } from '../services/tripService';
import { useAuth } from '../hooks/useAuth';
import { FilteredTask } from '../types/trips';

const ToDoPage: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<FilteredTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tripOptions, setTripOptions] = useState<string[]>([]);
  const [collaboratorsMap, setCollaboratorsMap] = useState<
    Map<string, string>
  >(new Map());

  const [tripFilter, setTripFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [peopleFilter, setPeopleFilter] = useState<string[]>([]);

  const [editingTask, setEditingTask] = useState<FilteredTask | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadFilterOptions = async () => {
      try {
        const [tripsResponse, collaboratorsResponse] = await Promise.all([
          tripService.fetchUserTrips({ uid: user.uid }),
          tripService.fetchFilteredTaskCollaborators({ uid: user.uid }),
        ]);
        setTripOptions(
          tripsResponse.trips
            .filter((trip) => trip.status.toLowerCase() !== 'completed')
            .map((trip) => trip.name)
        );
        const map = new Map<string, string>();
        collaboratorsResponse.collaborators.forEach((c) => {
          map.set(c.uid, c.username);
        });
        setCollaboratorsMap(map);
      } catch (err) {
        console.error('Failed to load filter options:', err);
      }
    };

    loadFilterOptions();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadTasks = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await tripService.fetchFilteredTasks({
          uid: user.uid,
          tripFilter,
          statusFilter,
          dueDateFilter: null,
          peopleFilter,
        });
        setTasks(response.filteredTasks);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tasks');
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [user, tripFilter, statusFilter, peopleFilter]);

  const updateTaskInState = (
    taskId: number,
    updates: Partial<FilteredTask>
  ) => {
    setTasks((prev) =>
      prev.map((t) => (t.taskId === taskId ? { ...t, ...updates } : t))
    );
  };

  const handleCompleteTask = async (task: FilteredTask) => {
    if (!user) return;
    try {
      await tripService.updateTaskStatus({
        uid: user.uid,
        taskId: task.taskId,
        status: 2,
      });
      updateTaskInState(task.taskId, { taskStatus: 2 });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to complete task');
    }
  };

  const handleDeleteTask = async (task: FilteredTask) => {
    if (!user) return;
    if (!window.confirm('Delete this task?')) return;
    try {
      await tripService.deleteTask({ uid: user.uid, taskId: task.taskId });
      setTasks((prev) => prev.filter((t) => t.taskId !== task.taskId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete task');
    }
  };

  const sortedTasks = [...tasks].sort(
    (a, b) =>
      new Date(a.taskDeadline).getTime() - new Date(b.taskDeadline).getTime()
  );

  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(135deg, #fffbeb, #ffe4c7)' }}
    >
      <NavBar />
      <main className="p-4 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <h1 className="text-2xl font-bold text-indigo-950">To-Do</h1>

          <div className="rounded-xl bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 p-6 shadow-lg">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FilterDropdown
                options={tripOptions}
                placeholder="Filter by Trip"
                menuType="trip"
                onSelectionChange={setTripFilter}
              />
              <FilterDropdown
                options={['0', '1', '2']}
                placeholder="Filter by Status"
                menuType="status"
                onSelectionChange={setStatusFilter}
              />
              <MultiSelectDropdown
                options={collaboratorsMap}
                selectedOptions={peopleFilter}
                placeholder="Filter by People"
                menuType="people"
                onSelectionChange={setPeopleFilter}
              />
            </div>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 p-6 shadow-lg">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-white" />
                <span className="ml-3 text-blue-100">Loading tasks...</span>
              </div>
            ) : error ? (
              <p className="py-12 text-center text-red-200">{error}</p>
            ) : sortedTasks.length === 0 ? (
              <p className="py-12 text-center text-blue-100">
                No tasks match the current filters.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sortedTasks.map((task) => (
                  <Card
                    key={task.taskId}
                    taskTitle={task.taskTitle}
                    description={task.taskDescription}
                    tripTitle={task.tripTitle}
                    status={task.taskStatus}
                    deadline={task.taskDeadline}
                    onCardClick={() => setEditingTask(task)}
                    onComplete={() => handleCompleteTask(task)}
                    onDelete={() => handleDeleteTask(task)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSaved={(updated) => updateTaskInState(updated.taskId, updated)}
        />
      )}
    </div>
  );
};

export default ToDoPage;
