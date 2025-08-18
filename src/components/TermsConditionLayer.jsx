"use client";
import React from "react";

const TermsConditionLayer = () => {
  return (
    <>
      <div className='card basic-data-table radius-12 overflow-hidden'>
        <div className='card-body p-32'>
          <div className="terms-content">
            {/* Stylish Header Section */}
            <div className="text-center mb-5 pb-4 border-bottom border-2 border-primary-200">
              <div className="d-inline-block p-3 bg-primary-50 radius-12 mb-3">
                <i className="ri-file-text-line text-primary-600" style={{fontSize: '3rem'}}></i>
              </div>
              <h1 className="display-6 fw-bold text-primary-600 mb-2">Terms and Conditions</h1>
              {/* <p className="text-muted fw-medium mb-0">Last updated: {new Date().toLocaleDateString()}</p> */}
            </div>
            
            <div className="terms-section mb-5">
              <div className="section-header d-flex align-items-center mb-4">
                <div className="section-number bg-primary-600 text-white fw-bold rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>1</div>
                <h3 className="fw-bold text-dark mb-0">Acceptance of Terms</h3>
              </div>
              <div className="ps-5">
                <p className="text-dark mb-3 lh-base fs-5">
                  By accessing and using Seleric Dashboard ("the Service"), you accept and agree to be bound by the terms and provisions 
                  of this agreement. These Terms and Conditions constitute a legally binding agreement between you and Seleric regarding 
                  your use of our dashboard platform and related services.
                </p>
                <p className="text-dark lh-base fs-5">
                  If you do not agree to abide by these terms, please do not use our Service. Your continued use of the Service 
                  constitutes acceptance of any modifications to these terms.
                </p>
              </div>
            </div>

            <div className="terms-section mb-5">
              <div className="section-header d-flex align-items-center mb-4">
                <div className="section-number bg-primary-600 text-white fw-bold rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>2</div>
                <h3 className="fw-bold text-dark mb-0">Service Description</h3>
              </div>
              <div className="ps-5">
                <p className="text-dark mb-3 lh-base fs-5">
                  Seleric Dashboard is a comprehensive business management platform that provides:
                </p>
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <div className="feature-card bg-light p-3 radius-8 border-start border-4 border-primary-600">
                      <i className="ri-bar-chart-line text-primary-600 me-2"></i>
                      <span className="text-dark fw-medium">Advanced analytics and reporting tools</span>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="feature-card bg-light p-3 radius-8 border-start border-4 border-success-600">
                      <i className="ri-team-line text-success-600 me-2"></i>
                      <span className="text-dark fw-medium">User and role management systems</span>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="feature-card bg-light p-3 radius-8 border-start border-4 border-info-600">
                      <i className="ri-dashboard-line text-info-600 me-2"></i>
                      <span className="text-dark fw-medium">Business intelligence dashboards</span>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="feature-card bg-light p-3 radius-8 border-start border-4 border-warning-600">
                      <i className="ri-pie-chart-line text-warning-600 me-2"></i>
                      <span className="text-dark fw-medium">Data visualization and insights</span>
                    </div>
                  </div>
                </div>
                <p className="text-dark lh-base fs-5">
                  We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time with reasonable notice.
                </p>
              </div>
            </div>

            <div className="terms-section mb-5">
              <div className="section-header d-flex align-items-center mb-4">
                <div className="section-number bg-primary-600 text-white fw-bold rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>3</div>
                <h3 className="fw-bold text-dark mb-0">User Accounts and Registration</h3>
              </div>
              <div className="ps-5">
                <div className="sub-section mb-4">
                  <h5 className="fw-semibold mb-3 text-primary-600 d-flex align-items-center">
                    <i className="ri-user-add-line me-2"></i>3.1 Account Creation
                  </h5>
                  <p className="text-dark mb-3 lh-base fs-5">To access certain features of the Service, you must create an account by providing:</p>
                  <ul className="text-dark mb-4 lh-base ps-4 custom-list">
                    <li className="mb-2">Valid and accurate personal information</li>
                    <li className="mb-2">A unique username and secure password</li>
                    <li className="mb-2">Verifiable email address and contact details</li>
                    <li className="mb-2">Company information (for business accounts)</li>
                  </ul>
                </div>
                
                <div className="sub-section">
                  <h5 className="fw-semibold mb-3 text-primary-600 d-flex align-items-center">
                    <i className="ri-shield-user-line me-2"></i>3.2 Account Responsibilities
                  </h5>
                  <p className="text-dark mb-3 lh-base fs-5">You are responsible for:</p>
                  <ul className="text-dark mb-4 lh-base ps-4 custom-list">
                    <li className="mb-2">Maintaining the confidentiality of your account credentials</li>
                    <li className="mb-2">All activities that occur under your account</li>
                    <li className="mb-2">Notifying us immediately of any unauthorized use</li>
                    <li className="mb-2">Ensuring your account information remains accurate and current</li>
                    <li className="mb-2">Keeping your password secure and changing it regularly</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="terms-section mb-5">
              <div className="section-header d-flex align-items-center mb-4">
                <div className="section-number bg-primary-600 text-white fw-bold rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>4</div>
                <h3 className="fw-bold text-dark mb-0">Acceptable Use Policy</h3>
              </div>
              <div className="ps-5">
                <p className="text-dark mb-3 lh-base fs-5">You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree NOT to:</p>
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="prohibition-card bg-danger-50 p-3 radius-8 border border-danger-200">
                      <i className="ri-error-warning-line text-danger-600 me-2"></i>
                      <span className="text-dark">Use the Service for any illegal purpose</span>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="prohibition-card bg-danger-50 p-3 radius-8 border border-danger-200">
                      <i className="ri-lock-line text-danger-600 me-2"></i>
                      <span className="text-dark">Attempt unauthorized access to systems</span>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="prohibition-card bg-danger-50 p-3 radius-8 border border-danger-200">
                      <i className="ri-bug-line text-danger-600 me-2"></i>
                      <span className="text-dark">Interfere with Service operation</span>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="prohibition-card bg-danger-50 p-3 radius-8 border border-danger-200">
                      <i className="ri-spam-line text-danger-600 me-2"></i>
                      <span className="text-dark">Transmit harmful content</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="terms-section mb-5">
              <div className="section-header d-flex align-items-center mb-4">
                <div className="section-number bg-primary-600 text-white fw-bold rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>5</div>
                <h3 className="fw-bold text-dark mb-0">Intellectual Property Rights</h3>
              </div>
              <div className="ps-5">
                <div className="sub-section mb-4">
                  <h5 className="fw-semibold mb-3 text-primary-600 d-flex align-items-center">
                    <i className="ri-copyright-line me-2"></i>5.1 Our Rights
                  </h5>
                  <p className="text-dark mb-3 lh-base fs-5">
                    The Service and its original content, features, functionality, and design are owned by Seleric and are protected by:
                  </p>
                  <ul className="text-dark mb-4 lh-base ps-4 custom-list">
                    <li className="mb-2">Copyright laws and international treaties</li>
                    <li className="mb-2">Trademark and service mark protections</li>
                    <li className="mb-2">Patent and trade secret laws</li>
                    <li className="mb-2">Other intellectual property rights</li>
                  </ul>
                </div>
                
                <div className="sub-section">
                  <h5 className="fw-semibold mb-3 text-primary-600 d-flex align-items-center">
                    <i className="ri-user-star-line me-2"></i>5.2 Your Rights
                  </h5>
                  <p className="text-dark lh-base fs-5">
                    You retain ownership of content you create or upload to the Service. By using our Service, you grant us a limited, 
                    non-exclusive license to use, store, and display your content solely for the purpose of providing the Service.
                  </p>
                </div>
              </div>
            </div>

            <div className="terms-section mb-5">
              <div className="section-header d-flex align-items-center mb-4">
                <div className="section-number bg-primary-600 text-white fw-bold rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>6</div>
                <h3 className="fw-bold text-dark mb-0">Privacy and Data Protection</h3>
              </div>
              <div className="ps-5">
                <p className="text-dark lh-base fs-5">
                  Your privacy is important to us. Our collection, use, and protection of your personal information is governed by 
                  our Privacy Policy, which is incorporated into these Terms by reference. By using the Service, you consent to 
                  our data practices as described in our Privacy Policy.
                </p>
              </div>
            </div>

            <div className="terms-section mb-5">
              <div className="section-header d-flex align-items-center mb-4">
                <div className="section-number bg-primary-600 text-white fw-bold rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>7</div>
                <h3 className="fw-bold text-dark mb-0">Service Availability and Maintenance</h3>
              </div>
              <div className="ps-5">
                <p className="text-dark mb-3 lh-base fs-5">We strive to maintain high service availability but cannot guarantee:</p>
                <ul className="text-dark mb-4 lh-base ps-4 custom-list">
                  <li className="mb-2">Uninterrupted or error-free operation</li>
                  <li className="mb-2">Specific response times or performance levels</li>
                  <li className="mb-2">Compatibility with all devices or browsers</li>
                  <li className="mb-2">Availability during scheduled maintenance windows</li>
                </ul>
                <p className="text-dark lh-base fs-5">
                  We will provide reasonable notice for scheduled maintenance and work to minimize service disruptions.
                </p>
              </div>
            </div>

            <div className="terms-section mb-5">
              <div className="section-header d-flex align-items-center mb-4">
                <div className="section-number bg-primary-600 text-white fw-bold rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>8</div>
                <h3 className="fw-bold text-dark mb-0">Payment Terms and Billing</h3>
              </div>
              <div className="ps-5">
                <div className="sub-section mb-4">
                  <h5 className="fw-semibold mb-3 text-primary-600 d-flex align-items-center">
                    <i className="ri-bank-card-line me-2"></i>8.1 Subscription Plans
                  </h5>
                  <p className="text-dark mb-3 lh-base fs-5">For paid subscription plans:</p>
                  <ul className="text-dark mb-4 lh-base ps-4 custom-list">
                    <li className="mb-2">Fees are billed in advance on a recurring basis</li>
                    <li className="mb-2">All fees are non-refundable except as required by law</li>
                    <li className="mb-2">We may change pricing with 30 days written notice</li>
                    <li className="mb-2">Failure to pay may result in service suspension or termination</li>
                  </ul>
          </div>

                <div className="sub-section">
                  <h5 className="fw-semibold mb-3 text-primary-600 d-flex align-items-center">
                    <i className="ri-gift-line me-2"></i>8.2 Free Tier
                  </h5>
                  <p className="text-dark lh-base fs-5">
                    We may offer a free tier with limited features. We reserve the right to modify or discontinue free services 
                    at any time without notice.
                  </p>
                </div>
              </div>
            </div>

            <div className="terms-section mb-5">
              <div className="section-header d-flex align-items-center mb-4">
                <div className="section-number bg-primary-600 text-white fw-bold rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>9</div>
                <h3 className="fw-bold text-dark mb-0">Limitation of Liability</h3>
              </div>
              <div className="ps-5">
                <p className="text-dark mb-3 lh-base fs-5">To the maximum extent permitted by law, Seleric shall not be liable for:</p>
                <ul className="text-dark mb-4 lh-base ps-4 custom-list">
                  <li className="mb-2">Indirect, incidental, special, or consequential damages</li>
                  <li className="mb-2">Loss of profits, data, use, goodwill, or other intangible losses</li>
                  <li className="mb-2">Damages resulting from unauthorized access to your account</li>
                  <li className="mb-2">Service interruptions or data loss</li>
                  <li className="mb-2">Third-party actions or content</li>
                </ul>
                <p className="text-dark lh-base fs-5">
                  Our total liability shall not exceed the amount you paid for the Service in the 12 months preceding the claim.
                </p>
              </div>
            </div>

            <div className="terms-section mb-5">
              <div className="section-header d-flex align-items-center mb-4">
                <div className="section-number bg-primary-600 text-white fw-bold rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>10</div>
                <h3 className="fw-bold text-dark mb-0">Indemnification</h3>
              </div>
              <div className="ps-5">
                <p className="text-dark lh-base fs-5">
                  You agree to defend, indemnify, and hold harmless Seleric and its officers, directors, employees, and agents 
                  from and against any claims, damages, obligations, losses, liabilities, costs, or debt arising from your use 
                  of the Service, violation of these Terms, or violation of any third-party rights.
                </p>
              </div>
            </div>

            <div className="terms-section mb-5">
              <div className="section-header d-flex align-items-center mb-4">
                <div className="section-number bg-primary-600 text-white fw-bold rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>11</div>
                <h3 className="fw-bold text-dark mb-0">Termination and Suspension</h3>
              </div>
              <div className="ps-5">
                <div className="sub-section mb-4">
                  <h5 className="fw-semibold mb-3 text-primary-600 d-flex align-items-center">
                    <i className="ri-logout-box-line me-2"></i>11.1 Your Rights
                  </h5>
                  <p className="text-dark mb-3 lh-base fs-5">You may terminate your account at any time by:</p>
                  <ul className="text-dark mb-4 lh-base ps-4 custom-list">
                    <li className="mb-2">Contacting our support team</li>
                    <li className="mb-2">Using the account deletion feature in your settings</li>
                    <li className="mb-2">Providing written notice of termination</li>
                  </ul>
        </div>

                <div className="sub-section">
                  <h5 className="fw-semibold mb-3 text-primary-600 d-flex align-items-center">
                    <i className="ri-shield-cross-line me-2"></i>11.2 Our Rights
                  </h5>
                  <p className="text-dark lh-base fs-5">
                    We may terminate or suspend your access immediately for violations of these Terms, fraudulent activity, 
                    or to protect the security of our Service and other users.
                  </p>
                </div>
              </div>
            </div>

            <div className="terms-section mb-5">
              <div className="section-header d-flex align-items-center mb-4">
                <div className="section-number bg-primary-600 text-white fw-bold rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>12</div>
                <h3 className="fw-bold text-dark mb-0">Governing Law and Dispute Resolution</h3>
              </div>
              <div className="ps-5">
                <p className="text-dark mb-3 lh-base fs-5">These Terms shall be governed by the laws of India. Any disputes shall be resolved through:</p>
                <ul className="text-dark mb-4 lh-base ps-4 custom-list">
                  <li className="mb-2">Good faith negotiations between the parties</li>
                  <li className="mb-2">Mediation if negotiations fail</li>
                  <li className="mb-2">Arbitration as a final resolution method</li>
                  <li className="mb-2">Legal proceedings in courts of competent jurisdiction in New Delhi, India</li>
                </ul>
              </div>
            </div>

            <div className="terms-section mb-5">
              <div className="section-header d-flex align-items-center mb-4">
                <div className="section-number bg-primary-600 text-white fw-bold rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>13</div>
                <h3 className="fw-bold text-dark mb-0">Changes to Terms</h3>
              </div>
              <div className="ps-5">
                <p className="text-dark mb-3 lh-base fs-5">We reserve the right to modify these Terms at any time. Material changes will be communicated through:</p>
                <ul className="text-dark mb-4 lh-base ps-4 custom-list">
                  <li className="mb-2">Email notifications to registered users</li>
                  <li className="mb-2">Prominent notices on our website</li>
                  <li className="mb-2">Updates to the "Last updated" date</li>
                </ul>
                <p className="text-dark lh-base fs-5">
                  Continued use of the Service after changes constitutes acceptance of the new Terms.
                </p>
              </div>
            </div>

            <div className="terms-section mb-5">
              <div className="section-header d-flex align-items-center mb-4">
                <div className="section-number bg-primary-600 text-white fw-bold rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>14</div>
                <h3 className="fw-bold text-dark mb-0">Severability and Waiver</h3>
              </div>
              <div className="ps-5">
                <p className="text-dark lh-base fs-5">
                  If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force. 
                  Our failure to enforce any right or provision does not constitute a waiver of that right or provision.
                </p>
              </div>
            </div>

            <div className="terms-section mb-5">
              <div className="section-header d-flex align-items-center mb-4">
                <div className="section-number bg-primary-600 text-white fw-bold rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>15</div>
                <h3 className="fw-bold text-dark mb-0">Contact Information</h3>
              </div>
              <div className="ps-5">
                <p className="text-dark mb-3 lh-base fs-5">For questions about these Terms and Conditions, please contact us:</p>
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
                  We will respond to your inquiry within 48 hours during business days.
                </p>
              </div>
            </div>

            <div className="terms-section">
              <div className="section-header d-flex align-items-center mb-4">
                <div className="section-number bg-primary-600 text-white fw-bold rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>16</div>
                <h3 className="fw-bold text-dark mb-0">Entire Agreement</h3>
              </div>
              <div className="ps-5">
                <p className="text-dark lh-base fs-5">
                  These Terms and Conditions, together with our Privacy Policy and any other policies referenced herein, 
                  constitute the entire agreement between you and Seleric regarding the Service. These Terms supersede all 
                  prior agreements, representations, and understandings between the parties.
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
        .bg-gradient-primary {
          background: linear-gradient(135deg, var(--bs-primary) 0%, var(--bs-primary-600) 100%);
        }
        .feature-card, .prohibition-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .feature-card:hover, .prohibition-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
      `}</style>
    </>
  );
};

export default TermsConditionLayer;
