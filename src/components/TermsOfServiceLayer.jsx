"use client";
import React from "react";

const TermsOfServiceLayer = () => {
  return (
    <>
      <div className='card basic-data-table radius-12 overflow-hidden'>
        <div className='card-body p-32'>
          <div className="terms-content">
            {/* Stylish Header Section */}
            <div className="text-center mb-5 pb-4 border-bottom border-2 border-primary-200">
              <div className="d-inline-block p-3 bg-primary-50 radius-12 mb-3">
                <i className="ri-service-line text-primary-600" style={{fontSize: '3rem'}}></i>
              </div>
              <h1 className="display-6 fw-bold text-primary-600 mb-2">Terms of Service</h1>
              {/* <p className="text-muted fw-medium mb-0">Last updated: {new Date().toLocaleDateString()}</p> */}
            </div>
            
            <div className="terms-section mb-5">
              <div className="section-header d-flex align-items-center mb-4">
                <div className="section-number bg-primary-600 text-white fw-bold rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>1</div>
                <h3 className="fw-bold text-dark mb-0">Service Overview</h3>
              </div>
              <div className="ps-5">
                <p className="text-dark mb-3 lh-base fs-5">
                  Seleric Dashboard provides comprehensive business management solutions including analytics, reporting, 
                  user management, and data visualization tools. Our platform is designed to help businesses streamline 
                  operations and make data-driven decisions.
                </p>
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <div className="service-card bg-light p-3 radius-8 border-start border-4 border-primary-600">
                      <i className="ri-dashboard-line text-primary-600 me-2"></i>
                      <span className="text-dark fw-medium">Interactive dashboards and reports</span>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="service-card bg-light p-3 radius-8 border-start border-4 border-success-600">
                      <i className="ri-user-settings-line text-success-600 me-2"></i>
                      <span className="text-dark fw-medium">Advanced user management</span>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="service-card bg-light p-3 radius-8 border-start border-4 border-info-600">
                      <i className="ri-bar-chart-grouped-line text-info-600 me-2"></i>
                      <span className="text-dark fw-medium">Real-time analytics</span>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="service-card bg-light p-3 radius-8 border-start border-4 border-warning-600">
                      <i className="ri-cloud-line text-warning-600 me-2"></i>
                      <span className="text-dark fw-medium">Cloud-based platform</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="terms-section mb-5">
              <div className="section-header d-flex align-items-center mb-4">
                <div className="section-number bg-primary-600 text-white fw-bold rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>2</div>
                <h3 className="fw-bold text-dark mb-0">Service Availability</h3>
              </div>
              <div className="ps-5">
                <p className="text-dark mb-3 lh-base fs-5">We commit to providing reliable service with the following guarantees:</p>
                <div className="row g-3">
                  <div className="col-md-4">
                    <div className="availability-card bg-success-50 p-3 radius-8 border border-success-200 text-center">
                      <i className="ri-time-line text-success-600 mb-2" style={{fontSize: '2rem'}}></i>
                      <h6 className="fw-semibold text-success-600 mb-2">99.9% Uptime</h6>
                      <p className="text-dark mb-0 small">High availability guarantee</p>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="availability-card bg-info-50 p-3 radius-8 border border-info-200 text-center">
                      <i className="ri-customer-service-line text-info-600 mb-2" style={{fontSize: '2rem'}}></i>
                      <h6 className="fw-semibold text-info-600 mb-2">24/7 Support</h6>
                      <p className="text-dark mb-0 small">Round-the-clock assistance</p>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="availability-card bg-warning-50 p-3 radius-8 border border-warning-200 text-center">
                      <i className="ri-shield-check-line text-warning-600 mb-2" style={{fontSize: '2rem'}}></i>
                      <h6 className="fw-semibold text-warning-600 mb-2">Security First</h6>
                      <p className="text-dark mb-0 small">Enterprise-grade protection</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="terms-section mb-5">
              <div className="section-header d-flex align-items-center mb-4">
                <div className="section-number bg-primary-600 text-white fw-bold rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>3</div>
                <h3 className="fw-bold text-dark mb-0">User Responsibilities</h3>
              </div>
              <div className="ps-5">
                <p className="text-dark mb-3 lh-base fs-5">As a user of our service, you agree to:</p>
                <ul className="text-dark mb-4 lh-base ps-4 custom-list">
                  <li className="mb-2">Provide accurate and complete information during registration</li>
                  <li className="mb-2">Maintain the security of your account credentials</li>
                  <li className="mb-2">Use the service in compliance with applicable laws</li>
                  <li className="mb-2">Report any security concerns immediately</li>
                  <li className="mb-2">Respect the intellectual property rights of others</li>
                  <li className="mb-2">Not attempt to reverse engineer or hack the platform</li>
                </ul>
              </div>
            </div>

            <div className="terms-section mb-5">
              <div className="section-header d-flex align-items-center mb-4">
                <div className="section-number bg-primary-600 text-white fw-bold rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>4</div>
                <h3 className="fw-bold text-dark mb-0">Data and Privacy</h3>
              </div>
              <div className="ps-5">
                <p className="text-dark mb-3 lh-base fs-5">Your data security and privacy are our top priorities:</p>
                <div className="security-features">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="security-card bg-light p-3 radius-8 border-start border-4 border-success-600">
                        <i className="ri-lock-password-line text-success-600 me-2"></i>
                        <span className="text-dark">End-to-end encryption</span>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="security-card bg-light p-3 radius-8 border-start border-4 border-info-600">
                        <i className="ri-fingerprint-line text-info-600 me-2"></i>
                        <span className="text-dark">Multi-factor authentication</span>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="security-card bg-light p-3 radius-8 border-start border-4 border-warning-600">
                        <i className="ri-shield-check-line text-warning-600 me-2"></i>
                        <span className="text-dark">Regular security audits</span>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="security-card bg-light p-3 radius-8 border-start border-4 border-primary-600">
                        <i className="ri-team-line text-primary-600 me-2"></i>
                        <span className="text-dark">Trained security team</span>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-dark mt-4 lh-base fs-5">
                  For detailed information about how we handle your data, please refer to our Privacy Policy.
                </p>
              </div>
            </div>

            <div className="terms-section mb-5">
              <div className="section-header d-flex align-items-center mb-4">
                <div className="section-number bg-primary-600 text-white fw-bold rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>5</div>
                <h3 className="fw-bold text-dark mb-0">Support and Maintenance</h3>
              </div>
              <div className="ps-5">
                <p className="text-dark mb-3 lh-base fs-5">We provide comprehensive support and regular maintenance:</p>
                <ul className="text-dark mb-4 lh-base ps-4 custom-list">
                  <li className="mb-2">24/7 technical support via email and phone</li>
                  <li className="mb-2">Regular system updates and improvements</li>
                  <li className="mb-2">Scheduled maintenance with advance notice</li>
                  <li className="mb-2">Comprehensive documentation and tutorials</li>
                  <li className="mb-2">Training sessions for enterprise customers</li>
                </ul>
              </div>
            </div>

            <div className="terms-section mb-5">
              <div className="section-header d-flex align-items-center mb-4">
                <div className="section-number bg-primary-600 text-white fw-bold rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>6</div>
                <h3 className="fw-bold text-dark mb-0">Contact Information</h3>
              </div>
              <div className="ps-5">
                <p className="text-dark mb-3 lh-base fs-5">For questions about our Terms of Service, please contact us:</p>
                <div className="contact-info bg-primary text-white p-4 radius-12 shadow-sm">
                  <div className="row g-3">
                    <div className="col-md-4">
                      <div className="text-center">
                        <i className="ri-mail-line text-white mb-2" style={{fontSize: '2rem'}}></i>
                        <p className="mb-1 fw-medium text-white">admin@seleric.com</p>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="text-center">
                        <i className="ri-map-pin-line text-white mb-2" style={{fontSize: '2rem'}}></i>
                        <p className="mb-1 fw-medium text-white">B1/D4, Mohan Cooperative Industrial Estate, New Delhi - 110044</p>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="text-center">
                        <i className="ri-phone-line text-white mb-2" style={{fontSize: '2rem'}}></i>
                        <p className="mb-1 fw-medium text-white">9818856823</p>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-dark mt-4 lh-base fs-5">
                  We will respond to your inquiry within 24 hours during business days.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-list li {
          position: relative;
          padding-left: 1.5rem;
        }
        .custom-list li:before {
          content: "•";
          color: var(--bs-primary);
          font-weight: bold;
          position: absolute;
          left: 0;
        }
        .service-card, .availability-card, .security-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .service-card:hover, .availability-card:hover, .security-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
      `}</style>
    </>
  );
};

export default TermsOfServiceLayer;
