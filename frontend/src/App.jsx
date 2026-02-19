import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Register from './components/Register';
import Marketplace from './components/Marketplace';
import ProductDetail from './components/ProductDetail';
import Profile from './components/Profile';
import AddProduct from './components/AddProduct';
import Search from './components/Search';
import Checkout from './components/Checkout';
import Wallet from './components/Wallet';
import Orders from './components/Orders';
import AdminDashboard from './components/AdminDashboard';
import AdminUsers from './components/AdminUsers';
import AdminLogs from './components/AdminLogs';
import AdminPing from './components/AdminPing';
import AdminExport from './components/AdminExport';
import RequireAuth from './components/RequireAuth';

function AppLayout() {
  const location = useLocation();
  const hideNavbar = ['/login', '/register'].includes(location.pathname);

  return (
    <>
      {!hideNavbar && <Navbar />}
      {hideNavbar ? (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      ) : (
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Marketplace />} />
            <Route path="/product/:id" element={<RequireAuth><ProductDetail /></RequireAuth>} />
            <Route path="/profile/:id" element={<RequireAuth><Profile /></RequireAuth>} />
            <Route path="/add-product" element={<RequireAuth><AddProduct /></RequireAuth>} />
            <Route path="/search" element={<Search />} />
            <Route path="/checkout/:id" element={<RequireAuth><Checkout /></RequireAuth>} />
            <Route path="/wallet" element={<RequireAuth><Wallet /></RequireAuth>} />
            <Route path="/orders" element={<RequireAuth><Orders /></RequireAuth>} />
            <Route path="/admin" element={<RequireAuth><AdminDashboard /></RequireAuth>} />
            <Route path="/admin/users" element={<RequireAuth><AdminUsers /></RequireAuth>} />
            <Route path="/admin/logs" element={<RequireAuth><AdminLogs /></RequireAuth>} />
            <Route path="/admin/ping" element={<RequireAuth><AdminPing /></RequireAuth>} />
            <Route path="/admin/export" element={<RequireAuth><AdminExport /></RequireAuth>} />
          </Routes>
        </main>
      )}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
