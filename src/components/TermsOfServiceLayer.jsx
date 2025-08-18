"use client";
import { useEffect, useRef, useState } from "react";
import hljs from "highlight.js";
import dynamic from "next/dynamic";
import "highlight.js/styles/github.css";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

const TermsOfServiceLayer = () => {
  const quillRef = useRef(null);
  const [value, setValue] = useState(`<div id="editor">
        <h4>Terms of Service</h4>
        <p>Last updated: ${new Date().toLocaleDateString()}</p>
        
        <h6>1. Service Description</h6>
        <p>Seleric Dashboard provides a comprehensive business management platform that includes analytics, reporting, user management, and various business tools. Our services are designed to help businesses streamline their operations and make data-driven decisions.</p>
        
        <h6>2. Service Availability</h6>
        <p>We strive to maintain high service availability but cannot guarantee uninterrupted access. We may perform maintenance, updates, or modifications that could temporarily affect service availability.</p>
        
        <h6>3. User Responsibilities</h6>
        <p>As a user of our service, you agree to:</p>
        <ul>
          <li>Provide accurate and complete information</li>
          <li>Maintain the security of your account</li>
          <li>Use the service in compliance with applicable laws</li>
          <li>Not attempt to gain unauthorized access to our systems</li>
          <li>Report any security concerns immediately</li>
        </ul>
        
        <h6>4. Data and Privacy</h6>
        <p>We are committed to protecting your data and privacy. Our data handling practices are outlined in our Privacy Policy. By using our service, you consent to our data collection and use practices as described therein.</p>
        
        <h6>5. Service Limitations</h6>
        <p>Our service is provided "as is" and "as available." We do not guarantee that the service will meet your specific requirements or that it will be error-free or uninterrupted.</p>
        
        <h6>6. Payment Terms</h6>
        <p>If you subscribe to a paid plan:</p>
        <ul>
          <li>Fees are billed in advance on a recurring basis</li>
          <li>All fees are non-refundable except as required by law</li>
          <li>We may change our pricing with 30 days notice</li>
          <li>Failure to pay may result in service suspension</li>
        </ul>
        
        <h6>7. Termination</h6>
        <p>You may cancel your account at any time. We may terminate or suspend your access to the service immediately, without prior notice, for conduct that we believe violates these Terms of Service or is harmful to other users or our business.</p>
        
        <h6>8. Intellectual Property</h6>
        <p>The service and its original content, features, and functionality are owned by Seleric and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.</p>
        
        <h6>9. Third-Party Services</h6>
        <p>Our service may integrate with third-party services. We are not responsible for the content, privacy policies, or practices of any third-party services.</p>
        
        <h6>10. Limitation of Liability</h6>
        <p>To the maximum extent permitted by law, Seleric shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.</p>
        
        <h6>11. Indemnification</h6>
        <p>You agree to defend, indemnify, and hold harmless Seleric and its officers, directors, employees, and agents from and against any claims, damages, obligations, losses, liabilities, costs, or debt arising from your use of the service.</p>
        
        <h6>12. Governing Law</h6>
        <p>These Terms of Service shall be governed by and construed in accordance with the laws of [Your Jurisdiction], without regard to its conflict of law provisions.</p>
        
        <h6>13. Changes to Terms</h6>
        <p>We reserve the right to modify these terms at any time. We will notify users of any material changes via email or through the service. Continued use of the service after changes constitutes acceptance of the new terms.</p>
        
        <h6>14. Contact Information</h6>
        <p>For questions about these Terms of Service, please contact us at:</p>
        <p>Email: admin@seleric.com<br>
        Address: B1/D4, Mohan Cooperative Industrial Estate, New Delhi - 110044<br>
        Phone: 9818856823</p>
      </div>`);
  
  const [isHighlightReady, setIsHighlightReady] = useState(false);

  useEffect(() => {
    // Load highlight.js configuration and signal when ready
    hljs?.configure({
      languages: [
        "javascript",
        "ruby",
        "python",
        "java",
        "csharp",
        "cpp",
        "go",
        "php",
        "swift",
      ],
    });
  }, []);

  const handleSave = () => {
    const editorContent = quillRef.current.getEditor().root.innerHTML;
    console.log("Editor content:", editorContent);
  };

  // Quill editor modules with syntax highlighting (only load if highlight.js is ready)
  const modules = isHighlightReady
    ? {
        syntax: {
          highlight: (text) => hljs?.highlightAuto(text).value, // Enable highlight.js in Quill
        },
        toolbar: {
          container: "#toolbar-container", // Custom toolbar container
        },
      }
    : {
        toolbar: {
          container: "#toolbar-container", // Custom toolbar container
        },
      };

  const formats = [
    "font",
    "size",
    "bold",
    "italic",
    "underline",
    "strike",
    "color",
    "background",
    "script",
    "header",
    "blockquote",
    "code-block",
    "list",
    "indent",
    "direction",
    "align",
    "link",
    "image",
    "video",
    "formula",
  ];

  return (
    <>
      <div className='card basic-data-table radius-12 overflow-hidden'>
        <div className='card-body p-0'>
          {/* Editor Toolbar */}
          <div id='toolbar-container'>
            <span className='ql-formats'>
              <select className='ql-font'></select>
              <select className='ql-size'></select>
            </span>
            <span className='ql-formats'>
              <button className='ql-bold'></button>
              <button className='ql-italic'></button>
              <button className='ql-underline'></button>
              <button className='ql-strike'></button>
            </span>
            <span className='ql-formats'>
              <select className='ql-color'></select>
              <select className='ql-background'></select>
            </span>
            <span className='ql-formats'>
              <button className='ql-script' value='sub'></button>
              <button className='ql-script' value='super'></button>
            </span>
            <span className='ql-formats'>
              <button className='ql-header' value='1'></button>
              <button className='ql-header' value='2'></button>
              <button className='ql-blockquote'></button>
              <button className='ql-code-block'></button>
            </span>
            <span className='ql-formats'>
              <button className='ql-list' value='ordered'></button>
              <button className='ql-list' value='bullet'></button>
              <button className='ql-indent' value='-1'></button>
              <button className='ql-indent' value='+1'></button>
            </span>
            <span className='ql-formats'>
              <button className='ql-direction' value='rtl'></button>
              <select className='ql-align'></select>
            </span>
            <span className='ql-formats'>
              <button className='ql-link'></button>
              <button className='ql-image'></button>
              <button className='ql-video'></button>
              <button className='ql-formula'></button>
            </span>
            <span className='ql-formats'>
              <button className='ql-clean'></button>
            </span>
          </div>

          {/* Quill Editor */}
          <ReactQuill
            ref={quillRef}
            theme='snow'
            value={value}
            onChange={setValue}
            modules={modules}
            formats={formats}
            placeholder='Compose terms of service content...'
          />
        </div>

        <div className='card-footer p-24 bg-base border border-bottom-0 border-end-0 border-start-0'>
          <div className='d-flex align-items-center justify-content-center gap-3'>
            <button
              type='button'
              className='border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-50 py-11 radius-8'
            >
              Cancel
            </button>
            <button
              type='button'
              className='btn btn-primary border border-primary-600 text-md px-28 py-12 radius-8'
              onClick={handleSave}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default TermsOfServiceLayer;
