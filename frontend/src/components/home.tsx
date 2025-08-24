import React, { useState, useEffect } from 'react';
import '../index.css';
import Card from './Card';
import AnimationWrapper from './AnimationWrapper';
import { databaseService } from '../services/databaseService';

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
  const userTaskCards: UserTaskCard[] = [];
  const [userTasks, setUserTasks] = useState<UserTaskCard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAndFormatData = async () => {
      try {
        setLoading(true);
        setError('');

        // Call your API
        const rawData: TableData[] =
          (await databaseService.getUserTasks()) as unknown as TableData[];

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

  const sampleCardData = [
    {
      title: 'Card 1',
      description: 'This is the description for Card 1',
      icon: '📦',
      bgColor: 'bg-white',
    },
    {
      title: 'Card 2',
      description: 'This is the description for Card 2',
      icon: '🔒',
      bgColor: 'bg-gray-100',
    },
    {
      title: 'Card 3',
      description: 'This is the description for Card 3',
      icon: '⚙️',
      bgColor: 'bg-white',
    },
    {
      title: 'Card 4',
      description: 'This is the description for Card 4',
      icon: '🔧',
      bgColor: 'bg-white',
    },
  ];
  return (
    <div className="min-h-screen">
      <h1 className="font-bold text-center">Home Page</h1>
      <div className="grid place-items-center">
        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-4 p-4 w-1/2 border-4 border-black">
          {sampleCardData
            .filter((item, index) => index < 3)
            .map((card, index) => (
              <AnimationWrapper key={index} delay={index * 150}>
                <Card
                  title={card.title}
                  description={card.description}
                  icon={card.icon}
                  bgColor={card.bgColor}
                />
              </AnimationWrapper>
            ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
