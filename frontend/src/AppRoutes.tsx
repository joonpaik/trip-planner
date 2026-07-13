import { Routes, Route } from 'react-router-dom';

import Home from './pages/Home';
import Contact from './components/Contact';
import About from './components/About';
import TripPortal from './pages/TripPortal';
import Calendar from './pages/Calendar';
import AddFriend from './pages/AddFriend';
import Expenses from './pages/Expenses';
import ToDo from './pages/ToDo';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/mytrips" element={<TripPortal />} />
      <Route path="/calendar" element={<Calendar />} />
      <Route path="/add-friend" element={<AddFriend />} />
      <Route path="/expenses" element={<Expenses />} />
      <Route path="/todo" element={<ToDo />} />
      {/* Add more routes here later */}
    </Routes>
  );
};

export default AppRoutes;
