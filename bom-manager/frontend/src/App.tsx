import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './layouts/Layout';
import DashboardPage from './pages/DashboardPage';
import PartSearchPage from './pages/PartSearchPage';
import PartDetailPage from './pages/PartDetailPage';
import ManufacturersPage from './pages/ManufacturersPage';
import SuppliersPage from './pages/SuppliersPage';
import BOMUploadPage from './pages/BOMUploadPage';
import BOMResultsPage from './pages/BOMResultsPage';
import LifecyclePage from './pages/LifecyclePage';
import CompliancePage from './pages/CompliancePage';
import ReplacementsPage from './pages/ReplacementsPage';
import ReportsPage from './pages/ReportsPage';
import AlertsPage from './pages/AlertsPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import { AuthProvider, useAuth } from './context/AuthContext';

function ProtectedRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-sm text-slate-400">Loading profile authentication...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/upload" element={<BOMUploadPage />} />
        <Route path="/bom/:bomId" element={<BOMResultsPage />} />
        <Route path="/search" element={<PartSearchPage />} />
        <Route path="/parts/:partId" element={<PartDetailPage />} />
        <Route path="/manufacturers" element={<ManufacturersPage />} />
        <Route path="/suppliers" element={<SuppliersPage />} />
        <Route path="/lifecycle" element={<LifecyclePage />} />
        <Route path="/compliance" element={<CompliancePage />} />
        <Route path="/replacements" element={<ReplacementsPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
