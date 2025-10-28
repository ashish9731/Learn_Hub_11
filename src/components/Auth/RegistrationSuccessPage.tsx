import React from 'react';
import { CheckCircle, Clock, Mail, ArrowLeft } from 'lucide-react';

interface RegistrationSuccessPageProps {
  onBackToLogin: () => void;
}

export default function RegistrationSuccessPage({ onBackToLogin }: RegistrationSuccessPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">
            Registration Submitted!
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Your profile has been submitted for review
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="space-y-6">
            <div className="flex items-start space-x-3">
              <Clock className="h-6 w-6 text-blue-500 mt-1" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">What happens next?</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Your registration is now pending approval by a system administrator. 
                  This process typically takes 1-2 business days.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Mail className="h-6 w-6 text-green-500 mt-1" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">You'll be notified</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Once your profile is reviewed, you'll receive access to the learning platform.
                  You can then sign in with your registered credentials.
                </p>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Approval Process:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Administrator reviews your profile information</li>
                <li>• You may be approved as an individual user</li>
                <li>• Or you may be assigned to a specific company</li>
                <li>• Once approved, you'll have full access to courses</li>
              </ul>
            </div>

            <button
              onClick={onBackToLogin}
              className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}