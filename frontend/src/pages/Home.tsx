import React, { useState, useEffect } from 'react';
import '../index.css';
import Card from '../components/Card';
import NavBar from '../components/Navbar';
import AnimationWrapper from '../components/AnimationWrapper';
import { routeService } from '../services/routeService';
import { useAuth } from '../hooks/useAuth';
interface TableData {
  [key: string]: any;
}

interface UserTaskCard {
  title: string;
  description: string;
  status: number;
  due_date: string;
}

const Home: React.FC = () => {
  const [userTasks, setUserTasks] = useState<UserTaskCard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchAndFormatData = async () => {
      try {
        setLoading(true);
        setError('');

        // Call your API
        const rawData: TableData[] =
          (await routeService.getUserTasks()) as unknown as TableData[];

        // Format the data for your Card components
        const formattedData: UserTaskCard[] = rawData.map((item, index) => ({
          id: item.id || index.toString(),
          title: item.name || item.title || 'Default Title',
          description: item.description || 'No description available',
          status: item.status || 0,
          due_date: item.due_date || 'No due date',
        }));

        setUserTasks(formattedData);
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
  }, []);

  return (
    <div
      className="min-h-screen items-center p-4"
      style={{ background: 'linear-gradient(#A7E3E0, #14f2e7ff)' }}
    >
      <NavBar />

      <h1 className="font-bold text-center">Welcome, {user?.username}</h1>

      <div className="grid border-4 border-black m-4 p-4 rounded-xl grid-cols-[1fr,3fr,1fr] gap-4">
        <div className="bg-white rounded-xl shadow-lg text-center">
          <h1 className="font-bold text-center">My Trips</h1>
          <h1 className="font-bold text-center">Calendar</h1>
          <h1 className="font-bold text-center">Expenses</h1>
          <h1 className="font-bold text-center">Todo</h1>
        </div>
        <div className="bg-white rounded-xl shadow-lg text-center"> main</div>
        <div className="bg-white rounded-xl shadow-lg text-center"> main</div>

        {/* <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-4 p-4 w-1/2 border-4 border-black">
          {userTasks
            .filter((item, index) => index < 3)
            .map((card, index) => (
              <AnimationWrapper key={index} delay={(index + 3) * 150}>
                <Card
                  title={card.title}
                  description={card.description}
                  bgColor="bg-white"
                />
              </AnimationWrapper>
            ))}
        </div> */}
      </div>
    </div>
  );
};

export default Home;
