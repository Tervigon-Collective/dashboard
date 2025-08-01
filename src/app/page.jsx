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

    // Show role-based dashboard for users with access
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
