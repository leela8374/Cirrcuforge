import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BookOpen, Zap, Shield, Download, ArrowRight, Sparkles, Brain, Users, ChevronRight } from "lucide-react";

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="home-page">
      {/* Hero */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-blob b1" />
          <div className="hero-blob b2" />
          <div className="hero-grid" />
        </div>

        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={14} />
            <span>AI-Powered Curriculum Designer</span>
          </div>

          <h1 className="hero-title">
            Forge Your Perfect
            <span className="gradient-text"> Curriculum</span>
            <br />in Seconds
          </h1>

          <p className="hero-desc">
            Input your subject, duration, and learning level — our AI generates a fully structured,
            week-by-week curriculum with objectives, activities, and assessments.
          </p>

          <div className="hero-cta">
            {user ? (
              <button className="cta-primary" onClick={() => navigate("/generate")}>
                Generate Curriculum
                <ArrowRight size={18} />
              </button>
            ) : (
              <>
                <Link to="/register" className="cta-primary">
                  Get Started Free
                  <ArrowRight size={18} />
                </Link>
                <Link to="/login" className="cta-ghost">
                  Sign In
                  <ChevronRight size={16} />
                </Link>
              </>
            )}
          </div>

          <div className="hero-stats">
            {[
              { value: "10K+", label: "Curricula Generated" },
              { value: "500+", label: "Subjects Covered" },
              { value: "99%", label: "Satisfaction Rate" },
            ].map((s, i) => (
              <div className="stat-item" key={i}>
                <span className="stat-value">{s.value}</span>
                <span className="stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Floating preview card */}
        <div className="hero-preview">
          <div className="preview-card">
            <div className="preview-header">
              <span className="preview-dot red" />
              <span className="preview-dot yellow" />
              <span className="preview-dot green" />
              <span className="preview-title">Curriculum Preview</span>
            </div>
            <div className="preview-body">
              <div className="preview-tag">📚 Machine Learning</div>
              <div className="preview-line" style={{ width: "90%" }} />
              <div className="preview-line" style={{ width: "75%" }} />
              <div className="preview-section">Week 1 · Foundations</div>
              <div className="preview-line sm" style={{ width: "85%" }} />
              <div className="preview-line sm" style={{ width: "65%" }} />
              <div className="preview-line sm" style={{ width: "75%" }} />
              <div className="preview-section">Week 2 · Core Concepts</div>
              <div className="preview-line sm" style={{ width: "80%" }} />
              <div className="preview-line sm" style={{ width: "60%" }} />
              <div className="preview-badge">✅ 12-Week Plan Generated</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <div className="section-header">
          <p className="section-tag">Why CurricuForge?</p>
          <h2 className="section-title">Everything you need to design great courses</h2>
        </div>

        <div className="features-grid">
          {[
            {
              icon: <Brain size={28} />,
              title: "AI-Powered Generation",
              desc: "Leverages cutting-edge Hugging Face language models to create detailed, expert-level curriculum content instantly.",
              color: "purple",
            },
            {
              icon: <Zap size={28} />,
              title: "Lightning Fast",
              desc: "Get a complete, structured curriculum in seconds. No more hours spent planning your course structure manually.",
              color: "yellow",
            },
            {
              icon: <Shield size={28} />,
              title: "Secure & Private",
              desc: "Your curricula are securely stored and linked only to your account. Full privacy guaranteed.",
              color: "green",
            },
            {
              icon: <Download size={28} />,
              title: "Export & Share",
              desc: "Download your curriculum as Markdown or copy the content to share with students and colleagues easily.",
              color: "blue",
            },
            {
              icon: <BookOpen size={28} />,
              title: "Multi-Level Support",
              desc: "From beginner to advanced — tailor the difficulty, pace, and depth for any learner profile.",
              color: "orange",
            },
            {
              icon: <Users size={28} />,
              title: "Curriculum History",
              desc: "All your generated curricula are saved. Revisit, update, or reference past course plans anytime.",
              color: "pink",
            },
          ].map((f, i) => (
            <div className={`feature-card fc-${f.color}`} key={i}>
              <div className={`feature-icon-wrap ic-${f.color}`}>{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="how-section">
        <div className="section-header">
          <p className="section-tag">How It Works</p>
          <h2 className="section-title">From idea to curriculum in 3 steps</h2>
        </div>

        <div className="steps-row">
          {[
            { num: "01", title: "Enter Details", desc: "Provide your subject, duration, education level, and any specific learning objectives." },
            { num: "02", title: "AI Generates", desc: "Our Hugging Face model creates a detailed week-by-week curriculum structure with activities and assessments." },
            { num: "03", title: "Download & Use", desc: "Review, export, and deploy your curriculum. Share with students or use as a course planning document." },
          ].map((s, i) => (
            <div className="step-card" key={i}>
              <div className="step-num">{s.num}</div>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-desc">{s.desc}</p>
              {i < 2 && <div className="step-arrow">→</div>}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="cta-section">
        <div className="cta-inner">
          <h2 className="cta-title">Ready to forge your curriculum?</h2>
          <p className="cta-desc">Join educators who are saving hours of planning with AI.</p>
          {user ? (
            <button className="cta-primary large" onClick={() => navigate("/generate")}>
              Generate Now <ArrowRight size={18} />
            </button>
          ) : (
            <Link to="/register" className="cta-primary large">
              Start for Free <ArrowRight size={18} />
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-brand">
          <BookOpen size={18} />
          <span>CurricuForge</span>
        </div>
        <p className="footer-copy">© 2025 CurricuForge. Built for educators, powered by AI.</p>
      </footer>
    </div>
  );
}
