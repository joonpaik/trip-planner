import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import '../index.css';
import Card from '../components/Card';
import NavBar from '../components/Navbar';
import { tripService } from '../services/tripService';
import { useAuth } from '../hooks/useAuth';
import { CalendarDropdown } from '../components/CalendarDropdown';
import { FilterDropdown } from '../components/FilterDropdown';
import { MultiSelectDropdown } from '../components/MultiSelectDropdown';
import { EditTaskModal } from '../components/EditTaskModal';
import { AddressAutocompleteInput } from '../components/AddressAutocompleteInput';
import { TripMember, FilteredTask, ItineraryItem } from '../types/trips';
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
  Trash2,
  Pencil,
  GripVertical,
  Plus,
} from 'lucide-react';

// Types
interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  description?: string;
  participants?: string[];
  budget?: number | null;
  itineraryEnabled?: boolean;
  itinerary?: ItineraryItem[];
}

interface ItineraryRow extends ItineraryItem {
  key: string;
}

const makeItineraryRowKey = () =>
  `itinerary-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const makeEmptyItineraryRow = (): ItineraryRow => ({
  key: makeItineraryRowKey(),
  location: '',
  address: '',
  notes: '',
});

interface TripPortalProps {
  // You would typically get these from your API/service
  trips?: Trip[];
  onLoadTrips?: () => Promise<Trip[]>;
}

const EMPTY_TRIPS: Trip[] = [];

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

const TripPortal: React.FC<TripPortalProps> = ({
  trips = EMPTY_TRIPS,
  onLoadTrips,
}) => {
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [openTabs, setOpenTabs] = useState<Trip[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tripStatusFilter, setTripStatusFilter] = useState<string | null>(
    null
  );

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTrip, setNewTrip] = useState<Partial<Trip>>({
    name: '',
    destination: '',
    startDate: '',
    endDate: '',
    description: '',
    participants: [],
    budget: null,
  });
  const [newTripBudgetEnabled, setNewTripBudgetEnabled] = useState(false);
  const [newTripItineraryEnabled, setNewTripItineraryEnabled] =
    useState(false);
  const [newTripItinerary, setNewTripItinerary] = useState<ItineraryRow[]>(
    []
  );

  const [showEditModal, setShowEditModal] = useState(false);
  const [editTrip, setEditTrip] = useState<Partial<Trip>>({
    id: '',
    name: '',
    destination: '',
    startDate: '',
    endDate: '',
    description: '',
    participants: [],
    budget: null,
  });
  const [editTripBudgetEnabled, setEditTripBudgetEnabled] = useState(false);
  const [editTripItineraryEnabled, setEditTripItineraryEnabled] =
    useState(false);
  const [editTripItinerary, setEditTripItinerary] = useState<ItineraryRow[]>(
    []
  );
  const itineraryDragIndex = useRef<number | null>(null);

  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [taskTargetTrip, setTaskTargetTrip] = useState<Trip | null>(null);
  const [newTask, setNewTask] = useState({
    title: '',
    deadline: '',
    status: 0,
    description: '',
    assigneeUids: [] as string[],
  });
  const [taskMemberSearch, setTaskMemberSearch] = useState('');
  const [taskMemberResults, setTaskMemberResults] = useState<TripMember[]>(
    []
  );
  const [selectedAssignees, setSelectedAssignees] = useState<TripMember[]>(
    []
  );
  const [taskCostEnabled, setTaskCostEnabled] = useState(false);
  const [taskTotalCost, setTaskTotalCost] = useState<number | null>(null);
  const [taskCostSplitType, setTaskCostSplitType] = useState<
    'direct' | 'percentage'
  >('direct');
  const [taskAssigneeCosts, setTaskAssigneeCosts] = useState<
    Record<string, number | null>
  >({});

  const [tripTasks, setTripTasks] = useState<FilteredTask[]>([]);
  const [tripTasksLoading, setTripTasksLoading] = useState(false);
  const [editingTask, setEditingTask] = useState<FilteredTask | null>(null);
  const [taskStatusFilter, setTaskStatusFilter] = useState<string | null>(
    null
  );
  const [taskPeopleFilter, setTaskPeopleFilter] = useState<string[]>([]);
  const [tripMembersMap, setTripMembersMap] = useState<Map<string, string>>(
    new Map()
  );
  const [tripCardMembers, setTripCardMembers] = useState<
    Map<string, TripMember[]>
  >(new Map());

  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [addMemberTargetTrip, setAddMemberTargetTrip] =
    useState<Trip | null>(null);
  const [addMemberIdentifier, setAddMemberIdentifier] = useState('');
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [addMemberError, setAddMemberError] = useState('');

  useEffect(() => {
    const loadTrips = async () => {
      setLoading(true);
      try {
        if (onLoadTrips) {
          const loadedTrips = await onLoadTrips();
          setAllTrips(loadedTrips);
        } else if (user) {
          const response = await tripService.fetchUserTrips({
            uid: user.uid,
          });
          const loadedTrips: Trip[] = response.trips.map((trip) => ({
            id: String(trip.id),
            name: trip.name,
            destination: trip.destination,
            startDate: trip.startDate,
            endDate: trip.endDate,
            status: (trip.status as Trip['status']) || 'upcoming',
            description: trip.description,
            budget: trip.budget,
            itineraryEnabled: trip.itineraryEnabled,
            itinerary: trip.itinerary,
          }));
          setAllTrips(loadedTrips);
        } else {
          setAllTrips(trips);
        }
      } catch (error) {
        console.error('Error loading trips:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTrips();
  }, [trips, onLoadTrips, user]);

  useEffect(() => {
    if (!user || allTrips.length === 0) {
      setTripCardMembers(new Map());
      return;
    }

    const loadAllTripMembers = async () => {
      const entries = await Promise.all(
        allTrips.map(async (trip): Promise<[string, TripMember[]]> => {
          try {
            const response = await tripService.fetchTripMembers({
              uid: user.uid,
              tripId: Number(trip.id),
            });
            return [trip.id, response.members];
          } catch (error) {
            console.error(`Failed to load members for trip ${trip.id}:`, error);
            return [trip.id, []];
          }
        })
      );
      setTripCardMembers(new Map(entries));
    };

    loadAllTripMembers();
  }, [allTrips, user]);

  const isTripAdmin = (tripId: string): boolean => {
    if (!user) return false;
    const members = tripCardMembers.get(tripId);
    const me = members?.find((m) => m.uid === user.uid);
    return me?.role === 'admin';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColorOnDark = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-400/20 text-blue-100';
      case 'ongoing':
        return 'bg-green-400/20 text-green-100';
      case 'completed':
        return 'bg-white/20 text-white/80';
      default:
        return 'bg-white/20 text-white/80';
    }
  };

  const openTripTab = (trip: Trip) => {
    // Check if tab is already open
    if (!openTabs.find((tab) => tab.id === trip.id)) {
      setOpenTabs((prev) => [...prev, trip]);
    }
    setActiveTabId(trip.id);
  };

  // Deep-link support: /mytrips?tripId=123 (e.g. from the calendar) opens
  // that trip's detail tab once its data has loaded.
  useEffect(() => {
    const tripId = searchParams.get('tripId');
    if (!tripId || allTrips.length === 0) return;

    const trip = allTrips.find((t) => t.id === tripId);
    if (trip) {
      openTripTab(trip);
    }

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('tripId');
        return next;
      },
      { replace: true }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTrips, searchParams]);

  // Deep-link support: /mytrips?createTrip=1&date=YYYY-MM-DD (e.g. from
  // clicking a day on the calendar) opens the Create Trip modal with that
  // date pre-filled as the start date.
  useEffect(() => {
    if (searchParams.get('createTrip') !== '1') return;

    const date = searchParams.get('date');
    setNewTrip((prev) => ({
      ...prev,
      startDate: date || prev.startDate,
      endDate: date || prev.endDate,
    }));
    setShowCreateModal(true);

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('createTrip');
        next.delete('date');
        return next;
      },
      { replace: true }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const closeTab = (tripId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTabs = openTabs.filter((tab) => tab.id !== tripId);
    setOpenTabs(newTabs);

    // If closing active tab, switch to another tab or go back to list
    if (activeTabId === tripId) {
      if (newTabs.length > 0) {
        setActiveTabId(newTabs[newTabs.length - 1].id);
      } else {
        setActiveTabId(null);
      }
    }
  };

  const closeAllTabs = () => {
    setOpenTabs([]);
    setActiveTabId(null);
  };

  const handleDeleteTrip = async (
    tripId: string,
    e?: React.MouseEvent
  ): Promise<void> => {
    e?.stopPropagation();

    if (!user) {
      alert('You must be logged in to delete a trip.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this trip?')) {
      return;
    }

    try {
      await tripService.deleteTrip({
        uid: user.uid,
        tripId: Number(tripId),
      });

      setAllTrips((prev) => prev.filter((trip) => trip.id !== tripId));
      setOpenTabs((prev) => prev.filter((trip) => trip.id !== tripId));
      if (activeTabId === tripId) {
        setActiveTabId(null);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete trip');
    }
  };

  const handleCompleteTrip = async (
    tripId: string,
    e?: React.MouseEvent
  ): Promise<void> => {
    e?.stopPropagation();

    if (!user) {
      alert('You must be logged in to complete a trip.');
      return;
    }

    if (
      !window.confirm(
        'Mark this trip as complete? All tasks on this trip will be marked as completed too.'
      )
    ) {
      return;
    }

    try {
      await tripService.completeTrip({
        uid: user.uid,
        tripId: Number(tripId),
      });

      setAllTrips((prev) =>
        prev.map((trip) =>
          trip.id === tripId ? { ...trip, status: 'completed' } : trip
        )
      );
      setOpenTabs((prev) =>
        prev.map((trip) =>
          trip.id === tripId ? { ...trip, status: 'completed' } : trip
        )
      );
      if (activeTabId === tripId) {
        setTripTasks((prev) =>
          prev.map((task) => ({ ...task, taskStatus: 2 }))
        );
      }

      setSuccessMessage('Trip and all its tasks marked as completed');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : 'Failed to complete trip'
      );
    }
  };

  const handleEditClick = (trip: Trip, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditTrip({ ...trip });
    setEditTripBudgetEnabled(trip.budget != null);
    setEditTripItineraryEnabled(trip.itineraryEnabled ?? false);
    setEditTripItinerary(
      (trip.itinerary ?? []).map((item) => ({
        ...item,
        key: makeItineraryRowKey(),
      }))
    );
    setShowEditModal(true);
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditTrip({
      id: '',
      name: '',
      destination: '',
      startDate: '',
      endDate: '',
      description: '',
      participants: [],
      budget: null,
    });
    setEditTripBudgetEnabled(false);
    setEditTripItineraryEnabled(false);
    setEditTripItinerary([]);
  };

  const handleUpdateTrip = async () => {
    if (
      !editTrip.id ||
      !editTrip.name ||
      !editTrip.startDate ||
      !editTrip.endDate
    ) {
      alert('Please fill in all required fields.');
      return;
    }

    if (!user) {
      alert('You must be logged in to edit a trip.');
      return;
    }

    const cleanedItinerary: ItineraryItem[] = editTripItinerary
      .filter((row) => row.location.trim() || row.address.trim() || row.notes.trim())
      .map(({ key, ...rest }) => rest);

    try {
      await tripService.updateTrip({
        uid: user.uid,
        tripId: Number(editTrip.id),
        name: editTrip.name,
        destination: {
          notes: '',
          address: editTrip.destination || '',
          location: editTrip.destination || '',
        },
        startDate: editTrip.startDate,
        endDate: editTrip.endDate,
        status: editTrip.status || 'upcoming',
        description: editTrip.description || '',
        budget: editTripBudgetEnabled ? Number(editTrip.budget) || 0 : null,
        itineraryEnabled: editTripItineraryEnabled,
        itinerary: cleanedItinerary,
      });

      const updatedTrip: Trip = {
        id: editTrip.id,
        name: editTrip.name,
        destination: editTrip.destination || '',
        startDate: editTrip.startDate,
        endDate: editTrip.endDate,
        status: (editTrip.status as Trip['status']) || 'upcoming',
        description: editTrip.description || '',
        participants: editTrip.participants || [],
        budget: editTripBudgetEnabled ? Number(editTrip.budget) || 0 : null,
        itineraryEnabled: editTripItineraryEnabled,
        itinerary: cleanedItinerary,
      };

      setAllTrips((prev) =>
        prev.map((trip) => (trip.id === updatedTrip.id ? updatedTrip : trip))
      );
      setOpenTabs((prev) =>
        prev.map((trip) => (trip.id === updatedTrip.id ? updatedTrip : trip))
      );

      handleCancelEdit();
      setSuccessMessage('Trip Updated Successfully');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update trip');
    }
  };

  const handleCreateTrip = async () => {
    if (!newTrip.name || !newTrip.startDate || !newTrip.endDate) {
      alert('Please fill in all required fields.');
      return;
    }

    if (!user) {
      alert('You must be logged in to create a trip.');
      return;
    }

    const cleanedItinerary: ItineraryItem[] = newTripItinerary
      .filter((row) => row.location.trim() || row.address.trim() || row.notes.trim())
      .map(({ key, ...rest }) => rest);

    try {
      const response = await tripService.createTrip({
        uid: user.uid,
        name: newTrip.name,
        destination: {
          notes: '',
          address: newTrip.destination || '',
          location: newTrip.destination || '',
        },
        startDate: newTrip.startDate,
        endDate: newTrip.endDate,
        status: newTrip.status || 'upcoming',
        description: newTrip.description || '',
        budget: newTripBudgetEnabled ? Number(newTrip.budget) || 0 : null,
        itineraryEnabled: newTripItineraryEnabled,
        itinerary: cleanedItinerary,
      });

      const tripToAdd: Trip = {
        id: String(response.tripId),
        name: newTrip.name,
        destination: newTrip.destination || '',
        startDate: newTrip.startDate,
        endDate: newTrip.endDate,
        status: (newTrip.status as Trip['status']) || 'upcoming',
        description: newTrip.description || '',
        participants: newTrip.participants || [],
        budget: newTripBudgetEnabled ? Number(newTrip.budget) || 0 : null,
        itineraryEnabled: newTripItineraryEnabled,
        itinerary: cleanedItinerary,
      };

      setAllTrips((prev) => [...prev, tripToAdd]);
      setNewTrip({
        name: '',
        destination: '',
        startDate: '',
        endDate: '',
        description: '',
        participants: [],
        budget: null,
      });
      setNewTripBudgetEnabled(false);
      setNewTripItineraryEnabled(false);
      setNewTripItinerary([]);
      setShowCreateModal(false);
      openTripTab(tripToAdd);

      if (response.tripId) {
        setSuccessMessage('Trip Created Successfully');
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create trip');
    }
  };

  const handleCancelCreate = () => {
    setShowCreateModal(false);
    setNewTrip({
      name: '',
      destination: '',
      startDate: '',
      endDate: '',
      description: '',
      participants: [],
      budget: null,
    });
    setNewTripBudgetEnabled(false);
    setNewTripItineraryEnabled(false);
    setNewTripItinerary([]);
  };

  const renderItineraryEditor = (
    enabled: boolean,
    setEnabled: (enabled: boolean) => void,
    items: ItineraryRow[],
    setItems: React.Dispatch<React.SetStateAction<ItineraryRow[]>>
  ) => {
    const updateRow = (
      key: string,
      field: keyof ItineraryItem,
      value: string
    ) => {
      setItems((prev) =>
        prev.map((row) => (row.key === key ? { ...row, [field]: value } : row))
      );
    };

    const removeRow = (key: string) => {
      setItems((prev) => prev.filter((row) => row.key !== key));
    };

    const addRow = () => {
      setItems((prev) => [...prev, makeEmptyItineraryRow()]);
    };

    const handleDragStart = (index: number) => {
      itineraryDragIndex.current = index;
    };

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (index: number) => {
      const fromIndex = itineraryDragIndex.current;
      itineraryDragIndex.current = null;
      if (fromIndex === null || fromIndex === index) return;
      setItems((prev) => {
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(index, 0, moved);
        return next;
      });
    };

    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">
            Itinerary
          </label>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
              enabled ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {enabled && (
          <div className="space-y-2 mt-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
            {items.length === 0 ? (
              <p className="text-xs text-gray-500">
                No stops yet. Add your first location below.
              </p>
            ) : (
              items.map((row, index) => (
                <div
                  key={row.key}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(index)}
                  className="flex items-start gap-2 bg-white border border-gray-200 rounded-lg p-2"
                >
                  <div
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    className="pt-2 cursor-grab text-gray-400 hover:text-gray-600"
                    title="Drag to reorder"
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="text"
                      value={row.location}
                      onChange={(e) =>
                        updateRow(row.key, 'location', e.target.value)
                      }
                      placeholder="Location (e.g., Eiffel Tower)"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <AddressAutocompleteInput
                      value={row.address}
                      onChange={(value) =>
                        updateRow(row.key, 'address', value)
                      }
                      placeholder="Address"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <textarea
                      value={row.notes}
                      onChange={(e) =>
                        updateRow(row.key, 'notes', e.target.value)
                      }
                      placeholder="Notes"
                      rows={2}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRow(row.key)}
                    className="pt-2 text-gray-400 hover:text-red-600 transition-colors duration-150"
                    title="Remove stop"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium pt-1"
            >
              <Plus className="w-4 h-4" />
              Add Location
            </button>
          </div>
        )}
      </div>
    );
  };

  const CreateTripModal = () => {
    if (!showCreateModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Create New Trip
              </h2>
              <button
                onClick={handleCancelCreate}
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

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trip Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTrip.name}
                  onChange={(e) =>
                    setNewTrip({ ...newTrip, name: e.target.value })
                  }
                  placeholder="e.g., Summer Vacation 2025"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Destination <span className="text-red-500">*</span>
                </label>
                <AddressAutocompleteInput
                  value={newTrip.destination ?? ''}
                  onChange={(value) =>
                    setNewTrip({ ...newTrip, destination: value })
                  }
                  placeholder="e.g., Paris, France"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {renderItineraryEditor(
                newTripItineraryEnabled,
                setNewTripItineraryEnabled,
                newTripItinerary,
                setNewTripItinerary
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={newTrip.startDate}
                    onChange={(e) =>
                      setNewTrip({ ...newTrip, startDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={newTrip.endDate}
                    onChange={(e) =>
                      setNewTrip({ ...newTrip, endDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={newTrip.status}
                  onChange={(e) =>
                    setNewTrip({
                      ...newTrip,
                      status: e.target.value as
                        | 'upcoming'
                        | 'ongoing'
                        | 'completed',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Trip Budget
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const enabled = !newTripBudgetEnabled;
                      setNewTripBudgetEnabled(enabled);
                      if (!enabled) {
                        setNewTrip({ ...newTrip, budget: null });
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                      newTripBudgetEnabled ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                        newTripBudgetEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                {newTripBudgetEnabled && (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newTrip.budget ?? ''}
                    onChange={(e) =>
                      setNewTrip({
                        ...newTrip,
                        budget: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                    placeholder="e.g., 2500.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newTrip.description}
                  onChange={(e) =>
                    setNewTrip({ ...newTrip, description: e.target.value })
                  }
                  placeholder="Tell us about your trip..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={handleCancelCreate}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTrip}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  Create Trip
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const EditTripModal = () => {
    if (!showEditModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Edit Trip</h2>
              <button
                onClick={handleCancelEdit}
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

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trip Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editTrip.name}
                  onChange={(e) =>
                    setEditTrip({ ...editTrip, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Destination <span className="text-red-500">*</span>
                </label>
                <AddressAutocompleteInput
                  value={editTrip.destination ?? ''}
                  onChange={(value) =>
                    setEditTrip({ ...editTrip, destination: value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {renderItineraryEditor(
                editTripItineraryEnabled,
                setEditTripItineraryEnabled,
                editTripItinerary,
                setEditTripItinerary
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <CalendarDropdown
                    selectedDate={
                      editTrip.startDate
                        ? parseDateInputValue(editTrip.startDate)
                        : null
                    }
                    onChange={(date) =>
                      setEditTrip({
                        ...editTrip,
                        startDate: date ? toDateInputValue(date) : '',
                      })
                    }
                    placeholder="Select start date"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <CalendarDropdown
                    selectedDate={
                      editTrip.endDate
                        ? parseDateInputValue(editTrip.endDate)
                        : null
                    }
                    onChange={(date) =>
                      setEditTrip({
                        ...editTrip,
                        endDate: date ? toDateInputValue(date) : '',
                      })
                    }
                    placeholder="Select end date"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={editTrip.status}
                  onChange={(e) =>
                    setEditTrip({
                      ...editTrip,
                      status: e.target.value as
                        | 'upcoming'
                        | 'ongoing'
                        | 'completed',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Trip Budget
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const enabled = !editTripBudgetEnabled;
                      setEditTripBudgetEnabled(enabled);
                      if (!enabled) {
                        setEditTrip({ ...editTrip, budget: null });
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                      editTripBudgetEnabled ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                        editTripBudgetEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                {editTripBudgetEnabled && (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editTrip.budget ?? ''}
                    onChange={(e) =>
                      setEditTrip({
                        ...editTrip,
                        budget: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                    placeholder="e.g., 2500.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editTrip.description}
                  onChange={(e) =>
                    setEditTrip({ ...editTrip, description: e.target.value })
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateTrip}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (!showCreateTaskModal || !taskTargetTrip || !user) return;

    const timeout = setTimeout(async () => {
      try {
        const response = await tripService.fetchTripMembers({
          uid: user.uid,
          tripId: Number(taskTargetTrip.id),
          search: taskMemberSearch,
        });
        setTaskMemberResults(
          response.members.filter(
            (member) =>
              !selectedAssignees.some((a) => a.uid === member.uid)
          )
        );
      } catch (error) {
        console.error('Failed to search trip members:', error);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [taskMemberSearch, showCreateTaskModal, taskTargetTrip, user, selectedAssignees]);

  useEffect(() => {
    const currentTrip = openTabs.find((trip) => trip.id === activeTabId);
    if (!currentTrip || !user) {
      setTripTasks([]);
      return;
    }

    const loadTripTasks = async () => {
      setTripTasksLoading(true);
      try {
        const [membersResponse, tasksResponse] = await Promise.all([
          tripService.fetchTripMembers({
            uid: user.uid,
            tripId: Number(currentTrip.id),
          }),
          tripService.fetchFilteredTasks({
            uid: user.uid,
            tripFilter: currentTrip.name,
            statusFilter: taskStatusFilter,
            dueDateFilter: null,
            peopleFilter: taskPeopleFilter,
            allTripMembers: true,
          }),
        ]);

        const membersMap = new Map<string, string>();
        membersResponse.members.forEach((member) => {
          membersMap.set(member.uid, member.username);
        });
        setTripMembersMap(membersMap);
        setTripTasks(tasksResponse.filteredTasks);
      } catch (error) {
        console.error('Failed to load trip tasks:', error);
      } finally {
        setTripTasksLoading(false);
      }
    };

    loadTripTasks();
  }, [activeTabId, openTabs, user, taskStatusFilter, taskPeopleFilter]);

  const handleOpenCreateTask = (trip: Trip) => {
    setTaskTargetTrip(trip);
    setNewTask({
      title: '',
      deadline: '',
      status: 0,
      description: '',
      assigneeUids: [],
    });
    setSelectedAssignees([]);
    setTaskMemberSearch('');
    setTaskMemberResults([]);
    setTaskCostEnabled(false);
    setTaskTotalCost(null);
    setTaskCostSplitType('direct');
    setTaskAssigneeCosts({});
    setShowCreateTaskModal(true);
  };

  const handleCancelCreateTask = () => {
    setShowCreateTaskModal(false);
    setTaskTargetTrip(null);
    setTaskCostEnabled(false);
    setTaskTotalCost(null);
    setTaskCostSplitType('direct');
    setTaskAssigneeCosts({});
  };

  const handleAddAssignee = (member: TripMember) => {
    setSelectedAssignees((prev) => [...prev, member]);
    setTaskMemberResults((prev) => prev.filter((m) => m.uid !== member.uid));
    setTaskAssigneeCosts((prev) => ({ ...prev, [member.uid]: null }));
  };

  const handleRemoveAssignee = (uid: string) => {
    setSelectedAssignees((prev) => prev.filter((m) => m.uid !== uid));
    setTaskAssigneeCosts((prev) => {
      const next = { ...prev };
      delete next[uid];
      return next;
    });
  };

  const handleTaskAssigneeCostChange = (uid: string, rawValue: string) => {
    setTaskAssigneeCosts((prev) => ({
      ...prev,
      [uid]: rawValue === '' ? null : Number(rawValue),
    }));
  };

  const handleCreateTask = async () => {
    if (!taskTargetTrip || !user) {
      alert('You must be logged in to create a task.');
      return;
    }

    if (
      !newTask.title.trim() ||
      !newTask.deadline ||
      !newTask.description.trim()
    ) {
      alert('Please fill in all required fields.');
      return;
    }

    if (selectedAssignees.length === 0) {
      alert('Please assign this task to at least one person before saving.');
      return;
    }

    if (taskCostEnabled) {
      const costSum = Object.values(taskAssigneeCosts).reduce(
        (sum: number, v) => sum + (v ?? 0),
        0
      );
      if (taskCostSplitType === 'direct' && costSum > (taskTotalCost ?? 0) + 0.005) {
        alert(
          `The split amounts ($${costSum.toFixed(2)}) exceed the total cost ($${(taskTotalCost ?? 0).toFixed(2)}). Please adjust before saving.`
        );
        return;
      }
      if (taskCostSplitType === 'percentage' && costSum > 100.005) {
        alert(
          `The split percentages add up to ${costSum.toFixed(2)}%, which is over 100%. Please adjust before saving.`
        );
        return;
      }
    }

    try {
      await tripService.createTask({
        uid: user.uid,
        tripId: Number(taskTargetTrip.id),
        title: newTask.title,
        description: newTask.description,
        deadline: newTask.deadline,
        status: newTask.status,
        assigneeUids: selectedAssignees.map((m) => m.uid),
        costEnabled: taskCostEnabled,
        totalCost: taskCostEnabled ? taskTotalCost : null,
        costSplitType: taskCostEnabled ? taskCostSplitType : null,
        assigneeCosts: taskCostEnabled
          ? selectedAssignees.map((m) => ({
              uid: m.uid,
              amount:
                taskCostSplitType === 'direct'
                  ? taskAssigneeCosts[m.uid] ?? null
                  : null,
              percentage:
                taskCostSplitType === 'percentage'
                  ? taskAssigneeCosts[m.uid] ?? null
                  : null,
            }))
          : [],
      });

      if (taskTargetTrip.id === activeTabId) {
        const tasksResponse = await tripService.fetchFilteredTasks({
          uid: user.uid,
          tripFilter: taskTargetTrip.name,
          statusFilter: taskStatusFilter,
          dueDateFilter: null,
          peopleFilter: taskPeopleFilter,
          allTripMembers: true,
        });
        setTripTasks(tasksResponse.filteredTasks);
      }

      handleCancelCreateTask();
      setSuccessMessage('Task Created Successfully');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create task');
    }
  };

  const updateTripTaskInState = (
    taskId: number,
    updates: Partial<FilteredTask>
  ) => {
    setTripTasks((prev) =>
      prev.map((t) => (t.taskId === taskId ? { ...t, ...updates } : t))
    );
  };

  const handleCompleteTripTask = async (task: FilteredTask) => {
    if (!user) return;
    try {
      await tripService.updateTaskStatus({
        uid: user.uid,
        taskId: task.taskId,
        status: 2,
      });
      updateTripTaskInState(task.taskId, { taskStatus: 2 });
    } catch (error) {
      alert(
        error instanceof Error ? error.message : 'Failed to complete task'
      );
    }
  };

  const handleDeleteTripTask = async (task: FilteredTask) => {
    if (!user) return;
    if (!window.confirm('Delete this task?')) return;
    try {
      await tripService.deleteTask({ uid: user.uid, taskId: task.taskId });
      setTripTasks((prev) => prev.filter((t) => t.taskId !== task.taskId));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete task');
    }
  };

  const handleOpenAddMember = (trip: Trip) => {
    setAddMemberTargetTrip(trip);
    setAddMemberIdentifier('');
    setAddMemberError('');
    setShowAddMemberModal(true);
  };

  const handleCancelAddMember = () => {
    setShowAddMemberModal(false);
    setAddMemberTargetTrip(null);
    setAddMemberIdentifier('');
    setAddMemberError('');
  };

  const handleAddMember = async () => {
    if (!addMemberTargetTrip || !user) return;

    if (!addMemberIdentifier.trim()) {
      setAddMemberError('Please enter a username or email');
      return;
    }

    setAddMemberLoading(true);
    setAddMemberError('');
    try {
      const response = await tripService.addTripMember({
        uid: user.uid,
        tripId: Number(addMemberTargetTrip.id),
        identifier: addMemberIdentifier.trim(),
      });

      const membersResponse = await tripService.fetchTripMembers({
        uid: user.uid,
        tripId: Number(addMemberTargetTrip.id),
      });
      setTripCardMembers((prev) => {
        const next = new Map(prev);
        next.set(addMemberTargetTrip.id, membersResponse.members);
        return next;
      });

      handleCancelAddMember();
      setSuccessMessage(response.message);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (error) {
      setAddMemberError(
        error instanceof Error ? error.message : 'Failed to add member'
      );
    } finally {
      setAddMemberLoading(false);
    }
  };

  const handleRemoveMember = async (trip: Trip, memberUid: string) => {
    if (!user) return;
    if (!window.confirm('Remove this participant from the trip?')) return;

    try {
      await tripService.removeTripMember({
        uid: user.uid,
        tripId: Number(trip.id),
        memberUid,
      });

      setTripCardMembers((prev) => {
        const next = new Map(prev);
        next.set(
          trip.id,
          (next.get(trip.id) ?? []).filter((m) => m.uid !== memberUid)
        );
        return next;
      });

      setSuccessMessage('Participant removed');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : 'Failed to remove member'
      );
    }
  };

  const handleToggleMemberRole = async (
    trip: Trip,
    member: TripMember
  ) => {
    if (!user) return;
    const newRole = member.role === 'admin' ? 'participant' : 'admin';
    const confirmMessage =
      newRole === 'admin'
        ? `Make ${member.username} an admin of this trip?`
        : `Remove admin access from ${member.username}?`;
    if (!window.confirm(confirmMessage)) return;

    try {
      await tripService.setTripMemberRole({
        uid: user.uid,
        tripId: Number(trip.id),
        memberUid: member.uid,
        role: newRole,
      });

      setTripCardMembers((prev) => {
        const next = new Map(prev);
        next.set(
          trip.id,
          (next.get(trip.id) ?? []).map((m) =>
            m.uid === member.uid ? { ...m, role: newRole } : m
          )
        );
        return next;
      });

      setSuccessMessage(
        newRole === 'admin' ? `${member.username} is now an admin` : `${member.username} is now a participant`
      );
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : 'Failed to update role'
      );
    }
  };

  const AddMemberModal = () => {
    if (!showAddMemberModal || !addMemberTargetTrip) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Add Member</h2>
            <button
              onClick={handleCancelAddMember}
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

          <p className="text-sm text-gray-600 mb-4">
            Enter a username or email. If they're already on TripPlanner,
            they'll be added to {addMemberTargetTrip.name}. Otherwise, we'll
            invite them to join.
          </p>

          {addMemberError && (
            <div className="mb-4 rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm px-4 py-2 text-center">
              {addMemberError}
            </div>
          )}

          <input
            type="text"
            value={addMemberIdentifier}
            onChange={(e) => setAddMemberIdentifier(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddMember();
            }}
            placeholder="username or email"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          />

          <button
            onClick={handleAddMember}
            disabled={addMemberLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50"
          >
            {addMemberLoading ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>
    );
  };

  const CreateTaskModal = () => {
    if (!showCreateTaskModal || !taskTargetTrip) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Create Task
              </h2>
              <button
                onClick={handleCancelCreateTask}
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

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trip Name
                </label>
                <input
                  type="text"
                  value={taskTargetTrip.name}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) =>
                    setNewTask({ ...newTask, title: e.target.value })
                  }
                  placeholder="e.g., Book flights"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deadline Date <span className="text-red-500">*</span>
                </label>
                <CalendarDropdown
                  selectedDate={
                    newTask.deadline
                      ? parseDateInputValue(newTask.deadline)
                      : null
                  }
                  onChange={(date) =>
                    setNewTask({
                      ...newTask,
                      deadline: date ? toDateInputValue(date) : '',
                    })
                  }
                  placeholder="Select deadline"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={newTask.status}
                  onChange={(e) =>
                    setNewTask({
                      ...newTask,
                      status: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>Not Started</option>
                  <option value={1}>Pending</option>
                  <option value={2}>Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newTask.description}
                  onChange={(e) =>
                    setNewTask({ ...newTask, description: e.target.value })
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign To
                </label>

                {selectedAssignees.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedAssignees.map((member) => (
                      <span
                        key={member.uid}
                        className="flex items-center gap-1 bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full"
                      >
                        {member.username}
                        <button
                          onClick={() => handleRemoveAssignee(member.uid)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <input
                  type="text"
                  value={taskMemberSearch}
                  onChange={(e) => setTaskMemberSearch(e.target.value)}
                  placeholder="Search by username..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {taskMemberResults.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                    {taskMemberResults.map((member) => (
                      <button
                        key={member.uid}
                        onClick={() => handleAddAssignee(member)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm text-gray-700 border-b border-gray-100 last:border-b-0"
                      >
                        {member.username}
                        <span className="text-gray-400 ml-2">
                          {member.firstName} {member.lastName}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Split Costs
                  </label>
                  <button
                    type="button"
                    onClick={() => setTaskCostEnabled(!taskCostEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                      taskCostEnabled ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                        taskCostEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {taskCostEnabled && (
                  <div className="space-y-3 mt-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Total Cost
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={taskTotalCost ?? ''}
                        onChange={(e) =>
                          setTaskTotalCost(
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
                        onClick={() => setTaskCostSplitType('direct')}
                        className={`px-3 py-1.5 ${
                          taskCostSplitType === 'direct'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        Direct $
                      </button>
                      <button
                        type="button"
                        onClick={() => setTaskCostSplitType('percentage')}
                        className={`px-3 py-1.5 border-l border-gray-300 ${
                          taskCostSplitType === 'percentage'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        Percentage %
                      </button>
                    </div>

                    {selectedAssignees.length === 0 ? (
                      <p className="text-xs text-gray-500">
                        Add assignees above to split the cost between them.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {selectedAssignees.map((member) => (
                          <div
                            key={member.uid}
                            className="flex items-center gap-2"
                          >
                            <span className="text-sm text-gray-700 flex-1 truncate">
                              {member.username}
                            </span>
                            <input
                              type="number"
                              min="0"
                              max={
                                taskCostSplitType === 'direct'
                                  ? taskTotalCost ?? 0
                                  : 100
                              }
                              step="0.01"
                              value={taskAssigneeCosts[member.uid] ?? ''}
                              onChange={(e) =>
                                handleTaskAssigneeCostChange(
                                  member.uid,
                                  e.target.value
                                )
                              }
                              placeholder={
                                taskCostSplitType === 'direct' ? '$0.00' : '0%'
                              }
                              className="w-28 px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>
                        ))}
                        <p className="text-xs text-gray-500">
                          {taskCostSplitType === 'direct'
                            ? `Remaining: $${(
                                (taskTotalCost ?? 0) -
                                Object.values(taskAssigneeCosts).reduce(
                                  (sum: number, v) => sum + (v ?? 0),
                                  0
                                )
                              ).toFixed(2)}`
                            : `Remaining: ${(
                                100 -
                                Object.values(taskAssigneeCosts).reduce(
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
                  onClick={handleCancelCreateTask}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTask}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  Create Task
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const TripsList = () => {
    const filteredTrips = tripStatusFilter
      ? allTrips.filter(
          (trip) =>
            trip.status.toLowerCase() === tripStatusFilter.toLowerCase()
        )
      : allTrips;

    return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Trips</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Trip
          </button>
          {openTabs.length > 0 && (
            <button
              onClick={closeAllTabs}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Close All Tabs
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 w-full max-w-xs">
        <FilterDropdown
          options={['Upcoming', 'Ongoing', 'Completed']}
          placeholder="Filter by Trip Status"
          menuType="trip-status"
          onSelectionChange={setTripStatusFilter}
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading trips...</span>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTrips.map((trip) => (
            <div
              key={trip.id}
              onClick={() => openTripTab(trip)}
              className="relative bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-200 cursor-pointer"
            >
              {isTripAdmin(trip.id) && (
                <div className="absolute top-3 right-3 flex items-center gap-1">
                  {trip.status !== 'completed' && (
                    <button
                      onClick={(e) => handleCompleteTrip(trip.id, e)}
                      className="p-1.5 rounded-full text-white/70 hover:text-emerald-200 hover:bg-white/10 transition-colors duration-150"
                      title="Mark trip as complete"
                    >
                      <CheckSquare className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={(e) => handleEditClick(trip, e)}
                    className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors duration-150"
                    title="Edit trip"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteTrip(trip.id, e)}
                    className="p-1.5 rounded-full text-white/70 hover:text-red-200 hover:bg-white/10 transition-colors duration-150"
                    title="Delete trip"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex justify-between items-start mb-3 pr-24">
                <h3 className="text-lg font-semibold text-white truncate">
                  {trip.name}
                </h3>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColorOnDark(trip.status)}`}
                >
                  {trip.status}
                </span>
              </div>

              <p className="text-blue-100 mb-2">
                <svg
                  className="w-4 h-4 inline mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                    clipRule="evenodd"
                  />
                </svg>
                {trip.destination}
              </p>

              <p className="text-sm text-blue-200 mb-3">
                {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
              </p>

              {trip.description && (
                <p className="text-sm text-blue-100 line-clamp-2">
                  {trip.description}
                </p>
              )}

              {trip.participants && trip.participants.length > 0 && (
                <div className="mt-3 flex items-center">
                  <svg
                    className="w-4 h-4 text-blue-200 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                  </svg>
                  <span className="text-xs text-blue-200">
                    {trip.participants.length} participant
                    {trip.participants.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && filteredTrips.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No trips found
          </h3>
          <p className="text-gray-500">
            {allTrips.length === 0
              ? 'Start planning your first adventure!'
              : 'No trips match this status filter.'}
          </p>
        </div>
      )}
    </div>
    );
  };

  const TripDetails = ({ trip }: { trip: Trip }) => (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 via-indigo-700 to-purple-800 px-6 py-8 text-white">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold mb-2">{trip.name}</h1>
                <p className="text-blue-100 text-lg flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {trip.destination}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium bg-white text-gray-800`}
                >
                  {trip.status}
                </span>
                {isTripAdmin(trip.id) && (
                  <>
                    {trip.status !== 'completed' && (
                      <button
                        onClick={() => handleCompleteTrip(trip.id)}
                        className="p-2 rounded-full text-white hover:bg-white hover:text-emerald-600 transition-colors duration-150"
                        title="Mark trip as complete"
                      >
                        <CheckSquare className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleEditClick(trip)}
                      className="p-2 rounded-full text-white hover:bg-white hover:text-blue-600 transition-colors duration-150"
                      title="Edit trip"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTrip(trip.id)}
                      className="p-2 rounded-full text-white hover:bg-white hover:text-red-600 transition-colors duration-150"
                      title="Delete trip"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-white mb-3">
                  Trip Details
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-blue-200">Start Date:</span>
                    <span className="font-medium text-white">
                      {formatDate(trip.startDate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-200">End Date:</span>
                    <span className="font-medium text-white">
                      {formatDate(trip.endDate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-200">Duration:</span>
                    <span className="font-medium text-white">
                      {Math.ceil(
                        (new Date(trip.endDate).getTime() -
                          new Date(trip.startDate).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )}{' '}
                      days
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">
                    Participants
                  </h3>
                  {isTripAdmin(trip.id) && (
                    <button
                      onClick={() => handleOpenAddMember(trip)}
                      className="text-sm text-blue-100 hover:text-white font-medium"
                    >
                      + Add Member
                    </button>
                  )}
                </div>
                {(tripCardMembers.get(trip.id) ?? []).length > 0 && (
                  <div className="space-y-2">
                    {(tripCardMembers.get(trip.id) ?? []).map((member) => {
                      const isSelf = member.uid === user?.uid;
                      const canRemove = isSelf || isTripAdmin(trip.id);
                      return (
                        <div
                          key={member.uid}
                          className="flex items-center justify-between group"
                        >
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-white/15 rounded-full flex items-center justify-center mr-3">
                              <span className="text-white text-sm font-medium">
                                {member.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-white">
                                {member.username}
                                {isSelf && (
                                  <span className="text-blue-200"> (You)</span>
                                )}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  member.role === 'admin'
                                    ? 'bg-purple-400/20 text-purple-100'
                                    : 'bg-white/15 text-blue-100'
                                }`}
                              >
                                {member.role === 'admin'
                                  ? 'Admin'
                                  : 'Participant'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            {isTripAdmin(trip.id) &&
                              (member.role !== 'admin' || isSelf) && (
                              <button
                                onClick={() =>
                                  handleToggleMemberRole(trip, member)
                                }
                                className="text-xs text-blue-100 hover:text-white font-medium px-2 py-1 whitespace-nowrap"
                                title={
                                  member.role === 'admin'
                                    ? 'Revert to participant'
                                    : 'Make admin'
                                }
                              >
                                {member.role === 'admin'
                                  ? 'Remove Admin'
                                  : 'Make Admin'}
                              </button>
                            )}
                            {canRemove && (
                              <button
                                onClick={() =>
                                  handleRemoveMember(trip, member.uid)
                                }
                                className="text-white/50 hover:text-red-200 transition-colors duration-200 p-1"
                                title={isSelf ? 'Leave trip' : 'Remove from trip'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {trip.description && (
              <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 rounded-xl p-4 mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">
                  Description
                </h3>
                <p className="text-blue-100 leading-relaxed">
                  {trip.description}
                </p>
              </div>
            )}

            {trip.itineraryEnabled &&
              trip.itinerary &&
              trip.itinerary.length > 0 && (
                <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 rounded-xl p-4 mb-6">
                  <h3 className="text-lg font-semibold text-white mb-3">
                    Itinerary
                  </h3>
                  <div>
                    {trip.itinerary.map((stop, index) => (
                      <div key={index} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-[11px] font-semibold text-white">
                            {index + 1}
                          </span>
                          {index < trip.itinerary!.length - 1 && (
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
                </div>
              )}

            {(() => {
              const costByUser = new Map<string, number>();
              tripTasks.forEach((t) => {
                (t.costBreakdown ?? []).forEach((entry) => {
                  costByUser.set(
                    entry.uid,
                    (costByUser.get(entry.uid) ?? 0) + entry.amount
                  );
                });
              });
              // Total cost is the sum of what everyone actually owes, not
              // each task's (independently editable) total-cost field -
              // those two numbers can diverge if a task's split doesn't
              // fully allocate its total.
              const totalCost = Array.from(costByUser.values()).reduce(
                (sum, amount) => sum + amount,
                0
              );
              const budget = trip.budget;
              const hasCostData = totalCost > 0 || costByUser.size > 0;
              if (!hasCostData && budget == null) return null;

              let budgetStatus: { label: string; className: string } | null =
                null;
              if (budget != null) {
                const diff = totalCost - budget;
                if (Math.abs(diff) < 0.005) {
                  budgetStatus = {
                    label: 'At Limit',
                    className: 'bg-yellow-400/20 text-yellow-100',
                  };
                } else if (diff > 0) {
                  budgetStatus = {
                    label: 'Over Budget',
                    className: 'bg-red-400/20 text-red-100',
                  };
                } else {
                  budgetStatus = {
                    label: 'Under Budget',
                    className: 'bg-green-400/20 text-green-100',
                  };
                }
              }

              return (
                <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 rounded-xl p-4 mb-6">
                  <h3 className="text-lg font-semibold text-white mb-3">
                    Cost Summary
                  </h3>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-blue-200">Total Cost:</span>
                      <span className="font-medium text-white">
                        ${totalCost.toFixed(2)}
                      </span>
                    </div>
                    {budget != null && (
                      <div className="flex justify-between items-center">
                        <span className="text-blue-200">Budget:</span>
                        <div className="flex items-center gap-2">
                          {budgetStatus && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${budgetStatus.className}`}
                            >
                              {budgetStatus.label}
                            </span>
                          )}
                          <span className="font-medium text-white">
                            ${budget.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  {costByUser.size > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-blue-100 mb-2">
                        Cost per Person
                      </h4>
                      <div className="space-y-1">
                        {Array.from(costByUser.entries()).map(
                          ([uid, amount]) => (
                            <div
                              key={uid}
                              className="flex justify-between text-sm"
                            >
                              <span className="text-blue-200">
                                {tripMembersMap.get(uid) ?? uid}
                              </span>
                              <span className="font-medium text-white">
                                ${amount.toFixed(2)}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="mt-8 bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Tasks</h3>
                {isTripAdmin(trip.id) && (
                  <button
                    onClick={() => handleOpenCreateTask(trip)}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-700 to-purple-800 text-white rounded-lg hover:opacity-90 transition-opacity duration-200 whitespace-nowrap"
                  >
                    Create Task
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr,2fr] gap-4">
                <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-white mb-3 text-center">
                    Filter
                  </h4>
                  <div className="space-y-3">
                    <FilterDropdown
                      options={['0', '1', '2']}
                      placeholder="Filter by Status"
                      menuType="status"
                      onSelectionChange={setTaskStatusFilter}
                    />
                    <MultiSelectDropdown
                      options={tripMembersMap}
                      selectedOptions={taskPeopleFilter}
                      placeholder="Filter by People"
                      menuType="people"
                      onSelectionChange={setTaskPeopleFilter}
                    />
                  </div>
                </div>

                <div>
                  {tripTasksLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                    </div>
                  ) : tripTasks.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No tasks for this trip yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
                      {tripTasks.map((task, index) => {
                        const canEditTask =
                          isTripAdmin(trip.id) ||
                          (!!user && (task.assigneeUids ?? []).includes(user.uid));
                        return (
                          <Card
                            key={index}
                            taskTitle={task.taskTitle}
                            description={task.taskDescription}
                            status={task.taskStatus}
                            deadline={task.taskDeadline}
                            onCardClick={
                              canEditTask ? () => setEditingTask(task) : undefined
                            }
                            onComplete={
                              canEditTask
                                ? () => handleCompleteTripTask(task)
                                : undefined
                            }
                            onDelete={
                              isTripAdmin(trip.id)
                                ? () => handleDeleteTripTask(task)
                                : undefined
                            }
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const activeTrip = openTabs.find((trip) => trip.id === activeTabId);

  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(135deg, #fffbeb, #ffe4c7)' }}
    >
      <NavBar />
      {successMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-100 border border-green-400 text-green-800 px-4 py-3 rounded-lg shadow-md">
          {successMessage}
        </div>
      )}
      {CreateTripModal()}
      {EditTripModal()}
      {CreateTaskModal()}
      {AddMemberModal()}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSaved={(updated) =>
            updateTripTaskInState(updated.taskId, updated)
          }
        />
      )}
      <main className="p-4 lg:p-8">
        {openTabs.length > 0 && (
          <div className="flex items-end px-2 space-x-1 overflow-x-auto">
            <button
              onClick={() => setActiveTabId(null)}
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-t-lg border-2 border-b-0 transition-colors duration-150 ${
                activeTabId === null
                  ? 'text-blue-600 border-gray-300 bg-white shadow-sm'
                  : 'text-gray-600 border-gray-200 bg-gray-50 hover:bg-gray-100'
              }`}
            >
              All Trips
            </button>

            {openTabs.map((trip) => (
              <button
                key={trip.id}
                onClick={() => setActiveTabId(trip.id)}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-t-lg border-2 border-b-0 transition-colors duration-150 group ${
                  activeTabId === trip.id
                    ? 'text-blue-600 border-gray-300 bg-white shadow-sm'
                    : 'text-gray-600 border-gray-200 bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <span className="truncate max-w-32">{trip.name}</span>
                <button
                  onClick={(e) => closeTab(trip.id, e)}
                  className="ml-2 p-1 rounded-full hover:bg-gray-200 transition-colors duration-150"
                >
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </button>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-6 overflow-visible border-2 border-gray-300">
          {activeTabId === null ? (
            TripsList()
          ) : activeTrip ? (
            TripDetails({ trip: activeTrip })
          ) : (
            <div className="p-6 text-center">
              <p className="text-gray-600">Trip not found</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TripPortal;
