"use client";
import React from "react";

const TermsOfServiceLayer = () => {
  return (
    <>
      <div className='card basic-data-table radius-12 overflow-hidden'>
        <div className='card-body p-32'>
          <div className="terms-of-service-content">
            <h2 className="mb-5 text-primary-600 fw-bold">Terms of Service</h2>
            <p className="text-dark mb-5 fw-medium">Last updated: {new Date().toLocaleDateString()}</p>
            
            <div className="service-section mb-5">
              <h4 className="fw-bold mb-4 text-dark">1. Service Overview</h4>
              <p className="text-dark mb-3 lh-base">
                Seleric Dashboard provides a comprehensive business intelligence and management platform designed to help organizations 
                streamline operations, gain insights from data, and make informed business decisions. Our platform includes analytics 
                tools, reporting capabilities, user management systems, and integration services.
              </p>
              <p className="text-dark lh-base">
                By subscribing to our service, you gain access to a suite of tools that can transform your business operations 
                and provide valuable insights into your performance metrics.
              </p>
            </div>

            <div className="service-section mb-5">
              <h4 className="fw-bold mb-4 text-dark">2. Service Tiers and Features</h4>
              <h5 className="fw-semibold mb-3 text-dark">2.1 Free Tier</h5>
              <p className="text-dark mb-3 lh-base">Our free tier includes:</p>
              <ul className="text-dark mb-4 lh-base ps-4">
                <li className="mb-2">Basic dashboard access with limited features</li>
                <li className="mb-2">Standard reporting capabilities</li>
                <li className="mb-2">Community support</li>
                <li className="mb-2">Basic user management (up to 3 users)</li>
                <li className="mb-2">Standard data retention (30 days)</li>
              </ul>
              
              <h5 className="fw-semibold mb-3 text-dark">2.2 Professional Tier</h5>
              <p className="text-dark mb-3 lh-base">Professional subscribers receive:</p>
              <ul className="text-dark mb-4 lh-base ps-4">
                <li className="mb-2">Full dashboard functionality</li>
                <li className="mb-2">Advanced analytics and reporting</li>
                <li className="mb-2">Priority customer support</li>
                <li className="mb-2">Extended user management (up to 25 users)</li>
                <li className="mb-2">Enhanced data retention (1 year)</li>
                <li className="mb-2">Custom dashboard templates</li>
                <li className="mb-2">API access for integrations</li>
              </ul>
              
              <h5 className="fw-semibold mb-3 text-dark">2.3 Enterprise Tier</h5>
              <p className="text-dark mb-3 lh-base">Enterprise customers enjoy:</p>
              <ul className="text-dark mb-4 lh-base ps-4">
                <li className="mb-2">All Professional features</li>
                <li className="mb-2">Unlimited user management</li>
                <li className="mb-2">Dedicated account manager</li>
                <li className="mb-2">Custom integrations and development</li>
                <li className="mb-2">Advanced security features</li>
                <li className="mb-2">SLA guarantees</li>
                <li className="mb-2">On-premise deployment options</li>
              </ul>
            </div>

            <div className="service-section mb-5">
              <h4 className="fw-bold mb-4 text-dark">3. Service Availability and Performance</h4>
              <h5 className="fw-semibold mb-3 text-dark">3.1 Uptime Commitment</h5>
              <p className="text-dark mb-3 lh-base">We commit to the following service levels:</p>
              <ul className="text-dark mb-4 lh-base ps-4">
                <li className="mb-2"><strong>Free Tier:</strong> 95% uptime (best effort)</li>
                <li className="mb-2"><strong>Professional Tier:</strong> 99% uptime</li>
                <li className="mb-2"><strong>Enterprise Tier:</strong> 99.9% uptime with SLA guarantees</li>
              </ul>
              
              <h5 className="fw-semibold mb-3 text-dark">3.2 Maintenance Windows</h5>
              <p className="text-dark lh-base">
                Scheduled maintenance is typically performed during low-usage hours (2:00 AM - 6:00 AM IST). 
                We provide 48-hour advance notice for planned maintenance and work to minimize service disruptions.
              </p>
            </div>

            <div className="service-section mb-5">
              <h4 className="fw-bold mb-4 text-dark">4. Data Management and Security</h4>
              <h5 className="fw-semibold mb-3 text-dark">4.1 Data Storage</h5>
              <p className="text-dark mb-3 lh-base">We provide secure data storage with:</p>
              <ul className="text-dark mb-4 lh-base ps-4">
                <li className="mb-2">Enterprise-grade cloud infrastructure</li>
                <li className="mb-2">Data encryption at rest and in transit</li>
                <li className="mb-2">Regular automated backups</li>
                <li className="mb-2">Geographic redundancy for disaster recovery</li>
                <li className="mb-2">Compliance with industry security standards</li>
              </ul>
              
              <h5 className="fw-semibold mb-3 text-dark">4.2 Data Processing</h5>
              <p className="text-dark lh-base">
                Your data is processed in accordance with our Privacy Policy and applicable data protection laws. 
                We implement strict access controls and audit logging to ensure data security and compliance.
              </p>
            </div>

            <div className="service-section mb-5">
              <h4 className="fw-bold mb-4 text-dark">5. Integration and API Services</h4>
              <h5 className="fw-semibold mb-3 text-dark">5.1 Available Integrations</h5>
              <p className="text-dark mb-3 lh-base">Our platform supports integration with:</p>
              <ul className="text-dark mb-4 lh-base ps-4">
                <li className="mb-2">Popular CRM systems (Salesforce, HubSpot, Pipedrive)</li>
                <li className="mb-2">Marketing platforms (Google Analytics, Facebook Ads, Mailchimp)</li>
                <li className="mb-2">E-commerce platforms (Shopify, WooCommerce, Magento)</li>
                <li className="mb-2">Financial systems (QuickBooks, Xero, Stripe)</li>
                <li className="mb-2">Project management tools (Asana, Trello, Jira)</li>
                <li className="mb-2">Custom APIs and webhooks</li>
              </ul>
              
              <h5 className="fw-semibold mb-3 text-dark">5.2 API Usage</h5>
              <p className="text-dark lh-base">
                API access is available for Professional and Enterprise tiers. Usage is subject to rate limits 
                and fair use policies to ensure optimal service performance for all users.
              </p>
            </div>

            <div className="service-section mb-5">
              <h4 className="fw-bold mb-4 text-dark">6. Customer Support and Training</h4>
              <h5 className="fw-semibold mb-3 text-dark">6.1 Support Channels</h5>
              <p className="text-dark mb-3 lh-base">We provide support through multiple channels:</p>
              <ul className="text-dark mb-4 lh-base ps-4">
                <li className="mb-2"><strong>Free Tier:</strong> Community forums and documentation</li>
                <li className="mb-2"><strong>Professional Tier:</strong> Email support with 24-hour response time</li>
                <li className="mb-2"><strong>Enterprise Tier:</strong> Priority phone and email support with 4-hour response time</li>
              </ul>
              
              <h5 className="fw-semibold mb-3 text-dark">6.2 Training and Onboarding</h5>
              <p className="text-dark lh-base">
                Professional and Enterprise customers receive comprehensive onboarding and training sessions. 
                We also provide video tutorials, webinars, and best practice guides to help you maximize 
                the value of our platform.
              </p>
            </div>

            <div className="service-section mb-5">
              <h4 className="fw-bold mb-4 text-dark">7. Billing and Payment Terms</h4>
              <h5 className="fw-semibold mb-3 text-dark">7.1 Billing Cycles</h5>
              <p className="text-dark mb-3 lh-base">We offer flexible billing options:</p>
              <ul className="text-dark mb-4 lh-base ps-4">
                <li className="mb-2">Monthly billing for all tiers</li>
                <li className="mb-2">Annual billing with 20% discount for Professional and Enterprise</li>
                <li className="mb-2">Enterprise customers may qualify for custom billing arrangements</li>
              </ul>
              
              <h5 className="fw-semibold mb-3 text-dark">7.2 Payment Methods</h5>
              <p className="text-dark mb-3 lh-base">We accept various payment methods:</p>
              <ul className="text-dark mb-4 lh-base ps-4">
                <li className="mb-2">Credit and debit cards (Visa, MasterCard, American Express)</li>
                <li className="mb-2">Digital wallets (PayPal, Google Pay, Apple Pay)</li>
                <li className="mb-2">Bank transfers for Enterprise customers</li>
                <li className="mb-2">Invoice-based payments for annual subscriptions</li>
              </ul>
            </div>

            <div className="service-section mb-5">
              <h4 className="fw-bold mb-4 text-dark">8. Service Limitations and Restrictions</h4>
              <p className="text-dark mb-3 lh-base">To ensure optimal service performance, we implement the following limitations:</p>
              <ul className="text-dark mb-4 lh-base ps-4">
                <li className="mb-2"><strong>Data Storage:</strong> Limits based on subscription tier</li>
                <li className="mb-2"><strong>API Calls:</strong> Rate limiting to prevent abuse</li>
                <li className="mb-2"><strong>User Accounts:</strong> Maximum users per tier</li>
                <li className="mb-2"><strong>Data Retention:</strong> Varies by subscription level</li>
                <li className="mb-2"><strong>Export Limits:</strong> Monthly export quotas</li>
              </ul>
              <p className="text-dark lh-base">
                These limitations are designed to provide fair access to all users while maintaining service quality.
              </p>
            </div>

            <div className="service-section mb-5">
              <h4 className="fw-bold mb-4 text-dark">9. Service Updates and Improvements</h4>
              <p className="text-dark mb-3 lh-base">We continuously improve our platform through:</p>
              <ul className="text-dark mb-4 lh-base ps-4">
                <li className="mb-2">Regular feature updates and enhancements</li>
                <li className="mb-2">Performance optimizations and bug fixes</li>
                <li className="mb-2">Security updates and vulnerability patches</li>
                <li className="mb-2">New integration partnerships</li>
                <li className="mb-2">User experience improvements based on feedback</li>
              </ul>
              <p className="text-dark lh-base">
                Updates are typically deployed automatically with minimal service disruption. 
                Major updates are communicated in advance through our notification system.
              </p>
            </div>

            <div className="service-section mb-5">
              <h4 className="fw-bold mb-4 text-dark">10. Service Termination and Data Export</h4>
              <h5 className="fw-semibold mb-3 text-dark">10.1 Termination Process</h5>
              <p className="text-dark mb-3 lh-base">You may cancel your subscription at any time:</p>
              <ul className="text-dark mb-4 lh-base ps-4">
                <li className="mb-2">Cancel through your account settings</li>
                <li className="mb-2">Contact our support team</li>
                <li className="mb-2">Provide written notice of cancellation</li>
              </ul>
              
              <h5 className="fw-semibold mb-3 text-dark">10.2 Data Export and Deletion</h5>
              <p className="text-dark lh-base">
                Upon cancellation, you have 30 days to export your data. We provide export tools in multiple formats 
                (CSV, JSON, Excel). After 30 days, your data will be permanently deleted in accordance with our 
                data retention policies.
              </p>
            </div>

            <div className="service-section mb-5">
              <h4 className="fw-bold mb-4 text-dark">11. Service Level Agreements (Enterprise)</h4>
              <p className="text-dark mb-3 lh-base">Enterprise customers receive guaranteed service levels:</p>
              <ul className="text-dark mb-4 lh-base ps-4">
                <li className="mb-2"><strong>Uptime:</strong> 99.9% monthly availability</li>
                <li className="mb-2"><strong>Response Time:</strong> 4 hours for critical issues</li>
                <li className="mb-2"><strong>Resolution Time:</strong> 24 hours for high-priority issues</li>
                <li className="mb-2"><strong>Data Recovery:</strong> 4-hour RTO (Recovery Time Objective)</li>
                <li className="mb-2"><strong>Support Hours:</strong> 24/7 dedicated support</li>
              </ul>
              <p className="text-dark lh-base">
                Failure to meet these SLAs may result in service credits as outlined in your Enterprise agreement.
              </p>
            </div>

            <div className="service-section mb-5">
              <h4 className="fw-bold mb-4 text-dark">12. Compliance and Certifications</h4>
              <p className="text-dark mb-3 lh-base">Our platform maintains compliance with:</p>
              <ul className="text-dark mb-4 lh-base ps-4">
                <li className="mb-2">GDPR (General Data Protection Regulation)</li>
                <li className="mb-2">ISO 27001 (Information Security Management)</li>
                <li className="mb-2">SOC 2 Type II (Security, Availability, Processing Integrity)</li>
                <li className="mb-2">PCI DSS (Payment Card Industry Data Security Standard)</li>
                <li className="mb-2">Indian IT Act and related regulations</li>
              </ul>
              <p className="text-dark lh-base">
                We regularly undergo third-party audits and assessments to maintain these certifications.
              </p>
            </div>

            <div className="service-section mb-5">
              <h4 className="fw-bold mb-4 text-dark">13. Third-Party Services and Dependencies</h4>
              <p className="text-dark lh-base">
                Our platform relies on trusted third-party services for infrastructure, security, and functionality. 
                While we carefully select these partners and maintain backup systems, we cannot guarantee their 
                performance or availability. We monitor these dependencies and have contingency plans in place.
              </p>
            </div>

            <div className="service-section mb-5">
              <h4 className="fw-bold mb-4 text-dark">14. Contact Information</h4>
              <p className="text-dark mb-3 lh-base">For questions about our Terms of Service or to discuss your specific needs, please contact us:</p>
              <div className="contact-info bg-light p-4 radius-8 border border-light">
                <p className="mb-2 fw-medium"><strong>Email:</strong> <span className="text-primary-600">admin@seleric.com</span></p>
                <p className="mb-2 fw-medium"><strong>Address:</strong> B1/D4, Mohan Cooperative Industrial Estate, New Delhi - 110044</p>
                <p className="mb-0 fw-medium"><strong>Phone:</strong> 9818856823</p>
              </div>
              <p className="text-dark mt-4 lh-base">
                Our team is available to discuss your requirements and help you choose the right service tier for your business needs.
              </p>
            </div>

            <div className="service-section">
              <h4 className="fw-bold mb-4 text-dark">15. Service Commitment</h4>
              <p className="text-dark lh-base">
                At Seleric, we are committed to providing exceptional service and continuously improving our platform. 
                Your success is our success, and we work tirelessly to ensure our dashboard platform meets and exceeds 
                your business intelligence and management needs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TermsOfServiceLayer;
