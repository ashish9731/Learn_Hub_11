import React from 'react';
import { supabase } from '../../lib/supabase';

interface CertificateData {
  userName: string;
  courseName: string;
  completionDate: string;
  certificateId: string;
}

const CertificateGenerator: React.FC<{ 
  certificateData: CertificateData;
  onDownload: () => void;
}> = ({ certificateData, onDownload }) => {
  const generateCertificate = async () => {
    try {
      // In a real implementation, this would generate a PDF certificate
      // For now, we'll create a simple HTML-based certificate and convert it to PDF
      const certificateHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Certificate of Completion</title>
          <style>
            body {
              font-family: 'Georgia', serif;
              background: linear-gradient(135deg, #f5f7fa 0%, #e4edf9 100%);
              margin: 0;
              padding: 40px;
              text-align: center;
            }
            .certificate {
              max-width: 800px;
              margin: 0 auto;
              padding: 40px;
              border: 15px solid #d4af37;
              background: white;
              box-shadow: 0 0 20px rgba(0,0,0,0.1);
              position: relative;
            }
            .certificate::before {
              content: "";
              position: absolute;
              top: 20px;
              left: 20px;
              right: 20px;
              bottom: 20px;
              border: 1px solid #d4af37;
              pointer-events: none;
            }
            .header {
              color: #d4af37;
              font-size: 48px;
              margin-bottom: 20px;
              text-transform: uppercase;
              letter-spacing: 3px;
            }
            .subtitle {
              font-size: 24px;
              color: #333;
              margin-bottom: 40px;
            }
            .recipient {
              font-size: 32px;
              color: #333;
              margin: 30px 0;
              font-weight: bold;
            }
            .course {
              font-size: 24px;
              color: #666;
              margin: 20px 0;
            }
            .date {
              font-size: 20px;
              color: #666;
              margin: 20px 0;
            }
            .signature {
              margin-top: 60px;
              display: flex;
              justify-content: space-around;
            }
            .signature-line {
              width: 200px;
              border-top: 1px solid #333;
              padding-top: 10px;
            }
            .certificate-id {
              position: absolute;
              bottom: 20px;
              right: 20px;
              font-size: 12px;
              color: #999;
            }
          </style>
        </head>
        <body>
          <div class="certificate">
            <h1 class="header">Certificate of Completion</h1>
            <p class="subtitle">This certifies that</p>
            <p class="recipient">${certificateData.userName}</p>
            <p class="subtitle">has successfully completed the course</p>
            <p class="course">${certificateData.courseName}</p>
            <p class="date">Completed on: ${certificateData.completionDate}</p>
            <div class="signature">
              <div class="signature-line">Authorized Signature</div>
              <div class="signature-line">Date</div>
            </div>
            <div class="certificate-id">ID: ${certificateData.certificateId}</div>
          </div>
        </body>
        </html>
      `;

      // Create a blob and download it
      const blob = new Blob([certificateHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${certificateData.certificateId}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      onDownload();
    } catch (error) {
      console.error('Error generating certificate:', error);
      alert('Error generating certificate. Please try again.');
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 shadow-lg p-6">
      <h3 className="text-lg font-medium text-white mb-2">Congratulations!</h3>
      <p className="text-gray-300 mb-4">You have successfully passed the quiz.</p>
      <button
        onClick={generateCertificate}
        className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 transform hover:scale-105"
      >
        Download Certificate
      </button>
    </div>
  );
};

export default CertificateGenerator;