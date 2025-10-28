import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, UserPlus, User, Book, Info, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { supabaseHelpers } from '../../hooks/useSupabase';
import UserRegistrationForm from './UserRegistrationForm';
import RegistrationSuccessPage from './RegistrationSuccessPage';

interface AuthPageProps {
  onLogin: (email: string, role?: string) => void;
}

export default function AuthPage({ onLogin }: AuthPageProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [showRegistrationSuccess, setShowRegistrationSuccess] = useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!supabaseHelpers.isValidEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (isSignUp) {
      if (!firstName.trim()) {
        newErrors.firstName = 'First name is required';
      }
      if (!lastName.trim()) {
        newErrors.lastName = 'Last name is required';
      }
      if (!confirmPassword.trim()) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!forgotPasswordEmail.trim()) {
      setErrors({ forgotPassword: 'Email is required' });
      return;
    }
    
    if (!supabaseHelpers.isValidEmail(forgotPasswordEmail)) {
      setErrors({ forgotPassword: 'Please enter a valid email address' });
      return;
    }
    
    try {
      setIsLoading(true);
      setErrors({});
      
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      setForgotPasswordSent(true);
    } catch (error: any) {
      console.error('Password reset error:', error);
      setErrors({ forgotPassword: error.message || 'Failed to send password reset email' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      if (isSignUp) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              full_name: `${firstName} ${lastName}`.trim(),
            },
          },
        });

        if (authError) throw authError;

        if (authData.user) {
          alert('Account created successfully! Please check your email to verify your account.');
          setIsSignUp(false);
          setEmail('');
          setPassword('');
          setConfirmPassword('');
          setFirstName('');
          setLastName('');
        }
      } else {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) {
          if (authError.message?.includes('Invalid login credentials')) {
            setErrors({ general: 'Invalid email or password. Please try again.' });
          } else if (authError.message?.includes('Email not confirmed')) {
            setErrors({ general: 'Please check your email and click the confirmation link before signing in.' });
          } else {
            setErrors({ general: authError.message || 'An error occurred during sign in. Please try again.' });
          }
          return;
        }
          
        if (authData.user) {
          // First try to get from auth metadata
          let userRole = authData.user.user_metadata?.role || 'user';
          let requiresPasswordChange = false;
          
          // Try to get from database as fallback
          try {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('role, requires_password_change')
              .eq('id', authData.user.id)
              .single();

            if (!userError && userData) {
              userRole = userData.role || userRole;
              requiresPasswordChange = userData.requires_password_change || false;
            }
          } catch (dbError) {
            console.warn('Could not fetch from database, using auth metadata:', dbError);
          }

          // Check if user needs to change password
          if (requiresPasswordChange) {
            setCurrentUser({ ...authData.user, role: userRole });
            setShowPasswordChangeModal(true);
            return; // Don't proceed with normal login
          } else {
            // User exists in the database, proceed with login
            onLogin(email, userRole);
            console.log('Logging in with role:', userRole);
          }
        }
      }
    } catch (error: any) {
      console.error('Authentication error:', error);

      if (error.message?.includes('Invalid login credentials')) {
        setErrors({ general: 'Invalid email or password. Please try again.' });
      } else if (error.message?.includes('User must be assigned to a company')) {
        setErrors({ general: 'Your account is not properly configured. Please contact the administrator.' });
      } else if (error.message?.includes('User already registered')) {
        setErrors({ general: 'An account with this email already exists. Please sign in instead.' });
      } else if (error.message?.includes('Email not confirmed')) {
        setErrors({ general: 'Please check your email and click the confirmation link before signing in.' });
      } else {
        setErrors({ general: error.message || 'An error occurred. Please try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmNewPassword) {
      setErrors({ passwordChange: 'Please fill in all password fields' });
      return;
    }
    
    if (newPassword.length < 6) {
      setErrors({ passwordChange: 'New password must be at least 6 characters' });
      return;
    }
    
    if (newPassword !== confirmNewPassword) {
      setErrors({ passwordChange: 'Passwords do not match' });
      return;
    }
    
    try {
      setIsLoading(true);
      setErrors({});
      
      // Update password in Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (updateError) throw updateError;
      
      // Update the requires_password_change flag in users table
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({ requires_password_change: false })
        .eq('id', currentUser.id);
      
      if (userUpdateError) {
        console.error('Error updating user password flag:', userUpdateError);
      }
      
      // Close modal and proceed with login
      setShowPasswordChangeModal(false);
      setCurrentUser(null);
      setNewPassword('');
      setConfirmNewPassword('');
      onLogin(email, currentUser.role);
      
    } catch (error: any) {
      console.error('Password change error:', error);
      setErrors({ passwordChange: error.message || 'Failed to change password' });
    } finally {
      setIsLoading(false);
    }
  };
  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setErrors({});
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFirstName('');
    setLastName('');
  };

  const handleShowRegistration = () => {
    setShowRegistration(true);
  };

  const handleRegistrationComplete = () => {
    setShowRegistration(false);
    setShowRegistrationSuccess(true);
  };

  const handleBackToLogin = () => {
    setShowRegistration(false);
    setShowRegistrationSuccess(false);
    setIsSignUp(false);
    setShowForgotPassword(false);
    setForgotPasswordSent(false);
    setForgotPasswordEmail('');
  };

  if (showRegistration) {
    return <UserRegistrationForm onRegistrationComplete={handleRegistrationComplete} />;
  }

  if (showRegistrationSuccess) {
    return <RegistrationSuccessPage onBackToLogin={handleBackToLogin} />;
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url("https://images.pexels.com/photos/1624496/pexels-photo-1624496.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&dpr=1")'
          }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        </div>

        {/* Content Container */}
        <div className="relative z-10 min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-white/10 backdrop-blur-sm mb-6 border border-white/20">
                <Lock className="h-12 w-12 text-white" />
              </div>
              <h2 className="text-3xl font-extrabold text-white">
                {forgotPasswordSent ? 'Check Your Email' : 'Reset Password'}
              </h2>
              <p className="mt-2 text-sm text-white/80">
                {forgotPasswordSent 
                  ? 'We\'ve sent a password reset link to your email'
                  : 'Enter your email to receive a password reset link'
                }
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-xl p-8 border border-white/20">
              {forgotPasswordSent ? (
                <div className="text-center space-y-4">
                  <div className="bg-green-500/20 rounded-lg p-4 border border-green-400/30">
                    <p className="text-green-200 text-sm">
                      Password reset email sent successfully! Check your inbox and follow the instructions to reset your password.
                    </p>
                  </div>
                  <button
                    onClick={handleBackToLogin}
                    className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg border border-white/30 transition-all duration-300"
                  >
                    Back to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-6">
                  <div>
                    <label className="block text-white/90 text-sm font-medium mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all duration-300"
                      placeholder="Enter your email address"
                      required
                    />
                  </div>

                  {errors.forgotPassword && (
                    <div className="bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-lg p-3">
                      <p className="text-sm text-red-200">{errors.forgotPassword}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Sending Reset Link...
                      </div>
                    ) : (
                      'Send Reset Link'
                    )}
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleBackToLogin}
                      className="text-white/80 hover:text-white text-sm font-medium transition-colors duration-300"
                    >
                      Back to Login
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <>
      <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url("https://images.pexels.com/photos/1624496/pexels-photo-1624496.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&dpr=1")'
        }}
      >
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 min-h-screen flex">
        {/* Left Side - Welcome Content */}
        <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 xl:px-24">
          <div className="max-w-lg">
            {/* Logo and Brand Name */}
            <div className="mb-16">
              <div className="flex items-center mb-4">
                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20">
                  <svg className="h-14 w-14 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="ml-6">
                  <h1 className="text-4xl font-bold text-white">LearnHub</h1>
                  <p className="text-white/70 text-base">Professional Learning Management</p>
                </div>
              </div>
            </div>

            <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Welcome
              <br />
              Back
            </h1>
            
            <p className="text-lg text-white/90 mb-8 leading-relaxed">
              Your learning journey awaits. Access premium content and track your progress with our comprehensive learning management platform.
            </p>

            {/* Social Media Icons */}
            <div className="flex space-x-4">
              <button className="p-3 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-all duration-300 border border-white/20">
                <Facebook className="h-5 w-5" />
              </button>
              <button className="p-3 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-all duration-300 border border-white/20">
                <Twitter className="h-5 w-5" />
              </button>
              <button className="p-3 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-all duration-300 border border-white/20">
                <Instagram className="h-5 w-5" />
              </button>
              <button className="p-3 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-all duration-300 border border-white/20">
                <Youtube className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full max-w-md lg:max-w-lg xl:max-w-xl flex items-center justify-center p-8">
          <div className="w-full max-w-sm">
            {/* Sign In Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">
                {isSignUp ? 'Create Account' : 'Sign in'}
              </h2>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {isSignUp && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all duration-300"
                      placeholder="First Name"
                      required
                    />
                    {errors.firstName && <p className="text-red-300 text-sm mt-1">{errors.firstName}</p>}
                  </div>
                  <div>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all duration-300"
                      placeholder="Last Name"
                      required
                    />
                    {errors.lastName && <p className="text-red-300 text-sm mt-1">{errors.lastName}</p>}
                  </div>
                </div>
              )}

              {/* Email Address */}
              <div>
                <label className="block text-white/90 text-sm font-medium mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all duration-300"
                  placeholder="Enter your email"
                  required
                />
                {errors.email && <p className="text-red-300 text-sm mt-1">{errors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="block text-white/90 text-sm font-medium mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all duration-300"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/70 hover:text-white transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.password && <p className="text-red-300 text-sm mt-1">{errors.password}</p>}
              </div>

              {isSignUp && (
                <div>
                  <label className="block text-white/90 text-sm font-medium mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all duration-300"
                      placeholder="Confirm your password"
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/70 hover:text-white transition-colors"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-red-300 text-sm mt-1">{errors.confirmPassword}</p>}
                </div>
              )}

              {/* Remember Me Checkbox */}
              {!isSignUp && (
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-white/30 rounded bg-white/10 backdrop-blur-sm"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-white/90">
                    Remember Me
                  </label>
                </div>
              )}

              {errors.general && (
                <div className="bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-lg p-3">
                  <p className="text-sm text-red-200">{errors.general}</p>
                </div>
              )}

              {/* Sign In Button */}
              <button
                type="submit"
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    {isSignUp ? 'Creating Account...' : 'Signing in...'}
                  </div>
                ) : (
                  isSignUp ? 'Create Account' : 'Sign in now'
                )}
              </button>

              {/* Lost Password Link */}
              {!isSignUp && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-white/80 hover:text-white text-sm transition-colors duration-300"
                  >
                    Lost your password?
                  </button>
                </div>
              )}

              {/* Toggle Sign Up/Sign In */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={toggleMode}
                  disabled={isLoading}
                  className="text-white/80 hover:text-white text-sm font-medium transition-colors duration-300 disabled:opacity-50"
                >
                  {isSignUp 
                    ? 'Already have an account? Sign in' 
                    : "Don't have an account? Sign up"
                  }
                </button>
              </div>

              {/* Independent Registration Link */}
              {!isSignUp && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleShowRegistration}
                    disabled={isLoading}
                    className="text-white/80 hover:text-white text-sm font-medium transition-colors duration-300 disabled:opacity-50 underline"
                  >
                    Register independently for approval
                  </button>
                </div>
              )}

              {/* Terms and Privacy */}
              {isSignUp && (
                <div className="text-center text-xs text-white/70 leading-relaxed">
                  By clicking on "Create Account" you agree to our{' '}
                  <button className="text-white/90 hover:text-white underline transition-colors">
                    Terms of Service
                  </button>
                  {' '}|{' '}
                  <button className="text-white/90 hover:text-white underline transition-colors">
                    Privacy Policy
                  </button>
                </div>
              )}
            </form>

            {/* Getting Started Info */}
            {!isSignUp && (
              <div className="mt-8">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <h3 className="text-sm font-medium text-white mb-2">Getting Started:</h3>
                  <div className="space-y-1 text-xs text-white/80">
                    <p>• <strong>New users:</strong> Click "Sign up" to create an account</p>
                    <p>• <strong>Existing users:</strong> Sign in with your credentials</p>
                    <p>• <strong>Super Admin:</strong> Contact system administrator for access</p>
                    <p>• <strong>Independent registration:</strong> Register for admin approval</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordChangeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Change Your Password</h3>
              <p className="text-sm text-gray-600 mb-6">
                For security reasons, you must change your password before accessing the system.
              </p>
              
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter new password"
                    required
                    minLength={6}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Confirm new password"
                    required
                    minLength={6}
                  />
                </div>
                
                {errors.passwordChange && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <p className="text-sm text-red-600">{errors.passwordChange}</p>
                  </div>
                )}
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}