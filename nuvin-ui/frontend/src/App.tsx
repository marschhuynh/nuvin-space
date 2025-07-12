import { Navbar } from '@/components';
import { useState } from 'react';
import { BrowserRouter } from 'react-router';
import AppRoutes from './routes';

function App() {
  const [user] = useState({ name: 'Marsch Huynh' });

  return (
    <BrowserRouter>
      <div className="h-screen flex flex-col bg-background">
        <Navbar userName={user.name} />
        <AppRoutes />
      </div>
    </BrowserRouter>
  );
}

export default App;
