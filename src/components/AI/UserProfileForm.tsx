import React, { useState } from 'react';
import { User, Building2, Briefcase, FileText, Brain, Rocket, Sparkles, MessageSquare } from 'lucide-react';

interface UserProfileFormProps {
  onSubmit: (profile: any) => void;
  initialData?: any;
}

export default function UserProfileForm({ onSubmit, initialData }: UserProfileFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    companyName: initialData?.companyName || '',
    designation: initialData?.designation || '',
    profileDescription: initialData?.profileDescription || '',
    learningGoals: initialData?.learningGoals || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeStep, setActiveStep] = useState(1);
  const totalSteps = 3;

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }
    if (!formData.designation.trim()) {
      newErrors.designation = 'Current designation is required';
    }
    if (!formData.profileDescription.trim()) {
      newErrors.profileDescription = 'Profile description is required';
    }
    if (!formData.learningGoals.trim()) {
      newErrors.learningGoals = 'Learning goals are required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        ...formData,
        interestedTech: formData.learningGoals.split(',').map(item => item.trim())
      });
    }
  };

  const nextStep = () => {
    setActiveStep(prev => Math.min(prev + 1, totalSteps));
  };

  const prevStep = () => {
    setActiveStep(prev => Math.max(prev - 1, 1));
  };

  const renderStepIndicator = () => {
    return (
      <div className="flex items-center justify-between mb-8 px-2">
        {[1, 2, 3].map(step => (
          <div key={step} className="flex flex-col items-center">
            <div 
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                step < activeStep 
                  ? 'bg-green-500 text-white' 
                  : step === activeStep 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {step < activeStep ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step
              )}
            </div>
            <span className={`text-xs mt-2 ${
              step === activeStep ? 'text-blue-600 font-medium' : 'text-gray-500'
            }`}>
              {step === 1 ? 'Basic Info' : step === 2 ? 'Professional' : 'Learning Goals'}
            </span>
          </div>
        ))}
        <div className="absolute left-0 right-0 h-0.5 bg-gray-200 -z-10" style={{ top: '1.25rem' }}>
          <div 
            className="h-full bg-blue-600 transition-all duration-300" 
            style={{ width: `${((activeStep - 1) / (totalSteps - 1)) * 100}%` }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-xl overflow-hidden mb-8">
        <div className="p-8 text-white">
          <div className="flex items-center mb-6">
            <div className="bg-white/20 p-4 rounded-lg backdrop-blur-sm">
              <Brain className="h-10 w-10 text-white" />
            </div>
            <div className="ml-6">
              <h1 className="text-3xl font-bold">Welcome to Kaaya</h1>
              <p className="text-xl text-blue-100">Your AI Learning Assistant</p>
            </div>
          </div>
          
          <p className="text-lg text-blue-100 mb-8">
            Kaaya provides personalized learning recommendations tailored to your career goals and interests.
            Let's get to know you better to create your perfect learning journey.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/10 rounded-xl p-5 backdrop-blur-sm transform transition-all duration-300 hover:scale-105 hover:bg-white/15">
              <Rocket className="h-8 w-8 text-blue-200 mb-3" />
              <h3 className="text-lg font-semibold mb-2">Career Growth</h3>
              <p className="text-blue-100">Get personalized career advancement strategies based on your goals</p>
            </div>
            
            <div className="bg-white/10 rounded-xl p-5 backdrop-blur-sm transform transition-all duration-300 hover:scale-105 hover:bg-white/15">
              <Sparkles className="h-8 w-8 text-blue-200 mb-3" />
              <h3 className="text-lg font-semibold mb-2">Skill Development</h3>
              <p className="text-blue-100">Focus on the skills that matter most for your specific role</p>
            </div>
            
            <div className="bg-white/10 rounded-xl p-5 backdrop-blur-sm transform transition-all duration-300 hover:scale-105 hover:bg-white/15">
              <MessageSquare className="h-8 w-8 text-blue-200 mb-3" />
              <h3 className="text-lg font-semibold mb-2">AI Guidance</h3>
              <p className="text-blue-100">Chat with Kaaya anytime for personalized learning advice</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-xl p-8 relative">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Complete Your Learning Profile</h2>
        <p className="text-gray-600 mb-6">
          Tell us about yourself so we can personalize your learning experience
        </p>
        
        {renderStepIndicator()}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {activeStep === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="h-4 w-4 inline mr-2" />
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`block w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter your full name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building2 className="h-4 w-4 inline mr-2" />
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  className={`block w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.companyName ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter your company name"
                />
                {errors.companyName && (
                  <p className="mt-1 text-sm text-red-600">{errors.companyName}</p>
                )}
              </div>
            </div>
          )}

          {activeStep === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Briefcase className="h-4 w-4 inline mr-2" />
                  Current Designation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={(e) => handleInputChange('designation', e.target.value)}
                  className={`block w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.designation ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Software Engineer, Product Manager, Data Analyst"
                />
                {errors.designation && (
                  <p className="mt-1 text-sm text-red-600">{errors.designation}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="h-4 w-4 inline mr-2" />
                  Profile Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={formData.profileDescription}
                  onChange={(e) => handleInputChange('profileDescription', e.target.value)}
                  className={`block w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.profileDescription ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Describe your current role, experience, and career goals..."
                />
                {errors.profileDescription && (
                  <p className="mt-1 text-sm text-red-600">{errors.profileDescription}</p>
                )}
              </div>
            </div>
          )}

          {activeStep === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Rocket className="h-4 w-4 inline mr-2" />
                  Learning Goals <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={6}
                  value={formData.learningGoals}
                  onChange={(e) => handleInputChange('learningGoals', e.target.value)}
                  className={`block w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.learningGoals ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Tell us what you want to learn, your interests, technologies you're curious about, or skills you want to develop. Separate multiple items with commas."
                />
                {errors.learningGoals && (
                  <p className="mt-1 text-sm text-red-600">{errors.learningGoals}</p>
                )}
                <p className="mt-2 text-sm text-gray-500">
                  Examples: "I want to learn React and improve my frontend skills", "I'm interested in machine learning and data science", 
                  "I need to prepare for a cloud certification"
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            {activeStep > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="px-6 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Back
              </button>
            )}
            {activeStep < totalSteps ? (
              <button
                type="button"
                onClick={nextStep}
                className="ml-auto px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Next
              </button>
            ) : (
              <div className="relative group ml-auto">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-200"></div>
                <button
                  type="submit"
                  className="relative px-8 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-md"
                >
                  <Sparkles className="h-4 w-4 inline mr-2" />
                  Start Learning Journey
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}