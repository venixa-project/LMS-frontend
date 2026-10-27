import { jsPDF } from 'jspdf';
import { Certificate } from '../types';

/**
 * Helper to convert an image URL (such as /logo.png) to base64 Data URL for jsPDF embedding
 */
const loadLogoBase64 = (url: string = '/logo.png'): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 855;
        canvas.height = img.naturalHeight || 239;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
          return;
        }
      } catch (err) {
        console.warn('Could not export logo to canvas:', err);
      }
      resolve(null);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

/**
 * Generate and download an executive, cryptographically-styled Vector PDF Diploma
 */
export async function generateCertificatePdf(cert: Certificate): Promise<void> {
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

  // 1. Warm Luxury Parchment Background (#fcfbf8)
  doc.setFillColor(252, 251, 248);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // 2. Heavy Navy Outer Security Border (#0f172a)
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(2.2);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

  // 3. Middle Gold Filigree Border (#d97706)
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(1.0);
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

  // 4. Inner Gold Fine Inset (#f59e0b)
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.35);
  doc.rect(13.8, 13.8, pageWidth - 27.6, pageHeight - 27.6);

  // 5. Corner Ornaments (Diamond rosettes at 4 inner corners)
  const cornerCoords = [
    [12, 12],
    [pageWidth - 12, 12],
    [12, pageHeight - 12],
    [pageWidth - 12, pageHeight - 12]
  ];
  doc.setFillColor(217, 119, 6);
  cornerCoords.forEach(([cx, cy]) => {
    doc.rect(cx - 2.5, cy - 2.5, 5, 5, 'F');
    doc.setFillColor(254, 243, 199);
    doc.rect(cx - 1, cy - 1, 2, 2, 'F');
    doc.setFillColor(217, 119, 6);
  });

  // 6. Company Logo (High-Resolution VeniLearn Branding)
  const logoBase64 = await loadLogoBase64('/logo.png');
  if (logoBase64) {
    // logo.png aspect ratio is 855 x 239 (~3.58 : 1)
    const logoWidth = 54;
    const logoHeight = 54 / 3.577; // ~15.1 mm
    doc.addImage(logoBase64, 'PNG', centerX - (logoWidth / 2), 17, logoWidth, logoHeight);
  } else {
    // Fallback if logo cannot be loaded
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(99, 102, 241);
    doc.text('VENILEARN', centerX, 25, { align: 'center' });
  }

  // 7. Academic Institution Sub-Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('VENILEARN  •  GLOBAL ACADEMIC CREDENTIALS REGISTRY', centerX, 37, { align: 'center' });

  // Gold decorative line with center jewel
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.6);
  doc.line(centerX - 50, 40, centerX + 50, 40);
  doc.setFillColor(217, 119, 6);
  doc.circle(centerX, 40, 1.2, 'F');

  // 8. Main Award Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(23);
  doc.setTextColor(15, 23, 42); // #0f172a
  doc.text('CERTIFICATE OF ACHIEVEMENT', centerX, 51, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(180, 83, 9); // Gold #b45309
  doc.text('EXCELLENCE IN PROFESSIONAL & TECHNICAL MASTERY', centerX, 58, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // #64748b
  doc.text('THIS IS OFFICIALLY CONFERRED AND RECORDED UPON', centerX, 66, { align: 'center' });

  // 9. Recipient Name
  doc.setFont('times', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(30, 27, 75); // #1e1b4b
  doc.text(recipient, centerX, 80, { align: 'center' });

  // Ornate underline for recipient
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.7);
  doc.line(centerX - 60, 83.5, centerX + 60, 83.5);
  doc.setFillColor(217, 119, 6);
  doc.circle(centerX, 83.5, 1.2, 'F');

  // 10. Award Citation Text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text(
    'for successfully completing all rigorous academic coursework, proctored examinations, and applied evaluations for',
    centerX,
    93,
    { align: 'center' }
  );

  // 11. Course Title (Prominent & Colored)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(37, 99, 235); // #2563eb
  doc.text(courseTitle, centerX, 103, { align: 'center' });

  // Accreditation & Rigor Subtext
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Demonstrating verified technical competency, architectural rigor, and professional distinction.',
    centerX,
    110,
    { align: 'center' }
  );

  // 12. Center Official Golden Seal
  const sealY = 138;
  // Ribbon tails hanging from seal
  doc.setFillColor(220, 38, 38); // Deep red / crimson ribbon
  doc.triangle(centerX - 8, sealY + 10, centerX - 14, sealY + 25, centerX - 4, sealY + 22, 'F');
  doc.triangle(centerX + 8, sealY + 10, centerX + 14, sealY + 25, centerX + 4, sealY + 22, 'F');

  // Outer gold circle
  doc.setFillColor(254, 243, 199); // #fef3c7
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(1.2);
  doc.circle(centerX, sealY, 15, 'FD');

  // Inner gold ring
  doc.setDrawColor(180, 83, 9);
  doc.setLineWidth(0.4);
  doc.circle(centerX, sealY, 13, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(180, 83, 9);
  doc.text('OFFICIAL SEAL', centerX, sealY - 4, { align: 'center' });
  doc.text('★ ★ ★ ★ ★', centerX, sealY + 0.5, { align: 'center' });
  doc.text('AUTHENTIC', centerX, sealY + 5, { align: 'center' });

  // 13. Left Signature (Lead Faculty)
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
  doc.text('Dr. James Wilson, Ph.D.', sigLeftX, sigLineY + 5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Lead Instructor & Curriculum Director', sigLeftX, sigLineY + 9, { align: 'center' });

  // 14. Right Signature (Dean of Academic Affairs)
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
  doc.text('Sarah Chen, M.Sc.', sigRightX, sigLineY + 5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Dean of Academic Affairs & Accreditation', sigRightX, sigLineY + 9, { align: 'center' });

  // 15. Security & Verification Bottom Bar
  const metaY = 175;
  doc.setFillColor(241, 245, 249); // #f1f5f9
  doc.rect(18, metaY, pageWidth - 36, 18, 'F');
  doc.setDrawColor(203, 213, 225); // #cbd5e1
  doc.setLineWidth(0.4);
  doc.rect(18, metaY, pageWidth - 36, 18, 'D');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(71, 85, 105);

  doc.text(`Issue Date: ${formattedDate}`, 24, metaY + 6);
  doc.text(`Credential ID: ${certId}`, 24, metaY + 12);

  doc.text(`Verification: Cryptographically Certified & Registered`, centerX, metaY + 6, { align: 'center' });
  doc.text(`Ledger Proof: SHA256-${hash.slice(0, 16)}...${hash.slice(-8)}`, centerX, metaY + 12, { align: 'center' });

  doc.text(`Online Verification:`, pageWidth - 24, metaY + 6, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text(`verify.acmelearning.com/${certId}`, pageWidth - 24, metaY + 12, { align: 'right' });

  // 16. Trigger PDF Save
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

  const printWindow = window.open('', '_blank', 'width=1100,height=800');
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
      padding: 24px;
    }
    .cert-container {
      width: 297mm;
      height: 210mm;
      background: #fdfbf7;
      border: 12px solid #0f172a;
      padding: 12px;
      position: relative;
      box-shadow: 0 16px 40px rgba(0,0,0,0.3);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .cert-inner {
      height: 100%;
      border: 3px double #d97706;
      padding: 28px 48px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      text-align: center;
      position: relative;
      background: radial-gradient(ellipse at center, rgba(254, 243, 199, 0.25) 0%, transparent 75%);
    }
    .brand-logo-container {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 6px;
    }
    .brand-logo-img {
      height: 48px;
      width: auto;
      max-width: 200px;
      object-fit: contain;
    }
    .cert-header h4 {
      font-size: 11px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #475569;
      font-weight: 700;
      margin-top: 4px;
    }
    .cert-header p {
      font-size: 9px;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #94a3b8;
    }
    .gold-divider {
      width: 100px;
      height: 2px;
      background: linear-gradient(90deg, transparent, #d97706, transparent);
      margin: 8px auto;
    }
    .cert-title {
      font-size: 30px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .cert-sub-badge {
      font-size: 12px;
      font-weight: 700;
      color: #b45309;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-top: 2px;
    }
    .cert-subtitle {
      font-size: 10px;
      letter-spacing: 2px;
      color: #64748b;
      text-transform: uppercase;
      margin-top: 6px;
    }
    .recipient-name {
      font-size: 40px;
      font-weight: 800;
      color: #1e1b4b;
      margin: 10px 0 6px;
      font-family: Georgia, serif;
      letter-spacing: -0.5px;
    }
    .name-underline {
      width: 260px;
      height: 2px;
      background: linear-gradient(90deg, transparent, #d97706, transparent);
      margin: 0 auto 12px;
    }
    .cert-desc {
      font-size: 13px;
      color: #475569;
      max-width: 700px;
      margin: 0 auto 6px;
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
      margin-top: 18px;
    }
    .sig-col {
      text-align: center;
      width: 190px;
    }
    .sig-hand {
      font-family: 'Brush Script MT', cursive, Georgia, serif;
      font-size: 24px;
      color: #1e293b;
      margin-bottom: 2px;
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
      width: 76px;
      height: 76px;
      border-radius: 50%;
      border: 3px solid #d97706;
      background: #fef3c7;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(217, 119, 6, 0.25);
      position: relative;
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
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 18px;
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
        border-width: 10px;
      }
    }
  </style>
</head>
<body>
  <div class="cert-container">
    <div class="cert-inner">
      <div class="cert-header">
        <div class="brand-logo-container">
          <img src="/logo.png" alt="VeniLearn Logo" class="brand-logo-img" />
        </div>
        <h4>VeniLearn &bull; Global Academic Credentials Registry</h4>
        <p>Department of Professional Curriculum & Continuous Education</p>
        <div class="gold-divider"></div>
        <h1 class="cert-title">Certificate of Achievement</h1>
        <div class="cert-sub-badge">Excellence in Professional & Technical Mastery</div>
        <p class="cert-subtitle">This is officially presented and conferred upon</p>
      </div>

      <div class="cert-body">
        <h2 class="recipient-name">${recipient}</h2>
        <div class="name-underline"></div>
        <p class="cert-desc">
          for successfully completing the rigorous academic curriculum, proctored examinations, and applied laboratory competencies required for the professional credential in
        </p>
        <h3 class="course-title">${courseTitle}</h3>
        <p class="cert-tagline">Demonstrating advanced engineering rigor, technical competency, and verified professional excellence.</p>
      </div>

      <div class="signatures-row">
        <div class="sig-col">
          <div class="sig-hand">Dr. James Wilson</div>
          <div class="sig-line">Dr. James Wilson, Ph.D.</div>
          <div class="sig-role">Lead Faculty & Curriculum Director</div>
        </div>

        <div class="seal-circle">
          <span class="seal-text">Official</span>
          <span class="seal-stars">★ ★ ★ ★ ★</span>
          <span class="seal-text">Authentic</span>
        </div>

        <div class="sig-col">
          <div class="sig-hand">Sarah Chen</div>
          <div class="sig-line">Sarah Chen, M.Sc.</div>
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
