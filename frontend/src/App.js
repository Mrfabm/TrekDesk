import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Home3 from './pages/Home3';
import CreateBooking from './pages/CreateBooking';
import UserManagement from './pages/UserManagement';
import Settings from './pages/Settings';
import Bookings from './pages/Bookings';
import Layout from './components/Layout';
import FinanceDashboard from './pages/FinanceDashboard';
import PaymentValidation from './pages/PaymentValidation';
import AvailableSlots from './pages/AvailableSlots';
import SuperuserHome from './pages/SuperuserHome';
import GoldenMonkeySlots from './pages/GoldenMonkeySlots';
import PassportManagement from './pages/PassportManagement';
import AdvancedTracking from './pages/AdvancedTracking';
import VoucherManagement from './pages/VoucherManagement';
import BookingClientDetails from './pages/BookingClientDetails';
import AuthorizerDashboard from './pages/AuthorizerDashboard';
import AgentManagement from './pages/AgentManagement';
import FinanceAR from './pages/FinanceAR';
import ViewBookings1 from './pages/ViewBookings1';
import ViewBookings2 from './pages/ViewBookings2';
import ViewBookings3 from './pages/ViewBookings3';

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

  const AuthorizerRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    return token && ['authorizer', 'superuser'].includes(role) ? children : <Navigate to="/login" />;
  };

  const HomeRedirect = () => {
    const role = localStorage.getItem('role');
    if (role === 'superuser') return <SuperuserHome />;
    if (role === 'finance_admin') return <Navigate to="/finance" />;
    if (role === 'authorizer') return <Navigate to="/authorizer" />;
    return <Home3 />;
  };

  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
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
                <Home3 />
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
          <Route path="/bookings/:bookingId/client" element={
            <PrivateRoute>
              <Layout>
                <BookingClientDetails />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/available-slots" element={
            <PrivateRoute>
              <Layout>
                <AvailableSlots />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/golden-monkey-slots" element={
            <PrivateRoute>
              <Layout>
                <GoldenMonkeySlots />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/passport-management" element={
            <PrivateRoute>
              <Layout>
                <PassportManagement />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/tracking" element={<AdvancedTracking />} />
          <Route path="/voucher-management" element={<PrivateRoute><Layout><VoucherManagement /></Layout></PrivateRoute>} />
          <Route path="/view-bookings1" element={<PrivateRoute><Layout><ViewBookings1 /></Layout></PrivateRoute>} />
          <Route path="/view-bookings2" element={<PrivateRoute><Layout><ViewBookings2 /></Layout></PrivateRoute>} />
          <Route path="/view-bookings3" element={<PrivateRoute><Layout><ViewBookings3 /></Layout></PrivateRoute>} />
          <Route path="/agents" element={
            <PrivateRoute>
              <Layout>
                <AgentManagement />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/finance-ar" element={
            <PrivateRoute>
              <Layout>
                <FinanceAR />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/authorizer" element={
            <AuthorizerRoute>
              <Layout>
                <AuthorizerDashboard />
              </Layout>
            </AuthorizerRoute>
          } />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App; 