import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../index.css';
import NavBar from '../components/Navbar';
import { tripService } from '../services/tripService';
import { useAuth } from '../hooks/useAuth';
import { TripSummary, FilteredTask, TripMember } from '../types/trips';
import { DollarSign } from 'lucide-react';

interface TripExpense {
  trip: TripSummary;
  totalCost: number;
  yourOwed: number;
  taskCount: number;
}

interface PersonTotal {
  username: string;
  amount: number;
}

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const budgetStatus = (trip: TripSummary, totalCost: number) => {
  if (trip.budget == null) return null;
  const diff = totalCost - trip.budget;
  if (Math.abs(diff) < 0.005) {
    return { label: 'At Limit', className: 'bg-yellow-100 text-yellow-700' };
  }
  if (diff > 0) {
    return { label: 'Over Budget', className: 'bg-red-100 text-red-700' };
  }
  return { label: 'Under Budget', className: 'bg-green-100 text-green-700' };
};

const ExpensesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tripExpenses, setTripExpenses] = useState<TripExpense[]>([]);
  const [personTotals, setPersonTotals] = useState<Map<string, PersonTotal>>(
    new Map()
  );

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const tripsResponse = await tripService.fetchUserTrips({
          uid: user.uid,
        });
        const trips = tripsResponse.trips;

        const results = await Promise.all(
          trips.map(
            async (
              trip
            ): Promise<{
              trip: TripSummary;
              tasks: FilteredTask[];
              members: TripMember[];
            }> => {
              try {
                const [tasksResponse, membersResponse] = await Promise.all([
                  tripService.fetchFilteredTasks({
                    uid: user.uid,
                    tripFilter: trip.name,
                    statusFilter: null,
                    dueDateFilter: null,
                    peopleFilter: [],
                    allTripMembers: true,
                  }),
                  tripService.fetchTripMembers({
                    uid: user.uid,
                    tripId: trip.id,
                  }),
                ]);
                return {
                  trip,
                  tasks: tasksResponse.filteredTasks,
                  members: membersResponse.members,
                };
              } catch (err) {
                console.error(
                  `Failed to load expenses for trip ${trip.id}:`,
                  err
                );
                return { trip, tasks: [], members: [] };
              }
            }
          )
        );

        const expenses: TripExpense[] = [];
        const people = new Map<string, PersonTotal>();

        results.forEach(({ trip, tasks, members }) => {
          const usernameByUid = new Map(
            members.map((m) => [m.uid, m.username])
          );
          let totalCost = 0;
          let yourOwed = 0;

          tasks.forEach((task) => {
            totalCost += task.totalCost ?? 0;
            (task.costBreakdown ?? []).forEach((entry) => {
              if (entry.uid === user.uid) {
                yourOwed += entry.amount;
              }
              const username = usernameByUid.get(entry.uid) ?? entry.uid;
              const existing = people.get(entry.uid);
              people.set(entry.uid, {
                username,
                amount: (existing?.amount ?? 0) + entry.amount,
              });
            });
          });

          expenses.push({ trip, totalCost, yourOwed, taskCount: tasks.length });
        });

        expenses.sort((a, b) => b.totalCost - a.totalCost);
        setTripExpenses(expenses);
        setPersonTotals(people);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load expenses'
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  const grandTotal = tripExpenses.reduce((sum, e) => sum + e.totalCost, 0);
  const yourGrandTotal = tripExpenses.reduce((sum, e) => sum + e.yourOwed, 0);

  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(135deg, #fffbeb, #ffe4c7)' }}
    >
      <NavBar />
      <main className="p-4 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <h1 className="text-2xl font-bold text-indigo-950">Expenses</h1>

          {loading ? (
            <div className="flex items-center justify-center rounded-xl bg-white p-12 shadow-lg">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
              <span className="ml-3 text-gray-600">Loading expenses...</span>
            </div>
          ) : error ? (
            <div className="rounded-xl bg-white p-12 shadow-lg">
              <p className="text-center text-red-600">{error}</p>
            </div>
          ) : tripExpenses.length === 0 ? (
            <div className="rounded-xl bg-white p-12 text-center text-gray-500 shadow-lg">
              No trips with expenses yet.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 p-6 shadow-lg">
                  <div className="mb-2 flex items-center gap-2 text-sm text-blue-200">
                    <DollarSign className="h-4 w-4" />
                    Grand Total
                  </div>
                  <p className="text-3xl font-bold text-white">
                    ${grandTotal.toFixed(2)}
                  </p>
                  <p className="mt-1 text-xs text-blue-200">
                    across {tripExpenses.length} trip
                    {tripExpenses.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 p-6 shadow-lg">
                  <div className="mb-2 flex items-center gap-2 text-sm text-blue-200">
                    <DollarSign className="h-4 w-4" />
                    You Owe
                  </div>
                  <p className="text-3xl font-bold text-white">
                    ${yourGrandTotal.toFixed(2)}
                  </p>
                  <p className="mt-1 text-xs text-blue-200">
                    your share across all trips
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-white p-6 shadow-lg">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">
                  Cost by Trip
                </h2>
                <div className="space-y-2">
                  {tripExpenses.map(
                    ({ trip, totalCost, yourOwed, taskCount }) => {
                      const status = budgetStatus(trip, totalCost);
                      return (
                        <div
                          key={trip.id}
                          onClick={() =>
                            navigate(`/mytrips?tripId=${trip.id}`)
                          }
                          className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-100 p-3 transition-colors duration-150 hover:bg-gray-50"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-gray-900">
                              {trip.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(trip.startDate)} -{' '}
                              {formatDate(trip.endDate)} - {taskCount} task
                              {taskCount !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-4">
                            {yourOwed > 0 && (
                              <span className="text-xs text-gray-500">
                                You: ${yourOwed.toFixed(2)}
                              </span>
                            )}
                            {status && (
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
                              >
                                {status.label}
                              </span>
                            )}
                            <span className="w-20 text-right font-semibold text-gray-900">
                              ${totalCost.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              {personTotals.size > 0 && (
                <div className="rounded-xl bg-white p-6 shadow-lg">
                  <h2 className="mb-4 text-lg font-semibold text-gray-900">
                    Cost by Person
                  </h2>
                  <div className="space-y-2">
                    {Array.from(personTotals.entries())
                      .sort((a, b) => b[1].amount - a[1].amount)
                      .map(([uid, { username, amount }]) => (
                        <div
                          key={uid}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-gray-700">
                            {username}
                            {uid === user?.uid && (
                              <span className="text-gray-400"> (You)</span>
                            )}
                          </span>
                          <span className="font-medium text-gray-900">
                            ${amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default ExpensesPage;
