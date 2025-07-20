import { Navbar } from '@/components';
import { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router';
import { ThemeProvider } from '@/lib/theme';
import { initializeTools } from '@/lib/tools';
import AppRoutes from './routes';

function App() {
  const [user] = useState({ name: 'Marsch Huynh' });

  // Initialize tools on app startup
  useEffect(() => {
    initializeTools();
  }, []);

  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="h-screen flex flex-col bg-background">
          <Navbar userName={user.name} />
          <AppRoutes />
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
