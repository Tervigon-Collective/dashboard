"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const SignInBypassPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate a brief loading
    setTimeout(() => {
      // Set comprehensive user data in localStorage
      localStorage.setItem("userRole", "user");
      localStorage.setItem("userToken", "bypass-token-" + Date.now());
      localStorage.setItem("userData", JSON.stringify({
        uid: "bypass-user-" + Date.now(),
        email: email,
        role: "user",
        displayName: email.split("@")[0],
        emailVerified: true,
        sidebarPermissions: null
      }));
      
      // Force a page reload to ensure context updates
      window.location.href = "/";
    }, 1000);
  };

  return (
    <section className="auth bg-base d-flex flex-wrap">
      <div className="auth-left d-lg-block d-none">
        <div className="d-flex align-items-center flex-column h-100 justify-content-center">
          <img src="/assets/images/make/dashborad-08.jpg" alt="" />
        </div>
      </div>
      <div className="auth-right py-32 px-24 d-flex flex-column justify-content-center">
        <div className="max-w-464-px mx-auto w-100">
          <div>
            <h4 className="mb-12">Sign In (Bypass Mode)</h4>
            <p className="mb-32 text-secondary-light text-lg">
              This bypasses authentication for testing
            </p>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="icon-field mb-16">
              <input
                type="email"
                className="form-control h-56-px bg-neutral-50 radius-12"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="position-relative mb-20">
              <input
                type="password"
                className="form-control h-56-px bg-neutral-50 radius-12"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary text-sm btn-sm px-12 py-16 w-100 radius-12 mt-32"
              disabled={loading}
            >
              {loading ? "Signing In..." : "Sign In (Bypass)"}
            </button>
            <div className="mt-24 text-center text-sm">
              <p className="mb-0 text-secondary-light">
                <a href="/sign-in" className="text-primary-600 fw-semibold text-decoration-none">
                  ← Back to Normal Sign In
                </a>
              </p>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default SignInBypassPage;
