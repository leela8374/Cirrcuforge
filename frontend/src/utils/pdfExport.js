/**
 * Converts the rendered HTML of an element into a proper print-based PDF.
 * The PDF will have selectable text, real tables, and exact formatting.
 * @param {string} elementId  - ID of the element whose innerHTML to capture
 * @param {string} title      - Document title shown in the PDF header
 */
export function downloadAsPDF(elementId, title = "Curriculum") {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element #${elementId} not found`);
    return;
  }

  // Capture the outer HTML to preserve classes (like .certificate-inner or .detail-md)
  const contentHTML = element.outerHTML;

  const printHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    /* ── Page Setup ─────────────────────────────── */
    @page {
      size: A4;
      margin: 20mm 18mm 20mm 18mm;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      color: #1a1a2e;
      line-height: 1.65;
      background: #fff;
    }

    /* ── PDF Header ─────────────────────────────── */
    .pdf-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #7c3aed;
      padding-bottom: 10px;
      margin-bottom: 22px;
    }
    .pdf-title {
      font-size: 13pt;
      font-weight: 700;
      color: #7c3aed;
    }
    .pdf-date {
      font-size: 9pt;
      color: #64748b;
    }

    /* ── Headings ───────────────────────────────── */
    h1 {
      font-size: 20pt;
      font-weight: 800;
      color: #7c3aed;
      margin-bottom: 14px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
    }
    h2 {
      font-size: 14pt;
      font-weight: 700;
      color: #4f46e5;
      margin-top: 22px;
      margin-bottom: 10px;
      padding-bottom: 4px;
      border-bottom: 1px solid #e2e8f0;
    }
    h3 {
      font-size: 12pt;
      font-weight: 600;
      color: #1e293b;
      margin-top: 14px;
      margin-bottom: 8px;
    }

    /* ── Paragraphs & Lists ─────────────────────── */
    p {
      margin-bottom: 8px;
    }
    ul, ol {
      margin: 6px 0 10px 20px;
    }
    li {
      margin-bottom: 3px;
    }

    /* ── Tables ─────────────────────────────────── */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0 18px;
      font-size: 9.5pt;
      page-break-inside: auto;
    }
    thead tr {
      background: #7c3aed;
      color: #fff;
    }
    thead th {
      padding: 8px 10px;
      text-align: left;
      font-weight: 700;
      font-size: 9pt;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    tbody tr {
      border-bottom: 1px solid #e2e8f0;
    }
    tbody tr:nth-child(even) {
      background: #f8f5ff;
    }
    tbody tr:nth-child(odd) {
      background: #ffffff;
    }
    td {
      padding: 7px 10px;
      vertical-align: top;
      color: #1e293b;
    }
    td:first-child {
      font-weight: 600;
      color: #7c3aed;
      white-space: nowrap;
    }

    /* ── Blockquotes ─────────────────────────────── */
    blockquote {
      border-left: 3px solid #7c3aed;
      padding: 8px 14px;
      margin: 10px 0;
      background: #f5f3ff;
      color: #4f46e5;
      font-style: italic;
      font-size: 10pt;
      border-radius: 0 6px 6px 0;
    }

    /* ── Code ───────────────────────────────────── */
    code {
      background: #f1f5f9;
      color: #7c3aed;
      padding: 1px 5px;
      border-radius: 3px;
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 9pt;
    }
    pre {
      background: #f1f5f9;
      padding: 10px 14px;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 9pt;
      margin: 10px 0;
    }
    pre code {
      background: none;
      padding: 0;
    }

    /* ── Strong & Em ────────────────────────────── */
    strong { font-weight: 700; color: #1e293b; }
    em     { font-style: italic; color: #4b5563; }

    /* ── Horizontal Rule ────────────────────────── */
    hr {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 16px 0;
    }

    /* ── Page Breaks ────────────────────────────── */
    h2 { page-break-after: avoid; }
    table { page-break-inside: auto; }
    tr    { page-break-inside: avoid; page-break-after: auto; }
    thead { display: table-header-group; }

    /* ── Footer ─────────────────────────────────── */
    .pdf-footer {
      position: fixed;
      bottom: 8mm;
      left: 0; right: 0;
      text-align: center;
      font-size: 8pt;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 4px;
    }

    /* Hide emoji that may render badly in some PDF engines */
    @media print {
      a { text-decoration: none; color: inherit; }
      
      /* Certificate-specific print styles */
      .certificate-inner {
        border: 8pt double #e2e8f0 !important;
        padding: 40pt !important;
        margin: 0 auto !important;
        background: #ffffff !important;
        color: #1a1a2e !important;
        width: 100% !important;
        box-sizing: border-box !important;
        page-break-inside: avoid;
      }
      .cert-title {
        font-family: 'Outfit', sans-serif !important;
        font-size: 36pt !important;
        font-weight: 800 !important;
        color: #1a1a2e !important;
        margin-bottom: 5pt !important;
        letter-spacing: 2pt !important;
        text-align: center !important;
      }
      .cert-sub {
        font-size: 14pt !important;
        letter-spacing: 5pt !important;
        margin-bottom: 30pt !important;
        color: #64748b !important;
        text-align: center !important;
      }
      .cert-student-name {
        font-size: 32pt !important;
        color: #7c3aed !important;
        font-weight: 800 !important;
        margin: 20pt 0 !important;
        text-transform: uppercase !important;
        text-align: center !important;
      }
      .cert-course-title {
        font-size: 18pt !important;
        font-weight: 700 !important;
        color: #334155 !important;
        margin-bottom: 40pt !important;
        text-align: center !important;
      }
      .cert-footer {
        display: flex !important;
        justify-content: space-around !important;
        margin-top: 30pt !important;
      }
      .cert-footer-item {
        border-top: 1pt solid #cbd5e1 !important;
        padding-top: 8pt !important;
        min-width: 140pt !important;
        text-align: center !important;
      }
      .cert-label {
        font-size: 8pt !important;
        color: #94a3b8 !important;
        font-weight: 700 !important;
      }
      .cert-id {
        margin-top: 30pt !important;
        font-size: 7pt !important;
        color: #94a3b8 !important;
        text-align: center !important;
      }
      .cert-text-sm {
        font-size: 10pt !important;
        color: #64748b !important;
        text-align: center !important;
      }
      .pdf-header { display: none !important; } /* Hide standard header on certificate */
      .no-print { display: none !important; }   /* Hide buttons in the actual PDF */
    }
  </style>
</head>
<body>
  ${title !== "Certificate" ? `
  <div class="pdf-header">
    <div class="pdf-title">📚 CurricuForge — AI Curriculum</div>
    <div class="pdf-date">Generated: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</div>
  </div>
  ` : ""}

  ${contentHTML}

  ${title !== "Certificate" ? `
  <div class="pdf-footer">
    CurricuForge — AI Curriculum Generator &nbsp;|&nbsp; curricuforge.app
  </div>
  ` : ""}

  <script>
    // Auto-print when the window fully loads
    window.onload = function() {
      setTimeout(function() {
        window.print();
        // Close the window after user handles the print dialog
        window.onafterprint = function() { window.close(); };
      }, 400);
    };
  </script>
</body>
</html>`;

  // Open in a new blank window and write the HTML
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) {
    // Popup blocked — fallback: create a hidden iframe
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow.document;
    doc.open(); doc.write(printHTML); doc.close();
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 2000);
    }, 500);
    return;
  }

  printWindow.document.open();
  printWindow.document.write(printHTML);
  printWindow.document.close();
}
