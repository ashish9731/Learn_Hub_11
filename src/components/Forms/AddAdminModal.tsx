import React, { useState } from 'react';
import { X, UserCog, Building2, Mail, Phone } from 'lucide-react';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import { sendAdminCreatedEmail } from '../../services/emailService';
import { supabaseHelpers } from '../../hooks/useSupabase';

interface AddAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (adminData: any) => Promise<string | null>;
  companies: any[];
}

export default function AddAdminModal({ isOpen, onClose, onSubmit, companies }: AddAdminModalProps) {
  const [formData, setFormData] = useState({
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    adminRole: 'admin',
    companyId: '',
    department: '',
    role: 'Admin',
    permissions: {
      userManagement: true,
      contentManagement: true,
      analytics: true,
      settings: false
    }
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

  const handlePermissionChange = (permission: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: value
      }
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validate role and company combination
    if (formData.adminRole === 'admin' && !formData.companyId.trim()) {
      newErrors.companyId = 'Company is required for admin users';
    }

    if (!formData.adminName.trim()) {
      newErrors.adminName = 'Admin name is required';
    }
    if (!formData.adminEmail.trim()) {
      newErrors.adminEmail = 'Admin email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.adminEmail)) {
      newErrors.adminEmail = 'Please enter a valid email address';
    }
    if (!formData.companyId.trim()) {
      if (formData.adminRole !== 'super_admin') {
        if (formData.adminRole === 'admin') {
          newErrors.companyId = 'Company is required for admin users';
        }
      }
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
      
      // Generate a secure random password for the admin
      const password = generateSecurePassword();
      setGeneratedPassword(password);
      
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
        .eq('email', formData.adminEmail)
        .maybeSingle();
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking user existence:', checkError);
        setErrors({ adminEmail: 'Failed to verify admin email. Please try again.' });
        setIsCreatingUser(false);
        return;
      }
      
      if (existingUser) {
        setErrors({ adminEmail: 'A user with this email already exists in the database. Please use a different email address.' });
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
          const existingAuthUser = authUser.users.find(user => user.email === formData.adminEmail);
          if (existingAuthUser) {
            setErrors({ adminEmail: 'A user with this email already exists in the authentication system. Please use a different email address.' });
            setIsCreatingUser(false);
            return;
          }
        }
      } catch (authCheckError) {
        console.error('Error checking auth user existence:', authCheckError);
        setErrors({ adminEmail: 'Failed to verify email in authentication system. Please try again.' });
        setIsCreatingUser(false);
        return;
      }
      
      // Create the admin using admin.createUser for reliable creation
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: formData.adminEmail,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: formData.adminName.split(' ')[0] || '',
          last_name: formData.adminName.split(' ').slice(1).join(' ') || '',
          full_name: formData.adminName,
          role: formData.adminRole,
          requires_password_change: true
        }
      });
      
      if (authError) {
        setErrors({ general: authError.message || 'Failed to create admin account.' });
        setIsCreatingUser(false);
        return;
      }
      
      if (!authData?.user?.id) {
        setErrors({ general: 'Failed to create admin account.' });
        setIsCreatingUser(false);
        return;
      }
      
      // Create the user in the users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: formData.adminEmail,
          role: formData.adminRole,
          company_id: formData.companyId || null,
          requires_password_change: true
        })
        .select()
        .single();
      
      if (userError) {
        // Clean up auth user if database creation fails
        console.error('Error creating user in users table:', userError);
        try {
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        } catch (cleanupError) {
          console.error('Failed to cleanup auth user:', cleanupError);
        }
        setErrors({ general: userError.message || 'Failed to create admin record.' });
        setIsCreatingUser(false);
        return;
      }
      
      // Create user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: authData.user.id,
          first_name: formData.adminName.split(' ')[0] || '',
          last_name: formData.adminName.split(' ').slice(1).join(' ') || '',
          full_name: formData.adminName,
          phone: formData.adminPhone,
          department: formData.department
        })
        .select();
      
      if (profileError) {
        console.error('Error creating user profile:', profileError);
        // Try to continue anyway, profile can be created later by the user
        console.warn('Profile creation failed, but admin account was created successfully');
      }
      
      // Store temporary password in database
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const tempPasswordRecord = await supabaseHelpers.createTempPassword({
          user_id: authData.user.id,
          email: formData.adminEmail,
          full_name: formData.adminName,
          role: formData.adminRole,
          temp_password: password,
          is_used: false,
          created_by: currentUser?.id
        });
        console.log('🔥 TEMP PASSWORD STORED:', tempPasswordRecord);
        console.log('🔥 PASSWORD FROM DB:', tempPasswordRecord?.temp_password);
      } catch (tempPasswordError) {
        console.error('Error storing temporary password:', tempPasswordError);
        // Continue anyway, password is still shown to admin
      }
      
      // Fetch the stored temp password from database to ensure we have the right one
      let finalTempPassword = password;
      try {
        console.log('🔥🔥🔥 ADMIN - FETCHING TEMP PASSWORD FROM DATABASE FOR USER ID:', authData.user.id);
        const { data: storedTempPasswordData, error: fetchError } = await supabase
          .from('temp_passwords')
          .select('*')
          .eq('user_id', authData.user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (!fetchError && storedTempPasswordData && storedTempPasswordData.temp_password) {
          finalTempPassword = storedTempPasswordData.temp_password;
          console.log('🔥🔥🔥 ADMIN - FETCHED TEMP PASSWORD FROM DB:', finalTempPassword);
          console.log('🔥🔥🔥 ADMIN - TEMP PASSWORD RECORD:', storedTempPasswordData);
        } else {
          console.log('🔥🔥🔥 ADMIN - NO TEMP PASSWORD FOUND IN DB, USING GENERATED:', password);
          console.log('🔥🔥🔥 ADMIN - FETCH ERROR:', fetchError);
        }
      } catch (fetchError) {
        console.error('ADMIN - Error fetching temp password from DB:', fetchError);
        console.log('🔥🔥🔥 ADMIN - EXCEPTION - FALLBACK TO GENERATED PASSWORD:', password);
      }
      
      // Send email notification with the temp password from database
      try {
        const selectedCompany = companies.find(company => company.id === formData.companyId);
        const companyName = selectedCompany ? selectedCompany.name : 'Your Organization';
        
        console.log('🔥🔥🔥 ADMIN - PREPARING TO SEND EMAIL WITH FINAL TEMP PASSWORD:', finalTempPassword);
        console.log('🔥🔥🔥 ADMIN - EMAIL WILL BE SENT TO:', formData.adminEmail);
        console.log('🔥🔥🔥 ADMIN - NAME FOR EMAIL:', formData.adminName);
        console.log('🔥🔥🔥 ADMIN - COMPANY NAME FOR EMAIL:', companyName);
        console.log('🔥🔥🔥 ADMIN - SELECTED ROLE FOR EMAIL:', formData.adminRole);
        
        // ALWAYS send admin email for admin role
        let emailSent = false;
        if (formData.adminRole === 'admin' || formData.adminRole === 'super_admin') {
          console.log('📧🔥🔥🔥 ADMIN - SENDING ADMIN INVITATION EMAIL');
          console.log('📧🔥🔥🔥 ADMIN - EMAIL:', formData.adminEmail);
          console.log('📧🔥🔥🔥 ADMIN - NAME:', formData.adminName);
          console.log('📧🔥🔥🔥 ADMIN - TEMP PASSWORD FROM DB:', finalTempPassword);
          console.log('📧🔥🔥🔥 ADMIN - COMPANY:', companyName);
          
          emailSent = await sendAdminCreatedEmail(
            formData.adminEmail,
            formData.adminName,
            finalTempPassword,
            companyName
          );
          
          if (emailSent) {
            console.log('✅🔥🔥🔥 ADMIN - EMAIL SENT SUCCESSFULLY WITH PASSWORD:', finalTempPassword);
          } else {
            console.error('❌🔥🔥🔥 ADMIN - EMAIL FAILED TO SEND');
          }
        } else {
          console.error('❌🔥🔥🔥 ADMIN FORM - UNKNOWN ROLE - NO EMAIL SENT:', formData.adminRole);
        }
      } catch (emailError) {
        console.error('❌🔥🔥🔥 ADMIN FORM - EMAIL SENDING EXCEPTION:', emailError);
      }
      
      setIsCreatingUser(false);
      // Show password modal instead of alert
      setShowPasswordModal(true);
      
      // Get company name for display purposes
      const selectedCompany = companies.find(company => company.id === formData.companyId);
      const companyName = selectedCompany ? selectedCompany.name : '';
      
      // Call the onSubmit callback with the admin data
      const errorMessage = await onSubmit({
        ...formData,
        id: authData.user.id,
        companyName
      });
      
      if (errorMessage) {
        setErrors({ general: errorMessage });
        return;
      }
      
    } catch (error: any) {
      console.error('Error creating admin:', error);
      setErrors({ general: error.message || 'Failed to create admin. Please try again.' });
      setIsCreatingUser(false);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleClose = () => {
    setFormData({
      adminName: '',
      adminEmail: '',
      adminPhone: '',
      adminRole: 'admin',
      companyId: '',
      department: '',
      role: 'Admin',
      permissions: {
        userManagement: true,
        contentManagement: true,
        analytics: true,
        settings: false
      }
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
            <UserCog className="h-6 w-6 text-[#8b5cf6] mr-2" />
            <h2 className="text-xl font-semibold text-white">Add New Admin</h2>
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

          {/* Admin Information */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Admin Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Admin Name *
                </label>
                <input
                  type="text"
                  value={formData.adminName}
                  onChange={(e) => handleInputChange('adminName', e.target.value)}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] bg-[#252525] text-white ${
                    errors.adminName ? 'border-red-700' : 'border-[#333333]'
                  }`}
                  placeholder="Enter admin name"
                />
                {errors.adminName && (
                  <p className="mt-1 text-sm text-red-400">{errors.adminName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Admin Email *
                </label>
                <input
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) => handleInputChange('adminEmail', e.target.value)}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] bg-[#252525] text-white ${
                    errors.adminEmail ? 'border-red-700' : 'border-[#333333]'
                  }`}
                  placeholder="admin@company.com"
                />
                {errors.adminEmail && (
                  <p className="mt-1 text-sm text-red-400">{errors.adminEmail}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.adminPhone}
                  onChange={(e) => handleInputChange('adminPhone', e.target.value)}
                  className="block w-full px-3 py-2 border border-[#333333] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] bg-[#252525] text-white"
                  placeholder="+1-555-0123"
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
                  placeholder="e.g., IT, HR, Training"
                />
                {errors.department && (
                  <p className="mt-1 text-sm text-red-400">{errors.department}</p>
                )}
              </div>
            </div>
          </div>

          {/* Admin Role */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Admin Role</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Role *
                </label>
                <select
                  value={formData.adminRole}
                  onChange={(e) => handleInputChange('adminRole', e.target.value)}
                  className="block w-full px-3 py-2 border border-[#333333] rounded-md shadow-sm focus:outline-none focus:ring-[#8b5cf6] focus:border-[#8b5cf6] bg-[#252525] text-white"
                >
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
                <p className="mt-1 text-xs text-[#a0a0a0]">
                  {formData.adminRole === 'super_admin' 
                    ? 'Super Admins have full system access' 
                    : 'Admins manage users within their company'}
                </p>
              </div>
            </div>
          </div>

          {/* Company Assignment */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Company Assignment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  <Building2 className="h-4 w-4 inline mr-1" />
                  Company {formData.adminRole === 'admin' ? <span className="text-red-500">*</span> : ''}
                </label>
                <select
                  value={formData.companyId}
                  onChange={(e) => handleInputChange('companyId', e.target.value)}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] bg-[#252525] text-white ${
                    errors.companyId ? 'border-red-700' : 'border-[#333333]'
                  }`}
                  disabled={formData.adminRole === 'super_admin'}
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
                  {formData.adminRole === 'super_admin' 
                    ? 'Super Admins are not assigned to any company' 
                    : 'Select the company that this admin will manage'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  className="block w-full px-3 py-2 border border-[#333333] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] bg-[#252525] text-white"
                >
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Supervisor">Supervisor</option>
                </select>
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Permissions</h3>
            <div className="space-y-3">
              {Object.entries(formData.permissions).map(([permission, value]) => (
                <div key={permission} className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-white capitalize">
                      {permission.replace(/([A-Z])/g, ' $1').trim()}
                    </h4>
                    <p className="text-sm text-[#a0a0a0]">
                      {permission === 'userManagement' && 'Manage users and their access'}
                      {permission === 'contentManagement' && 'Upload and manage learning content'}
                      {permission === 'analytics' && 'View analytics and reports'}
                      {permission === 'settings' && 'Modify system settings'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => handlePermissionChange(permission, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#333333] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#8b5cf6]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#333333] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8b5cf6]"></div>
                  </label>
                </div>
              ))}
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
              {isCreatingUser ? 'Creating...' : 'Create Admin'}
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
              <h3 className="text-lg font-medium text-white mb-4">Admin Created Successfully!</h3>
              <div className="bg-[#252525] border border-[#333333] rounded-lg p-4 mb-4">
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
                  <strong>Important:</strong> Please share this password with the admin. They will be required to change it on first login.
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setGeneratedPassword(null);
                    // Reset form and close main modal
                    setFormData({
                      adminName: '',
                      adminEmail: '',
                      adminPhone: '',
                      adminRole: 'admin',
                      companyId: '',
                      department: '',
                      role: 'Admin',
                      permissions: {
                        userManagement: true,
                        contentManagement: true,
                        analytics: true,
                        settings: false
                      }
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