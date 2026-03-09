import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import { History, BookOpen, Clock, Trash2, Eye, Sparkles, GraduationCap, Youtube, PlusCircle } from "lucide-react";

export default function CurriculumHistory() {
  const navigate = useNavigate();
  const [curricula, setCurricula] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [activeTab, setActiveTab] = useState("ai"); // 'ai' or 'manual'

  useEffect(() => {
    setLoading(true);
    API.get("/curriculum/history")
      .then((res) => setCurricula(res.data.curricula))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this entry?")) return;
    setDeleting(id);
    try {
      await API.delete(`/curriculum/${id}`);
      setCurricula((prev) => prev.filter((c) => c._id !== id));
    } catch (err) {
      alert("Failed to delete curriculum.");
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (iso) => {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    });
  };

  const levelColorMap = {
    Beginner: "lv-green",
    Intermediate: "lv-blue",
    Advanced: "lv-orange",
    Expert: "lv-red",
  };

  const filteredCurricula = curricula.filter(c => {
    if (activeTab === "ai") return c.type === "ai";
    if (activeTab === "manual") return c.type === "manual";
    return true;
  });

  return (
    <div className="history-page">
      <div className="page-header">
        <div className="page-header-inner">
          <div className="page-badge"><History size={14} /><span>Faculty History</span></div>
          <h1 className="page-title">Curriculum History</h1>
          <p className="page-sub">Access your AI-generated lessons and manually created video courses in one place.</p>
        </div>
      </div>

      <div className="history-content">
        <div className="dashboard-tabs">
          <button 
            className={`dash-tab ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            <Sparkles size={16} /> AI Generations
          </button>
          <button 
            className={`dash-tab ${activeTab === 'manual' ? 'active' : ''}`}
            onClick={() => setActiveTab('manual')}
          >
            <PlusCircle size={16} /> My Manual Courses
          </button>
        </div>

        {loading ? (
          <div className="loading-screen full" style={{ minHeight: 400 }}>
            <div className="spinner" /><p>Loading history…</p>
          </div>
        ) : filteredCurricula.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              {activeTab === 'ai' ? <Sparkles size={48} /> : <BookOpen size={48} />}
            </div>
            <h3>Nothing found here yet</h3>
            <p>
              {activeTab === 'ai' 
                ? "You haven't generated any AI curricula yet." 
                : "You haven't manually added any courses yet."}
            </p>
            <button 
              className="cta-primary" 
              onClick={() => navigate(activeTab === 'ai' ? "/generate" : "/add-course")}
            >
              {activeTab === 'ai' ? <Sparkles size={16} /> : <PlusCircle size={16} />}
              {activeTab === 'ai' ? "Generate Now" : "Add Course"}
            </button>
          </div>
        ) : (
          <>
            <div className="history-meta">
              <span>{filteredCurricula.length} {activeTab === 'ai' ? "curriculum" : "course"}{filteredCurricula.length !== 1 ? "s" : ""} saved</span>
              <button 
                className="gen-new-btn" 
                onClick={() => navigate(activeTab === 'ai' ? "/generate" : "/add-course")}
              >
                {activeTab === 'ai' ? <Sparkles size={14} /> : <PlusCircle size={14} />}
                {activeTab === 'ai' ? "Generate New" : "Add New Course"}
              </button>
            </div>

            <div className="history-grid">
              {filteredCurricula.map((c) => (
                <div className="history-card" key={c._id}>
                  <div className="hcard-top">
                    <div className="hcard-icon">
                      {c.type === 'ai' ? <Sparkles size={20} /> : <Youtube size={20} color="#ff0000" />}
                    </div>
                    <div className={`hcard-level ${levelColorMap[c.level] || "lv-blue"}`}>
                      {c.level}
                    </div>
                  </div>

                  <h3 className="hcard-subject">{c.subject}</h3>
                  {c.description && <p className="hcard-desc">{c.description}</p>}

                  <div className="hcard-meta">
                    <span className="hcard-detail"><Clock size={13} />{c.duration}</span>
                    <span className="hcard-detail">
                      {c.youtube_url ? <Youtube size={13} /> : <BookOpen size={13} />}
                      {c.youtube_url ? "Video Linked" : "Markdown"}
                    </span>
                  </div>

                  <div className="hcard-date">{formatDate(c.created_at)}</div>

                  <div className="hcard-actions">
                    <button className="hcard-btn primary" onClick={() => navigate(`/curriculum/${c._id}`)}>
                      <Eye size={14} />View
                    </button>
                    <button 
                      className="hcard-btn danger" 
                      onClick={() => handleDelete(c._id)}
                      disabled={deleting === c._id}
                    >
                      {deleting === c._id ? <span className="btn-spinner sm" /> : <Trash2 size={14} />}
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
