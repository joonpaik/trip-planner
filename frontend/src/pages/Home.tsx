import React, { useState, useEffect } from 'react';
import '../index.css';
import Card from '../components/Card';
import NavBar from '../components/Navbar';
import AnimationWrapper from '../components/AnimationWrapper';
import { routeService } from '../services/routeService';
import { tripService } from '../services/tripService';
import { useAuth } from '../hooks/useAuth';
import { FilterDropdown } from '../components/FilterDropdown';
import {
  FetchFilteredTasksRequest,
  FetchFilteredTasksResponse,
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

const Home: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [taskSize, setTaskSize] = useState<number>(0);
  const [userTasks, setUserTasks] = useState<UserTaskCard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Task Filter States
  const [tripFilter, setTripFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [peopleFilter, setPeopleFilter] = useState<string | null>(null);
  const [dueDateFilter, setDueDateFilter] = useState<string | null>(null);

  // Categories for Trip Filter Dropdown
  const [tripFilterCategories, setTripFilterCategories] = useState<
    string[] | null
  >(null);
  const sampleCategories = ['Trip to Japan', 'Trip to Korea', 'Trip to USA'];

  // scrolling logic for dropdowns
  let shouldFilteredTacksScroll = false;

  // Auth Context
  const { user } = useAuth();

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
  const handleFilterSelection = (title: string | null) => {
    setTripFilter(title);
    console.log('Selected Title Filter:', title);
  };
  useEffect(() => {
    const fetchAndFormatData = async () => {
      try {
        setLoading(true);
        setError('');

        // Fetched Filtered Task API Call
        const defaultRequest: FetchFilteredTasksRequest = {
          tripFilter: tripFilter,
          peopleFilter: [],
          dueDateFilter: null,
          statusFilter: null,
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

        // Pull Trip Filter Cateogries
        const tripFilterCategoriesSet = new Set<string>();
        formattedData.forEach((task) => {
          if (task.tripTitle) {
            tripFilterCategoriesSet.add(task.tripTitle);
          }
        });
        console.log('Trip Filter Categories:', tripFilterCategoriesSet);
        const tempTripFilterCategories: string[] = [];
        tripFilterCategoriesSet.forEach((category) => {
          tempTripFilterCategories.push(category);
        });
        setTripFilterCategories(tempTripFilterCategories);
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
  }, [tripFilter]);

  return (
    <div
      className="min-h-screen items-center p-4"
      style={{ background: 'linear-gradient(#A7E3E0, #14f2e7ff)' }}
    >
      <NavBar />
      <main className="p-4 lg:p-8 space-y-8 border-4 border-black rounded-xl">
        {/* Upcoming Trip Hero Section bg-white rounded-xl shadow-lg */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 rounded-3xl shadow-xl overflow-hidden border-4 border-black">
          <div className="relative p-6 lg:p-8">
            <div className="relative z-10">
              <div className="flex items-center space-x-2 mb-4 justify-between">
                <div className="flex space-x-2">
                  <div className="px-3 py-1 bg-white bg-opacity-20 rounded-full">
                    <span className="text-white text-sm font-medium">
                      Next Trip
                    </span>
                  </div>
                  <div className="px-3 py-1 bg-green-500 bg-opacity-90 rounded-full">
                    <span className="text-white text-xs font-semibold">
                      5 DAYS LEFT
                    </span>
                  </div>
                </div>

                <div className="px-3 py-1 bg-white bg-opacity-20 rounded-full">
                  <span className="text-white text-sm font-medium flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>2h 30m</span>
                  </span>
                </div>
              </div>

              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                Upcoming Trip Here
              </h2>
              <p className="text-blue-100 text-lg mb-6">Date Range</p>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Plane className="w-5 h-5 text-blue-200" />
                    <span className="text-blue-100 text-sm">Flight Info</span>
                  </div>
                  <p className="text-white font-semibold">link to flight</p>
                  <p className="text-blue-200 text-sm">summary</p>
                </div>

                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <MapPin className="w-5 h-5 text-blue-200" />
                    <span className="text-blue-100 text-sm">
                      Accomdation Info
                    </span>
                  </div>
                  <p className="text-white font-semibold">
                    link to accomdation
                  </p>
                  <p className="text-blue-200 text-sm">address maybe?</p>
                </div>

                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <DollarSign className="w-5 h-5 text-blue-200" />
                    <span className="text-blue-100 text-sm">Budget Info</span>
                  </div>
                  <p className="text-white font-semibold">$3,200</p>
                  <p className="text-blue-200 text-sm">yay</p>
                </div>

                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <DollarSign className="w-5 h-5 text-blue-200" />
                    <span className="text-blue-100 text-sm">
                      Outstanding Tasks
                    </span>
                  </div>
                  <p className="text-white font-semibold">how many remaining</p>
                  <p className="text-blue-200 text-sm">yay</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button className="bg-white text-blue-700 px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-all duration-200 flex items-center space-x-2">
                  <span>View Itinerary</span>
                </button>
                <button className="bg-white bg-opacity-20 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-semibold hover:bg-opacity-30 transition-all duration-200 flex items-center space-x-2">
                  <CheckSquare className="w-4 h-4" />
                  <span>Checklist</span>
                </button>
                <button className="bg-white bg-opacity-20 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-semibold hover:bg-opacity-30 transition-all duration-200 flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>Add to Calendar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg  p-6 overflow-hidden">
          <h1 className="font-bold text-center">Tasks Remaining</h1>
          <br />
          <br />
          <div className="grid grid-cols-1 md:grid-cols-[1fr,2fr] gap-4 mb-6">
            <div>
              <div className="bg-white rounded-xl shadow-lg text-center h-full justify-center border-4 border-black">
                <div className="justify-center">
                  <h1 className="text-lg font-bold text-center"> Filter</h1>
                </div>
                <div className="p-4 text-left">
                  <FilterDropdown
                    options={
                      tripFilterCategories
                        ? Array.from(tripFilterCategories)
                        : []
                    }
                    placeholder="Filter by Trip"
                    menuType="title"
                    onSelectionChange={handleFilterSelection}
                  />
                </div>
                <div className="p-4 text-left">
                  <FilterDropdown
                    options={sampleCategories}
                    placeholder="Filter by Due Date"
                    menuType="dueDate"
                    onSelectionChange={handleFilterSelection}
                  />
                </div>
                <div className="p-4 text-left">
                  <FilterDropdown
                    options={sampleCategories}
                    placeholder="Filter by Status"
                    menuType="status"
                    onSelectionChange={handleFilterSelection}
                  />
                </div>
                <div className="p-4 text-left">
                  <FilterDropdown
                    options={sampleCategories}
                    placeholder="Filter by People"
                    menuType="title"
                    onSelectionChange={handleFilterSelection}
                  />
                </div>
              </div>
            </div>
            <div className="max-h-1/2 overflow-y-auto gap-4 p-4 border-4 border-black">
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
      </main>
    </div>
  );
};

export default Home;

//  <div
//       className="min-h-screen items-center p-4"
//       style={{ background: 'linear-gradient(#A7E3E0, #14f2e7ff)' }}
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
