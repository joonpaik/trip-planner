import { Routes, Route } from 'react-router-dom';

import Home from './pages/Home';
import Contact from './components/Contact';
import About from './components/About';
import TripPortal from './pages/TripPortal';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/mytrips" element={<TripPortal />} />
      {/* Add more routes here later */}
    </Routes>
  );
};

export default AppRoutes;
