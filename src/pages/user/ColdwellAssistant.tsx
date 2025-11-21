import React from 'react';

export default function ColdwellAssistant() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-300 text-black dark:from-gray-900 dark:to-black dark:text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Glassmorphism Header */}
        <div className="bg-white/80 dark:bg-white/10 backdrop-blur-lg rounded-2xl border border-gray-200 dark:border-white/20 shadow-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-black dark:text-white">Coldwell Assistant</h1>
              <p className="text-gray-700 dark:text-gray-300 mt-1">Your AI-powered learning assistant</p>
            </div>
          </div>
        </div>

        {/* Chatbot Container */}
        <div className="bg-white/80 dark:bg-white/10 backdrop-blur-lg rounded-2xl border border-gray-200 dark:border-white/20 shadow-xl p-6">
          <div className="h-[calc(100vh-200px)]">
            <iframe
              src="https://app.vectorshift.ai/chatbots/deployed/6906fc2a3e9a9fba20bca9e2"
              className="w-full h-full rounded-lg border-0"
              title="Coldwell Assistant Chatbot"
              allow="clipboard-write"
            />
          </div>
        </div>
      </div>
    </div>
  );
}