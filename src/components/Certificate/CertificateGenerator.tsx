import React from 'react';
import { jsPDF } from 'jspdf';

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
      // Create a new PDF document
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Set background color
      doc.setFillColor(245, 247, 250);
      doc.rect(0, 0, 297, 210, 'F');

      // Add border
      doc.setDrawColor(212, 175, 55); // Gold color
      doc.setLineWidth(2);
      doc.rect(10, 10, 277, 190);

      // Add inner border
      doc.setLineWidth(0.5);
      doc.rect(15, 15, 267, 180);

      // Add header
      doc.setFontSize(36);
      doc.setTextColor(212, 175, 55); // Gold color
      doc.setFont('helvetica', 'bold');
      doc.text('CERTIFICATE OF COMPLETION', 148.5, 40, { align: 'center' });

      // Add subtitle
      doc.setFontSize(18);
      doc.setTextColor(51, 51, 51); // Dark gray
      doc.setFont('helvetica', 'normal');
      doc.text('This certifies that', 148.5, 60, { align: 'center' });

      // Add recipient name
      doc.setFontSize(28);
      doc.setTextColor(51, 51, 51); // Dark gray
      doc.setFont('helvetica', 'bold');
      doc.text(certificateData.userName, 148.5, 80, { align: 'center' });

      // Add completion text
      doc.setFontSize(18);
      doc.setTextColor(51, 51, 51); // Dark gray
      doc.setFont('helvetica', 'normal');
      doc.text('has successfully completed the course', 148.5, 100, { align: 'center' });

      // Add course name
      doc.setFontSize(22);
      doc.setTextColor(102, 102, 102); // Gray
      doc.setFont('helvetica', 'bold');
      // Wrap text if too long
      const courseNameLines = doc.splitTextToSize(certificateData.courseName, 180);
      doc.text(courseNameLines, 148.5, 115, { align: 'center' });

      // Add completion date
      doc.setFontSize(16);
      doc.setTextColor(102, 102, 102); // Gray
      doc.setFont('helvetica', 'normal');
      doc.text(`Completed on: ${certificateData.completionDate}`, 148.5, 135, { align: 'center' });

      // Add training info
      doc.setFontSize(14);
      doc.setTextColor(85, 85, 85); // Darker gray
      doc.setFont('helvetica', 'italic');
      doc.text('Training done by ColdWell Bankers', 148.5, 155, { align: 'center' });
      doc.text('Training Partner: KeenEdge Technologies', 148.5, 162, { align: 'center' });

      // Add signature lines
      doc.setDrawColor(51, 51, 51); // Black
      doc.setLineWidth(0.5);
      doc.line(70, 180, 130, 180); // Authorized signature line
      doc.line(167, 180, 227, 180); // Date line

      doc.setFontSize(12);
      doc.setTextColor(51, 51, 51); // Black
      doc.setFont('helvetica', 'normal');
      doc.text('Authorized Signature', 100, 185, { align: 'center' });
      doc.text('Date', 197, 185, { align: 'center' });

      // Add certificate ID
      doc.setFontSize(10);
      doc.setTextColor(153, 153, 153); // Light gray
      doc.text(`ID: ${certificateData.certificateId}`, 280, 200, { align: 'right' });

      // Save the PDF
      doc.save(`certificate-${certificateData.certificateId}.pdf`);
      
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