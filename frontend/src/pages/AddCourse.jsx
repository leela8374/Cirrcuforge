import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";
import { 
  PlusCircle, BookOpen, Clock, GraduationCap, 
  FileText, Youtube, ArrowLeft, Save, AlertCircle 
} from "lucide-react";

export default function AddCourse() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    duration: "",
    level: "Beginner",
    description: "",
    youtube_url: "",
    content: ""
  });
  const [modules, setModules] = useState([]); // Start with empty modules

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim()) {
      setError("Course title is required.");
      return;
    }
    setLoading(true);
    try {
      await API.post("/curriculum/add", { ...form, modules });
      setSuccess(true);
      setTimeout(() => navigate("/history"), 1500);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add course.");
    } finally {
      setLoading(false);
    }
  };

  const addModule = () => {
    setModules([...modules, { title: "", video_url: "", content: "" }]);
  };

  const removeModule = (index) => {
    setModules(modules.filter((_, i) => i !== index));
  };

  const handleModuleChange = (index, field, value) => {
    const newModules = [...modules];
    newModules[index][field] = value;
    setModules(newModules);
  };

  return (
    <div className="generate-page">
      <div className="page-header">
        <div className="page-header-inner">
          <button className="back-btn-simple" onClick={() => navigate("/history")}>
            <ArrowLeft size={16} /> Back to History
          </button>
          <h1 className="page-title">Add New Course</h1>
          <p className="page-sub">Manually create a course with video links and custom content.</p>
        </div>
      </div>

      <div className="generate-layout" style={{ maxWidth: 800, margin: "0 auto" }}>
        <div className="gen-form-card">
          <h2 className="card-title"><PlusCircle size={20} /> Course Information</h2>
          
          {error && <div className="gen-error"><AlertCircle size={16} /><span>{error}</span></div>}
          {success && (
            <div className="publish-success-banner">
              <PlusCircle size={16} />
              <span>✅ <strong>Success!</strong> Course added and published. Redirecting...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="gen-form">
            <div className="form-group">
              <label><BookOpen size={15} /> Course Title *</label>
              <input 
                type="text" 
                name="subject" 
                placeholder="e.g., Python Basics, Advanced Networking..." 
                value={form.subject} 
                onChange={handleChange} 
                className="gen-input" 
                required 
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label><Clock size={15} /> Duration</label>
                <input 
                  type="text" 
                  name="duration" 
                  placeholder="e.g., 4 Weeks" 
                  value={form.duration} 
                  onChange={handleChange} 
                  className="gen-input" 
                />
              </div>
              <div className="form-group">
                <label><GraduationCap size={15} /> Level</label>
                <select name="level" value={form.level} onChange={handleChange} className="gen-select">
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Expert">Expert</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label><Youtube size={15} color="#ff0000" /> YouTube Video Link</label>
              <input 
                type="url" 
                name="youtube_url" 
                placeholder="https://www.youtube.com/watch?v=..." 
                value={form.youtube_url} 
                onChange={handleChange} 
                className="gen-input" 
              />
            </div>

            <div className="form-group">
              <label><FileText size={15} /> Brief Description</label>
              <textarea 
                name="description" 
                placeholder="What is this course about?" 
                value={form.description} 
                onChange={handleChange} 
                rows={2} 
                className="gen-textarea" 
              />
            </div>

            <div className="form-group">
              <label><FileText size={15} /> Course Content (Markdown)</label>
              <textarea 
                name="content" 
                placeholder="List modules, lessons, or notes here..." 
                value={form.content} 
                onChange={handleChange} 
                rows={4} 
                className="gen-textarea" 
              />
            </div>

            <div className="modules-section" style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #eee" }}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#4b5563" }}>Course Modules (Video Lessons)</h3>
                  <button type="button" onClick={addModule} className="action-btn-outline" style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", fontSize: "0.85rem" }}>
                     <PlusCircle size={14} /> Add Module
                  </button>
               </div>
               
               {modules.length === 0 && (
                 <p style={{ color: "#9ca3af", fontSize: "0.9rem", textAlign: "center", padding: "20px 0" }}>
                   No modules added yet. Add modules to create a structured video course.
                 </p>
               )}

               <div className="modules-list" style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                  {modules.map((m, idx) => (
                    <div key={idx} className="module-item-form" style={{ background: "#f9fafb", padding: 15, borderRadius: 8, border: "1px solid #e5e7eb", position: "relative" }}>
                        <button type="button" onClick={() => removeModule(idx)} style={{ position: "absolute", top: 10, right: 10, color: "#ef4444", border: "none", background: "none", cursor: "pointer" }}>
                           <PlusCircle size={16} style={{ transform: "rotate(45deg)" }} />
                        </button>
                        <div className="form-group">
                           <label style={{ fontSize: "0.8rem" }}>Module {idx + 1} Title</label>
                           <input 
                              type="text" 
                              placeholder="e.g., Introduction to UI Design" 
                              value={m.title} 
                              onChange={(e) => handleModuleChange(idx, "title", e.target.value)}
                              className="gen-input"
                              style={{ padding: "8px 12px" }}
                           />
                        </div>
                        <div className="form-row-2" style={{ marginTop: 10 }}>
                           <div className="form-group">
                              <label style={{ fontSize: "0.8rem" }}>YouTube Video URL</label>
                              <input 
                                 type="url" 
                                 placeholder="https://youtube.com/..." 
                                 value={m.video_url} 
                                 onChange={(e) => handleModuleChange(idx, "video_url", e.target.value)}
                                 className="gen-input"
                                 style={{ padding: "8px 12px" }}
                              />
                           </div>
                           <div className="form-group">
                              <label style={{ fontSize: "0.8rem" }}>Description (Optional)</label>
                              <input 
                                 type="text" 
                                 placeholder="Short summary..." 
                                 value={m.content} 
                                 onChange={(e) => handleModuleChange(idx, "content", e.target.value)}
                                 className="gen-input"
                                 style={{ padding: "8px 12px" }}
                              />
                           </div>
                        </div>
                    </div>
                  ))}
               </div>
            </div>

            <button type="submit" className="gen-btn" disabled={loading}>
              {loading ? <><span className="btn-spinner" />Saving...</> : <><Save size={18} />Save Course</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
