import { Routes, Route } from 'react-router-dom';

import Home from './components/Home';
import Contact from './components/Contact';
import About from './components/About';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
    </Routes>
  );
};

export default AppRoutes;
