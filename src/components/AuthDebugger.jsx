"use client";
import { useEffect, useState } from "react";
import { useUser } from "@/helper/UserContext";
import { Icon } from "@iconify/react/dist/iconify.js";

const AuthDebugger = () => {
  const { user, token, role, loading } = useUser();
  const [debugInfo, setDebugInfo] = useState({});
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateDebugInfo = () => {
      const info = {
        user: user ? {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          emailVerified: user.emailVerified,
        } : null,
        token: token ? {
          exists: true,
          length: token.length,
          startsWithEyJ: token.startsWith("eyJ"),
          preview: token.substring(0, 20) + "...",
        } : null,
        role,
        loading,
        localStorage: {
          idToken: localStorage.getItem("idToken") ? "exists" : "missing",
          userRole: localStorage.getItem("userRole") || "missing",
          userData: localStorage.getItem("userData") ? "exists" : "missing",
        },
        timestamp: new Date().toLocaleString(),
      };
      setDebugInfo(info);
    };

    updateDebugInfo();
    const interval = setInterval(updateDebugInfo, 2000);
    return () => clearInterval(interval);
  }, [user, token, role, loading]);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="btn btn-sm btn-outline-info position-fixed"
        style={{
          bottom: "20px",
          right: "20px",
          zIndex: 9999,
        }}
      >
        <Icon icon="mdi:bug" className="me-1" />
        Debug Auth
      </button>
    );
  }

  return (
    <div
      className="position-fixed bg-white border shadow-lg rounded p-3"
      style={{
        bottom: "20px",
        right: "20px",
        width: "400px",
        maxHeight: "500px",
        overflow: "auto",
        zIndex: 9999,
        fontSize: "12px",
      }}
    >
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0">Authentication Debug</h6>
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() => setIsVisible(false)}
        >
          <Icon icon="mdi:close" />
        </button>
      </div>
      
      <div className="mb-2">
        <strong>Status:</strong> {loading ? "Loading..." : "Ready"}
      </div>
      
      <div className="mb-2">
        <strong>User:</strong> {user ? "✅ Authenticated" : "❌ Not authenticated"}
        {user && (
          <div className="ms-2">
            <div>UID: {user.uid}</div>
            <div>Email: {user.email}</div>
            <div>Name: {user.displayName || "N/A"}</div>
            <div>Verified: {user.emailVerified ? "✅" : "❌"}</div>
          </div>
        )}
      </div>
      
      <div className="mb-2">
        <strong>Token:</strong> {token ? "✅ Present" : "❌ Missing"}
        {token && (
          <div className="ms-2">
            <div>Length: {token.length}</div>
            <div>Format: {token.startsWith("eyJ") ? "✅ Valid" : "❌ Invalid"}</div>
            <div>Preview: {token.substring(0, 20)}...</div>
          </div>
        )}
      </div>
      
      <div className="mb-2">
        <strong>Role:</strong> {role || "None"}
      </div>
      
      <div className="mb-2">
        <strong>LocalStorage:</strong>
        <div className="ms-2">
          <div>idToken: {debugInfo.localStorage?.idToken}</div>
          <div>userRole: {debugInfo.localStorage?.userRole}</div>
          <div>userData: {debugInfo.localStorage?.userData}</div>
        </div>
      </div>
      
      <div className="mb-2">
        <strong>Last Updated:</strong> {debugInfo.timestamp}
      </div>
      
      <div className="d-flex gap-2 mt-3">
        <button
          className="btn btn-sm btn-warning"
          onClick={() => {
            localStorage.clear();
            window.location.reload();
          }}
        >
          Clear & Reload
        </button>
        <button
          className="btn btn-sm btn-info"
          onClick={() => {
            console.log("Auth Debug Info:", debugInfo);
          }}
        >
          Log to Console
        </button>
      </div>
    </div>
  );
};

export default AuthDebugger;
