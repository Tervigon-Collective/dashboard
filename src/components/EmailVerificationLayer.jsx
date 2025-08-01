"use client";
import { useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useUser } from "@/helper/UserContext";
import { useRole } from "@/hook/useRole";
import config from "@/config";

const EmailVerificationLayer = () => {
  const { user, token } = useUser();
  const { canManageUsers } = useRole();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [verifiedUser, setVerifiedUser] = useState(null);

  const handleEmailVerification = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    setVerifiedUser(null);

    try {
      const response = await fetch(`${config.api.baseURL}/api/users/verify-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        const data = await response.json();
        setVerifiedUser(data.user);
        setMessage({ type: 'success', text: 'User verified successfully!' });
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.message || 'Failed to verify user' });
      }
    } catch (error) {
      console.error('Error verifying user:', error);
      setMessage({ type: 'error', text: 'Failed to verify user' });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleAssignment = async (uid, newRole) => {
    setLoading(true);
    try {
      const response = await fetch(`${config.api.baseURL}/api/users/${uid}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: `Role updated to ${newRole}` });
        setVerifiedUser(null);
        setEmail("");
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.message || 'Failed to update role' });
      }
    } catch (error) {
      console.error('Error updating role:', error);
      setMessage({ type: 'error', text: 'Failed to update role' });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="alert alert-warning">
        <Icon icon="mdi:alert-circle" className="me-2" />
        Please sign in to verify users.
      </div>
    );
  }

  if (!canManageUsers()) {
    return (
      <div className="alert alert-danger">
        <Icon icon="mdi:shield-alert" className="me-2" />
        You do not have permission to verify users.
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h5 className="card-title mb-0">
          <Icon icon="mdi:email-check" className="me-2" />
          Email Verification & User Lookup
        </h5>
      </div>
      <div className="card-body">
        {message.text && (
          <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'} mb-3`}>
            <Icon 
              icon={message.type === 'success' ? 'mdi:check-circle' : 'mdi:alert-circle'} 
              className="me-2" 
            />
            {message.text}
          </div>
        )}

        <form onSubmit={handleEmailVerification} className="mb-4">
          <div className="row">
            <div className="col-md-8">
              <label htmlFor="email" className="form-label">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-control"
                placeholder="Enter email address to verify"
                required
              />
            </div>
            <div className="col-md-4 d-flex align-items-end">
              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Verifying...
                  </>
                ) : (
                  <>
                    <Icon icon="mdi:email-search" className="me-2" />
                    Verify Email
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {verifiedUser && (
          <div className="card border-success">
            <div className="card-header bg-success text-white">
              <Icon icon="mdi:account-check" className="me-2" />
              User Verified
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <h6>User Information</h6>
                  <p><strong>UID:</strong> {verifiedUser.uid}</p>
                  <p><strong>Email:</strong> {verifiedUser.email}</p>
                  <p><strong>Display Name:</strong> {verifiedUser.displayName || 'N/A'}</p>
                  <p><strong>Current Role:</strong> 
                    <span className={`badge ms-2 ${
                      verifiedUser.role === 'super_admin' ? 'bg-danger' :
                      verifiedUser.role === 'admin' ? 'bg-warning' :
                      verifiedUser.role === 'manager' ? 'bg-info' :
                      'bg-secondary'
                    }`}>
                      {verifiedUser.role}
                    </span>
                  </p>
                  <p><strong>Status:</strong> 
                    <span className={`badge ms-2 ${
                      verifiedUser.status === 'active' ? 'bg-success' : 'bg-warning'
                    }`}>
                      {verifiedUser.status}
                    </span>
                  </p>
                  <p><strong>Email Verified:</strong> 
                    <span className={`badge ms-2 ${
                      verifiedUser.emailVerified ? 'bg-success' : 'bg-warning'
                    }`}>
                      {verifiedUser.emailVerified ? 'Yes' : 'No'}
                    </span>
                  </p>
                </div>
                <div className="col-md-6">
                  <h6>Assign Role</h6>
                  <div className="d-grid gap-2">
                    {['user', 'manager', 'admin'].map(role => (
                      <button
                        key={role}
                        className={`btn btn-outline-${role === 'admin' ? 'warning' : role === 'manager' ? 'info' : 'secondary'}`}
                        onClick={() => handleRoleAssignment(verifiedUser.uid, role)}
                        disabled={loading || verifiedUser.role === role}
                      >
                        <Icon icon="mdi:account-cog" className="me-2" />
                        Assign {role.charAt(0).toUpperCase() + role.slice(1)} Role
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="alert alert-info mt-3">
          <Icon icon="mdi:information" className="me-2" />
          <strong>How it works:</strong>
          <ul className="mb-0 mt-2">
            <li>Enter the email address of a user created by an admin</li>
            <li>The system will verify the email exists in Firestore</li>
            <li>You can then assign appropriate roles to the verified user</li>
            <li>Users must verify their email before accessing the system</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationLayer; 