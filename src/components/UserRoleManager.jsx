"use client";
import { useState, useEffect } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { 
  setUserRole, 
  getAllUsers, 
  getUsersByRole, 
  canManageUsers, 
  canManageRoles,
  getRoleDisplayName,
  getValidRoles,
  isValidRole,
  canAssignRoleToSelf,
  deleteUserFromFirebase
} from "@/utils/firebaseRoleManager";
import { useUser } from "@/helper/UserContext";
import config from "@/config";

const UserRoleManager = () => {
  const { user, token, role } = useUser();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const validRoles = getValidRoles();

  useEffect(() => {
    loadUsers();
  }, [selectedRole]);



  const loadUsers = async () => {
    setLoading(true);
    try {
      let userList;
      if (selectedRole === 'all') {
        userList = await getAllUsers();
      } else {
        userList = await getUsersByRole(selectedRole);
      }
      setUsers(userList);
    } catch (error) {
      console.error('Error loading users:', error);
      setMessage({ type: 'error', text: 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleUpdate = async () => {
    if (!selectedUser || !newRole) {
      setMessage({ type: 'error', text: 'Please select a user and role' });
      return;
    }

    if (!isValidRole(newRole)) {
      setMessage({ type: 'error', text: 'Invalid role selected' });
      return;
    }

    // Check if user is trying to modify their own role
    if (selectedUser.uid === user?.uid) {
      // Prevent self-promotion to higher roles
      if (!canAssignRoleToSelf(role || 'none', newRole)) {
        setMessage({ 
          type: 'error', 
          text: 'You cannot promote yourself to a higher role. Only a super admin can promote you.' 
        });
        return;
      }
    }

    setUpdating(true);
    try {
      const result = await setUserRole(selectedUser.uid, newRole, {
        email: selectedUser.email,
        updatedBy: user?.uid,
        updatedAt: new Date()
      });

      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        setSelectedUser(null);
        setNewRole('');
        loadUsers(); // Reload users
      } else {
        setMessage({ type: 'error', text: result.error });
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      setMessage({ type: 'error', text: 'Failed to update user role' });
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This will:\n\n• Delete the user from the backend database\n• Delete the user from Firebase Firestore\n• Remove all user data and permissions\n\nThis action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      // First delete from backend API
      const response = await fetch(`${config.api.baseURL}/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Then delete from Firebase Authentication
        try {
          const firebaseResult = await deleteUserFromFirebase(userId);
          
          if (firebaseResult.success) {
            setMessage({ type: 'success', text: 'User deleted successfully from both backend and Firebase' });
          } else {
            setMessage({ 
              type: 'warning', 
              text: `User deleted from backend but Firebase deletion failed: ${firebaseResult.error}` 
            });
          }
        } catch (firebaseError) {
          console.error('Firebase deletion error:', firebaseError);
          setMessage({ 
            type: 'warning', 
            text: 'User deleted from backend but Firebase deletion failed. User may still exist in Firebase Authentication.' 
          });
        }
        
        loadUsers(); // Reload users
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.message || 'Failed to delete user from backend' });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setMessage({ type: 'error', text: 'Failed to delete user' });
    } finally {
      setDeleting(false);
    }
  };

  const canManage = async () => {
    const canManageUsersResult = await canManageUsers();
    const canManageRolesResult = await canManageRoles();
    return canManageUsersResult || canManageRolesResult;
  };

  if (!user) {
    return (
      <div className="alert alert-warning">
        <Icon icon="mdi:alert-circle" className="me-2" />
        Please sign in to manage user roles.
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h5 className="card-title">
          <Icon icon="mdi:account-multiple" className="me-2" />
          User Role Management
        </h5>
      </div>
      <div className="card-body">
        
        {/* Message Display */}
        {message.text && (
          <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'} mb-3`}>
            <Icon 
              icon={message.type === 'success' ? 'mdi:check-circle' : 'mdi:alert-circle'} 
              className="me-2" 
            />
            {message.text}
          </div>
        )}

        {/* Role Filter */}
        <div className="row mb-3">
          <div className="col-md-6">
            <label className="form-label">Filter by Role:</label>
            <select 
              className="form-select"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="all">All Roles</option>
              {validRoles.map(role => (
                <option key={role} value={role}>
                  {getRoleDisplayName(role)}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-6 d-flex align-items-end">
            <button 
              className="btn btn-primary"
              onClick={loadUsers}
              disabled={loading}
            >
              <Icon icon="mdi:refresh" className="me-2" />
              Refresh
            </button>
          </div>
        </div>



        {/* Users Table */}
        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : (
          <>
            {/* Delete Information */}
            <div className="alert alert-info mb-3">
              <Icon icon="mdi:information" className="me-2" />
              <strong>Note:</strong> When deleting a user, they will be removed from both the backend database and Firebase Firestore. 
              This action cannot be undone and will permanently remove all user data and permissions.
            </div>
            
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Email</th>
                    <th>Current Role</th>
                    <th>Updated At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((userData) => (
                    <tr key={userData.uid}>
                      <td>
                        <code className="small">{userData.uid}</code>
                      </td>
                      <td>{userData.email || 'N/A'}</td>
                      <td>
                        <span className={`badge ${
                          userData.role === 'super_admin' ? 'bg-danger' :
                          userData.role === 'admin' ? 'bg-warning' :
                          userData.role === 'manager' ? 'bg-info' :
                          'bg-secondary'
                        }`}>
                          {getRoleDisplayName(userData.role || 'user')}
                        </span>
                      </td>
                      <td>
                        {userData.updatedAt ? 
                          new Date(userData.updatedAt.toDate()).toLocaleDateString() : 
                          'N/A'
                        }
                      </td>
                      <td>
                        <div className="btn-group" role="group">
                          <button 
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => {
                              setSelectedUser(userData);
                              setNewRole(userData.role || 'user');
                            }}
                          >
                            <Icon icon="mdi:edit" className="me-1" />
                            Edit Role
                          </button>
                          {(role === 'admin' || role === 'super_admin') && userData.uid !== user?.uid && (
                            <button 
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDeleteUser(userData.uid)}
                              disabled={deleting}
                              title="Delete user (irreversible)"
                            >
                              <Icon icon="mdi:delete" className="me-1" />
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Role Update Modal */}
        {selectedUser && (
          <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Update User Role</h5>
                  <button 
                    type="button" 
                    className="btn-close"
                    onClick={() => {
                      setSelectedUser(null);
                      setNewRole('');
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">User:</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={selectedUser.email || selectedUser.uid} 
                      readOnly 
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Current Role:</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={getRoleDisplayName(selectedUser.role || 'user')} 
                      readOnly 
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">New Role:</label>
                    <select 
                      className="form-select"
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                    >
                      {validRoles.map(roleOption => {
                        const isSelfPromotion = selectedUser.uid === user?.uid && 
                          !canAssignRoleToSelf(role || 'none', roleOption);
                        
                        return (
                          <option 
                            key={roleOption} 
                            value={roleOption}
                            disabled={isSelfPromotion}
                          >
                            {getRoleDisplayName(roleOption)}
                            {isSelfPromotion ? ' (Self-promotion not allowed)' : ''}
                          </option>
                        );
                      })}
                                          </select>
                      {selectedUser.uid === user?.uid && (
                        <small className="text-muted">
                          You can only assign roles at or below your current level to yourself.
                        </small>
                      )}
                    </div>
                  </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => {
                      setSelectedUser(null);
                      setNewRole('');
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={handleRoleUpdate}
                    disabled={updating}
                  >
                    {updating ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Updating...
                      </>
                    ) : (
                      'Update Role'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No Users Message */}
        {!loading && users.length === 0 && (
          <div className="text-center py-4">
            <Icon icon="mdi:account-off" className="text-muted" style={{ fontSize: '3rem' }} />
            <p className="text-muted mt-2">No users found with the selected role.</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default UserRoleManager; 