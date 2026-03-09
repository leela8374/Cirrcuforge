import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../api/axios";
import { Mail, Key, ShieldCheck, ArrowLeft, Loader2, AlertCircle, CheckCircle } from "lucide-react";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Request OTP, 2: Reset Password
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await API.post("/auth/forgot-password", { email });
      setStep(2);
      setSuccess("OTP sent to your email!");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await API.post("/auth/reset-password", { email, otp, password: newPassword });
      setSuccess("Password reset successful! Redirecting to login...");
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page forgot-pw-page">
      <div className="auth-bg">
        <div className="auth-blob blob-1" /><div className="auth-blob blob-2" /><div className="auth-blob blob-3" />
      </div>
      <div className="forgot-pw-container">
        <div className="forgot-pw-card">
          <div className="forgot-pw-header-nav">
            <Link to="/login" className="back-link">
              <ArrowLeft size={16} /> Back to Login
            </Link>
          </div>
          <div className="auth-header">
          <div className="auth-logo">
            <ShieldCheck size={32} />
          </div>
          <h1>{step === 1 ? "Forgot Password?" : "Reset Password"}</h1>
          <p>
            {step === 1 
              ? "Enter your email and we'll send you an OTP to reset your password." 
              : `We've sent a 6-digit code to ${email}`}
          </p>
        </div>

        {error && <div className="alert alert-error"><AlertCircle size={18} /><span>{error}</span></div>}
        {success && <div className="alert alert-success"><CheckCircle size={18} /><span>{success}</span></div>}

        {step === 1 ? (
          <form onSubmit={handleRequestOTP} className="auth-form">
            <div className="form-group">
              <label><Mail size={16} /> Email Address</label>
              <input 
                type="email" 
                placeholder="yours@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? <Loader2 className="spinner" size={20} /> : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="auth-form">
            <div className="form-group">
              <label><Key size={16} /> 6-Digit OTP</label>
              <input 
                type="text" 
                placeholder="000000" 
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label><ShieldCheck size={16} /> New Password</label>
              <input 
                type="password" 
                placeholder="At least 6 characters" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? <Loader2 className="spinner" size={20} /> : "Reset Password"}
            </button>
            <p className="resend-text">
              Didn't get the code? <button type="button" onClick={handleRequestOTP} className="btn-link">Resend</button>
            </p>
          </form>
        )}
      </div>
    </div>
  </div>
);
}
