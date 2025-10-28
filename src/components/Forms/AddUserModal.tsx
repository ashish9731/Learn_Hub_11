import React, { useState } from 'react';
import { X, User, Building2, Mail, Phone, UserCheck } from 'lucide-react';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import { sendUserCreatedEmail } from '../../services/emailService';
import { supabaseHelpers } from '../../hooks/useSupabase';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userData: any) => Promise<string | null>;
  companies: any[];
  admins: any[];
}

export default function AddUserModal({ isOpen, onClose, onSubmit, companies, admins }: AddUserModalProps) {
  const [formData, setFormData] = useState({
    userName: '',
    userEmail: '',
    userPhone: '',
    userRole: 'user',
    companyId: '',
    adminId: '',
    department: '',
    position: '',
    employeeId: '',
    joiningDate: new Date().toISOString().split('T')[0]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

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

    if (!formData.userName.trim()) {
      newErrors.userName = 'User name is required';
    }
    if (!formData.userEmail.trim()) {
      newErrors.userEmail = 'User email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.userEmail)) {
      newErrors.userEmail = 'Please enter a valid email address';
    }
    if (!formData.companyId.trim()) {
      newErrors.companyId = 'Company is required';
    }
    if (!formData.department.trim()) {
      newErrors.department = 'Department is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsCreatingUser(true);
      setErrors({});
      
      // Generate a secure random password for the user
      const password = generateSecurePassword();
      setGeneratedPassword(password);
      
      console.log('Creating user with email:', formData.userEmail);
      
      // Check if service role key is configured
      if (!supabaseAdmin || !supabaseAdmin.auth || !supabaseAdmin.auth.admin) {
        setErrors({ general: 'Admin operations are not configured. Please ensure VITE_SUPABASE_SERVICE_ROLE_KEY is set in your environment variables.' });
        setIsCreatingUser(false);
        return;
      }
      
      // Check if user already exists in our database
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', formData.userEmail)
        .maybeSingle();
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking user existence:', checkError);
        setErrors({ userEmail: 'Failed to verify user email. Please try again.' });
        setIsCreatingUser(false);
        return;
      }
      
      if (existingUser) {
        setErrors({ userEmail: 'A user with this email already exists in the database. Please use a different email address.' });
        setIsCreatingUser(false);
        return;
      }
      
      // Check if user already exists in Supabase Auth
      try {
        const { data: authUser, error: authCheckError } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000
        });
        
        if (authUser?.users) {
          const existingAuthUser = authUser.users.find(user => user.email === formData.userEmail);
          if (existingAuthUser) {
            setErrors({ userEmail: 'A user with this email already exists in the authentication system. Please use a different email address.' });
            setIsCreatingUser(false);
            return;
          }
        }
      } catch (authCheckError) {
        console.error('Error checking auth user existence:', authCheckError);
        setErrors({ userEmail: 'Failed to verify email in authentication system. Please try again.' });
        setIsCreatingUser(false);
        return;
      }
      
      // Create the user using admin.createUser for reliable creation
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: formData.userEmail,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: formData.userName.split(' ')[0] || '',
          last_name: formData.userName.split(' ').slice(1).join(' ') || '',
          full_name: formData.userName,
          role: 'user',
          requires_password_change: true
        }
      });
      
      if (authError) {
        console.error('Auth error:', authError);
        setErrors({ userEmail: 'Failed to create user account: ' + authError.message });
        setIsCreatingUser(false);
        return;
      }
      
      if (!authData?.user?.id) {
        setErrors({ general: 'Failed to create user account.' });
        setIsCreatingUser(false);
        return;
      }
      
      const userId = authData.user.id;
      console.log('Created auth user with ID:', userId);
      
      // Create the user in the users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: formData.userEmail,
          role: 'user',
          company_id: formData.companyId || null,
          requires_password_change: true
        })
        .select()
        .single();
      
      if (userError) {
        console.error('Database creation error:', userError);
        // Clean up auth user if database creation fails
        try {
          await supabaseAdmin.auth.admin.deleteUser(userId);
        } catch (cleanupError) {
          console.error('Failed to cleanup auth user:', cleanupError);
        }
        setErrors({ general: 'Failed to create user record: ' + userError.message });
        setIsCreatingUser(false);
        return;
      }
      
      // Create user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: userId,
          first_name: formData.userName.split(' ')[0] || '',
          last_name: formData.userName.split(' ').slice(1).join(' ') || '',
          full_name: formData.userName,
          phone: formData.userPhone,
          department: formData.department,
          position: formData.position,
          employee_id: formData.employeeId
        })
        .select();
      
      if (profileError) {
        console.error('Error creating user profile:', profileError);
        // Try to continue anyway, profile can be created later by the user
        console.warn('Profile creation failed, but user account was created successfully');
      }
      
      console.log('User creation completed successfully');
      
      // Store temporary password in database
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const tempPasswordRecord = await supabaseHelpers.createTempPassword({
          user_id: userId,
          email: formData.userEmail,
          full_name: formData.userName,
          role: 'user',
          temp_password: password,
          is_used: false,
          created_by: currentUser?.id
        });
        console.log('🔥 USER TEMP PASSWORD STORED:', tempPasswordRecord);
        console.log('🔥 USER PASSWORD FROM DB:', tempPasswordRecord?.temp_password);
      } catch (tempPasswordError) {
        console.error('Error storing temporary password:', tempPasswordError);
        // Continue anyway, password is still shown to admin
      }
      
      // Fetch the stored temp password from database to ensure we have the right one
      let finalTempPassword = password;
      try {
        console.log('🔥🔥🔥 USER - FETCHING TEMP PASSWORD FROM DATABASE FOR USER ID:', userId);
        const { data: storedTempPasswordData, error: fetchError } = await supabase
          .from('temp_passwords')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (!fetchError && storedTempPasswordData && storedTempPasswordData.temp_password) {
          finalTempPassword = storedTempPasswordData.temp_password;
          console.log('🔥🔥🔥 USER - FETCHED TEMP PASSWORD FROM DB:', finalTempPassword);
          console.log('🔥🔥🔥 USER - TEMP PASSWORD RECORD:', storedTempPasswordData);
        } else {
          console.log('🔥🔥🔥 USER - NO TEMP PASSWORD FOUND IN DB, USING GENERATED:', password);
          console.log('🔥🔥🔥 USER - FETCH ERROR:', fetchError);
        }
      } catch (fetchError) {
        console.error('USER - Error fetching temp password from DB:', fetchError);
        console.log('🔥🔥🔥 USER - EXCEPTION - FALLBACK TO GENERATED PASSWORD:', password);
      }
      
      // Send email notification with the temp password from database
      try {
        const selectedCompany = companies.find(company => company.id === formData.companyId);
        const companyName = selectedCompany ? selectedCompany.name : 'Your Organization';
        
        console.log('🔥🔥🔥 USER - PREPARING TO SEND EMAIL WITH FINAL TEMP PASSWORD:', finalTempPassword);
        console.log('🔥🔥🔥 USER - EMAIL WILL BE SENT TO:', formData.userEmail);
        console.log('🔥🔥🔥 USER - NAME FOR EMAIL:', formData.userName);
        console.log('🔥🔥🔥 USER - COMPANY NAME FOR EMAIL:', companyName);
        console.log('🔥🔥🔥 USER - SELECTED ROLE FOR EMAIL:', formData.userRole);
        
        // ALWAYS send user email for user role
        let emailSent = false;
        console.log('📧🔥🔥🔥 USER - SENDING USER INVITATION EMAIL');
        console.log('📧🔥🔥🔥 USER - EMAIL:', formData.userEmail);
        console.log('📧🔥🔥🔥 USER - NAME:', formData.userName);
        console.log('📧🔥🔥🔥 USER - TEMP PASSWORD FROM DB:', finalTempPassword);
        console.log('📧🔥🔥🔥 USER - COMPANY:', companyName);
        
        emailSent = await sendUserCreatedEmail(
          formData.userEmail,
          formData.userName,
          finalTempPassword,
          companyName
        );
        
        if (emailSent) {
          console.log('✅🔥🔥🔥 USER - EMAIL SENT SUCCESSFULLY WITH PASSWORD:', finalTempPassword);
        } else {
          console.error('❌🔥🔥🔥 USER - EMAIL FAILED TO SEND');
        }
          
      } catch (emailError) {
        console.error('❌🔥🔥🔥 USER FORM - EMAIL SENDING EXCEPTION:', emailError);
      }
      
      console.log('User created successfully, showing password modal');
      setIsCreatingUser(false);
      setShowPasswordModal(true);
      
      // Call the onSubmit callback after showing password modal
      const errorMessage = await onSubmit({
        ...formData,
        id: userId,
        password: password
      });
      
      if (errorMessage) {
        setErrors({ general: errorMessage });
        return;
      }
      
    } catch (error: any) {
      console.error('Error creating user:', error);
      setErrors({ general: 'Failed to create user: ' + error.message });
      setIsCreatingUser(false);
    } finally {
      setIsCreatingUser(false);
    }
  };
    
  const sendEmailNotification = async () => {
    try {
      const selectedCompany = companies.find(company => company.id === formData.companyId);
      const companyName = selectedCompany ? selectedCompany.name : '';
      
      const emailResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-user-notification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'user_created',
          userEmail: formData.userEmail,
          userName: formData.userName,
          password: generatedPassword,
          companyName: companyName
        })
      });
      
      if (!emailResponse.ok) {
        console.error('Failed to send email notification');
      } else {
        console.log('Email notification sent successfully');
      }
    } catch (emailError) {
      console.error('Error sending email notification:', emailError);
      // Don't fail user creation if email fails
    }
  };

  const handleClose = () => {
    setFormData({
      userName: '',
      userEmail: '',
      userPhone: '',
      userRole: 'user',
      companyId: '',
      adminId: '',
      department: '',
      position: '',
      employeeId: '',
      joiningDate: new Date().toISOString().split('T')[0]
    });
    setErrors({});
    onClose();
  };

  const generateSecurePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Password copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy password. Please copy it manually.');
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-[#1e1e1e] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#333333]">
          <div className="flex items-center justify-between p-6 border-b border-[#333333]">
            <div className="flex items-center">
              <User className="h-6 w-6 text-[#8b5cf6] mr-2" />
              <h2 className="text-xl font-semibold text-white">Add New User</h2>
            </div>
            <button
              onClick={handleClose}
              className="text-[#a0a0a0] hover:text-white focus:outline-none"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* General Error Message */}
            {errors.general && (
              <div className="bg-red-900/20 border border-red-800 rounded-md p-3">
                <p className="text-sm text-red-400">{errors.general}</p>
              </div>
            )}

            {/* User Information */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4">User Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    User Name *
                  </label>
                  <input
                    type="text"
                    value={formData.userName}
                    onChange={(e) => handleInputChange('userName', e.target.value)}
                    className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] bg-[#252525] text-white ${
                      errors.userName ? 'border-red-700' : 'border-[#333333]'
                    }`}
                    placeholder="Enter user name"
                  />
                  {errors.userName && (
                    <p className="mt-1 text-sm text-red-400">{errors.userName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    User Email *
                  </label>
                  <input
                    type="email"
                    value={formData.userEmail}
                    onChange={(e) => handleInputChange('userEmail', e.target.value)}
                    className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] bg-[#252525] text-white ${
                      errors.userEmail ? 'border-red-700' : 'border-[#333333]'
                    }`}
                    placeholder="user@company.com"
                  />
                  {errors.userEmail && (
                    <p className="mt-1 text-sm text-red-400">{errors.userEmail}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.userPhone}
                    onChange={(e) => handleInputChange('userPhone', e.target.value)}
                    className="block w-full px-3 py-2 border border-[#333333] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] bg-[#252525] text-white"
                    placeholder="+1-555-0123"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    value={formData.employeeId}
                    onChange={(e) => handleInputChange('employeeId', e.target.value)}
                    className="block w-full px-3 py-2 border border-[#333333] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] bg-[#252525] text-white"
                    placeholder="EMP001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Department *
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] bg-[#252525] text-white ${
                      errors.department ? 'border-red-700' : 'border-[#333333]'
                    }`}
                    placeholder="e.g., IT, HR, Sales"
                  />
                  {errors.department && (
                    <p className="mt-1 text-sm text-red-400">{errors.department}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Position
                  </label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => handleInputChange('position', e.target.value)}
                    className="block w-full px-3 py-2 border border-[#333333] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] bg-[#252525] text-white"
                    placeholder="e.g., Software Engineer, Manager"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Joining Date
                  </label>
                  <input
                    type="date"
                    value={formData.joiningDate}
                    onChange={(e) => handleInputChange('joiningDate', e.target.value)}
                    className="block w-full px-3 py-2 border border-[#333333] rounded-md shadow-sm focus:outline-none focus:ring-[#8b5cf6] focus:border-[#8b5cf6] bg-[#252525] text-white"
                  />
                </div>
              </div>
            </div>

            {/* Company & Admin Assignment */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Company & Admin Assignment</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    <Building2 className="h-4 w-4 inline mr-1" />
                    Company *
                  </label>
                  <select
                    value={formData.companyId}
                    onChange={(e) => {
                      handleInputChange('companyId', e.target.value);
                      // Reset admin selection when company changes
                      handleInputChange('adminId', '');
                    }}
                    className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] bg-[#252525] text-white ${
                      errors.companyId ? 'border-red-700' : 'border-[#333333]'
                    }`}
                  >
                    <option value="">Select a company</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                  {errors.companyId && (
                    <p className="mt-1 text-sm text-red-400">{errors.companyId}</p>
                  )}
                  <p className="mt-1 text-xs text-[#a0a0a0]">
                    Select the company for this user
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    <UserCheck className="h-4 w-4 inline mr-1" />
                    Assign to Admin (Optional)
                  </label>
                  <select
                    value={formData.adminId}
                    onChange={(e) => handleInputChange('adminId', e.target.value)}
                    className="block w-full px-3 py-2 border border-[#333333] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] bg-[#252525] text-white"
                    disabled={!formData.companyId}
                  >
                    <option value="">No admin assigned</option>
                    {admins
                      .filter(admin => !formData.companyId || admin.company_id === formData.companyId)
                      .map(admin => (
                        <option key={admin.id} value={admin.id}>
                          {admin.email}
                        </option>
                      ))}
                  </select>
                  <p className="mt-1 text-xs text-[#a0a0a0]">
                    {!formData.companyId 
                      ? "Select a company first" 
                      : admins.filter(a => a.company_id === formData.companyId).length === 0
                        ? "No admins available for this company"
                        : "Optionally assign this user to an admin from the selected company"}
                  </p>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-[#333333]">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-[#333333] rounded-md shadow-sm text-sm font-medium text-white bg-[#252525] hover:bg-[#333333] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8b5cf6]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingUser}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8b5cf6] hover:bg-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8b5cf6] disabled:opacity-50"
              >
                {isCreatingUser ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Password Display Modal */}
      {showPasswordModal && generatedPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60 p-4">
          <div className="bg-[#1e1e1e] rounded-lg shadow-xl max-w-md w-full border border-[#333333]">
            <div className="p-6">
              <h3 className="text-lg font-medium text-white mb-4">User Created Successfully!</h3>
              <div className="bg-[#252525] border border-[#333333] rounded-lg p-4 mb-4">
                <p className="text-sm text-[#a0a0a0] mb-2">Email:</p>
                <div className="bg-[#1e1e1e] border border-[#333333] rounded p-3 mb-3">
                  <code className="text-white font-mono text-sm">{formData.userEmail}</code>
                </div>
                <p className="text-sm text-[#a0a0a0] mb-2">Temporary Password:</p>
                <div className="flex items-center justify-between bg-[#1e1e1e] border border-[#333333] rounded p-3">
                  <code className="text-white font-mono text-lg">{generatedPassword}</code>
                  <button
                    onClick={() => copyToClipboard(generatedPassword)}
                    className="ml-2 px-3 py-1 bg-[#8b5cf6] text-white text-xs rounded hover:bg-[#7c3aed]"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3 mb-4">
                <p className="text-yellow-400 text-sm">
                  <strong>Important:</strong> Please share these credentials with the user. They will be required to change the password on first login.
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setGeneratedPassword(null);
                    // Reset form and close main modal
                    setFormData({
                      userName: '',
                      userEmail: '',
                      userPhone: '',
                      userRole: 'user',
                      companyId: '',
                      adminId: '',
                      department: '',
                      position: '',
                      employeeId: '',
                      joiningDate: new Date().toISOString().split('T')[0]
                    });
                    onClose();
                  }}
                  className="px-4 py-2 bg-[#8b5cf6] text-white rounded hover:bg-[#7c3aed]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}