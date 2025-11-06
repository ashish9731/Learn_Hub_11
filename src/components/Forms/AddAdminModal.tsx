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
      const { data: existingUser, error: checkError } = await supabaseAdmin
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
      const { data: userData, error: userError } = await supabaseAdmin
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
      const { data: profileData, error: profileError } = await supabaseAdmin
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
        const { data: storedTempPasswordData, error: fetchError } = await supabaseAdmin
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-[var(--background-secondary)] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border-color)]">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                Add New Admin
              </h2>
              <button
                onClick={onClose}
                className="text-[var(--text-primary)] hover:text-[var(--text-secondary)]"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="adminEmail" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="adminEmail"
                  value={formData.adminEmail}
                  onChange={(e) => handleInputChange('adminEmail', e.target.value)}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] bg-[var(--background-tertiary)] text-[var(--text-primary)] ${
                    errors.adminEmail ? 'border-red-500' : 'border-[var(--border-color)]'
                  }`}
                  placeholder="admin@example.com"
                />
                {errors.adminEmail && <p className="mt-1 text-sm text-red-400">{errors.adminEmail}</p>}
              </div>

              <div>
                <label htmlFor="adminName" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  id="adminName"
                  value={formData.adminName}
                  onChange={(e) => handleInputChange('adminName', e.target.value)}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] bg-[var(--background-tertiary)] text-[var(--text-primary)] ${
                    errors.adminName ? 'border-red-500' : 'border-[var(--border-color)]'
                  }`}
                  placeholder="John Doe"
                />
                {errors.adminName && <p className="mt-1 text-sm text-red-400">{errors.adminName}</p>}
              </div>

              <div>
                <label htmlFor="adminPhone" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="adminPhone"
                  value={formData.adminPhone}
                  onChange={(e) => handleInputChange('adminPhone', e.target.value)}
                  className="block w-full px-3 py-2 border border-[var(--border-color)] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] bg-[var(--background-tertiary)] text-[var(--text-primary)]"
                  placeholder="+1-555-0123"
                />
              </div>

              <div>
                <label htmlFor="companyId" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Company
                </label>
                <select
                  id="companyId"
                  value={formData.companyId}
                  onChange={(e) => handleInputChange('companyId', e.target.value)}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] bg-[var(--background-tertiary)] text-[var(--text-primary)] ${
                    errors.companyId ? 'border-red-500' : 'border-[var(--border-color)]'
                  }`}
                >
                  <option value="">Select a company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
                {errors.companyId && <p className="mt-1 text-sm text-red-400">{errors.companyId}</p>}
              </div>

              <div>
                <label htmlFor="department" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Department
                </label>
                <input
                  type="text"
                  id="department"
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] bg-[var(--background-tertiary)] text-[var(--text-primary)] ${
                    errors.department ? 'border-red-500' : 'border-[var(--border-color)]'
                  }`}
                  placeholder="e.g., IT, HR, Sales"
                />
                {errors.department && <p className="mt-1 text-sm text-red-400">{errors.department}</p>}
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-[var(--border-color)] rounded-md shadow-sm text-sm font-medium text-[var(--text-primary)] bg-[var(--background-tertiary)] hover:bg-[var(--background-secondary)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent-primary)] disabled:opacity-50"
                >
                  {isCreatingUser ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Password Display Modal */}
      {showPasswordModal && generatedPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60 p-4">
          <div className="bg-[var(--background-secondary)] rounded-lg shadow-xl max-w-md w-full border border-[var(--border-color)]">
            <div className="p-6">
              <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">Admin Created Successfully!</h3>
              <div className="bg-[var(--background-tertiary)] border border-[var(--border-color)] rounded-lg p-4 mb-4">
                <p className="text-sm text-[var(--text-tertiary)] mb-2">Temporary Password:</p>
                <div className="flex items-center justify-between bg-[var(--background-secondary)] border border-[var(--border-color)] rounded p-3">
                  <code className="text-[var(--text-primary)] font-mono text-lg">{generatedPassword}</code>
                  <button
                    onClick={() => copyToClipboard(generatedPassword)}
                    className="ml-2 px-3 py-1 bg-[var(--accent-primary)] text-white text-xs rounded hover:bg-[var(--accent-secondary)]"
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
                  className="px-4 py-2 bg-[var(--accent-primary)] text-white rounded hover:bg-[var(--accent-secondary)]"
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