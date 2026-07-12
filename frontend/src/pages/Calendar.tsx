import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../index.css';
import NavBar from '../components/Navbar';
import { tripService } from '../services/tripService';
import { useAuth } from '../hooks/useAuth';
import { TripSummary, TripMember } from '../types/trips';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

// 10 hues spread evenly around the color wheel so adjacent trips never
// look alike before the palette repeats.
const TRIP_COLORS = [
  'bg-red-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-lime-500',
  'bg-emerald-500',
  'bg-cyan-500',
  'bg-blue-500',
  'bg-violet-500',
  'bg-fuchsia-500',
  'bg-rose-500',
];

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const toDateInputValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const CalendarPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [tripMembersByTripId, setTripMembersByTripId] = useState<
    Map<number, TripMember[]>
  >(new Map());
  const [sharedUsers, setSharedUsers] = useState<TripMember[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [hoveredTrip, setHoveredTrip] = useState<{
    trip: TripSummary;
    x: number;
    y: number;
  } | null>(null);

  const handleTripHover = (trip: TripSummary, e: React.MouseEvent) => {
    setHoveredTrip({ trip, x: e.clientX, y: e.clientY });
  };

  const handleTripClick = (trip: TripSummary) => {
    navigate(`/mytrips?tripId=${trip.id}`);
  };

  const handleDayClick = (date: Date) => {
    navigate(`/mytrips?createTrip=1&date=${toDateInputValue(date)}`);
  };

  useEffect(() => {
    const loadTrips = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const response = await tripService.fetchUserTrips({ uid: user.uid });
        setTrips(response.trips);

        const memberEntries = await Promise.all(
          response.trips.map(async (trip): Promise<[number, TripMember[]]> => {
            try {
              const membersResponse = await tripService.fetchTripMembers({
                uid: user.uid,
                tripId: trip.id,
              });
              return [trip.id, membersResponse.members];
            } catch (err) {
              console.error(`Failed to load members for trip ${trip.id}:`, err);
              return [trip.id, []];
            }
          })
        );
        const membersMap = new Map(memberEntries);
        setTripMembersByTripId(membersMap);

        const sharedUsersMap = new Map<string, TripMember>();
        memberEntries.forEach(([, members]) => {
          members.forEach((member) => {
            sharedUsersMap.set(member.uid, member);
          });
        });
        setSharedUsers(
          Array.from(sharedUsersMap.values()).sort((a, b) => {
            if (a.uid === user.uid) return -1;
            if (b.uid === user.uid) return 1;
            return a.username.localeCompare(b.username);
          })
        );
        // Default to all users (including yourself) selected, so every trip shows on load.
        setSelectedUserIds(new Set(sharedUsersMap.keys()));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load trips'
        );
      } finally {
        setLoading(false);
      }
    };

    loadTrips();
  }, [user]);

  const toggleSharedUser = (uid: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) {
        next.delete(uid);
      } else {
        next.add(uid);
      }
      return next;
    });
  };

  const toggleAllSharedUsers = () => {
    setSelectedUserIds((prev) =>
      prev.size === sharedUsers.length
        ? new Set()
        : new Set(sharedUsers.map((sharedUser) => sharedUser.uid))
    );
  };

  const visibleTrips = trips.filter((trip) => {
    const members = tripMembersByTripId.get(trip.id) ?? [];
    // A trip with no known members isn't affected by the user toggles -
    // it's always visible. Otherwise it's visible only if at least one of
    // its members (including yourself) is currently selected.
    if (members.length === 0) return true;
    return members.some((member) => selectedUserIds.has(member.uid));
  });

  const tripColor = (tripId: number) =>
    TRIP_COLORS[tripId % TRIP_COLORS.length];

  const tripsOnDate = (date: Date) => {
    const day = startOfDay(date).getTime();
    return visibleTrips.filter((trip) => {
      const start = startOfDay(new Date(trip.startDate)).getTime();
      const end = startOfDay(new Date(trip.endDate)).getTime();
      return day >= start && day <= end;
    });
  };

  // Assign each trip a stable "lane" (row) for the currently displayed
  // month, via greedy interval scheduling, so a trip always renders at the
  // same vertical position across every day it spans - overlapping trips
  // never cause each other to shift up/down from one day to the next.
  const monthStart = startOfDay(
    new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
  ).getTime();
  const monthEnd = startOfDay(
    new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
  ).getTime();
  const monthVisibleTrips = visibleTrips.filter((trip) => {
    const start = startOfDay(new Date(trip.startDate)).getTime();
    const end = startOfDay(new Date(trip.endDate)).getTime();
    return start <= monthEnd && end >= monthStart;
  });

  const tripLanes = new Map<number, number>();
  const laneEndTimes: number[] = [];
  monthVisibleTrips.forEach((trip) => {
    const start = startOfDay(new Date(trip.startDate)).getTime();
    const end = startOfDay(new Date(trip.endDate)).getTime();
    let lane = laneEndTimes.findIndex((endTime) => endTime < start);
    if (lane === -1) {
      lane = laneEndTimes.length;
      laneEndTimes.push(end);
    } else {
      laneEndTimes[lane] = end;
    }
    tripLanes.set(trip.id, lane);
  });
  const maxLanes = laneEndTimes.length;
  // Once too many trips overlap, showing full text bars makes day cells
  // huge - collapse to thin, unlabeled color strips and let the legend
  // below identify each trip instead.
  const COMPACT_LANE_THRESHOLD = 4;
  const isCompact = maxLanes > COMPACT_LANE_THRESHOLD;

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + (direction === 'prev' ? -1 : 1));
      return next;
    });
  };

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();
  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay();

  const today = new Date();
  const isToday = (date: Date) =>
    startOfDay(date).getTime() === startOfDay(today).getTime();
  const isPast = (date: Date) =>
    startOfDay(date).getTime() < startOfDay(today).getTime();

  const cells: (Date | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) =>
        new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1)
    ),
  ];

  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(135deg, #fffbeb, #ffe4c7)' }}
    >
      <NavBar />
      <main className="p-4 lg:p-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-150"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              {MONTH_NAMES[currentMonth.getMonth()]}{' '}
              {currentMonth.getFullYear()}
            </h1>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-150"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="flex justify-center mb-4">
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Today
            </button>
          </div>

          {/* Trip visibility toggles */}
          <div className="flex flex-wrap items-center gap-2 mb-6 pb-4 border-b border-gray-100">
            {sharedUsers.length > 0 && (
              <>
                <button
                  onClick={toggleAllSharedUsers}
                  className="px-3 py-1.5 rounded-full text-sm font-medium border border-gray-300 text-gray-600 bg-white hover:bg-gray-50 transition-colors duration-150"
                >
                  {selectedUserIds.size === sharedUsers.length
                    ? 'Deselect All'
                    : 'Select All'}
                </button>
                {sharedUsers.map((sharedUser) => {
                  const isSelected = selectedUserIds.has(sharedUser.uid);
                  return (
                    <button
                      key={sharedUser.uid}
                      onClick={() => toggleSharedUser(sharedUser.uid)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors duration-150 ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-semibold ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {sharedUser.username.charAt(0).toUpperCase()}
                      </span>
                      {sharedUser.username}
                      {sharedUser.uid === user?.uid && ' (You)'}
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading trips...</span>
            </div>
          ) : error ? (
            <p className="text-center text-red-600 py-12">{error}</p>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEK_DAYS.map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-semibold text-gray-500 py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 border-l border-t border-gray-200">
                {cells.map((date, index) => {
                  if (!date) {
                    return (
                      <div
                        key={`empty-${index}`}
                        className="min-h-24 border-r border-b border-gray-200 bg-gray-50"
                      />
                    );
                  }

                  const dayTrips = tripsOnDate(date);
                  const tripsByLane = new Map(
                    dayTrips.map((trip) => [tripLanes.get(trip.id), trip])
                  );
                  const past = isPast(date);
                  const rowStart = date.getDay() === 0;
                  const rowEnd = date.getDay() === 6;

                  return (
                    <div
                      key={date.toISOString()}
                      onClick={() => handleDayClick(date)}
                      title="Click to plan a trip on this day"
                      className={`min-h-24 border-r border-b p-1.5 flex flex-col gap-1 cursor-pointer hover:bg-indigo-50 transition-colors duration-100 ${
                        isToday(date)
                          ? 'border-gray-200 bg-blue-50'
                          : past
                            ? 'border-gray-200 bg-gray-50'
                            : 'border-gray-200 bg-white'
                      }`}
                    >
                      <span
                        className={`text-xs font-medium self-end ${
                          isToday(date)
                            ? 'text-blue-600'
                            : past
                              ? 'text-gray-300'
                              : 'text-gray-500'
                        }`}
                      >
                        {date.getDate()}
                      </span>
                      <div className="flex flex-col gap-1 overflow-hidden -mx-1.5">
                        {Array.from({ length: maxLanes }).map((_, lane) => {
                          const trip = tripsByLane.get(lane);
                          if (!trip) {
                            return (
                              <span
                                key={`empty-${lane}`}
                                className={
                                  isCompact
                                    ? 'h-1.5 invisible'
                                    : 'text-[10px] leading-tight px-1 py-0.5 invisible'
                                }
                              >
                                {isCompact ? null : ' '}
                              </span>
                            );
                          }

                          const tripStart =
                            startOfDay(new Date(trip.startDate)).getTime() ===
                            startOfDay(date).getTime();
                          const tripEnd =
                            startOfDay(new Date(trip.endDate)).getTime() ===
                            startOfDay(date).getTime();
                          const roundLeft = tripStart || rowStart;
                          const roundRight = tripEnd || rowEnd;

                          if (isCompact) {
                            return (
                              <span
                                key={trip.id}
                                title={trip.name}
                                onMouseEnter={(e) => handleTripHover(trip, e)}
                                onMouseMove={(e) => handleTripHover(trip, e)}
                                onMouseLeave={() => setHoveredTrip(null)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTripClick(trip);
                                }}
                                className={`h-1.5 cursor-pointer ${
                                  past ? 'bg-gray-300' : tripColor(trip.id)
                                } ${roundLeft ? 'rounded-l' : ''} ${roundRight ? 'rounded-r' : ''}`}
                              />
                            );
                          }

                          return (
                            <span
                              key={trip.id}
                              title={trip.name}
                              onMouseEnter={(e) => handleTripHover(trip, e)}
                              onMouseMove={(e) => handleTripHover(trip, e)}
                              onMouseLeave={() => setHoveredTrip(null)}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTripClick(trip);
                              }}
                              className={`text-[10px] leading-tight text-white px-1 py-0.5 truncate cursor-pointer ${
                                past
                                  ? 'bg-gray-300 text-gray-100'
                                  : tripColor(trip.id)
                              } ${roundLeft ? 'rounded-l' : ''} ${roundRight ? 'rounded-r' : ''}`}
                            >
                              {tripStart || rowStart ? trip.name : ' '}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">
                  Trips
                </h2>
                {visibleTrips.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    {trips.length === 0
                      ? 'No trips planned yet.'
                      : 'No trips match the current filters.'}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {visibleTrips.map((trip) => (
                      <div
                        key={trip.id}
                        className="flex items-center gap-2 text-sm text-gray-700"
                      >
                        <span
                          className={`w-3 h-3 rounded-full ${tripColor(trip.id)}`}
                        />
                        <span>{trip.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {hoveredTrip && (
        <div
          className="fixed z-50 w-64 pointer-events-none rounded-lg border border-gray-200 bg-white p-3 shadow-xl"
          style={{
            left: Math.min(hoveredTrip.x + 12, window.innerWidth - 272),
            top: Math.min(hoveredTrip.y + 12, window.innerHeight - 140),
          }}
        >
          <div className="mb-1 flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${tripColor(hoveredTrip.trip.id)}`}
            />
            <p className="truncate text-sm font-semibold text-gray-900">
              {hoveredTrip.trip.name}
            </p>
          </div>
          {hoveredTrip.trip.destination && (
            <p className="mb-1 truncate text-xs text-gray-500">
              {hoveredTrip.trip.destination}
            </p>
          )}
          <p className="text-xs text-gray-600">
            {formatDate(hoveredTrip.trip.startDate)} -{' '}
            {formatDate(hoveredTrip.trip.endDate)}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {(tripMembersByTripId.get(hoveredTrip.trip.id) ?? []).length}{' '}
            participant
            {(tripMembersByTripId.get(hoveredTrip.trip.id) ?? []).length !== 1
              ? 's'
              : ''}
          </p>
          <p className="mt-1 text-[11px] text-blue-500">Click for details</p>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
