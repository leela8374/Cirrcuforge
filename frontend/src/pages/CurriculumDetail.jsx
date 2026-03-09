import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api/axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { downloadAsPDF } from "../utils/pdfExport";
import { ArrowLeft, Download, Copy, Check, Clock, GraduationCap, BookOpen, FileDown, Youtube } from "lucide-react";

export default function CurriculumDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    API.get(`/curriculum/${id}`)
      .then((res) => setData(res.data.curriculum))
      .catch(() => setError("Curriculum not found or access denied."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleCopy = () => {
    navigator.clipboard.writeText(data.curriculum);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    downloadAsPDF("faculty-detail-output", data.subject || "Curriculum");
  };

  if (loading) return (
    <div className="loading-screen full">
      <div className="spinner" /><p>Loading curriculum…</p>
    </div>
  );

  if (error) return (
    <div className="error-screen">
      <h2>⚠ {error}</h2>
      <button className="cta-primary" onClick={() => navigate("/history")}>Back to History</button>
    </div>
  );

  return (
    <div className="detail-page">
      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate("/history")}>
          <ArrowLeft size={16} /> Back
        </button>

        <div className="detail-meta">
          <h1 className="detail-title">{data.subject}</h1>
          <div className="detail-tags">
            <span className="dtag"><Clock size={13} /> {data.duration}</span>
            <span className="dtag"><GraduationCap size={13} /> {data.level}</span>
            <span className="dtag"><BookOpen size={13} /> {new Date(data.created_at).toLocaleDateString()}</span>
            {data.published && <span className="dtag" style={{ color: "var(--green)" }}>🌐 Published</span>}
          </div>
        </div>
      </div>

      <div className="markdown-output detail-md" id="faculty-detail-output">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.curriculum}</ReactMarkdown>
      </div>

      <div className="detail-footer-actions">
        <div className="result-actions">
          <button className="action-btn" onClick={handleCopy}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Copied!" : "Copy"}
          </button>
          <button className="action-btn primary" onClick={handleDownload}>
            <Download size={16} />Download .md
          </button>
          <button className="action-btn pdf-btn" onClick={handlePDF}>
            <FileDown size={16} />Download PDF
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
