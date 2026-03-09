import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { downloadAsPDF } from "../utils/pdfExport";
import { ArrowLeft, Download, Copy, Check, Clock, GraduationCap, BookOpen, User, Globe, FileDown, Youtube, X, PlayCircle } from "lucide-react";

export default function StudentCurriculumView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [completedModules, setCompletedModules] = useState([]);
  const [certificateData, setCertificateData] = useState(null);
  const [claimingCertificate, setClaimingCertificate] = useState(false);

  useEffect(() => {
    API.get(`/student/curricula/${id}`)
      .then((res) => {
        setData(res.data.curriculum);
        setCompletedModules(res.data.curriculum.progress || []);
      })
      .catch((err) => setError(err.response?.data?.error || "Failed to load curriculum."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleMarkComplete = async (idx) => {
    try {
      const res = await API.post("/student/progress/complete", { curriculum_id: id, module_index: idx });
      setCompletedModules([...new Set([...completedModules, idx])]);
      if (res.data.completed) {
        alert("🎉 Congratulations! You have completed the course. Your certificate has been sent to your email.");
      }
    } catch (err) {
      console.error("Failed to mark complete:", err);
    }
  };

  const handleClaimCertificate = async () => {
    setClaimingCertificate(true);
    try {
      const res = await API.get(`/student/certificate/${id}`);
      if (res.data.eligible) {
        setCertificateData(res.data);
      } else {
        alert(res.data.message || "You haven't completed all modules yet.");
      }
    } catch (err) {
      alert("Failed to claim certificate.");
    } finally {
      setClaimingCertificate(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(data.curriculum);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([data.curriculum], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.subject.replace(/\s+/g, "_")}_curriculum.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePDF = () => {
    downloadAsPDF("student-curriculum-output", data.subject || "Curriculum");
  };

  if (loading) {
    return (
      <div className="loading-state" style={{ marginTop: 80 }}>
        <div className="loading-animation"><div className="pulse-ring" /><BookOpen size={32} className="loading-icon" /></div>
        <h3>Loading curriculum…</h3>
      </div>
    );
  }
  if (error) {
    return (
      <div className="error-screen">
        <h2>Oops!</h2><p>{error}</p>
        <button className="back-btn" onClick={() => navigate("/student")}>← Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="detail-page">
      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate("/student")}>
          <ArrowLeft size={18} /> Back to Dashboard
        </button>
        <h1 className="detail-title">{data.subject}</h1>
        <div className="detail-tags">
          <span className="dtag"><Clock size={14} /> {data.duration}</span>
          <span className="dtag"><GraduationCap size={14} /> {data.level}</span>
          <span className="dtag"><User size={14} /> By {data.faculty_name}</span>
          <span className="dtag"><Globe size={14} /> Published</span>
        </div>
      </div>

      <div className="markdown-output detail-md" id="student-curriculum-output">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.curriculum}</ReactMarkdown>
      </div>

      {data.modules && data.modules.length > 0 && (
        <div className="course-modules-view">
          <div className="modules-header">
            <h2 className="modules-title">
              <Youtube size={24} color="#ff0000" /> Course Modules
            </h2>
            <div className="progress-pills">
              {Math.round((completedModules.length / data.modules.length) * 100)}% Complete
            </div>
          </div>

          <div className="modules-list-student">
            {data.modules.map((m, idx) => {
              const isCompleted = completedModules.includes(idx);
              return (
                <div key={idx} className={`module-card ${isCompleted ? 'completed' : ''}`}>
                  <div className={`module-idx ${isCompleted ? 'idx-done' : ''}`}>
                    {isCompleted ? <Check size={18} /> : idx + 1}
                  </div>
                  <div className="module-info">
                    <h4 className="module-title">{m.title}</h4>
                    {m.content && <p className="module-desc">{m.content}</p>}
                  </div>
                  <div className="module-actions">
                    {m.video_url && (
                       <button className="icon-btn-sm" onClick={() => window.open(m.video_url, "_blank")} title="Watch Video">
                          <PlayCircle size={18} color="#ff0000" />
                       </button>
                    )}
                    <button 
                      className={`complete-toggle-btn ${isCompleted ? 'is-done' : ''}`}
                      onClick={() => handleMarkComplete(idx)}
                      disabled={isCompleted}
                    >
                      {isCompleted ? <><Check size={14} /> Completed</> : "Mark as Complete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {completedModules.length === data.modules.length && (
            <div className="completion-award">
              <div className="award-content">
                <h3 className="award-title">🎉 Congratulations!</h3>
                <p className="award-subtitle">You have successfully completed all modules of this course.</p>
                <div className="award-actions" style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                  <button 
                    className="claim-btn" 
                    onClick={handleClaimCertificate}
                    disabled={claimingCertificate}
                  >
                    {claimingCertificate ? "Generating..." : <><GraduationCap size={20} /> Preview Certificate</>}
                  </button>
                  <button 
                    className="action-btn pdf-btn" 
                    style={{ padding: "14px 24px", borderRadius: "12px" }}
                    onClick={() => {
                        handleClaimCertificate().then(() => {
                           // Trigger download after data is fetched if possible, 
                           // but simple way is to just use the modal button for now.
                        });
                        // Shortcut: if we already have data, just download. 
                        // But let's just make the modal more reliable.
                    }}
                  >
                    <FileDown size={20} /> Download Certificate (PDF)
                  </button>
                </div>
              </div>
              <div className="award-bg-icon">
                <GraduationCap size={160} />
              </div>
            </div>
          )}
        </div>
      )}

      {certificateData && (
        <div className="certificate-overlay">
          <div className="certificate-modal">
            <button 
              onClick={() => setCertificateData(null)}
              className="modal-close-btn"
            >
              <X size={24} />
            </button>
            <div id="certificate-printable" className="certificate-inner">
               <div className="certificate-badge">
                  <BookOpen size={48} color="#7c3aed" />
               </div>
               <h1 className="cert-title">CERTIFICATE</h1>
               <p className="cert-sub">OF COMPLETION</p>
               
               <p className="cert-text-sm">This is to certify that</p>
               <h2 className="cert-student-name">{certificateData.student_name}</h2>
               <p className="cert-text-sm">has successfully completed the course</p>
               
               <h3 className="cert-course-title">{certificateData.course_name}</h3>
               
               <div className="cert-footer">
                  <div className="cert-footer-item">
                     <p className="cert-date-val">{certificateData.date}</p>
                     <p className="cert-label">DATE</p>
                  </div>
                  <div className="cert-footer-item">
                     <p className="cert-issuer">CurricuForge AI</p>
                     <p className="cert-label">ISSUER</p>
                  </div>
               </div>
               
               <div className="cert-id" style={{ marginTop: "40px", opacity: 0.6 }}>
                  Certificate ID: {certificateData.certificate_id}
               </div>

               <div className="no-print" style={{ marginTop: "48px", borderTop: "1px solid #eee", paddingTop: "32px" }}>
                  <button onClick={() => downloadAsPDF("certificate-printable", "Certificate")} className="pdf-download-btn">
                     <FileDown size={20} /> Download Official Certificate (PDF)
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}

      <div className="detail-footer-actions">
        <div className="result-actions">
          <button className="action-btn" onClick={handleCopy}>
            {copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Copied!" : "Copy"}
          </button>
          <button className="action-btn primary" onClick={handleDownload}>
            <Download size={16} />Download .md
          </button>
          <button className="action-btn pdf-btn" onClick={handlePDF}>
            <FileDown size={16} />Download Course PDF
          </button>
          {data.youtube_url && (
            <button className="action-btn youtube-btn" onClick={() => window.open(data.youtube_url, "_blank")}>
              <Youtube size={16} color="#ff0000" />Watch on YouTube
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
