"use client";
import { useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useUser } from "@/helper/UserContext";
import { useRole } from "@/hook/useRole";
import { createNewUser } from "@/utils/firebaseRoleManager";
import config from "@/config";

const CreateUserLayer = () => {
  const { user, token } = useUser();
  const { canCreateUsers, getAssignableRoles } = useRole();
  const [formData, setFormData] = useState({
    email: "",
    displayName: "",
    role: "none"
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const assignableRoles = getAssignableRoles();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(`${config.api.baseURL}/api/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'User created successfully!' });
        setFormData({ email: "", displayName: "", role: "none" });
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.message || 'Failed to create user' });
      }
    } catch (error) {
      console.error('Error creating user:', error);
      setMessage({ type: 'error', text: 'Failed to create user' });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="alert alert-warning">
        <Icon icon="mdi:alert-circle" className="me-2" />
        Please sign in to create users.
      </div>
    );
  }

  if (!canCreateUsers()) {
    return (
      <div className="alert alert-danger">
        <Icon icon="mdi:shield-alert" className="me-2" />
        You do not have permission to create users.
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h5 className="card-title mb-0">
          <Icon icon="mdi:account-plus" className="me-2" />
          Create New User
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

        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label htmlFor="email" className="form-label">Email Address *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="form-control"
                placeholder="Enter email address"
                required
              />
            </div>

            <div className="col-md-6 mb-3">
              <label htmlFor="displayName" className="form-label">Display Name</label>
              <input
                type="text"
                id="displayName"
                name="displayName"
                value={formData.displayName}
                onChange={handleInputChange}
                className="form-control"
                placeholder="Enter display name"
              />
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="role" className="form-label">Initial Role</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="form-select"
              required
            >
              {assignableRoles.map(role => (
                <option key={role} value={role}>
                  {role === 'none' ? 'No Access' : role.charAt(0).toUpperCase() + role.slice(1)}
                </option>
              ))}
            </select>
            <small className="text-muted">
              Users will need to sign in with their email and set their password.
            </small>
          </div>

          <div className="alert alert-info">
            <Icon icon="mdi:information" className="me-2" />
            <strong>Note:</strong> The user will receive an email to set their password and complete their account setup.
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2"></span>
                Creating User...
              </>
            ) : (
              <>
                <Icon icon="mdi:account-plus" className="me-2" />
                Create User
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateUserLayer; 