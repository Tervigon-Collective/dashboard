"use client";
import React from "react";

const PrivacyPolicyLayer = () => {
  return (
    <>
      <div className='card basic-data-table radius-12 overflow-hidden'>
        <div className='card-body p-32'>
          <div className="privacy-policy-content">
            {/* Stylish Header Section */}
            <div className="text-center mb-5 pb-4 border-bottom border-2 border-primary-200">
              <div className="d-inline-block p-3 bg-primary-50 radius-12 mb-3">
                <i className="ri-shield-check-line text-primary-600" style={{fontSize: '3rem'}}></i>
              </div>
              <h1 className="display-6 fw-bold text-primary-600 mb-2">Privacy Policy</h1>
              {/* <p className="text-muted fw-medium mb-0">Last updated: {new Date().toLocaleDateString()}</p> */}
            </div>
            
            <div className="policy-section mb-5">
              <div className="section-header d-flex align-items-center mb-4">
                <div className="section-number bg-primary-600 text-white fw-bold rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>1</div>
                <h3 className="fw-bold text-dark mb-0">Introduction</h3>
              </div>
              <div className="ps-5">
                <p className="text-dark mb-3 lh-base fs-5">
                  Seleric ("we," "our," or "us") is committed to protecting your privacy and ensuring the security of your personal information. 
                  This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our dashboard platform 
                  and related services (collectively, the "Service").
                </p>
                <p className="text-dark lh-base fs-5">
                  By using our Service, you consent to the data practices described in this policy. If you do not agree with our policies and practices, 
                  please do not use our Service.
                </p>
              </div>
            </div>

            <div className="policy-section mb-5">
              <div className="section-header d-flex align-items-center mb-4">
                <div className="section-number bg-primary-600 text-white fw-bold rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>2</div>
                <h3 className="fw-bold text-dark mb-0">Information We Collect</h3>
              </div>
              <div className="ps-5">
                <div className="sub-section mb-4">
                  <h5 className="fw-semibold mb-3 text-primary-600 d-flex align-items-center">
                    <i className="ri-user-line me-2"></i>2.1 Personal Information
                  </h5>
                  <p className="text-dark mb-3 lh-base fs-5">We collect information you provide directly to us, including:</p>
                  <ul className="text-dark mb-4 lh-base ps-4 custom-list">
                    <li className="mb-2">Account information (name, email address, phone number)</li>
                    <li className="mb-2">Profile information (company details, job title, preferences)</li>
                    <li className="mb-2">Authentication credentials (username, password)</li>
                    <li className="mb-2">Communication preferences and settings</li>
                    <li className="mb-2">Payment and billing information for premium services</li>
                  </ul>
                </div>
                
                <div className="sub-section mb-4">
                  <h5 className="fw-semibold mb-3 text-primary-600 d-flex align-items-center">
                    <i className="ri-analytics-line me-2"></i>2.2 Usage Information
                  </h5>
                  <p className="text-dark mb-3 lh-base fs-5">We automatically collect certain information about your use of our Service:</p>
                  <ul className="text-dark mb-4 lh-base ps-4 custom-list">
                    <li className="mb-2">Log data (IP address, browser type, access times, pages viewed)</li>
                    <li className="mb-2">Device information (device type, operating system, unique device identifiers)</li>
                    <li className="mb-2">Usage patterns and analytics data</li>
                    <li className="mb-2">Performance and error logs</li>
                  </ul>
                </div>
                
                <div className="sub-section">
                  <h5 className="fw-semibold mb-3 text-primary-600 d-flex align-items-center">
                    <i className="ri-cookie-line me-2"></i>2.3 Cookies and Tracking Technologies
                  </h5>
                  <p className="text-dark lh-base fs-5">
                    We use cookies, web beacons, and similar technologies to enhance your experience, analyze usage patterns, 
                    and personalize content. You can control cookie settings through your browser preferences.
                  </p>
                </div>
              </div>
            </div>

            <div className="policy-section mb-5">
              <div className="section-header d-flex align-items-center mb-4">
                <div className="section-number bg-primary-600 text-white fw-bold rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>3</div>
                <h3 className="fw-bold text-dark mb-0">How We Use Your Information</h3>
              </div>
              <div className="ps-5">
                <p className="text-dark mb-3 lh-base fs-5">We use the collected information for the following purposes:</p>
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="usage-card bg-light p-3 radius-8 border-start border-4 border-primary-600">
                      <h6 className="fw-semibold text-primary-600 mb-2">Service Provision</h6>
                      <p className="text-dark mb-0 small">To provide, maintain, and improve our dashboard platform</p>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="usage-card bg-light p-3 radius-8 border-start border-4 border-success-600">
                      <h6 className="fw-semibold text-success-600 mb-2">User Management</h6>
                      <p className="text-dark mb-0 small">To create and manage user accounts, authenticate users, and control access</p>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="usage-card bg-light p-3 radius-8 border-start border-4 border-info-600">
                      <h6 className="fw-semibold text-info-600 mb-2">Communication</h6>
                      <p className="text-dark mb-0 small">To send important updates, security alerts, and support messages</p>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="usage-card bg-light p-3 radius-8 border-start border-4 border-warning-600">
                      <h6 className="fw-semibold text-warning-600 mb-2">Analytics</h6>
                      <p className="text-dark mb-0 small">To analyze usage patterns and improve our services</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="policy-section mb-5">
              <div className="section-header d-flex align-items-center mb-4">
                <div className="section-number bg-primary-600 text-white fw-bold rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>4</div>
                <h3 className="fw-bold text-dark mb-0">Information Sharing and Disclosure</h3>
              </div>
              <div className="ps-5">
                <p className="text-dark mb-3 lh-base fs-5">We do not sell, trade, or rent your personal information to third parties. We may share your information in the following circumstances:</p>
                <ul className="text-dark mb-4 lh-base ps-4 custom-list">
                  <li className="mb-2"><strong>Service Providers:</strong> With trusted third-party service providers who assist in our operations</li>
                  <li className="mb-2"><strong>Legal Requirements:</strong> When required by law, court order, or government request</li>
                  <li className="mb-2"><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                  <li className="mb-2"><strong>Protection of Rights:</strong> To protect our rights, property, or safety, or that of our users</li>
                  <li className="mb-2"><strong>Consent:</strong> With your explicit consent for specific purposes</li>
                </ul>
              </div>
            </div>

            <div className="policy-section mb-5">
              <div className="section-header d-flex align-items-center mb-4">
                <div className="section-number bg-primary-600 text-white fw-bold rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>5</div>
                <h3 className="fw-bold text-dark mb-0">Data Security</h3>
              </div>
              <div className="ps-5">
                <p className="text-dark mb-3 lh-base fs-5">We implement comprehensive security measures to protect your personal information:</p>
                <div className="security-grid">
                  <div className="security-item bg-success-50 p-3 radius-8 border border-success-200">
                    <i className="ri-lock-password-line text-success-600 me-2"></i>
                    <span className="text-dark">Encryption of data in transit and at rest</span>
                  </div>
                  <div className="security-item bg-info-50 p-3 radius-8 border border-info-200">
                    <i className="ri-fingerprint-line text-info-600 me-2"></i>
                    <span className="text-dark">Multi-factor authentication</span>
                  </div>
                  <div className="security-item bg-warning-50 p-3 radius-8 border border-warning-200">
                    <i className="ri-shield-check-line text-warning-600 me-2"></i>
                    <span className="text-dark">Regular security audits</span>
                  </div>
                  <div className="security-item bg-primary-50 p-3 radius-8 border border-primary-200">
                    <i className="ri-team-line text-primary-600 me-2"></i>
                    <span className="text-dark">Employee training</span>
                  </div>
                </div>
                <p className="text-dark mt-4 lh-base fs-5">
                  However, no method of transmission over the internet or electronic storage is 100% secure. 
                  We strive to use commercially acceptable means to protect your information but cannot guarantee absolute security.
                </p>
              </div>
            </div>

            <div className="policy-section mb-5">
              <div className="section-header d-flex align-items-center mb-4">
                <div className="section-number bg-primary-600 text-white fw-bold rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>6</div>
                <h3 className="fw-bold text-dark mb-0">Your Rights and Choices</h3>
              </div>
              <div className="ps-5">
                <p className="text-dark mb-3 lh-base fs-5">Depending on your location, you may have the following rights regarding your personal information:</p>
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="rights-card bg-primary-50 p-3 radius-8">
                      <h6 className="fw-semibold text-primary-600 mb-2">Access & Correction</h6>
                      <p className="text-dark mb-0 small">Request access to and correction of your personal information</p>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="rights-card bg-success-50 p-3 radius-8">
                      <h6 className="fw-semibold text-success-600 mb-2">Deletion & Portability</h6>
                      <p className="text-dark mb-0 small">Request deletion and portable copies of your data</p>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="rights-card bg-warning-50 p-3 radius-8">
                      <h6 className="fw-semibold text-warning-600 mb-2">Restriction & Objection</h6>
                      <p className="text-dark mb-0 small">Request restriction and object to processing</p>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="rights-card bg-info-50 p-3 radius-8">
                      <h6 className="fw-semibold text-info-600 mb-2">Withdrawal</h6>
                      <p className="text-dark mb-0 small">Withdraw consent where processing is based on consent</p>
                    </div>
                  </div>
                </div>
                <p className="text-dark mt-4 lh-base fs-5">
                  To exercise these rights, please contact us using the information provided below.
                </p>
              </div>
            </div>

            <div className="policy-section mb-5">
              <div className="section-header d-flex align-items-center mb-4">
                <div className="section-number bg-primary-600 text-white fw-bold rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>7</div>
                <h3 className="fw-bold text-dark mb-0">Data Retention</h3>
              </div>
              <div className="ps-5">
                <p className="text-dark lh-base fs-5">
                  We retain your personal information for as long as necessary to provide our services, comply with legal obligations, 
                  resolve disputes, and enforce our agreements. When we no longer need your information, we will securely delete or 
                  anonymize it in accordance with our data retention policies.
                </p>
              </div>
            </div>

            <div className="policy-section mb-5">
              <div className="section-header d-flex align-items-center mb-4">
                <div className="section-number bg-primary-600 text-white fw-bold rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>8</div>
                <h3 className="fw-bold text-dark mb-0">International Data Transfers</h3>
              </div>
              <div className="ps-5">
                <p className="text-dark lh-base fs-5">
                  Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards 
                  are in place to protect your data during such transfers, including standard contractual clauses and adequacy decisions 
                  where applicable.
                </p>
              </div>
            </div>

            <div className="policy-section mb-5">
              <div className="section-header d-flex align-items-center mb-4">
                <div className="section-number bg-primary-600 text-white fw-bold rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>9</div>
                <h3 className="fw-bold text-dark mb-0">Children's Privacy</h3>
              </div>
              <div className="ps-5">
                <p className="text-dark lh-base fs-5">
                  Our Service is not intended for children under 16 years of age. We do not knowingly collect personal information 
                  from children under 16. If you believe we have collected such information, please contact us immediately, and we 
                  will take steps to remove it.
                </p>
              </div>
            </div>

            <div className="policy-section mb-5">
              <div className="section-header d-flex align-items-center mb-4">
                <div className="section-number bg-primary-600 text-white fw-bold rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>10</div>
                <h3 className="fw-bold text-dark mb-0">Changes to This Privacy Policy</h3>
              </div>
              <div className="ps-5">
                <p className="text-dark lh-base fs-5">
                  We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, 
                  or other factors. We will notify you of any material changes by posting the new policy on this page and updating the 
                  "Last updated" date. We encourage you to review this policy periodically.
                </p>
              </div>
            </div>

            <div className="policy-section mb-5">
              <div className="section-header d-flex align-items-center mb-4">
                <div className="section-number bg-primary-600 text-white fw-bold rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>11</div>
                <h3 className="fw-bold text-dark mb-0">Contact Us</h3>
              </div>
              <div className="ps-5">
                <p className="text-dark mb-3 lh-base fs-5">If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:</p>
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
                  We will respond to your inquiry within 30 days and work to resolve any concerns you may have.
                </p>
              </div>
            </div>

            <div className="policy-section">
              <div className="section-header d-flex align-items-center mb-4">
                <div className="section-number bg-primary-600 text-white fw-bold rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>12</div>
                <h3 className="fw-bold text-dark mb-0">Additional Information</h3>
              </div>
              <div className="ps-5">
                <p className="text-dark lh-base fs-5">
                  This Privacy Policy is part of our broader commitment to transparency and user privacy. For additional information 
                  about our data practices, please refer to our Terms of Service and other applicable policies.
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
        .security-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .security-item {
          display: flex;
          align-items: center;
          font-weight: 500;
        }
        .bg-gradient-primary {
          background: linear-gradient(135deg, var(--bs-primary) 0%, var(--bs-primary-600) 100%);
        }
        .usage-card, .rights-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .usage-card:hover, .rights-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
      `}</style>
    </>
  );
};

export default PrivacyPolicyLayer;
