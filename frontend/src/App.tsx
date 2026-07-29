import { RouterProvider } from 'react-router-dom';
import { router } from './config/routes';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SchoolProvider } from './context/SchoolContext';
import './index.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SchoolProvider>
          <RouterProvider router={router} />
        </SchoolProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
