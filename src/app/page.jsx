"use client";
import { useUser } from "@/helper/UserContext";
import { useRole } from "@/hook/useRole";
import MasterLayout from "@/masterLayout/MasterLayout";
import DashBoardLayerOne from "@/components/DashBoardLayerOne";
import NoAccessLayer from "@/components/NoAccessLayer";
import { Icon } from "@iconify/react/dist/iconify.js";

export default function Home() {
  try {
    const { user, loading } = useUser();
    const { role, hasAnyAccess } = useRole();

    // Get role from localStorage as fallback
    const localStorageRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;

    // Show loading while checking authentication
    if (loading) {
      return (
        <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3 text-muted">Loading dashboard...</p>
          </div>
        </div>
      );
    }

    // Show sign-in prompt if not authenticated
    if (!user) {
      return (
        <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
          <div className="text-center">
            <Icon icon="mdi:account-lock" className="text-muted" style={{ fontSize: '3rem' }} />
            <h3 className="mt-3">Please Sign In</h3>
            <p className="text-muted">You need to sign in to access the dashboard.</p>
            <a href="/sign-in" className="btn btn-primary">
              <Icon icon="mdi:login" className="me-2" />
              Sign In
            </a>
          </div>
        </div>
      );
    }

    // Check if user has any access - use both context and localStorage
    const hasAccess = hasAnyAccess() || (localStorageRole && localStorageRole !== 'none');
    
    if (!hasAccess) {
      return (
        <MasterLayout>
          <NoAccessLayer />
        </MasterLayout>
      );
    }

    // Check if user is 'user' role - show limited access
    if (role === 'user' || localStorageRole === 'user') {
      return (
        <MasterLayout>
          <div className="container-fluid">
            <div className="row justify-content-center">
              <div className="col-lg-8 col-md-10">
                <div className="card">
                  <div className="card-body text-center p-5">
                    <div className="mb-4">
                      <Icon 
                        icon="mdi:account-check" 
                        className="text-success" 
                        style={{ fontSize: '4rem' }} 
                      />
                    </div>
                    
                    <h2 className="mb-3">Welcome, {user?.displayName || user?.email}!</h2>
                    <p className="text-muted mb-4">
                      You have limited access to the system. You can view customer data and manage your profile.
                    </p>
                    
                    <div className="alert alert-info mb-4">
                      <Icon icon="mdi:information" className="me-2" />
                      <strong>Available Features:</strong>
                      <br />
                      • View Customer Data
                      <br />
                      • Manage Your Profile
                      <br />
                      • Contact Administrators for additional permissions
                    </div>
                    
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <div className="card border">
                          <div className="card-body">
                            <Icon icon="mdi:database" className="text-primary fs-1 mb-2" />
                            <h5>Customer Data</h5>
                            <p className="text-muted small">
                              View and manage customer information
                            </p>
                            <a href="/customer-data" className="btn btn-primary btn-sm">
                              Access Customer Data
                            </a>
                          </div>
                        </div>
                      </div>
                      
                      <div className="col-md-6 mb-3">
                        <div className="card border">
                          <div className="card-body">
                            <Icon icon="mdi:account-cog" className="text-success fs-1 mb-2" />
                            <h5>Your Profile</h5>
                            <p className="text-muted small">
                              Manage your account settings
                            </p>
                            <a href="/view-profile" className="btn btn-success btn-sm">
                              View Profile
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </MasterLayout>
      );
    }

    // Show full dashboard for admin, manager, and super admin
    return (
      <MasterLayout>
        <DashBoardLayerOne />
      </MasterLayout>
    );
  } catch (error) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="text-center">
          <Icon icon="mdi:alert-circle" className="text-danger" style={{ fontSize: '3rem' }} />
          <h3 className="mt-3">Something went wrong</h3>
          <p className="text-muted">Please try refreshing the page.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn btn-primary"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
}
