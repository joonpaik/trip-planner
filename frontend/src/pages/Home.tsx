import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../index.css';
import Card from '../components/Card';
import NavBar from '../components/Navbar';
import AnimationWrapper from '../components/AnimationWrapper';
import { routeService } from '../services/routeService';
import { tripService } from '../services/tripService';
import { useAuth } from '../hooks/useAuth';
import { FilterDropdown } from '../components/FilterDropdown';
import { MultiSelectDropdown } from '../components/MultiSelectDropdown';
import { CalendarDropdown } from '../components/CalendarDropdown';
import { EditTaskModal } from '../components/EditTaskModal';
import {
  FetchFilteredTasksRequest,
  FetchFilteredTasksResponse,
  FetchFilteredTasksCollaboratorRequest,
  FetchFilteredTasksCollaboratorResponse,
  TaskCollaborator,
  TripSummary,
  FilteredTask,
  TripMemberProgress,
} from '../types/trips';
import {
  Menu,
  X,
  MapPin,
  Calendar,
  DollarSign,
  CheckSquare,
  Plane,
  TrendingUp,
  Clock,
  Globe,
  Users,
  Plus,
  Sparkles,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  Circle,
  Hotel,
} from 'lucide-react';
interface TableData {
  [key: string]: any;
}

export interface UserTaskCard {
  taskTitle: string;
  tripTitle?: string;
  description: string;
  status: number;
  deadline: Date;
  people: string[];
}

const CircularProgress: React.FC<{ percent: number; size?: number }> = ({
  percent,
  size = 48,
}) => {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
};

const Home: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [taskSize, setTaskSize] = useState<number>(0);
  const [userTasks, setUserTasks] = useState<UserTaskCard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isInitialTaskFetch = useRef(true);

  // Task Filter States
  const [tripFilter, setTripFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [peopleFilter, setPeopleFilter] = useState<string[]>([]);
  const [uidToNameMap, setUidToNameMap] = useState<Map<string, string>>(
    new Map()
  );
  const [dueDateFilter, setDueDateFilter] = useState<string | null>(null);

  // Categories for Trip Filter Dropdown
  const [tripFilterCategories, setTripFilterCategories] = useState<
    string[] | null
  >(null);
  const [statusFilterCategories, setStatusFilterCategories] = useState<
    string[] | null
  >(null);
  const [peopleFilterCategories, setPeopleFilterCategories] = useState<
    string[]
  >([]);
  const sampleCategories = ['Trip to Japan', 'Trip to Korea', 'Trip to USA'];

  // scrolling logic for dropdowns
  let shouldFilteredTacksScroll = false;

  // Auth Context
  const { user } = useAuth();
  const navigate = useNavigate();

  // Upcoming Trip Hero Card State
  const [upcomingTrip, setUpcomingTrip] = useState<TripSummary | null>(null);
  const [upcomingTripLoading, setUpcomingTripLoading] =
    useState<boolean>(true);
  // Up to 3 closest non-completed trips, shown as dots on the hero card so
  // the user can switch which trip the hero is featuring.
  const [nearTermTrips, setNearTermTrips] = useState<TripSummary[]>([]);
  const [selectedTripIndex, setSelectedTripIndex] = useState(0);
  // "Upcoming Itinerary" always previews whichever trip comes right after
  // the one currently featured in the hero, so it follows the dots.
  const nextTripAfterClosest = nearTermTrips[selectedTripIndex + 1] || null;
  const [upcomingTripTasks, setUpcomingTripTasks] = useState<FilteredTask[]>(
    []
  );
  const [allTripTasks, setAllTripTasks] = useState<FilteredTask[]>([]);
  const [otherMemberProgress, setOtherMemberProgress] = useState<
    TripMemberProgress[]
  >([]);
  const [showChecklist, setShowChecklist] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<FilteredTask | null>(null);

  // Scroll-driven "dynamic" effect for the in-hero task list
  const taskScrollRef = useRef<HTMLDivElement>(null);
  const taskItemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const updateTaskItemStyles = () => {
    const container = taskScrollRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const centerY = containerRect.top + containerRect.height / 2;

    taskItemRefs.current.forEach((el) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const itemCenter = rect.top + rect.height / 2;
      const distance = Math.abs(centerY - itemCenter);
      const proximity = Math.max(
        0,
        1 - distance / (containerRect.height / 2)
      );
      const scale = 0.94 + proximity * 0.06;
      const opacity = 0.5 + proximity * 0.5;
      el.style.transform = `scale(${scale})`;
      el.style.opacity = `${opacity}`;
    });
  };

  const navigationItems = [
    {
      title: 'My Trips',
      icon: MapPin,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Calendar',
      icon: Calendar,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Expenses',
      icon: DollarSign,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Todo',
      icon: CheckSquare,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
    },
  ];

  // Filter handle tasks based on selected filters
  const handleTripFilterSelection = (trip: string | null) => {
    setTripFilter(trip);
    console.log('Selected Title Filter:', trip);
  };
  const handleStatusFilterSelection = (status: string | null) => {
    setStatusFilter(status);
    console.log('Selected Status Filter:', status);
  };
  const handlePeopleFilterSelection = (people: string[] | null) => {
    if (people) {
      setPeopleFilter(people);
      console.log('Selected People Filter:', people);
    } else {
      setPeopleFilter([]);
      console.log('Cleared People Filter');
    }
  };
  useEffect(() => {
    const fetchAndFormatData = async () => {
      try {
        setLoading(true);
        setError('');

        // Fetched Filtered Task API Call
        const defaultRequest: FetchFilteredTasksRequest = {
          tripFilter: tripFilter,
          peopleFilter: peopleFilter,
          dueDateFilter: null,
          statusFilter: statusFilter,
          uid: user?.uid || '',
        };
        const rawData = (await tripService.fetchFilteredTasks(
          defaultRequest
        )) as unknown as FetchFilteredTasksResponse;

        const tableData: TableData[] =
          rawData.filteredTasks as unknown as TableData[];
        console.log('Table Data:', tableData);
        // Format the data for Card components
        const formattedData: UserTaskCard[] = new Array<UserTaskCard>();
        tableData.forEach((item: any) => {
          const task: UserTaskCard = {
            taskTitle: item.taskTitle,
            tripTitle: item.tripTitle,
            description: item.taskDescription,
            status: item.taskStatus,
            deadline: item.taskDeadline,
            people: [], // Assuming people data is not available in the current response
          };
          formattedData.push(task);
        });

        console.log('Formatted Data:', formattedData);
        setUserTasks(formattedData);
        setTaskSize(formattedData.length);
        shouldFilteredTacksScroll = formattedData.length > 3;

        if (isInitialTaskFetch.current) {
          isInitialTaskFetch.current = false;

          const tripFilterCategoriesSet = new Set<string>();
          const statusFilterCategoriesSet = new Set<number>();

          formattedData.forEach((task) => {
            if (task.tripTitle) {
              tripFilterCategoriesSet.add(task.tripTitle);
            }
            if (task.status) {
              statusFilterCategoriesSet.add(task.status);
            }
          });
          console.log('Trip Filter Categories:', tripFilterCategoriesSet);
          console.log('Status Filter Categories:', statusFilterCategoriesSet);

          const tempStatusFilterCategories: string[] = [];
          statusFilterCategoriesSet.forEach((category) => {
            tempStatusFilterCategories.push(category.toString());
          });
          setStatusFilterCategories(tempStatusFilterCategories);

          const tempTripFilterCategories: string[] = [];
          tripFilterCategoriesSet.forEach((category) => {
            tempTripFilterCategories.push(category);
          });
          setTripFilterCategories(tempTripFilterCategories);

          // people filter categories
          const request: FetchFilteredTasksCollaboratorRequest = {
            uid: user?.uid || '',
          };
          const rawPeopleFilterData =
            (await tripService.fetchFilteredTaskCollaborators(
              request
            )) as unknown as FetchFilteredTasksCollaboratorResponse;
          const tempUidToNameMap = new Map<string, string>();
          rawPeopleFilterData.collaborators.forEach(
            (collaborator: TaskCollaborator) => {
              tempUidToNameMap.set(
                collaborator.uid,
                `${collaborator.first_name} ${collaborator.last_name}`
              );
            }
          );
          setUidToNameMap(tempUidToNameMap);
          console.log('UID to Name Map:', tempUidToNameMap);
          const tempPeopleFilterCategories =
            rawPeopleFilterData.collaborators.map(
              (collaborator: TaskCollaborator) =>
                `${collaborator.uid}:${collaborator.first_name} ${collaborator.last_name}`
            );
          setPeopleFilterCategories(tempPeopleFilterCategories);
          console.log('People Filter Categories:', peopleFilterCategories);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError('Failed to load data: ' + errorMessage);
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAndFormatData();
  }, [tripFilter, statusFilter, peopleFilter]);

  useEffect(() => {
    const loadTripsList = async () => {
      if (!user) {
        setUpcomingTripLoading(false);
        return;
      }

      try {
        const tripsResponse = await tripService.fetchUserTrips({
          uid: user.uid,
        });
        const now = new Date();
        const sortedFutureTrips = tripsResponse.trips
          .filter(
            (trip) =>
              new Date(trip.endDate) >= now &&
              trip.status.toLowerCase() !== 'completed'
          )
          .sort(
            (a, b) =>
              new Date(a.startDate).getTime() -
              new Date(b.startDate).getTime()
          );

        setNearTermTrips(sortedFutureTrips.slice(0, 3));
        setSelectedTripIndex(0);

        if (sortedFutureTrips.length === 0) {
          setUpcomingTrip(null);
          setUpcomingTripLoading(false);
        }
      } catch (err) {
        console.error('Error loading trips list:', err);
        setUpcomingTripLoading(false);
      }
    };

    loadTripsList();
  }, [user]);

  useEffect(() => {
    const selectedTrip = nearTermTrips[selectedTripIndex];

    if (!user || !selectedTrip) {
      return;
    }

    const loadSelectedTripDetails = async () => {
      setUpcomingTripLoading(true);
      try {
        setUpcomingTrip(selectedTrip);

        const tasksResponse = await tripService.fetchFilteredTasks({
          uid: user.uid,
          tripFilter: selectedTrip.name,
          statusFilter: null,
          dueDateFilter: null,
          peopleFilter: [],
        });
        setUpcomingTripTasks(tasksResponse.filteredTasks);

        const allTasksResponse = await tripService.fetchFilteredTasks({
          uid: user.uid,
          tripFilter: selectedTrip.name,
          statusFilter: null,
          dueDateFilter: null,
          peopleFilter: [],
          allTripMembers: true,
        });
        setAllTripTasks(allTasksResponse.filteredTasks);

        const memberProgressResponse =
          await tripService.fetchTripMemberProgress({
            uid: user.uid,
            tripId: selectedTrip.id,
          });
        setOtherMemberProgress(memberProgressResponse.members);
      } catch (err) {
        console.error('Error loading selected trip details:', err);
      } finally {
        setUpcomingTripLoading(false);
      }
    };

    loadSelectedTripDetails();
  }, [user, nearTermTrips, selectedTripIndex]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => updateTaskItemStyles());
    return () => cancelAnimationFrame(frame);
  }, [upcomingTripTasks]);

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const shortOpts: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
    };
    return `${startDate.toLocaleDateString('en-US', shortOpts)} - ${endDate.toLocaleDateString('en-US', { ...shortOpts, year: 'numeric' })}`;
  };

  const daysUntilUpcomingTrip = upcomingTrip
    ? Math.max(
        0,
        Math.ceil(
          (new Date(upcomingTrip.startDate).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;

  const isUpcomingTripOngoing = upcomingTrip
    ? (() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const start = new Date(upcomingTrip.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(upcomingTrip.endDate);
        end.setHours(0, 0, 0, 0);
        return today >= start && today <= end;
      })()
    : false;

  const completedUpcomingTripTaskCount = upcomingTripTasks.filter(
    (task) => task.taskStatus === 2
  ).length;
  const outstandingUpcomingTripTaskCount =
    upcomingTripTasks.length - completedUpcomingTripTaskCount;
  const sortedUpcomingTripTasks = [...upcomingTripTasks].sort(
    (a, b) => a.taskStatus - b.taskStatus
  );

  const readinessPercent =
    upcomingTripTasks.length > 0
      ? Math.round(
          (completedUpcomingTripTaskCount / upcomingTripTasks.length) * 100
        )
      : 0;

  // "All trip tasks" figures (every collaborator's tasks), used for the
  // Planning Progress card - distinct from the hero's personal readiness.
  const allTripCompletedCount = allTripTasks.filter(
    (task) => task.taskStatus === 2
  ).length;
  const allTripReadinessPercent =
    allTripTasks.length > 0
      ? Math.round((allTripCompletedCount / allTripTasks.length) * 100)
      : 0;
  const sortedAllTripTasks = [...allTripTasks].sort(
    (a, b) => a.taskStatus - b.taskStatus
  );
  const allTripCompletedPreview = sortedAllTripTasks.filter(
    (task) => task.taskStatus === 2
  );
  const allTripRemainingPreview = sortedAllTripTasks.filter(
    (task) => task.taskStatus !== 2
  );

  const upcomingTripTotalCost = allTripTasks.reduce(
    (sum, t) => sum + (t.totalCost ?? 0),
    0
  );
  const upcomingTripAmountOwed = user
    ? allTripTasks.reduce(
        (sum, t) =>
          sum +
          (t.costBreakdown ?? [])
            .filter((entry) => entry.uid === user.uid)
            .reduce((entrySum, entry) => entrySum + entry.amount, 0),
        0
      )
    : 0;
  const upcomingTripBudget = upcomingTrip?.budget ?? null;
  const upcomingTripBudgetPercent =
    upcomingTripBudget != null && upcomingTripBudget > 0
      ? Math.round((upcomingTripTotalCost / upcomingTripBudget) * 100)
      : upcomingTripTotalCost > 0
        ? 100
        : 0;
  let upcomingTripBudgetStatus: { label: string; className: string } | null =
    null;
  if (upcomingTripBudget != null) {
    const diff = upcomingTripTotalCost - upcomingTripBudget;
    if (Math.abs(diff) < 0.005) {
      upcomingTripBudgetStatus = {
        label: 'At Limit',
        className: 'bg-yellow-400/20 text-yellow-100',
      };
    } else if (diff > 0) {
      upcomingTripBudgetStatus = {
        label: 'Over Budget',
        className: 'bg-red-400/20 text-red-100',
      };
    } else {
      upcomingTripBudgetStatus = {
        label: 'Under Budget',
        className: 'bg-green-400/20 text-green-100',
      };
    }
  }
  const upcomingTripBudgetBarColor =
    upcomingTripBudgetStatus?.label === 'Over Budget'
      ? 'bg-red-400'
      : upcomingTripBudgetStatus?.label === 'At Limit'
        ? 'bg-yellow-400'
        : 'bg-green-400';

  const taskStatusColor = (status: number) => {
    if (status === 2) return 'bg-emerald-500';
    if (status === 1) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const taskStatusLabel = (status: number) => {
    if (status === 2) return 'Completed';
    if (status === 1) return 'Pending';
    return 'Not Started';
  };


  const updateTaskInState = (
    taskId: number,
    updates: Partial<FilteredTask>
  ) => {
    setUpcomingTripTasks((prev) =>
      prev.map((t) => (t.taskId === taskId ? { ...t, ...updates } : t))
    );
    setAllTripTasks((prev) =>
      prev.map((t) => (t.taskId === taskId ? { ...t, ...updates } : t))
    );
  };

  const removeTaskFromState = (taskId: number) => {
    setUpcomingTripTasks((prev) => prev.filter((t) => t.taskId !== taskId));
    setAllTripTasks((prev) => prev.filter((t) => t.taskId !== taskId));
  };

  const handleCompleteTask = async (task: FilteredTask) => {
    if (!user) return;
    try {
      await tripService.updateTask({
        uid: user.uid,
        taskId: task.taskId,
        title: task.taskTitle,
        description: task.taskDescription,
        deadline: new Date(task.taskDeadline).toISOString(),
        status: 2,
      });
      updateTaskInState(task.taskId, { taskStatus: 2 });
    } catch (error) {
      alert(
        error instanceof Error ? error.message : 'Failed to complete task'
      );
    }
  };

  const handleDeleteTask = async (task: FilteredTask) => {
    if (!user) return;
    if (!window.confirm('Delete this task?')) return;
    try {
      await tripService.deleteTask({ uid: user.uid, taskId: task.taskId });
      removeTaskFromState(task.taskId);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete task');
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(135deg, #fffbeb, #ffe4c7)' }}
    >
      <NavBar />
      <main className="max-w-[1400px] mx-auto px-6 lg:px-10 py-8 space-y-8">
        {upcomingTripLoading && !upcomingTrip ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          </div>
        ) : upcomingTrip ? (
          <>
            {/* HERO */}
            <section
              className={`relative rounded-[28px] overflow-hidden shadow-2xl transition-opacity duration-200 ${upcomingTripLoading ? 'opacity-70' : 'opacity-100'}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800" />
              <div className="absolute inset-0 bg-black/10" />
              <div className="relative z-10 p-8 lg:p-12 grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2">
                <div className="flex items-center flex-wrap gap-2 mb-6">
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium">
                    Next Trip
                  </span>
                  {daysUntilUpcomingTrip !== null && (
                    <span className="px-3 py-1 bg-emerald-500/90 rounded-full text-white text-xs font-semibold tracking-wide">
                      {isUpcomingTripOngoing
                        ? 'ONGOING'
                        : daysUntilUpcomingTrip === 0
                          ? 'STARTS TODAY'
                          : `${daysUntilUpcomingTrip} DAY${daysUntilUpcomingTrip === 1 ? '' : 'S'} REMAINING`}
                    </span>
                  )}
                  {nearTermTrips.length > 1 && (
                    <div className="flex items-center gap-1.5 ml-1">
                      {nearTermTrips.map((trip, index) => (
                        <button
                          key={trip.id}
                          onClick={() => setSelectedTripIndex(index)}
                          title={trip.name}
                          className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
                            index === selectedTripIndex
                              ? 'bg-white w-6'
                              : 'bg-white/40 hover:bg-white/60'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center flex-wrap gap-3 mb-3">
                  <h1 className="text-4xl lg:text-5xl font-bold text-white tracking-tight">
                    {upcomingTrip.name}
                  </h1>
                </div>
                <p className="text-blue-100 text-lg mb-8">
                  {upcomingTrip.destination} •{' '}
                  {formatDateRange(
                    upcomingTrip.startDate,
                    upcomingTrip.endDate
                  )}
                </p>

                {/* Readiness progress bar */}
                <div className="mb-8 max-w-md">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-blue-100 text-sm font-medium">
                      Trip Readiness
                    </span>
                    <span className="text-white text-sm font-semibold">
                      {upcomingTripTasks.length === 0
                        ? 'No tasks'
                        : `${readinessPercent}%`}
                    </span>
                  </div>
                  <p className="text-blue-200/70 text-xs mb-2">
                    Your personal tasks for this trip
                  </p>
                  {upcomingTripTasks.length > 0 && (
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${readinessPercent}%` }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 mb-8">
                  <button
                    onClick={() => navigate(`/mytrips?tripId=${upcomingTrip.id}`)}
                    className="flex items-center gap-2 bg-white text-blue-700 px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 hover:-translate-y-0.5 transition-all duration-200 shadow-lg"
                  >
                    <span>View Trip</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => navigate('/calendar')}
                    title="Calendar"
                    className="p-3 bg-white/15 backdrop-blur-sm text-white rounded-xl hover:bg-white/25 hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <Calendar className="w-5 h-5" />
                  </button>
                </div>

                {/* Other members' status */}
                {otherMemberProgress.length === 0 ? (
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-dashed border-white/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-blue-200" />
                      <span className="text-blue-100 text-xs font-medium">
                        Trip Members
                      </span>
                    </div>
                    <p className="text-blue-200 text-sm">
                      No other members on this trip yet
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-blue-200" />
                      <span className="text-blue-100 text-xs font-medium">
                        Trip Participants
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {otherMemberProgress.map((member) => {
                      const percent =
                        member.totalTasks > 0
                          ? Math.round(
                              (member.completedTasks / member.totalTasks) *
                                100
                            )
                          : 0;
                      const ringColorClass =
                        member.totalTasks === 0
                          ? 'text-slate-400'
                          : percent === 100
                            ? 'text-emerald-400'
                            : percent === 0
                              ? 'text-rose-400'
                              : 'text-amber-400';
                      return (
                        <div
                          key={member.uid}
                          className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 flex flex-col items-center text-center"
                        >
                          <div className={`relative ${ringColorClass}`}>
                            <CircularProgress percent={percent} />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-white text-xs font-semibold">
                                {member.totalTasks === 0 ? '—' : `${percent}%`}
                              </span>
                            </div>
                          </div>
                          <span className="text-blue-100 text-xs font-medium truncate mt-2">
                            {member.username}
                          </span>
                          <p className="text-blue-200 text-[11px] mt-0.5">
                            {member.totalTasks === 0
                              ? 'No tasks yet'
                              : `${member.completedTasks}/${member.totalTasks} done`}
                          </p>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                )}
              </div>

              {/* Scrollable task list, embedded in the hero */}
              <div className="lg:col-span-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold">Tasks</h3>
                  <button
                    onClick={() => navigate('/mytrips')}
                    className="text-xs font-medium text-blue-100 hover:text-white flex items-center gap-0.5"
                  >
                    View all
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                {sortedUpcomingTripTasks.length === 0 ? (
                  <p className="text-sm text-blue-200/70">
                    No tasks for this trip yet.
                  </p>
                ) : (
                  <div
                    ref={taskScrollRef}
                    onScroll={updateTaskItemStyles}
                    className="h-72 overflow-y-auto snap-y snap-mandatory scroll-smooth pr-1 space-y-3"
                  >
                    {sortedUpcomingTripTasks.map((task, i) => (
                      <div
                        key={i}
                        ref={(el) => {
                          taskItemRefs.current[i] = el;
                        }}
                        className="snap-center bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 transition-transform duration-150 ease-out"
                      >
                        <div className="flex items-start gap-2.5">
                          <span
                            className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${taskStatusColor(task.taskStatus)}`}
                          />
                          <div className="min-w-0">
                            <p className="text-sm text-white truncate">
                              {task.taskTitle}
                            </p>
                            <p className="text-xs text-blue-200">
                              {taskStatusLabel(task.taskStatus)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              </div>
            </section>

            {/* TOP ROW: Itinerary (or Mini Itinerary fallback) / Budget */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6">
                <div className="flex items-center justify-between mb-5">
                  <span className="text-xs font-medium text-blue-200">
                    Itinerary
                  </span>
                </div>
                {upcomingTrip.itineraryEnabled &&
                upcomingTrip.itinerary.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto pr-1">
                    {upcomingTrip.itinerary.map((stop, index) => (
                      <div key={index} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-[11px] font-semibold text-white">
                            {index + 1}
                          </span>
                          {index < upcomingTrip.itinerary.length - 1 && (
                            <span className="mt-1 w-px flex-1 bg-white/20" />
                          )}
                        </div>
                        <div className="pb-4">
                          <p className="text-sm font-medium text-white">
                            {stop.location}
                          </p>
                          {stop.address && (
                            <p className="text-xs text-blue-200">
                              {stop.address}
                            </p>
                          )}
                          {stop.notes && (
                            <p className="mt-0.5 text-xs italic text-blue-300">
                              {stop.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0 text-center">
                      <div className="w-10 h-10 mx-auto rounded-xl bg-white/15 flex items-center justify-center mb-2">
                        <Plane className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-blue-100 text-xs font-medium">
                        Flight
                      </p>
                      <p className="text-blue-200 text-[11px] truncate">
                        Add in airline
                      </p>
                    </div>

                    <ChevronRight className="w-4 h-4 text-blue-300 shrink-0" />

                    <div className="flex-1 min-w-0 text-center">
                      <div className="w-10 h-10 mx-auto rounded-xl bg-white/15 flex items-center justify-center mb-2">
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-blue-100 text-xs font-medium">
                        Destination
                      </p>
                      <p className="text-blue-200 text-[11px] truncate">
                        {upcomingTrip.destination}
                      </p>
                    </div>

                    <ChevronRight className="w-4 h-4 text-blue-300 shrink-0" />

                    <div className="flex-1 min-w-0 text-center">
                      <div className="w-10 h-10 mx-auto rounded-xl bg-white/15 flex items-center justify-center mb-2">
                        <Hotel className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-blue-100 text-xs font-medium">
                        Stay
                      </p>
                      <p className="text-blue-200 text-[11px] truncate">
                        Add in hotel
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-medium text-blue-200">
                    {upcomingTripBudget != null ? 'Budget' : 'Costs'}
                  </span>
                </div>
                {upcomingTripBudget != null ? (
                  <>
                    <p className="text-blue-100 text-sm mb-1">
                      ${upcomingTripTotalCost.toFixed(2)}{' '}
                      <span className="text-blue-300">of</span> $
                      {upcomingTripBudget.toFixed(2)}
                    </p>
                    <div className="flex items-center justify-between mb-3">
                      {upcomingTripBudgetStatus && (
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${upcomingTripBudgetStatus.className}`}
                        >
                          {upcomingTripBudgetStatus.label}
                        </span>
                      )}
                      <span className="text-blue-200 text-xs">
                        {upcomingTripBudgetPercent}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/15 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${upcomingTripBudgetBarColor}`}
                        style={{
                          width: `${Math.min(upcomingTripBudgetPercent, 100)}%`,
                        }}
                      />
                    </div>
                    {upcomingTripAmountOwed > 0 && (
                      <p className="text-blue-200 text-xs mt-3">
                        You owe{' '}
                        <span className="text-white font-medium">
                          ${upcomingTripAmountOwed.toFixed(2)}
                        </span>
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-blue-100 text-sm mb-3">
                      ${upcomingTripTotalCost.toFixed(2)} in costs
                    </p>
                    <div className="h-1.5 bg-white/15 rounded-full overflow-hidden">
                      <div className="h-full bg-white/40 rounded-full w-0" />
                    </div>
                    {upcomingTripAmountOwed > 0 && (
                      <p className="text-blue-200 text-xs mt-3">
                        You owe{' '}
                        <span className="text-white font-medium">
                          ${upcomingTripAmountOwed.toFixed(2)}
                        </span>
                      </p>
                    )}
                  </>
                )}
              </div>
            </section>

            {/* SECOND ROW: Planning Progress */}
            <section className="grid grid-cols-1 gap-6">
              <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 lg:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      Planning Progress
                    </h3>
                    <p className="text-sm text-blue-200">
                      All trip tasks • {allTripTasks.length} task
                      {allTripTasks.length === 1 ? '' : 's'} across everyone
                      on this trip
                    </p>
                  </div>
                  <div className="text-3xl font-bold text-white">
                    {allTripTasks.length === 0
                      ? 'No tasks'
                      : `${allTripReadinessPercent}%`}
                  </div>
                </div>

                {allTripTasks.length > 0 && (
                  <div className="h-2.5 bg-white/15 rounded-full overflow-hidden mb-8">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${allTripReadinessPercent}%` }}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold text-blue-200 mb-3">
                      Completed
                    </h4>
                    {allTripCompletedPreview.length === 0 ? (
                      <p className="text-sm text-blue-200/70">Nothing yet</p>
                    ) : (
                      <ul className="space-y-2">
                        {allTripCompletedPreview.slice(0, 4).map((task, i) => (
                          <li
                            key={i}
                            className="flex items-center gap-2 text-sm text-blue-50"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="truncate">{task.taskTitle}</span>
                          </li>
                        ))}
                        {allTripCompletedPreview.length > 4 && (
                          <li className="text-xs text-blue-200 pl-6">
                            +{allTripCompletedPreview.length - 4} more
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-blue-200 mb-3">
                      Remaining
                    </h4>
                    {allTripRemainingPreview.length === 0 ? (
                      <p className="text-sm text-blue-200/70">All done!</p>
                    ) : (
                      <ul className="space-y-2">
                        {allTripRemainingPreview.slice(0, 4).map((task, i) => (
                          <li
                            key={i}
                            className="flex items-center gap-2 text-sm text-blue-50"
                          >
                            <Circle className="w-4 h-4 text-blue-300 shrink-0" />
                            <span className="truncate">{task.taskTitle}</span>
                          </li>
                        ))}
                        {allTripRemainingPreview.length > 4 && (
                          <li className="text-xs text-blue-200 pl-6">
                            +{allTripRemainingPreview.length - 4} more
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* THIRD ROW: Upcoming Itinerary (the trip after the closest one) */}
            {nextTripAfterClosest && (
              <section className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 lg:p-8">
                <h3 className="text-lg font-bold text-white mb-6">
                  Upcoming Itinerary
                </h3>
                <div className="flex items-start gap-4">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                  <div>
                    <div className="flex flex-wrap items-baseline gap-2">
                      <p className="text-sm font-semibold text-white">
                        {nextTripAfterClosest.name}
                      </p>
                      <span className="text-xs text-blue-200">
                        {formatDateRange(
                          nextTripAfterClosest.startDate,
                          nextTripAfterClosest.endDate
                        )}
                      </span>
                    </div>
                    <p className="text-sm text-blue-100 mt-0.5">
                      {nextTripAfterClosest.destination}
                    </p>
                  </div>
                </div>
              </section>
            )}
          </>
        ) : (
          /* EMPTY STATE */
          <section className="rounded-[28px] bg-white shadow-xl border border-slate-100 py-20 px-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-3">
              Ready for your next adventure?
            </h2>
            <p className="text-slate-500 max-w-md mx-auto mb-8">
              Create your first itinerary, manage flights, budgets, and
              collaborate with friends.
            </p>
            <button
              onClick={() => navigate('/mytrips')}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-8 py-4 rounded-xl font-semibold hover:-translate-y-0.5 hover:shadow-xl transition-all duration-200 shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Create Trip
            </button>
          </section>
        )}

        {showChecklist && upcomingTrip && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {upcomingTrip.name} Checklist
                  </h2>
                  <button
                    onClick={() => setShowChecklist(false)}
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

                {sortedUpcomingTripTasks.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No tasks for this trip yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {sortedUpcomingTripTasks.map((task, index) => (
                      <Card
                        key={index}
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
          </div>
        )}

        {editingTask && (
          <EditTaskModal
            task={editingTask}
            onClose={() => setEditingTask(null)}
            onSaved={(updated) => updateTaskInState(updated.taskId, updated)}
          />
        )}

        {/* Floating action button */}
        <button
          onClick={() => navigate('/mytrips')}
          title="Create Trip"
          className="fixed bottom-8 right-8 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white pl-5 pr-6 py-4 rounded-full shadow-2xl hover:-translate-y-1 hover:shadow-blue-500/30 transition-all duration-200 z-40"
        >
          <Plus className="w-5 h-5" />
          <span className="font-semibold hidden sm:inline">Create Trip</span>
        </button>

        {/* Tasks Remaining - commented out, logic reserved for reuse elsewhere */}
        {false && (
        <div className="bg-gray-200 rounded-xl shadow-lg  p-6 overflow-visible">
          <h1 className="font-bold text-center">Tasks Remaining</h1>
          <br />
          <br />
          <div className="grid grid-cols-1 md:grid-cols-[1fr,2fr] gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-lg ">
              <div className=" text-center h-full justify-center ">
                <div className="justify-center pt-5">
                  <h1 className="text-lg font-bold text-center"> Filter</h1>
                </div>
                <div className="p-4 text-left">
                  <FilterDropdown
                    options={Array.from(tripFilterCategories ?? [])}
                    placeholder="Filter by Trip"
                    menuType="title"
                    onSelectionChange={handleTripFilterSelection}
                  />
                </div>
                {/* <div className="p-4 text-left">
                  <CalendarDropdown
                    selectedDate={}
                    placeholder="Filter by Deadline"
                    menuType="dueDate"
                    onSelectionChange={handleTripFilterSelection}
                  />
                </div> */}
                <div className="p-4 text-left">
                  <FilterDropdown
                    options={Array.from(statusFilterCategories ?? [])}
                    placeholder="Filter by Status"
                    menuType="status"
                    onSelectionChange={handleStatusFilterSelection}
                  />
                </div>
                <div className="p-4 text-left">
                  <MultiSelectDropdown
                    options={uidToNameMap}
                    selectedOptions={peopleFilter}
                    placeholder="Filter by People"
                    menuType="people"
                    onSelectionChange={setPeopleFilter}
                  />
                </div>
              </div>
            </div>
            <div className="max-h-1/2 overflow-y-auto gap-4 p-4 bg-white rounded-xl shadow-lg">
              <h1 className="font-bold text-center"> Filtered Tasks</h1>
              <div
                className={`${taskSize > 3 ? `overflow-y-auto border-gray border-4` : ``} grid grid-cols-1 gap-4`}
                style={taskSize > 3 ? { maxHeight: `${3 * 11}rem` } : {}}
              >
                {userTasks.map((card, index) => (
                  <AnimationWrapper key={index} delay={(index + 3) * 150}>
                    <Card
                      taskTitle={card.taskTitle}
                      description={card.description}
                      bgColor="bg-gray-200"
                      status={card.status}
                      tripTitle={card.tripTitle}
                      deadline={card.deadline}
                    />
                  </AnimationWrapper>
                ))}
              </div>
            </div>
          </div>
        </div>
        )}
      </main>
    </div>
  );
};

export default Home;

//  <div
//       className="min-h-screen items-center p-4"
//       style={{ background: 'linear-gradient(135deg, #fffbeb, #ffe4c7)' }}
//     >
//       <NavBar />

//       <h1 className="font-bold text-center">Welcome, {user?.username}</h1>

//       <div className="grid border-4 border-black m-4 p-4 rounded-xl grid-cols-[1fr,3fr,1fr] gap-4">
//         <div className="bg-white rounded-xl shadow-lg text-center">
//           <h1 className="font-bold text-center">My Trips</h1>
//           <h1 className="font-bold text-center">Calendar</h1>
//           <h1 className="font-bold text-center">Expenses</h1>
//           <h1 className="font-bold text-center">Todo</h1>
//         </div>
//         <div className="bg-white rounded-xl shadow-lg text-center"> main</div>
//         <div className="bg-white rounded-xl shadow-lg text-center"> main</div>

// {/* <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-4 p-4 w-1/2 border-4 border-black">
//   {userTasks
//     .filter((item, index) => index < 3)
//     .map((card, index) => (
//       <AnimationWrapper key={index} delay={(index + 3) * 150}>
//         <Card
//           title={card.title}
//           description={card.description}
//           bgColor="bg-white"
//         />
//       </AnimationWrapper>
//     ))}
// </div> */}
//       </div>
//     </div>
