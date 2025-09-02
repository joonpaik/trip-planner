import React, { useState, useEffect } from 'react';
import '../index.css';

const NavBar: React.FC = () => {
  return (
    <nav className="bg-white/10 backdrop-blur-md">
      <div className="mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="text-2xl font-bold text-white">
            <a href="/">YourBrand</a>
          </div>

          <div className="flex gap-8">
            <a
              href="/"
              className="text-white/90 hover:text-white transition-colors"
            >
              My Trips
            </a>
            <a
              href="/about"
              className="text-white/90 hover:text-white transition-colors"
            >
              Calendar
            </a>
            <a
              href="/contact"
              className="text-white/90 hover:text-white transition-colors"
            >
              Expenses
            </a>
            <a
              href="/contact"
              className="text-white/90 hover:text-white transition-colors"
            >
              Todo
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
