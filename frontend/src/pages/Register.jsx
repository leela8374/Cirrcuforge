import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";
import { BookOpen, Eye, EyeOff, Mail, Lock, User, ArrowRight, Sparkles, GraduationCap, BookMarked } from "lucide-react";

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", role: "student" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError("Passwords do not match"); return; }
    setLoading(true); setError("");
    try {
      const res = await API.post("/auth/register", {
        name: form.name, email: form.email, password: form.password, role: form.role
      });
      login(res.data.token, res.data.user);
      navigate(res.data.user.role === "faculty" ? "/generate" : "/student");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed. Please try again.");
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
            <p className="panel-subtitle">AI-powered curriculum generation for educators and learners worldwide.</p>
            <div className="features-list">
              {[
                { icon: "🤖", text: "AI-Generated Curricula" },
                { icon: "👨‍🏫", text: "Faculty: Generate & Publish" },
                { icon: "👩‍🎓", text: "Students: Browse & Learn" },
                { icon: "📥", text: "Export & Download" },
              ].map((f, i) => (
                <div className="feature-item" key={i}>
                  <span className="feature-icon">{f.icon}</span><span>{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="auth-panel right-panel">
          <div className="auth-form-wrap">
            <div className="auth-header">
              <div className="auth-badge"><Sparkles size={14} /><span>Create Account</span></div>
              <h2 className="auth-title">Join CurricuForge</h2>
              <p className="auth-sub">Choose your role to get started</p>
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
                <span className="role-desc">Browse & view published curricula</span>
              </button>
              <button
                type="button"
                className={`role-card ${form.role === "faculty" ? "active" : ""}`}
                onClick={() => setForm({ ...form, role: "faculty" })}
              >
                <BookMarked size={24} />
                <span className="role-label">Faculty</span>
                <span className="role-desc">Generate & publish AI curricula</span>
              </button>
            </div>

            {error && <div className="auth-error"><span>⚠ {error}</span></div>}

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Full Name</label>
                <div className="input-wrap">
                  <User size={16} className="input-icon" />
                  <input type="text" name="name" placeholder="Your full name" value={form.name} onChange={handleChange} required autoComplete="name" />
                </div>
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <div className="input-wrap">
                  <Mail size={16} className="input-icon" />
                  <input type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required autoComplete="email" />
                </div>
              </div>
              <div className="form-group">
                <label>Password</label>
                <div className="input-wrap">
                  <Lock size={16} className="input-icon" />
                  <input type={showPw ? "text" : "password"} name="password" placeholder="Min 6 characters" value={form.password} onChange={handleChange} required autoComplete="new-password" />
                  <button type="button" className="eye-btn" onClick={() => setShowPw(!showPw)}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <div className="input-wrap">
                  <Lock size={16} className="input-icon" />
                  <input type={showPw ? "text" : "password"} name="confirm" placeholder="Re-enter password" value={form.confirm} onChange={handleChange} required autoComplete="new-password" />
                </div>
              </div>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? <span className="btn-spinner" /> : <><ArrowRight size={18} />Create {form.role === "faculty" ? "Faculty" : "Student"} Account</>}
              </button>
            </form>
            <p className="auth-switch">Already have an account?{" "}<Link to="/login" className="auth-link">Sign in</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
