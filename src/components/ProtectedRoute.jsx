import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';

const ProtectedRoute = ({ children, requireAuth = true, requireApproval = false, adminOnly = false }) => {
  const { user, loading } = useAuth();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#6b7280'
      }}>
        Se încarcă...
      </div>
    );
  }

  // Level 1: Not authenticated - redirect to auth
  if (requireAuth && !user) {
    return <Navigate to="/" replace />;
  }

  // Level 2: Admin only access
  if (adminOnly && (!user || user.role !== 'admin')) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        textAlign: 'center',
        padding: '20px'
      }}>
        <h2 style={{ color: '#ef4444', marginBottom: '16px' }}>🚫 Acces Interzis</h2>
        <p style={{ color: '#6b7280', fontSize: '16px' }}>
          Nu ai permisiunea să accesezi această pagină.
        </p>
        <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>
          Doar administratorii pot accesa panoul de administrare.
        </p>
      </div>
    );
  }

  // Level 3: Requires approval for certain actions (handled in individual components)
  // This level allows access but restricts functionality
  if (requireApproval && user && !user.validate) {
    // We still render the component but pass approval status
    return React.cloneElement(children, { userApproved: false });
  }

  // User is authenticated and has appropriate permissions
  return React.cloneElement(children, { userApproved: user?.validate || false });
};

export default ProtectedRoute;
