"use client";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useUser } from "@/helper/UserContext";
import Link from "next/link";

const NoAccessLayer = () => {
  const { user, role } = useUser();

  return (
    <div className="container-fluid">
      <div className="row justify-content-center">
        <div className="col-lg-8 col-md-10">
          <div className="card">
            <div className="card-body text-center p-5">
              <div className="mb-4">
                <Icon 
                  icon="mdi:shield-alert" 
                  className="text-warning" 
                  style={{ fontSize: '4rem' }} 
                />
              </div>
              
              <h2 className="mb-3">Access Restricted</h2>
              <p className="text-muted mb-4">
                Welcome, <strong>{user?.email}</strong>! 
                Your account currently has no access permissions.
              </p>
              
              <div className="alert alert-info mb-4">
                <Icon icon="mdi:information" className="me-2" />
                <strong>What you need to do:</strong>
                <br />
                Contact an administrator to request access permissions for your account.
              </div>
              
              <div className="row">
                <div className="col-md-6 mb-3">
                  <div className="card border">
                    <div className="card-body">
                      <Icon icon="mdi:account-clock" className="text-primary fs-1 mb-2" />
                      <h5>Request Access</h5>
                      <p className="text-muted small">
                        Ask an admin to assign you appropriate permissions
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="col-md-6 mb-3">
                  <div className="card border">
                    <div className="card-body">
                      <Icon icon="mdi:account-multiple" className="text-success fs-1 mb-2" />
                      <h5>Contact Admin</h5>
                      <p className="text-muted small">
                        Reach out to your system administrator
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4">
                <button 
                  className="btn btn-outline-primary me-2"
                  onClick={() => window.location.reload()}
                >
                  <Icon icon="mdi:refresh" className="me-2" />
                  Refresh Page
                </button>
                
                <Link href="/sign-out" className="btn btn-outline-secondary">
                  <Icon icon="mdi:logout" className="me-2" />
                  Sign Out
                </Link>
              </div>
              
              <div className="mt-4 text-muted small">
                <p>
                  <Icon icon="mdi:clock-outline" className="me-1" />
                  Your access request will be reviewed by an administrator.
                </p>
                <p>
                  <Icon icon="mdi:email-outline" className="me-1" />
                  You will be notified once your permissions are updated.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoAccessLayer; 