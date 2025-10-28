import React, { useState, useEffect } from 'react';
import { X, UserCog, Building2, Mail, Phone } from 'lucide-react';

interface EditAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (adminData: any) => void;
  admin: any;
  companies: any[];
}

export default function EditAdminModal({ isOpen, onClose, onSubmit, admin, companies }: EditAdminModalProps) {
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

  useEffect(() => {
    if (admin) {
      setFormData({
        adminName: admin.email.split('@')[0] || '',
        adminEmail: admin.email || '',
        adminRole: admin.role || 'admin',
        adminPhone: admin.phone || '',
        companyId: admin.company_id || '',
        department: admin.department || '',
        role: 'Admin',
        permissions: {
          userManagement: true,
          contentManagement: true,
          analytics: true,
          settings: false
        }
      });
    }
  }, [admin]);

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // Get company name for display purposes
      const selectedCompany = companies.find(company => company.id === formData.companyId);
      const companyName = selectedCompany ? selectedCompany.name : '';

      const adminData = {
        ...admin,
        ...formData,
        role: formData.adminRole,
        companyName
      };
      onSubmit(adminData);
      onClose();
    }
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <UserCog className="h-6 w-6 text-indigo-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Edit Admin</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Admin Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Admin Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Name *
                </label>
                <input
                  type="text"
                  value={formData.adminName}
                  onChange={(e) => handleInputChange('adminName', e.target.value)}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.adminName ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter admin name"
                />
                {errors.adminName && (
                  <p className="mt-1 text-sm text-red-600">{errors.adminName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Email *
                </label>
                <input
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) => handleInputChange('adminEmail', e.target.value)}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.adminEmail ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="admin@company.com"
                />
                {errors.adminEmail && (
                  <p className="mt-1 text-sm text-red-600">{errors.adminEmail}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.adminPhone}
                  onChange={(e) => handleInputChange('adminPhone', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="+1-555-0123"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., IT, HR, Training"
                />
              </div>
            </div>
          </div>

          {/* Admin Role */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Admin Role</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role *
                </label>
                <select
                  value={formData.adminRole}
                  onChange={(e) => handleInputChange('adminRole', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {formData.adminRole === 'super_admin' 
                    ? 'Super Admins have full system access' 
                    : 'Admins manage users within their company'}
                </p>
              </div>
            </div>
          </div>

          {/* Company Assignment */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Company Assignment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building2 className="h-4 w-4 inline mr-1" />
                  Company {formData.adminRole === 'admin' ? <span className="text-red-500">*</span> : ''}
                </label>
                <select
                  value={formData.companyId}
                  onChange={(e) => handleInputChange('companyId', e.target.value)}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.companyId ? 'border-red-300' : 'border-gray-300'
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
                  <p className="mt-1 text-sm text-red-600">{errors.companyId}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  {formData.adminRole === 'super_admin' 
                    ? 'Super Admins are not assigned to any company' 
                    : 'Select the company that this admin will manage'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            <h3 className="text-lg font-medium text-gray-900 mb-4">Permissions</h3>
            <div className="space-y-3">
              {Object.entries(formData.permissions).map(([permission, value]) => (
                <div key={permission} className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 capitalize">
                      {permission.replace(/([A-Z])/g, ' $1').trim()}
                    </h4>
                    <p className="text-sm text-gray-500">
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
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}