import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { HRLayout } from '../layouts/HRLayout';
import { CandidateLayout } from '../layouts/CandidateLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';
import { ROLES } from '../constants';

// Auth Pages
import { Login } from '../pages/auth/Login';
import { Register } from '../pages/auth/Register';

// Candidate Pages
import { CandidateDashboard } from '../pages/candidate/Dashboard';
import { CandidateProfile } from '../pages/candidate/Profile';
import { MyCV } from '../pages/candidate/MyCV';
import { CandidateJobs } from '../pages/candidate/Jobs';
import { CandidateApplications } from '../pages/candidate/Applications';

// HR Pages
import { HRDashboard } from '../pages/hr/Dashboard';
import { HRJobs } from '../pages/hr/Jobs';
import { HRCandidates } from '../pages/hr/Candidates';
import { HRScreening } from '../pages/hr/Screening';
import { HRRanking } from '../pages/hr/Ranking';
import { HRAnalytics } from '../pages/hr/Analytics';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/candidate/jobs" replace />} />

      {/* Auth Public Routes */}
      <Route element={<MainLayout />}>
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/register" element={<Register />} />
      </Route>

      {/* Candidate Portal Routes */}
      <Route
        path="/candidate"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[ROLES.CANDIDATE]}>
              <CandidateLayout />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/candidate/dashboard" replace />} />
        <Route path="dashboard" element={<CandidateDashboard />} />
        <Route path="profile" element={<CandidateProfile />} />
        <Route path="my-cv" element={<MyCV />} />
        <Route path="jobs" element={<CandidateJobs />} />
        <Route path="applications" element={<CandidateApplications />} />
      </Route>

      {/* HR Portal Routes */}
      <Route
        path="/hr"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[ROLES.EMPLOYER, ROLES.ADMIN]}>
              <HRLayout />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/hr/dashboard" replace />} />
        <Route path="dashboard" element={<HRDashboard />} />
        <Route path="jobs" element={<HRJobs />} />
        <Route path="candidates" element={<HRCandidates />} />
        <Route path="screening" element={<HRScreening />} />
        <Route path="ranking" element={<HRRanking />} />
        <Route path="analytics" element={<HRAnalytics />} />
      </Route>

      {/* Fallback 404 Route */}
      <Route path="*" element={<Navigate to="/candidate/jobs" replace />} />
    </Routes>
  );
};
