import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";
import { BookOpen, Eye, EyeOff, Mail, Lock, ArrowRight, Sparkles, GraduationCap, BookMarked } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "", role: "student" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setError(""); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await API.post("/auth/login", form);
      login(res.data.token, res.data.user);
      navigate(res.data.user.role === "faculty" ? "/generate" : "/student");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-blob blob-1" /><div className="auth-blob blob-2" /><div className="auth-blob blob-3" />
      </div>
      <div className="auth-container">
        {/* Left Panel */}
        <div className="auth-panel left-panel">
          <div className="panel-content">
            <div className="panel-logo"><BookOpen size={36} /></div>
            <h1 className="panel-title">CurricuForge</h1>
            <p className="panel-subtitle">Welcome back! Sign in to access your personalized dashboard.</p>
            <div className="features-list">
              {[
                { icon: "👨‍🏫", text: "Faculty: Create & Publish Curricula" },
                { icon: "👩‍🎓", text: "Students: Browse Published Courses" },
                { icon: "🔒", text: "Role-Based Secure Access" },
                { icon: "📊", text: "Table-Format AI Curriculum" },
              ].map((f, i) => (
                <div className="feature-item" key={i}><span className="feature-icon">{f.icon}</span><span>{f.text}</span></div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="auth-panel right-panel">
          <div className="auth-form-wrap">
            <div className="auth-header">
              <div className="auth-badge"><Sparkles size={14} /><span>Welcome Back</span></div>
              <h2 className="auth-title">Sign in</h2>
              <p className="auth-sub">Select your role and enter your credentials</p>
            </div>

            {/* Role Selector */}
            <div className="role-selector">
              <button
                type="button"
                className={`role-card ${form.role === "student" ? "active" : ""}`}
                onClick={() => setForm({ ...form, role: "student" })}
              >
                <GraduationCap size={24} />
                <span className="role-label">Student</span>
                <span className="role-desc">View published curricula</span>
              </button>
              <button
                type="button"
                className={`role-card ${form.role === "faculty" ? "active" : ""}`}
                onClick={() => setForm({ ...form, role: "faculty" })}
              >
                <BookMarked size={24} />
                <span className="role-label">Faculty</span>
                <span className="role-desc">Generate & publish courses</span>
              </button>
            </div>

            {error && <div className="auth-error"><span>⚠ {error}</span></div>}

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email Address</label>
                <div className="input-wrap">
                  <Mail size={16} className="input-icon" />
                  <input type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required autoComplete="email" />
                </div>
              </div>
              <div className="form-group">
                <div className="form-group-header">
                  <label>Password</label>
                  <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--purple)', fontWeight: 600 }}>Forgot password?</Link>
                </div>
                <div className="input-wrap">
                  <Lock size={16} className="input-icon" />
                  <input type={showPw ? "text" : "password"} name="password" placeholder="Your password" value={form.password} onChange={handleChange} required autoComplete="current-password" />
                  <button type="button" className="eye-btn" onClick={() => setShowPw(!showPw)}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? <span className="btn-spinner" /> : <><ArrowRight size={18} />Sign in as {form.role === "faculty" ? "Faculty" : "Student"}</>}
              </button>
            </form>
            <p className="auth-switch">Don't have an account?{" "}<Link to="/register" className="auth-link">Register free</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
