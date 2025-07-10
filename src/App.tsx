import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider } from './contexts/AppContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Cities from './pages/Cities';
import PriceAreas from './pages/PriceAreas';
import Stores from './pages/Stores';
import Products from './pages/Products';
import StoreDeliveries from './pages/StoreDeliveries';
import IndividualDeliveries from './pages/IndividualDeliveries';
import Returns from './pages/Returns';
import Employees from './pages/Employees';
import Payroll from './pages/Payroll';
import Factory from './pages/Factory';
import RawMaterials from './pages/RawMaterials';
import HPP from './pages/HPP';
import Bills from './pages/Bills';
import Bookkeeping from './pages/Bookkeeping';
import Reports from './pages/Reports';
import AdminSettings from './pages/AdminSettings';
import DataBackup from './pages/DataBackup';
import Assets from './pages/Assets';
import ROI from './pages/ROI';
import DiscountCalculator from './pages/DiscountCalculator';
import BundlingCalculator from './pages/BundlingCalculator';
import OverheadCalculator from './pages/OverheadCalculator';
import SeasonalReport from './pages/SeasonalReport';

function AppContent() {
  const [userRole, setUserRole] = useState<string | null>(null);

  // Check if user is already logged in
  useEffect(() => {
    const savedRole = localStorage.getItem('userRole');
    if (savedRole) {
      setUserRole(savedRole);
    }
  }, []);

  const handleLogin = (role: string) => {
    setUserRole(role);
    localStorage.setItem('userRole', role);
  };

  const handleLogout = () => {
    setUserRole(null);
    localStorage.removeItem('userRole');
  };

  if (!userRole) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <>
      <Layout userRole={userRole} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/cities" element={<Cities />} />
          <Route path="/price-areas" element={<PriceAreas />} />
          <Route path="/stores" element={<Stores />} />
          <Route path="/products" element={<Products />} />
          <Route path="/store-deliveries" element={<StoreDeliveries />} />
          <Route path="/individual-deliveries" element={<IndividualDeliveries />} />
          <Route path="/returns" element={<Returns />} />
          <Route path="/bookkeeping" element={<Bookkeeping />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/payroll" element={<Payroll />} />
          <Route path="/factory" element={<Factory />} />
          <Route path="/raw-materials" element={<RawMaterials />} />
          <Route path="/hpp" element={<HPP />} />
          <Route path="/bills" element={<Bills />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/admin-settings" element={<AdminSettings />} />
          <Route path="/data-backup" element={<DataBackup />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/roi" element={<ROI />} />
          <Route path="/discount-calculator" element={<DiscountCalculator />} />
          <Route path="/bundling-calculator" element={<BundlingCalculator />} />
          <Route path="/overhead-calculator" element={<OverheadCalculator />} />
          <Route path="/seasonal-report" element={<SeasonalReport />} />
        </Routes>
      </Layout>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </>
  );
}

function App() {
  return (
    <AppProvider>
      <Router>
        <AppContent />
      </Router>
    </AppProvider>
  );
}

export default App;