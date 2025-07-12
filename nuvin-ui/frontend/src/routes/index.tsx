import { Routes, Route } from 'react-router';
import Dashboard from '../screens/Dashboard';
import Settings from '../screens/Settings';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
}
