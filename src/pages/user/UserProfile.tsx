import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Calendar, Edit, Save, X, Building2, Award } from 'lucide-react';
import { useProfile } from '../../hooks/useProfile';
import { supabaseHelpers } from '../../hooks/useSupabase';
import { supabase } from '../../lib/supabase';
import ProfilePictureUpload from '../../components/Profile/ProfilePictureUpload';
import { extractFirstNameFromEmail } from '../../utils/timeGreeting';
import { useLocalStorage } from '../../hooks/useLocalStorage';

interface UserProfileProps {
  userEmail?: string;
}

export default function UserProfile({ userEmail = '' }: UserProfileProps) {
  const { profile, loading, error, updateProfile, uploadProfilePicture, deleteProfilePicture } = useProfile();
  const [users, setUsers] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    first_name: '',
    last_name: '',
    full_name: '',
    phone: '',
    department: '',
    position: '',
    employee_id: '',
    bio: ''
  });

  // Default user data
  const [currentUser, setCurrentUser] = useState({
    userName: '',
    userEmail: '',
    userPhone: '',
    department: '',
    position: '',
    companyName: '',
    adminName: '',
    joiningDate: '',
    employeeId: '',
    coursesEnrolled: 0,
    coursesCompleted: 0,
    completionHours: 0,
    completionRate: 0
  });

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await supabaseHelpers.getUsers();
        setUsers(userData);
        
        // Find current user data
        const user = userData.find((u: any) => u.email === userEmail);
        if (user) {
          // Get company name
          let companyName = '';
          if (user.company_id) {
            const { data: company } = await supabase
              .from('companies')
              .select('name')
              .eq('id', user.company_id)
              .single();
            companyName = company?.name || '';
          }
          
          // Get admin name
          let adminName = '';
          if (user.company_id) {
            const { data: admin } = await supabase
              .from('users')
              .select('email')
              .eq('company_id', user.company_id)
              .eq('role', 'admin')
              .maybeSingle();
            adminName = admin?.email || '';
          }
          
          // Get user courses
          const { data: userCourses } = await supabase
            .from('user_courses')
            .select('*')
            .eq('user_id', user.id);
          
          setCurrentUser({
            userName: extractFirstNameFromEmail(userEmail || ''),
            userEmail: userEmail || '',
            userPhone: user.phone || '',
            department: user.department || '',
            position: user.position || '',
            companyName,
            adminName,
            joiningDate: user.created_at ? new Date(user.created_at).toISOString().split('T')[0] : '',
            employeeId: user.employee_id || '',
            coursesEnrolled: userCourses?.length || 0,
            coursesCompleted: userCourses?.filter((c: any) => c.completed).length || 0,
            completionHours: user.completionHours || 0,
            completionRate: user.completionRate || 0
          });
        }
      } catch (error) {
        console.error('Failed to load users:', error);
      }
    };
    
    loadUserData();
  }, []);

  useEffect(() => {
    if (profile) {
      setEditData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        department: profile.department || currentUser.department,
        position: profile.position || currentUser.position,
        employee_id: profile.employee_id || currentUser.employeeId,
        bio: profile.bio || ''
      });
    }
  }, [profile, currentUser]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      const fullName = `${editData.first_name} ${editData.last_name}`.trim();
      await updateProfile({
        ...editData,
        full_name: fullName
      });
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile. Please try again.');
    }
  };

  const handleCancel = () => {
    if (profile) {
      setEditData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        department: profile.department || currentUser.department,
        position: profile.position || currentUser.position,
        employee_id: profile.employee_id || currentUser.employeeId,
        bio: profile.bio || ''
      });
    }
    setIsEditing(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleProfilePictureUpload = async (file: File) => {
    await uploadProfilePicture(file);
  };

  const handleProfilePictureDelete = async () => {
    await deleteProfilePicture();
  };

  if (loading) {
    return (
      <div className="py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading profile...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-600">Error loading profile: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  const displayName = profile?.full_name || extractFirstNameFromEmail(userEmail);
  const firstName = profile?.first_name || extractFirstNameFromEmail(userEmail);

  return (
    <div className="py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Profile
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage your personal information and learning preferences
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            {!isEditing ? (
              <button
                onClick={handleEdit}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Edit className="-ml-1 mr-2 h-5 w-5" />
                Edit Profile
              </button>
            ) : (
              <div className="flex space-x-3">
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <X className="-ml-1 mr-2 h-5 w-5" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <Save className="-ml-1 mr-2 h-5 w-5" />
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
          </div>
          
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Profile Picture */}
              <div className="md:col-span-2 flex items-center space-x-6">
                <div className="flex-shrink-0">
                  <ProfilePictureUpload
                    currentImageUrl={profile?.profile_picture_url}
                    onUpload={handleProfilePictureUpload}
                    onDelete={handleProfilePictureDelete}
                    size="lg"
                  />
                </div>
                <div>
                  <h4 className="text-lg font-medium text-gray-900">{displayName}</h4>
                  <p className="text-sm text-gray-500">{editData.position || currentUser.position}</p>
                  <p className="text-sm text-gray-500">{currentUser.companyName}</p>
                  <p className="text-sm text-gray-500 mt-1">Click the camera icon to change your photo</p>
                </div>
              </div>

              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <div className="flex items-center">
                    <User className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">{profile?.first_name || 'Not set'}</span>
                  </div>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <div className="flex items-center">
                    <User className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">{profile?.last_name || 'Not set'}</span>
                  </div>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="flex items-center">
                  <Mail className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-900">{userEmail}</span>
                  <span className="ml-2 text-xs text-gray-500">(Cannot be changed)</span>
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">{profile?.phone || currentUser.userPhone}</span>
                  </div>
                )}
              </div>

              {/* Employee ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employee ID
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.employee_id}
                    onChange={(e) => handleInputChange('employee_id', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <div className="flex items-center">
                    <span className="text-sm text-gray-900">{profile?.employee_id || currentUser.employeeId}</span>
                  </div>
                )}
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <div className="flex items-center">
                    <span className="text-sm text-gray-900">{profile?.department || currentUser.department}</span>
                  </div>
                )}
              </div>

              {/* Position */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Position
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.position}
                    onChange={(e) => handleInputChange('position', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <div className="flex items-center">
                    <span className="text-sm text-gray-900">{profile?.position || currentUser.position}</span>
                  </div>
                )}
              </div>

              {/* Company */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company
                </label>
                <div className="flex items-center">
                  <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-900">{currentUser.companyName}</span>
                </div>
              </div>

              {/* Join Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Join Date
                </label>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-900">
                    {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : new Date(currentUser.joiningDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Bio */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>
                {isEditing ? (
                  <textarea
                    rows={3}
                    value={editData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-sm text-gray-900">{profile?.bio || 'Dedicated team member focused on continuous learning and professional development. Passionate about acquiring new skills and applying knowledge to drive organizational success.'}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Learning Statistics */}
        <div className="mt-8 bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Learning Statistics</h3>
          </div>
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">0</div>
                <div className="text-sm text-gray-500">Courses Enrolled <span className="text-xs text-blue-600">(Coming Soon)</span></div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">0</div>
                <div className="text-sm text-gray-500">Courses Completed <span className="text-xs text-blue-600">(Coming Soon)</span></div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">0.0</div>
                <div className="text-sm text-gray-500">Hours Completed <span className="text-xs text-blue-600">(Coming Soon)</span></div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">0%</div>
                <div className="text-sm text-gray-500">Completion Rate <span className="text-xs text-blue-600">(Coming Soon)</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="mt-8 bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Security</h3>
          </div>
          <div className="px-6 py-6">
            <div className="space-y-4">
              <button className="w-full text-left px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Change Password</h4>
                    <p className="text-sm text-gray-500">Update your account password</p>
                  </div>
                  <span className="text-sm text-blue-600">Change</span>
                </div>
              </button>
              
              <button className="w-full text-left px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Notification Preferences</h4>
                    <p className="text-sm text-gray-500">Manage your learning notifications</p>
                  </div>
                  <span className="text-sm text-blue-600">Manage</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}