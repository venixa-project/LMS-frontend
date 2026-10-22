import { jsPDF } from 'jspdf';
import { Certificate } from '../types';

export function generateCertificatePdf(cert: Certificate): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4' // 297 x 210 mm
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const centerX = pageWidth / 2;

  const courseTitle = cert.courseTitle || cert.courseName || 'Certified Professional Curriculum';
  const recipient = cert.learnerName || 'Alex Thompson';
  const certId = cert.id || 'cert-001';
  const rawDate = cert.issuedAt || cert.issueDate || new Date().toISOString();
  const formattedDate = new Date(rawDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const hash = cert.verificationHash || '9a4f8c2b7e1d5a3f6e8c0b2d4f7a1e3c8821fa5d';

  // 1. Background fill (subtle warm luxury off-white)
  doc.setFillColor(252, 251, 247);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // 2. Decorative Outer Border (Navy / Charcoal #1e293b)
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(2);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

  // 3. Middle Gold Inset Border (#d97706)
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.8);
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

  // 4. Inner Gold Fine Inset (#f59e0b)
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.3);
  doc.rect(13.5, 13.5, pageWidth - 27, pageHeight - 27);

  // 5. Corner Ornaments
  const cornerCoords = [
    [12, 12],
    [pageWidth - 12, 12],
    [12, pageHeight - 12],
    [pageWidth - 12, pageHeight - 12]
  ];
  doc.setFillColor(217, 119, 6);
  cornerCoords.forEach(([cx, cy]) => {
    doc.rect(cx - 2, cy - 2, 4, 4, 'F');
  });

  // 6. Header: Institution & Brand
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105); // #475569
  doc.text('VENILEARN ENTERPRISE LMS  •  ACME LEARNING CORP', centerX, 26, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // #94a3b8
  doc.text('DEPARTMENT OF ACADEMIC AFFAIRS & PROFESSIONAL ACCREDITATION', centerX, 31, { align: 'center' });

  // Decorative header divider line
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.5);
  doc.line(centerX - 40, 34, centerX + 40, 34);

  // 7. Main Award Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(15, 23, 42); // #0f172a
  doc.text('CERTIFICATE OF ACHIEVEMENT', centerX, 48, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // #64748b
  doc.text('THIS IS OFFICIALLY PRESENTED AND CONFERRED UPON', centerX, 58, { align: 'center' });

  // 8. Recipient Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(30, 27, 75); // #1e1b4b
  doc.text(recipient, centerX, 74, { align: 'center' });

  // Name underline flourish
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.8);
  doc.line(centerX - 55, 78, centerX + 55, 78);
  doc.setFillColor(217, 119, 6);
  doc.circle(centerX, 78, 1.2, 'F');

  // 9. Description Paragraph
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'for successfully completing all prescribed coursework, laboratory requirements, and comprehensive examinations for',
    centerX,
    88,
    { align: 'center' }
  );

  // 10. Course Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(37, 99, 235); // #2563eb
  doc.text(courseTitle, centerX, 99, { align: 'center' });

  // Additional accomplishment text
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Demonstrating advanced technical proficiency, engineering rigor, and professional mastery.',
    centerX,
    107,
    { align: 'center' }
  );

  // 11. Center Seal Graphics
  const sealY = 138;
  // Outer gold star / circle
  doc.setFillColor(254, 243, 199); // #fef3c7
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(1);
  doc.circle(centerX, sealY, 15, 'FD');

  doc.setDrawColor(180, 83, 9);
  doc.setLineWidth(0.4);
  doc.circle(centerX, sealY, 13, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(180, 83, 9);
  doc.text('OFFICIAL SEAL', centerX, sealY - 4, { align: 'center' });
  doc.text('★ ★ ★', centerX, sealY + 0.5, { align: 'center' });
  doc.text('VERIFIED', centerX, sealY + 5, { align: 'center' });

  // 12. Signatures
  // Left: Lead Instructor
  const sigLineY = 142;
  const sigLeftX = centerX - 65;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.5);
  doc.line(sigLeftX - 35, sigLineY, sigLeftX + 35, sigLineY);

  doc.setFont('times', 'italic');
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text('Dr. James Wilson', sigLeftX, sigLineY - 3, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Dr. James Wilson', sigLeftX, sigLineY + 5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Lead Instructor & Curriculum Director', sigLeftX, sigLineY + 9, { align: 'center' });

  // Right: Dean of Academic Affairs
  const sigRightX = centerX + 65;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.5);
  doc.line(sigRightX - 35, sigLineY, sigRightX + 35, sigLineY);

  doc.setFont('times', 'italic');
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text('Sarah Chen', sigRightX, sigLineY - 3, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Sarah Chen', sigRightX, sigLineY + 5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Dean of Academic Affairs & Accreditation', sigRightX, sigLineY + 9, { align: 'center' });

  // 13. Bottom Verification & Cryptographic Ledger Details
  const metaY = 175;
  doc.setFillColor(241, 245, 249); // #f1f5f9
  doc.rect(20, metaY, pageWidth - 40, 18, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.rect(20, metaY, pageWidth - 40, 18, 'D');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  doc.text(`Issue Date: ${formattedDate}`, 28, metaY + 6);
  doc.text(`Credential ID: ${certId}`, 28, metaY + 12);

  doc.text(`Status: Verified & Cryptographically Signed`, centerX, metaY + 6, { align: 'center' });
  doc.text(`Ledger Hash: SHA256-${hash.slice(0, 16)}...${hash.slice(-8)}`, centerX, metaY + 12, { align: 'center' });

  doc.text(`Verify Online:`, pageWidth - 28, metaY + 6, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text(`verify.acmelearning.com/${certId}`, pageWidth - 28, metaY + 12, { align: 'right' });

  // 14. Download File
  const safeTitle = courseTitle.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
  const safeName = recipient.replace(/\s+/g, '_');
  doc.save(`Certificate_${certId}_${safeTitle}_${safeName}.pdf`);
}

/**
 * Open a clean, printable landscape diploma window for instant Print / Save as PDF
 */
export function printCertificateDiploma(cert: Certificate): void {
  const courseTitle = cert.courseTitle || cert.courseName || 'Certified Professional Curriculum';
  const recipient = cert.learnerName || 'Alex Thompson';
  const certId = cert.id || 'cert-001';
  const rawDate = cert.issuedAt || cert.issueDate || new Date().toISOString();
  const formattedDate = new Date(rawDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const hash = cert.verificationHash || '9a4f8c2b7e1d5a3f6e8c0b2d4f7a1e3c8821fa5d';

  const printWindow = window.open('', '_blank', 'width=1000,height=750');
  if (!printWindow) {
    // Fallback directly to PDF generation
    generateCertificatePdf(cert);
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Certificate - ${recipient} - ${courseTitle}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      background: #e2e8f0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
    }
    .cert-container {
      width: 297mm;
      height: 210mm;
      background: #fdfbf7;
      border: 10px solid #1e293b;
      padding: 12px;
      position: relative;
      box-shadow: 0 10px 30px rgba(0,0,0,0.25);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .cert-inner {
      height: 100%;
      border: 3px double #d97706;
      padding: 30px 48px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      text-align: center;
      position: relative;
    }
    .cert-header h4 {
      font-size: 11px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #475569;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .cert-header p {
      font-size: 9px;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #94a3b8;
    }
    .gold-divider {
      width: 80px;
      height: 2px;
      background: #d97706;
      margin: 10px auto;
    }
    .cert-title {
      font-size: 32px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-top: 6px;
    }
    .cert-subtitle {
      font-size: 11px;
      letter-spacing: 2px;
      color: #64748b;
      text-transform: uppercase;
      margin-top: 6px;
    }
    .recipient-name {
      font-size: 38px;
      font-weight: 800;
      color: #1e1b4b;
      margin: 12px 0 6px;
      font-family: Georgia, serif;
    }
    .name-underline {
      width: 240px;
      height: 2px;
      background: linear-gradient(90deg, transparent, #d97706, transparent);
      margin: 0 auto 16px;
    }
    .cert-desc {
      font-size: 13px;
      color: #475569;
      max-width: 680px;
      margin: 0 auto 8px;
      line-height: 1.5;
    }
    .course-title {
      font-size: 24px;
      font-weight: 800;
      color: #2563eb;
      margin-bottom: 4px;
    }
    .cert-tagline {
      font-size: 11px;
      color: #64748b;
      font-style: italic;
    }
    .signatures-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding: 0 40px;
      margin-top: 20px;
    }
    .sig-col {
      text-align: center;
      width: 180px;
    }
    .sig-hand {
      font-family: 'Brush Script MT', cursive, Georgia, serif;
      font-size: 22px;
      color: #1e293b;
      margin-bottom: 4px;
    }
    .sig-line {
      border-top: 1px solid #94a3b8;
      padding-top: 4px;
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
    }
    .sig-role {
      font-size: 9px;
      color: #64748b;
    }
    .seal-circle {
      width: 74px;
      height: 74px;
      border-radius: 50%;
      border: 3px solid #d97706;
      background: #fef3c7;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 10px rgba(217, 119, 6, 0.2);
    }
    .seal-text {
      font-size: 8px;
      font-weight: 800;
      color: #b45309;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .seal-stars {
      color: #b45309;
      font-size: 9px;
    }
    .cert-footer {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 16px;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #64748b;
      margin-top: 14px;
    }
    @media print {
      body {
        background: transparent;
        padding: 0;
      }
      .cert-container {
        box-shadow: none;
        width: 100vw;
        height: 100vh;
        border-width: 8px;
      }
    }
  </style>
</head>
<body>
  <div class="cert-container">
    <div class="cert-inner">
      <div class="cert-header">
        <h4>VeniLearn Enterprise LMS &bull; Acme Learning Corp</h4>
        <p>Department of Academic Affairs &bull; Official Credentials Registry</p>
        <div class="gold-divider"></div>
        <h1 class="cert-title">Certificate of Achievement</h1>
        <p class="cert-subtitle">This is officially presented and conferred upon</p>
      </div>

      <div class="cert-body">
        <h2 class="recipient-name">${recipient}</h2>
        <div class="name-underline"></div>
        <p class="cert-desc">
          for successfully satisfying all rigorous academic standards, laboratory requirements, and comprehensive examinations for the professional course of study in
        </p>
        <h3 class="course-title">${courseTitle}</h3>
        <p class="cert-tagline">Demonstrating advanced engineering rigor, technical proficiency, and verified professional excellence.</p>
      </div>

      <div class="signatures-row">
        <div class="sig-col">
          <div class="sig-hand">Dr. James Wilson</div>
          <div class="sig-line">Dr. James Wilson</div>
          <div class="sig-role">Lead Faculty & Curriculum Director</div>
        </div>

        <div class="seal-circle">
          <span class="seal-text">Official</span>
          <span class="seal-stars">★ ★ ★</span>
          <span class="seal-text">Verified</span>
        </div>

        <div class="sig-col">
          <div class="sig-hand">Sarah Chen</div>
          <div class="sig-line">Sarah Chen</div>
          <div class="sig-role">Dean of Academic Affairs</div>
        </div>
      </div>

      <div class="cert-footer">
        <div><strong>Issued:</strong> ${formattedDate} &bull; <strong>ID:</strong> ${certId}</div>
        <div><strong>Status:</strong> Verified &bull; <strong>Proof:</strong> SHA256-${hash.slice(0, 10)}...</div>
        <div><strong>Verify:</strong> verify.acmelearning.com/${certId}</div>
      </div>
    </div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
