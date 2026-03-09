import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { downloadAsPDF } from "../utils/pdfExport";
import {
  BookOpen, Clock, GraduationCap, FileText, Target,
  Sparkles, Download, Copy, Check, AlertCircle, ChevronDown,
  Globe, EyeOff, FileDown, Youtube
} from "lucide-react";

const LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"];
const DURATIONS = [
  "2 Weeks", "4 Weeks", "6 Weeks", "8 Weeks",
  "10 Weeks", "12 Weeks", "3 Months", "6 Months", "1 Year"
];

export default function Generate() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({ subject: "", duration: "", level: "Beginner", description: "", objectives: "", youtube_url: "" });
  const [loading, setLoading] = useState(false);
  const [curriculum, setCurriculum] = useState("");
  const [curriculumId, setCurriculumId] = useState("");
  const [published, setPublished] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  const handleChange = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setError(""); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.duration) { setError("Subject and duration are required."); return; }
    setLoading(true); setError(""); setCurriculum(""); setPublished(false);
    try {
      const res = await API.post("/curriculum/generate", form);
      setCurriculum(res.data.curriculum);
      setCurriculumId(res.data.id);
      setIsDemo(!!res.data.demo);
      setTimeout(() => document.getElementById("result-section")?.scrollIntoView({ behavior: "smooth" }), 200);
    } catch (err) {
      setError(err.response?.data?.error || "Generation failed. Please try again.");
    } finally { setLoading(false); }
  };

  const handlePublish = async () => {
    if (!curriculumId) return;
    setPublishLoading(true);
    try {
      const newPublished = !published;
      await API.patch(`/curriculum/${curriculumId}/publish`, { publish: newPublished });
      setPublished(newPublished);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to toggle publish state.");
    } finally { setPublishLoading(false); }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(curriculum);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([curriculum], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${form.subject.replace(/\s+/g, "_")}_curriculum.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePDF = () => {
    const safeName = form.subject || "Curriculum";
    downloadAsPDF("curriculum-output", safeName);
  };

  return (
    <div className="generate-page">
      <div className="page-header">
        <div className="page-header-inner">
          <div className="page-badge"><Sparkles size={14} /><span>Faculty Dashboard</span></div>
          <h1 className="page-title">Generate Curriculum</h1>
          <p className="page-sub">Create a complete AI-powered curriculum, then publish it for students to view.</p>
        </div>
      </div>

      <div className="generate-layout">
        <div className="gen-form-card">
          <h2 className="card-title"><FileText size={20} />Course Details</h2>
          {error && <div className="gen-error"><AlertCircle size={16} /><span>{error}</span></div>}

          <form onSubmit={handleSubmit} className="gen-form">
            <div className="form-group">
              <label><BookOpen size={15} /> Subject / Course Name *</label>
              <input type="text" name="subject" placeholder="e.g., Machine Learning, Web Development..." value={form.subject} onChange={handleChange} required className="gen-input" />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label><Clock size={15} /> Duration *</label>
                <div className="select-wrap">
                  <select name="duration" value={form.duration} onChange={handleChange} required className="gen-select">
                    <option value="">Choose duration…</option>
                    {DURATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <ChevronDown size={16} className="select-arrow" />
                </div>
              </div>
              <div className="form-group">
                <label><GraduationCap size={15} /> Education Level</label>
                <div className="level-chips">
                  {LEVELS.map((lvl) => (
                    <button type="button" key={lvl}
                      className={`level-chip ${form.level === lvl ? "active" : ""}`}
                      onClick={() => setForm({ ...form, level: lvl })}>{lvl}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label><FileText size={15} /> Course Description <span className="optional-tag">Optional</span></label>
              <textarea name="description" placeholder="Briefly describe your course goals or audience..." value={form.description} onChange={handleChange} rows={3} className="gen-textarea" />
            </div>

            <div className="form-group">
              <label><Target size={15} /> Specific Learning Objectives <span className="optional-tag">Optional</span></label>
              <textarea name="objectives" placeholder="e.g., Students should be able to build a neural network..." value={form.objectives} onChange={handleChange} rows={3} className="gen-textarea" />
            </div>

            <div className="form-group">
              <label><Youtube size={15} color="#ff0000" /> YouTube Course Link <span className="optional-tag">Optional</span></label>
              <input type="url" name="youtube_url" placeholder="https://www.youtube.com/watch?v=..." value={form.youtube_url} onChange={handleChange} className="gen-input" />
            </div>

            <button type="submit" className="gen-btn" disabled={loading}>
              {loading ? <><span className="btn-spinner" />Generating Curriculum...</> : <><Sparkles size={18} />Generate Curriculum</>}
            </button>
          </form>
        </div>

        {/* Sidebar */}
        <div className="gen-sidebar">
          <div className="faculty-info-card">
            <div className="fi-header">
              <div className="fi-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
              <div>
                <div className="fi-name">{user?.name}</div>
                <div className="fi-role">👨‍🏫 Faculty</div>
              </div>
            </div>
            <p className="fi-tip">Generate a curriculum below, then click <strong>Publish</strong> to share it with students.</p>
          </div>
          <div className="tips-card">
            <h3 className="tips-title">💡 Tips</h3>
            <ul className="tips-list">
              <li>Be specific with subject name for better AI results</li>
              <li>Add objectives to get tailored learning outcomes</li>
              <li>Publish to make visible to students instantly</li>
              <li>Unpublish anytime to hide from students</li>
            </ul>
          </div>
          <div className="subjects-card">
            <h3 className="tips-title">🔥 Quick Subjects</h3>
            <div className="subject-tags">
              {["Machine Learning", "Web Development", "Data Science", "Cybersecurity", "Cloud Computing", "Python", "Digital Marketing", "UI/UX Design"].map((s) => (
                <button key={s} className="subject-tag" onClick={() => setForm({ ...form, subject: s })}>{s}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="loading-state" id="result-section">
          <div className="loading-animation"><div className="pulse-ring" /><Sparkles size={32} className="loading-icon" /></div>
          <h3>Generating your curriculum…</h3>
          <p>Our AI is crafting a detailed, structured plan. This may take 30–60 seconds.</p>
          <div className="progress-bar"><div className="progress-fill" /></div>
        </div>
      )}

      {/* Result */}
      {curriculum && !loading && (
        <div className="result-section" id="result-section">
          {isDemo && (
            <div className="demo-banner">
              <AlertCircle size={16} />
              <div>
                <strong>Demo Mode:</strong> Your Hugging Face API key is missing or invalid.
                <br />
                👉 Get a free token at{" "}
                <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer"
                  style={{ color: "var(--yellow)", textDecoration: "underline" }}>
                  huggingface.co/settings/tokens
                </a>{" "}
                → paste in <code>backend/.env</code> as <code>HUGGINGFACE_API_KEY</code> → restart Flask.
              </div>
            </div>
          )}

          <div className="result-header">
            <div>
              <h2 className="result-title">Curriculum Ready! 🎉</h2>
              <p className="result-sub">{form.subject} · {form.duration} · {form.level}</p>
            </div>
            <div className="result-actions">
              <button className="action-btn" onClick={handleCopy}>
                {copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Copied!" : "Copy"}
              </button>
              <button className="action-btn primary" onClick={handleDownload}>
                <Download size={16} />Download .md
              </button>
              <button className="action-btn pdf-btn" onClick={handlePDF}>
                <FileDown size={16} />Download PDF
              </button>

              {/* PUBLISH BUTTON */}
              <button
                className={`action-btn publish-btn ${published ? "published" : ""}`}
                onClick={handlePublish}
                disabled={publishLoading || !curriculumId}
              >
                {publishLoading ? <span className="btn-spinner sm" /> :
                  published ? <><EyeOff size={16} />Unpublish</> : <><Globe size={16} />Publish to Students</>
                }
              </button>

              <button className="action-btn ghost" onClick={() => navigate("/history")}>History</button>
            </div>
          </div>

          {published && (
            <div className="publish-success-banner">
              <Globe size={16} />
              <span>✅ <strong>Published!</strong> Students can now view this curriculum in their dashboard.</span>
            </div>
          )}

          <div className="markdown-output" id="curriculum-output">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{curriculum}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
