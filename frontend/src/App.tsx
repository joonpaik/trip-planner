import React from 'react';
import logo from '../assets/logo.svg';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import './App.css';
import { BrowserRouter } from 'react-router-dom';
import NavBar from './components/Navbar';
import AppRoutes from './AppRoutes';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './context/authContext';
import { LoginForm } from './pages/Login';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public login page */}
          <Route path="/login" element={<LoginForm />} />

          {/* Protected home page */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />

          {/* Other protected routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppRoutes />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

{
  /* <ProtectedRoute>
        <BrowserRouter>
          <Route path="/home" element={<Home />} />

          <div
            className="min-h-screen"
            style={{ background: 'linear-gradient(#A7E3E0, #14f2e7ff)' }}
          >
            <NavBar />
            <AppRoutes />
          </div>
        </BrowserRouter>
      </ProtectedRoute> */
}

//  <AuthProvider>
//       <BrowserRouter>
//         <div
//           className="min-h-screen"
//           style={{ background: 'linear-gradient(#A7E3E0, #14f2e7ff)' }}
//         >
//           <Routes>
//             <Route path="/login" element={<LoginForm />} />
//             <Route
//               path="/"
//               element={
//                 <ProtectedRoute>
//                   <NavBar />
//                   <Home />
//                 </ProtectedRoute>
//               }
//             />
//             {/* Add more routes here later */}
//             <Route path="/*" element={<AppRoutes />} />
//           </Routes>
//         </div>
//       </BrowserRouter>
//     </AuthProvider>
