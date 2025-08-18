"use client";
import { useEffect, useRef, useState } from "react";
import hljs from "highlight.js";
import dynamic from "next/dynamic";
import "highlight.js/styles/github.css";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

const PrivacyPolicyLayer = () => {
  const quillRef = useRef(null);
  const [value, setValue] = useState(`<div id="editor">
        <h4>Privacy Policy</h4>
        <p>Last updated: ${new Date().toLocaleDateString()}</p>
        
        <h6>1. Information We Collect</h6>
        <p>We collect information you provide directly to us, such as when you create an account, make a purchase, or contact us for support. This may include:</p>
        <ul>
          <li>Name, email address, and contact information</li>
          <li>Account credentials and profile information</li>
          <li>Payment and billing information</li>
          <li>Communication preferences and settings</li>
        </ul>
        
        <h6>2. How We Use Your Information</h6>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide, maintain, and improve our services</li>
          <li>Process transactions and send related information</li>
          <li>Send technical notices, updates, and support messages</li>
          <li>Respond to your comments and questions</li>
          <li>Protect against fraudulent or illegal activity</li>
        </ul>
        
        <h6>3. Information Sharing</h6>
        <p>We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy. We may share information with:</p>
        <ul>
          <li>Service providers who assist in our operations</li>
          <li>Legal authorities when required by law</li>
          <li>Business partners with your explicit consent</li>
        </ul>
        
        <h6>4. Data Security</h6>
        <p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.</p>
        
        <h6>5. Your Rights</h6>
        <p>You have the right to:</p>
        <ul>
          <li>Access and update your personal information</li>
          <li>Request deletion of your data</li>
          <li>Opt-out of marketing communications</li>
          <li>File a complaint with supervisory authorities</li>
        </ul>
        
        <h6>6. Cookies and Tracking</h6>
        <p>We use cookies and similar technologies to enhance your experience, analyze usage patterns, and personalize content. You can control cookie settings through your browser preferences.</p>
        
        <h6>7. Children's Privacy</h6>
        <p>Our services are not intended for children under 13. We do not knowingly collect personal information from children under 13. If you believe we have collected such information, please contact us immediately.</p>
        
        <h6>8. International Transfers</h6>
        <p>Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data during such transfers.</p>
        
        <h6>9. Changes to This Policy</h6>
        <p>We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.</p>
        
        <h6>10. Contact Us</h6>
        <p>If you have any questions about this privacy policy or our data practices, please contact us at:</p>
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
            placeholder='Compose privacy policy content...'
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

export default PrivacyPolicyLayer;
