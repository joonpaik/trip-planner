import React from 'react';
import logo from '../assets/logo.svg';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import './App.css';
import { BrowserRouter } from 'react-router-dom';
import NavBar from './components/Navbar';
import AppRoutes from './AppRoutes';

function App() {
  return (
    <BrowserRouter>
      <div
        className="min-h-screen"
        style={{
          background: 'linear-gradient(#A7E3E0, #14f2e7ff)',
        }}
      >
        <NavBar />
        <AppRoutes />
      </div>
    </BrowserRouter>
  );
}

export default App;

// alert('App.tsx is loading!');
//   return (
//     <div className="App">
//       <header className="App-header">
//         <img src={logo} className="App-logo" alt="logo" />
//         <p>
//           Edit <code>src/App.tsx</code> and save to reload.
//         </p>
//         <a
//           className="App-link"
//           href="https://reactjs.org"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           Learn React
//         </a>
//       </header>
//     </div>
//   );
