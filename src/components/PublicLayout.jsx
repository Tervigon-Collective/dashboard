"use client";
import React from "react";
import Link from "next/link";
import ThemeToggleButton from "@/helper/ThemeToggleButton";

const PublicLayout = ({ children, title }) => {
  return (
    <div className="public-layout">
      {/* Header */}
      <header className="public-header bg-white border-bottom border-light py-3">
        <div className="container">
          <div className="d-flex align-items-center justify-content-between">
            {/* Logo */}
            <Link href="/" className="d-flex align-items-center text-decoration-none">
              <img 
                src="/assets/images/make/dashborad-01.jpg" 
                alt="Seleric Dashboard" 
                height="40"
                className="me-2"
              />
              <span className="h4 mb-0 text-primary fw-bold">Seleric Dashboard</span>
            </Link>
            
            {/* Theme Toggle */}
            <div className="d-flex align-items-center gap-3">
              <ThemeToggleButton />
              <Link href="/sign-in" className="btn btn-outline-primary btn-sm">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="public-main py-5">
        <div className="container">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="public-footer bg-light border-top border-light py-4 mt-5">
        <div className="container">
          <div className="row align-items-center justify-content-between">
            <div className="col-auto">
              <p className="mb-0 text-muted">© 2025 Seleric. All Rights Reserved.</p>
            </div>
            <div className="col-auto">
              <div className="d-flex align-items-center gap-3">
                <Link href="/privacy-policy" className="text-muted text-decoration-none hover-text-primary">
                  Privacy Policy
                </Link>
                <span className="text-muted">|</span>
                <Link href="/terms-of-service" className="text-muted text-decoration-none hover-text-primary">
                  Terms & Conditions
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
