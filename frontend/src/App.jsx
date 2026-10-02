/**
 * App.jsx
 * ----------------------------------------------------------------------------
 * Top-level route table. The "/" route renders a different dashboard
 * component depending on role (RoleHome below) so employees, administrators
 * and the system owner each land on the dashboard that's actually relevant
 * to them — matching the Usability NFR's "role-appropriate views."
 * ----------------------------------------------------------------------------
 */
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';

import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import ForgotPassword from './pages/auth/ForgotPassword.jsx';
import ResetPassword from './pages/auth/ResetPassword.jsx';

import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import EmployeeDashboard from './pages/employee/Dashboard.jsx';
import PolicyLibrary from './pages/employee/PolicyLibrary.jsx';
import PolicyDetail from './pages/employee/PolicyDetail.jsx';
import Training from './pages/employee/Training.jsx';
import TrainingModule from './pages/employee/TrainingModule.jsx';
import Assets from './pages/employee/Assets.jsx';
import Profile from './pages/employee/Profile.jsx';

import AdminOverview from './pages/admin/AdminOverview.jsx';
import UserManagement from './pages/admin/UserManagement.jsx';
import PolicyManagement from './pages/admin/PolicyManagement.jsx';
import AssetInventory from './pages/admin/AssetInventory.jsx';
import AuditLog from './pages/admin/AuditLog.jsx';

import Oversight from './pages/systemowner/Oversight.jsx';

function RoleHome() {
  const { user } = useAuth();
  if (user?.role === 'system_owner') return <Oversight />;
  return <EmployeeDashboard />;
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Authenticated routes, shared shell */}
      <Route path="/" element={<ProtectedRoute><Layout><RoleHome /></Layout></ProtectedRoute>} />
      <Route path="/policies" element={<ProtectedRoute><Layout><PolicyLibrary /></Layout></ProtectedRoute>} />
      <Route path="/policies/:id" element={<ProtectedRoute><Layout><PolicyDetail /></Layout></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />

      {/* Employee + Administrator only (System Owner has no training/asset duties) */}
      <Route path="/training" element={<ProtectedRoute roles={['employee', 'administrator']}><Layout><Training /></Layout></ProtectedRoute>} />
      <Route path="/training/:id" element={<ProtectedRoute roles={['employee', 'administrator']}><Layout><TrainingModule /></Layout></ProtectedRoute>} />
      <Route path="/assets" element={<ProtectedRoute roles={['employee', 'administrator']}><Layout><Assets /></Layout></ProtectedRoute>} />

      {/* Administrator-only management screens (server also enforces this — see rbac.js) */}
      <Route path="/admin" element={<ProtectedRoute roles={['administrator']}><Layout><AdminOverview /></Layout></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute roles={['administrator']}><Layout><UserManagement /></Layout></ProtectedRoute>} />
      <Route path="/admin/policies" element={<ProtectedRoute roles={['administrator']}><Layout><PolicyManagement /></Layout></ProtectedRoute>} />
      <Route path="/admin/assets" element={<ProtectedRoute roles={['administrator']}><Layout><AssetInventory /></Layout></ProtectedRoute>} />

      {/* Audit log: administrator AND system_owner (both read-only here) */}
      <Route path="/admin/audit" element={<ProtectedRoute roles={['administrator', 'system_owner']}><Layout><AuditLog /></Layout></ProtectedRoute>} />
    </Routes>
  );
}
