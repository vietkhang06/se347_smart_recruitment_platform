import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";
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
import DashboardPage from "./pages/candidate/DashboardPage";
import InterviewsPage from "./pages/candidate/InterviewsPage";
import { CandidateGuard } from "./components/candidate/CandidateUI";
import ProfilePage from "./pages/candidate/ProfilePage";
import SavedJobsPage from "./pages/candidate/SavedJobsPage";
import ApplicationsPage from "./pages/candidate/ApplicationsPage";
const EmployerPortal = lazy(() => import("./pages/employer/EmployerPortal"));
const AdminPortal = lazy(() => import("./pages/admin/AdminPortal"));
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
        <Suspense fallback={<div className="container py-5" role="status">Đang tải giao diện…</div>}>
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
          <Route path="/candidate" element={<CandidateGuard><DashboardPage /></CandidateGuard>} />
          <Route path="/candidate/dashboard" element={<CandidateGuard><DashboardPage /></CandidateGuard>} />
          <Route path="/candidate/profile" element={<CandidateGuard><ProfilePage /></CandidateGuard>} />
          <Route path="/candidate/saved" element={<CandidateGuard><SavedJobsPage /></CandidateGuard>} />
          <Route path="/candidate/applications" element={<CandidateGuard><ApplicationsPage /></CandidateGuard>} />

          <Route path="/candidate/interviews" element={<CandidateGuard><InterviewsPage /></CandidateGuard>} />
          {/* Employer & Admin Portals */}
          <Route path="/employer/*" element={<EmployerPortal />} />
          <Route path="/admin/*" element={<AdminPortal />} />

          {/* Fallback */}
          <Route path="*" element={<HomePage />} />
        </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
