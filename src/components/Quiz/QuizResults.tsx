import React, { useState } from 'react';
import CertificateGenerator from '../Certificate/CertificateGenerator';

interface QuizResultsProps {
  passed: boolean;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  userName: string;
  courseName: string;
  onRetake: () => void;
  onExit: () => void;
}

const QuizResults: React.FC<QuizResultsProps> = ({ 
  passed, 
  score, 
  totalQuestions,
  correctAnswers,
  userName, 
  courseName, 
  onRetake, 
  onExit 
}) => {
  const [showCertificate, setShowCertificate] = useState(false);
  const certificateId = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const completionDate = new Date().toLocaleDateString();
  const passingScore = Math.ceil(totalQuestions * 0.5); // 50% passing rate

  const handleDownload = () => {
    setShowCertificate(false);
    // Show success message
    setTimeout(() => {
      alert('Certificate downloaded successfully!');
    }, 100);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-black mb-6 dark:text-white">Quiz Results</h2>
        
        {passed ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 mb-6">
            <div className="text-green-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-green-500 mb-2">Congratulations!</h3>
            <p className="text-gray-700 mb-4 dark:text-gray-300">You have successfully passed the quiz.</p>
            <div className="bg-gray-100 rounded-lg p-4 shadow-sm mb-6 dark:bg-gray-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Your Score</p>
                  <p className="text-2xl font-bold text-green-500">{correctAnswers}/{totalQuestions}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Percentage</p>
                  <p className="text-2xl font-bold text-black dark:text-white">{score}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Passing Score</p>
                  <p className="text-2xl font-bold text-black dark:text-white">{passingScore} ({Math.ceil(50)}%)</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                  <p className="text-2xl font-bold text-green-500">PASSED</p>
                </div>
              </div>
            </div>
            
            {!showCertificate ? (
              <div className="space-y-4">
                <button
                  onClick={() => setShowCertificate(true)}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white px-4 py-3 rounded-lg font-medium transition-all duration-300 transform hover:scale-105"
                >
                  Generate Certificate
                </button>
                <button
                  onClick={onExit}
                  className="w-full bg-white hover:bg-gray-100 text-black px-4 py-3 rounded-lg font-medium transition-colors dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white"
                >
                  Exit
                </button>
              </div>
            ) : (
              <CertificateGenerator 
                certificateData={{
                  userName,
                  courseName,
                  completionDate,
                  certificateId
                }}
                onDownload={handleDownload}
              />
            )}
          </div>
        ) : (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 mb-6">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-red-500 mb-2">Quiz Not Passed</h3>
            <p className="text-gray-700 mb-4 dark:text-gray-300">You need to score at least {passingScore} to pass this quiz.</p>
            <div className="bg-gray-100 rounded-lg p-4 shadow-sm mb-6 dark:bg-gray-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Your Score</p>
                  <p className="text-2xl font-bold text-red-500">{correctAnswers}/{totalQuestions}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Percentage</p>
                  <p className="text-2xl font-bold text-black dark:text-white">{score}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Passing Score</p>
                  <p className="text-2xl font-bold text-black dark:text-white">{passingScore} ({Math.ceil(50)}%)</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                  <p className="text-2xl font-bold text-red-500">FAILED</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={onRetake}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-4 py-3 rounded-lg font-medium transition-all duration-300 transform hover:scale-105"
              >
                Retake Quiz
              </button>
              <button
                onClick={onExit}
                className="w-full bg-white hover:bg-gray-100 text-black px-4 py-3 rounded-lg font-medium transition-colors dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white"
              >
                Exit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizResults;