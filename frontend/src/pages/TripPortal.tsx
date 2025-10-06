import React, { useState, useEffect, useRef } from 'react';
import '../index.css';
import Card from '../components/Card';
import NavBar from '../components/Navbar';
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
}

interface TripPortalProps {
  // You would typically get these from your API/service
  trips?: Trip[];
  onLoadTrips?: () => Promise<Trip[]>;
}

// Mock data for demonstration
const mockTrips: Trip[] = [
  {
    id: '1',
    name: 'Summer Vacation',
    destination: 'Hawaii',
    startDate: '2024-07-15',
    endDate: '2024-07-22',
    status: 'completed',
    description: 'A relaxing beach vacation with the family.',
    participants: ['John', 'Jane', 'Kids'],
  },
  {
    id: '2',
    name: 'Business Conference',
    destination: 'New York',
    startDate: '2024-08-10',
    endDate: '2024-08-12',
    status: 'completed',
    description: 'Annual tech conference and networking.',
    participants: ['John', 'Sarah'],
  },
  {
    id: '3',
    name: 'Weekend Getaway',
    destination: 'Mountains',
    startDate: '2024-09-01',
    endDate: '2024-09-03',
    status: 'completed',
    description: 'Hiking and camping trip.',
    participants: ['John', 'Mike', 'Alex'],
  },
];

const TripPortal: React.FC<TripPortalProps> = ({
  trips = mockTrips,
  onLoadTrips,
}) => {
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [openTabs, setOpenTabs] = useState<Trip[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTrip, setNewTrip] = useState<Partial<Trip>>({
    name: '',
    destination: '',
    startDate: '',
    endDate: '',
    description: '',
    participants: [],
  });

  useEffect(() => {
    const loadTrips = async () => {
      setLoading(true);
      try {
        if (onLoadTrips) {
          const loadedTrips = await onLoadTrips();
          setAllTrips(loadedTrips);
        } else {
          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 1000));
          setAllTrips(trips);
        }
      } catch (error) {
        console.error('Error loading trips:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTrips();
  }, [trips, onLoadTrips]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'ongoing':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const openTripTab = (trip: Trip) => {
    // Check if tab is already open
    if (!openTabs.find((tab) => tab.id === trip.id)) {
      setOpenTabs((prev) => [...prev, trip]);
    }
    setActiveTabId(trip.id);
  };

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

  const handleCreateTrip = () => {
    if (!newTrip.name || !newTrip.startDate || !newTrip.endDate) {
      alert('Please fill in all required fields.');
      return;
    }

    const tripToAdd: Trip = {
      id: (Math.random() * 100000).toFixed(0),
      name: newTrip.name!,
      destination: newTrip.destination || '',
      startDate: newTrip.startDate!,
      endDate: newTrip.endDate!,
      status: 'upcoming',
      description: newTrip.description || '',
      participants: newTrip.participants || [],
    };

    setAllTrips((prev) => [...prev, tripToAdd]);
    setNewTrip({
      name: '',
      destination: '',
      startDate: '',
      endDate: '',
      description: '',
      participants: [],
    });
    setShowCreateModal(false);
    openTripTab(tripToAdd);
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
    });
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
                <input
                  type="text"
                  value={newTrip.destination}
                  onChange={(e) =>
                    setNewTrip({ ...newTrip, destination: e.target.value })
                  }
                  placeholder="e.g., Paris, France"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

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

  const TripsList = () => (
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

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading trips...</span>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {allTrips.map((trip) => (
            <div
              key={trip.id}
              onClick={() => openTripTab(trip)}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200 cursor-pointer"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {trip.name}
                </h3>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(trip.status)}`}
                >
                  {trip.status}
                </span>
              </div>

              <p className="text-gray-600 mb-2">
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

              <p className="text-sm text-gray-500 mb-3">
                {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
              </p>

              {trip.description && (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {trip.description}
                </p>
              )}

              {trip.participants && trip.participants.length > 0 && (
                <div className="mt-3 flex items-center">
                  <svg
                    className="w-4 h-4 text-gray-400 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                  </svg>
                  <span className="text-xs text-gray-500">
                    {trip.participants.length} participant
                    {trip.participants.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && allTrips.length === 0 && (
        <div className="text-center py-12">
          <svg
            className="w-16 h-16 text-gray-300 mx-auto mb-4"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm8 0a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1V8z"
              clipRule="evenodd"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No trips found
          </h3>
          <p className="text-gray-500">Start planning your first adventure!</p>
        </div>
      )}
    </div>
  );

  const TripDetails = ({ trip }: { trip: Trip }) => (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-8 text-white">
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
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium bg-white text-gray-800`}
              >
                {trip.status}
              </span>
            </div>
          </div>

          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Trip Details
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Start Date:</span>
                    <span className="font-medium">
                      {formatDate(trip.startDate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">End Date:</span>
                    <span className="font-medium">
                      {formatDate(trip.endDate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">
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

              {trip.participants && trip.participants.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Participants
                  </h3>
                  <div className="space-y-2">
                    {trip.participants.map((participant, index) => (
                      <div key={index} className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-blue-600 text-sm font-medium">
                            {participant.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-gray-700">{participant}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {trip.description && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Description
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {trip.description}
                </p>
              </div>
            )}

            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-600 text-center">
                Additional trip details, itinerary, photos, and documents would
                go here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const activeTrip = openTabs.find((trip) => trip.id === activeTabId);

  return (
    <div
      className="min-h-screen items-center p-4"
      style={{ background: 'linear-gradient(#A7E3E0, #14f2e7ff)' }}
    >
      <NavBar />
      <CreateTripModal />
      <main className="p-4 lg:p-8 border-4 border-black rounded-xl">
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
            <TripsList />
          ) : activeTrip ? (
            <TripDetails trip={activeTrip} />
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
