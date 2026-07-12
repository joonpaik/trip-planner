import React, { useState } from 'react';
import '../index.css';
import NavBar from '../components/Navbar';
import { userService } from '../services/userService';
import { useAuth } from '../hooks/useAuth';

const AddFriend: React.FC = () => {
  const { user } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async () => {
    if (!identifier.trim()) {
      setError('Please enter a username or email');
      setSuccess('');
      return;
    }
    if (!user) {
      setError('You must be logged in to add friends');
      setSuccess('');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await userService.addFriend({
        uid: user.uid,
        identifier: identifier.trim(),
      });
      setSuccess(response.message);
      setIdentifier('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add friend');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(135deg, #fffbeb, #ffe4c7)' }}
    >
      <NavBar />
      <main className="p-4 lg:p-8">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
            Add a Friend
          </h1>
          <p className="text-sm text-gray-600 mb-6 text-center">
            Enter a username or email. If they're already on TripPlanner,
            we'll send them a follow request. Otherwise, we'll invite them to
            join.
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm px-4 py-2 text-center">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-lg bg-green-100 border border-green-300 text-green-700 text-sm px-4 py-2 text-center">
              {success}
            </div>
          )}

          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            placeholder="username or email"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          />

          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </main>
    </div>
  );
};

export default AddFriend;
