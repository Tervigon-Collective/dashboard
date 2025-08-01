"use client";
import { useState } from "react";
import { useUser } from "@/helper/UserContext";
import { useRole } from "@/hook/useRole";
import { Icon } from "@iconify/react/dist/iconify.js";

const DebugRoleLayer = () => {
  const { user, token, role, loading } = useUser();
  const { hasAnyAccess, getRoleDisplayName } = useRole();
  const [debugInfo, setDebugInfo] = useState({});

  const refreshDebugInfo = () => {
    const info = {
      user: user ? {
        email: user.email,
        uid: user.uid,
        emailVerified: user.emailVerified
      } : null,
      role: role,
      token: token ? 'Present' : 'Missing',
      loading: loading,
      hasAnyAccess: hasAnyAccess(),
      localStorage: {
        userRole: typeof window !== 'undefined' ? localStorage.getItem('userRole') : 'N/A',
        userToken: typeof window !== 'undefined' ? localStorage.getItem('userToken') ? 'Present' : 'Missing' : 'N/A',
        userData: typeof window !== 'undefined' ? localStorage.getItem('userData') : 'N/A'
      }
    };
    setDebugInfo(info);
  };

  const setSuperAdminRole = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('userRole', 'super_admin');
      window.location.reload();
    }
  };

  const clearRole = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userRole');
      window.location.reload();
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h5 className="card-title">
          <Icon icon="mdi:bug" className="me-2" />
          Role Debug Information
        </h5>
      </div>
      <div className="card-body">
        <div className="mb-3">
          <button onClick={refreshDebugInfo} className="btn btn-primary me-2">
            <Icon icon="mdi:refresh" className="me-2" />
            Refresh Debug Info
          </button>
          <button onClick={setSuperAdminRole} className="btn btn-warning me-2">
            <Icon icon="mdi:shield-crown" className="me-2" />
            Set Super Admin Role
          </button>
          <button onClick={clearRole} className="btn btn-danger">
            <Icon icon="mdi:delete" className="me-2" />
            Clear Role
          </button>
        </div>

        <div className="row">
          <div className="col-md-6">
            <h6>Current State:</h6>
            <ul className="list-unstyled">
              <li><strong>User Email:</strong> {user?.email || 'Not signed in'}</li>
              <li><strong>Current Role:</strong> {role || 'none'} ({getRoleDisplayName()})</li>
              <li><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</li>
              <li><strong>Has Access:</strong> {hasAnyAccess() ? 'Yes' : 'No'}</li>
              <li><strong>Token:</strong> {token ? 'Present' : 'Missing'}</li>
            </ul>
          </div>
          <div className="col-md-6">
            <h6>localStorage:</h6>
            <ul className="list-unstyled">
              <li><strong>userRole:</strong> {typeof window !== 'undefined' ? localStorage.getItem('userRole') || 'Not set' : 'N/A'}</li>
              <li><strong>userToken:</strong> {typeof window !== 'undefined' ? localStorage.getItem('userToken') ? 'Present' : 'Missing' : 'N/A'}</li>
              <li><strong>userData:</strong> {typeof window !== 'undefined' ? localStorage.getItem('userData') || 'Not set' : 'N/A'}</li>
            </ul>
          </div>
        </div>

        {Object.keys(debugInfo).length > 0 && (
          <div className="mt-3">
            <h6>Debug Info:</h6>
            <pre className="bg-light p-3 rounded" style={{ fontSize: '0.8rem' }}>
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugRoleLayer; 