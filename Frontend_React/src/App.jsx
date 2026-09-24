import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Header from "./components/common/Header";
import Footer from "./components/common/Footer";
import HomePage from "./pages/public/HomePage";
import JobsPage from "./pages/public/JobsPage";
import JobDetailPage from "./pages/public/JobDetailPage";
import CompaniesPage from "./pages/public/CompaniesPage";
import GuidesPage from "./pages/public/GuidesPage";
import RoleSelectPage from "./pages/auth/RoleSelectPage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ProfilePage from "./pages/candidate/ProfilePage";
import SavedJobsPage from "./pages/candidate/SavedJobsPage";
import ApplicationsPage from "./pages/candidate/ApplicationsPage";
import EmployerPortal from "./pages/employer/EmployerPortal";
import AdminPortal from "./pages/admin/AdminPortal";
import { useAOS } from "./hooks/useAOS";

export default function App() {
  const location = useLocation();
  useAOS();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="d-flex flex-column min-vh-100">
      <Header />
      <main className="flex-grow-1">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/jobs/:id" element={<JobDetailPage />} />
          <Route path="/companies" element={<CompaniesPage />} />
          <Route path="/guides" element={<GuidesPage />} />

          {/* Auth Routes */}
          <Route path="/role" element={<RoleSelectPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Candidate Routes */}
          <Route path="/candidate/profile" element={<ProfilePage />} />
          <Route path="/candidate/saved" element={<SavedJobsPage />} />
          <Route path="/candidate/applications" element={<ApplicationsPage />} />

          {/* Employer & Admin Portals */}
          <Route path="/employer/*" element={<EmployerPortal />} />
          <Route path="/admin/*" element={<AdminPortal />} />

          {/* Fallback */}
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
