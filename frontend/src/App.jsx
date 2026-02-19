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
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/profile/:id" element={<Profile />} />
            <Route path="/add-product" element={<AddProduct />} />
            <Route path="/search" element={<Search />} />
            <Route path="/checkout/:id" element={<Checkout />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/logs" element={<AdminLogs />} />
            <Route path="/admin/ping" element={<AdminPing />} />
            <Route path="/admin/export" element={<AdminExport />} />
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
