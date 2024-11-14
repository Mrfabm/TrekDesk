import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Home from './pages/Home';
import CreateBooking from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import Settings from './pages/Settings';
import Bookings from './pages/Bookings';
import Layout from './components/Layout';
import FinanceDashboard from './pages/FinanceDashboard';
import PaymentValidation from './pages/PaymentValidation';

function App() {
  const PrivateRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    return token ? children : <Navigate to="/login" />;
  };

  const FinanceRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    return token && role === 'finance_admin' ? children : <Navigate to="/login" />;
  };

  const HomeRedirect = () => {
    const role = localStorage.getItem('role');
    if (role === 'finance_admin') {
      return <Navigate to="/finance" />;
    }
    return <Home />;
  };

  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Finance Admin Routes */}
          <Route path="/finance" element={
            <FinanceRoute>
              <Layout>
                <FinanceDashboard />
              </Layout>
            </FinanceRoute>
          } />
          <Route path="/finance/validate/:bookingId" element={
            <FinanceRoute>
              <Layout>
                <PaymentValidation />
              </Layout>
            </FinanceRoute>
          } />

          {/* Other Routes */}
          <Route path="/" element={
            <PrivateRoute>
              <Layout>
                <HomeRedirect />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/home" element={
            <PrivateRoute>
              <Layout>
                <Home />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/create-booking" element={
            <PrivateRoute>
              <Layout>
                {localStorage.getItem('role') === 'finance_admin' ? 
                  <Navigate to="/finance" /> : 
                  <CreateBooking />
                }
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/users" element={
            <PrivateRoute>
              <Layout>
                <UserManagement />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/settings" element={
            <PrivateRoute>
              <Layout>
                <Settings />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/bookings" element={
            <PrivateRoute>
              <Layout>
                <Bookings />
              </Layout>
            </PrivateRoute>
          } />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App; 