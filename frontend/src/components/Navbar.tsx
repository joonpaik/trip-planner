import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../index.css';
import { useAuth } from '../hooks/useAuth';

const NavBar: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="bg-gradient-to-r from-blue-600 via-indigo-700 to-purple-800 shadow-md">
      <div className="mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="text-2xl font-bold text-white">
            <a href="/">TripPlannerPlus</a>
          </div>

          <div className="flex items-center gap-8">
            <a
              href="/mytrips"
              className="text-white/90 hover:text-white transition-colors"
            >
              My Trips
            </a>
            <a
              href="/calendar"
              className="text-white/90 hover:text-white transition-colors"
            >
              Calendar
            </a>
            <a
              href="/expenses"
              className="text-white/90 hover:text-white transition-colors"
            >
              Expenses
            </a>
            <a
              href="/todo"
              className="text-white/90 hover:text-white transition-colors"
            >
              ToDo
            </a>
            <a
              href="/add-friend"
              className="text-white/90 hover:text-white transition-colors"
            >
              Add Friend
            </a>
            <button
              onClick={handleLogout}
              className="px-4 py-1.5 rounded-lg bg-white/20 text-white/90 hover:bg-white/30 hover:text-white transition-colors"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
