import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";
import { BookOpen, Clock, GraduationCap, Search, Eye, Globe, User, Sparkles, Youtube } from "lucide-react";

const LEVELS = ["All", "Beginner", "Intermediate", "Advanced", "Expert"];

function levelColor(level) {
  const map = { Beginner: "lv-green", Intermediate: "lv-blue", Advanced: "lv-orange", Expert: "lv-red" };
  return map[level] || "lv-green";
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [curricula, setCurricula] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("All");
  const [activeTab, setActiveTab] = useState("ai"); // 'ai', 'manual', or 'certs'
  const [error, setError] = useState("");

  const fetchCurricula = async () => {
    setLoading(true); setError("");
    try {
      const params = {};
      if (search.trim()) params.q = search.trim();
      if (levelFilter !== "All") params.level = levelFilter;
      const res = await API.get("/student/curricula", { params });
      setCurricula(res.data.curricula);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load curricula.");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchCurricula(); }, [levelFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchCurricula();
  };

  const formatDate = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  // Filter curricula by the active tab (ai vs manual/video)
  const filteredCurricula = curricula.filter(c => {
    const courseType = c.type || "ai"; // Handle missing type for older records
    if (activeTab === "certs") {
       return c.modules_count > 0 && c.progress?.length === c.modules_count;
    }
    if (activeTab === "ai") return courseType === "ai";
    if (activeTab === "manual") return courseType === "manual";
    return true;
  });

  return (
    <div className="student-page">
      <div className="page-header">
        <div className="page-header-inner">
          <div className="page-badge"><GraduationCap size={14} /><span>Student Dashboard</span></div>
          <h1 className="page-title">Curriculum Library</h1>
          <p className="page-sub">Explore expert-crafted courses and AI-generated learning paths published by your faculty.</p>
        </div>
      </div>

      <div className="student-content">
        {/* Type Tabs */}
        <div className="dashboard-tabs">
          <button 
            className={`dash-tab ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            <Sparkles size={16} /> AI Learning Paths
          </button>
          <button 
            className={`dash-tab ${activeTab === 'manual' ? 'active' : ''}`}
            onClick={() => setActiveTab('manual')}
          >
            <Youtube size={16} /> Video Courses
          </button>
          <button 
            className={`dash-tab ${activeTab === 'certs' ? 'active' : ''}`}
            onClick={() => setActiveTab('certs')}
          >
            <GraduationCap size={16} /> My Certificates
          </button>
        </div>

        {/* Search & Filters */}
        <div className="student-toolbar">
          <form className="search-bar" onSubmit={handleSearch}>
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder={`Search ${activeTab === 'ai' ? 'learning paths' : 'video courses'}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-btn">Search</button>
          </form>
          <div className="level-filter">
            {LEVELS.map((lvl) => (
              <button
                key={lvl}
                className={`filter-chip ${levelFilter === lvl ? "active" : ""}`}
                onClick={() => setLevelFilter(lvl)}
              >{lvl}</button>
            ))}
          </div>
        </div>

        {/* Welcome card */}
        <div className="student-welcome">
          <div className="sw-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
          <div>
            <div className="sw-name">Welcome, {user?.name}!</div>
            <div className="sw-sub">👩‍STUDENT · {
              activeTab === 'ai' ? "Viewing structured AI-generated paths." : 
              activeTab === 'manual' ? "Viewing faculty-added video courses." :
              "Viewing your earned certificates of completion."
            }</div>
          </div>
        </div>

        {error && <div className="gen-error" style={{ marginBottom: 20 }}><span>⚠ {error}</span></div>}

        {loading ? (
          <div className="loading-state" style={{ marginTop: 40 }}>
            <div className="loading-animation"><div className="pulse-ring" /><BookOpen size={32} className="loading-icon" /></div>
            <h3>Loading {activeTab === 'ai' ? 'curricula' : 'courses'}…</h3>
          </div>
        ) : filteredCurricula.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              {activeTab === 'ai' ? <Sparkles size={36} /> : <Youtube size={36} />}
            </div>
            <h3>No {activeTab === 'ai' ? 'learning paths' : 'video courses'} found</h3>
            <p>
              {search || levelFilter !== "All" 
                ? "Try adjusting your search filters." 
                : `Nothing has been published under this category yet.`}
            </p>
          </div>
        ) : (
          <>
            <div className="student-meta">
              <span>{filteredCurricula.length} {activeTab === 'ai' ? "path" : "course"}{filteredCurricula.length !== 1 ? "s" : ""} available</span>
            </div>
            <div className="history-grid">
              {filteredCurricula.map((c) => {
                const isCertified = c.modules_count > 0 && c.progress?.length === c.modules_count;
                return (
                <div key={c._id} className={`history-card student-card ${activeTab === 'certs' ? 'certified-card' : ''}`}>
                  <div className="hcard-top">
                    <div className="hcard-icon">
                      {activeTab === 'certs' ? <GraduationCap size={18} color="#7c3aed" /> : 
                       c.type === 'ai' ? <Sparkles size={18} /> : <Youtube size={18} />}
                    </div>
                    <span className={`hcard-level ${levelColor(c.level)}`}>{c.level}</span>
                  </div>
                  <div className="hcard-subject">{c.subject}</div>
                  {c.description && <div className="hcard-desc">{c.description}</div>}
                  <div className="hcard-meta">
                    <span className="hcard-detail"><Clock size={13} />{c.duration}</span>
                    <span className="hcard-detail"><User size={13} />{c.faculty_name}</span>
                  </div>
                  <div className="published-badge">
                    <Globe size={11} />
                    {activeTab === 'certs' ? "Earned " : "Published "} {formatDate(c.published_at || c.created_at)}
                  </div>

                  {c.modules_count > 0 && activeTab !== 'certs' && (
                    <div className="card-progress" style={{ marginTop: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#6b7280", marginBottom: 4 }}>
                        <span>Progress</span>
                        <span>{c.progress?.length || 0}/{c.modules_count} Modules</span>
                      </div>
                      <div style={{ height: 6, background: "#f3f4f6", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ 
                          height: "100%", 
                          width: `${Math.min(100, ((c.progress?.length || 0) / c.modules_count) * 100)}%`, 
                          background: (c.progress?.length === c.modules_count) ? "#22c55e" : "#7c3aed",
                          transition: "width 0.3s ease"
                        }} />
                      </div>
                    </div>
                  )}

                  {activeTab === 'certs' && (
                    <div style={{ marginTop: 15, padding: "10px", background: "#fdf8ff", borderRadius: 8, border: "1px dashed #7c3aed", textAlign: "center", fontSize: "0.85rem", color: "#7c3aed", fontWeight: 600 }}>
                      <GraduationCap size={14} style={{ marginRight: 5 }} /> Certificate Earned!
                    </div>
                  )}

                  <div className="hcard-actions">
                    <button
                      className={`hcard-btn ${activeTab === 'certs' ? 'primary' : 'primary'}`}
                      onClick={() => navigate(`/student/curriculum/${c._id}`)}
                    >
                      {activeTab === 'certs' ? <><GraduationCap size={14} /> View Certificate</> : <><Eye size={14} /> View Details</>}
                    </button>
                    {c.youtube_url && activeTab !== 'certs' && (
                       <button
                       className="hcard-btn"
                       style={{ background: 'rgba(255,0,0,0.1)', color: '#ff0000', borderColor: 'rgba(255,0,0,0.2)' }}
                       onClick={() => window.open(c.youtube_url, "_blank")}
                     >
                       <Youtube size={14} />Video
                     </button>
                    )}
                  </div>
                </div>
              );})}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
