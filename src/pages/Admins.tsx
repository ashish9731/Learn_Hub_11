import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Building2, User, Mail, Phone, MapPin, UserCog, CheckCircle, BookOpen, ArrowLeft } from 'lucide-react';
import { supabaseHelpers } from '../hooks/useSupabase';
import { useRealtimeSync } from '../hooks/useSupabase';
import { supabase } from '../lib/supabase';
import AddAdminModal from '../components/Forms/AddAdminModal';
import EditAdminModal from '../components/Forms/EditAdminModal';

interface Company {
  id: string;
  name: string;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  role: string;
  company_id: string;
  created_at: string;
}

interface Course {
  id: string;
  title: string;
  company_id: string | null;
  image_url: string | null;
  created_at: string;
  level?: string;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  department: string;
  created_at: string;
}

interface UserCourse {
  id: string;
  user_id: string;
  course_id: string;
  created_at: string;
}

export default function Admins() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<User | null>(null);
  const [supabaseData, setSupabaseData] = useState<{
    companies: Company[];
    users: User[];
    courses: Course[];
    userProfiles: UserProfile[];
    userCourses: UserCourse[];
  }>({
    companies: [],
    users: [],
    courses: [],
    userProfiles: [],
    userCourses: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAdminsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [companiesData, usersData, coursesData, userProfilesData, userCoursesData] = await Promise.all([
        supabaseHelpers.getCompanies(),
        supabaseHelpers.getUsers(),
        supabaseHelpers.getCourses(),
        supabaseHelpers.getAllUserProfiles(),
        supabaseHelpers.getAllUserCourses()
      ]);
      
      setSupabaseData({
        companies: companiesData,
        users: usersData,
        courses: coursesData,
        userProfiles: userProfilesData,
        userCourses: userCoursesData
      });
    } catch (err) {
      console.error('Failed to load admins data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Real-time sync for all relevant tables
  useRealtimeSync('users', loadAdminsData);
  useRealtimeSync('companies', loadAdminsData);
  useRealtimeSync('courses', loadAdminsData);
  useRealtimeSync('user-courses', loadAdminsData);
  useRealtimeSync('podcasts', loadAdminsData);
  useRealtimeSync('pdfs', loadAdminsData);
  useRealtimeSync('content-categories', loadAdminsData);
  useRealtimeSync('podcast-assignments', loadAdminsData);
  useRealtimeSync('podcast-progress', loadAdminsData);
  useRealtimeSync('podcast-likes', loadAdminsData);
  useRealtimeSync('logos', loadAdminsData);
  useRealtimeSync('activity-logs', loadAdminsData);
  useRealtimeSync('temp-passwords', loadAdminsData);
  useRealtimeSync('user-registrations', loadAdminsData);
  useRealtimeSync('approval-logs', loadAdminsData);
  useRealtimeSync('audit-logs', loadAdminsData);
  useRealtimeSync('chat-history', loadAdminsData);
  useRealtimeSync('contact-messages', loadAdminsData);

  useEffect(() => {
    loadAdminsData();
  }, []);
  
  const getAdminProfile = (adminId: string) => {
    return supabaseData.userProfiles.find((profile: UserProfile) => profile.user_id === adminId);
  };


  const getCompanyName = (companyId: string) => {
    const company = supabaseData.companies.find((c: Company) => c.id === companyId);
    return company ? company.name : '';
  };

  // Get all admin users
  const admins = supabaseData.users.filter((user: User) => 
    user.role === 'admin'
  );

  const filteredAdmins = admins;

  const handleAddAdmin = async (adminData: any): Promise<string | null> => {
    try {
      // The actual Supabase operations are now handled in the AddAdminModal component
      // Here we just need to refresh the data
      await loadAdminsData();
      return null;
    } catch (error) {
      console.error('Failed to add admin:', error);
      alert('Failed to add admin. Please try again.');
      return 'Failed to add admin';
    }
  };

  const handleEditAdmin = (admin: any) => {
    setSelectedAdmin(admin);
    setIsEditModalOpen(true);
  };

  const handleUpdateAdmin = async (adminData: any) => {
    try {
      // Update the admin in Supabase
      await supabaseHelpers.updateUser(adminData.id, {
        email: adminData.adminEmail,
        company_id: adminData.companyId,
        role: 'admin'
      });
      
      // Update profile if it exists
      try {
        const profile = await supabaseHelpers.getUserProfile(adminData.id);
        if (profile) {
          await supabaseHelpers.updateUserProfile(adminData.id, {
            first_name: adminData.adminName.split(' ')[0] || '',
            last_name: adminData.adminName.split(' ').slice(1).join(' ') || '',
            full_name: adminData.adminName,
            phone: adminData.adminPhone,
            department: adminData.department
          });
        } else {
          await supabaseHelpers.createUserProfile({
            user_id: adminData.id,
            first_name: adminData.adminName.split(' ')[0] || '',
            last_name: adminData.adminName.split(' ').slice(1).join(' ') || '',
            full_name: adminData.adminName,
            phone: adminData.adminPhone,
            department: adminData.department
          });
        }
      } catch (profileError) {
        console.error('Error updating profile:', profileError);
      }
      
      setIsEditModalOpen(false);
      await loadAdminsData(); // Refresh data
    } catch (error) {
      console.error('Failed to update admin:', error);
      alert('Failed to update admin. Please try again.');
    }
  };

  const handleDeleteClick = (admin: any) => {
    setSelectedAdmin(admin);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteAdmin = async () => {
    if (!selectedAdmin) return;
    
    try {
      // Delete dependent records first to avoid foreign key constraint violations
      
      // Delete activity logs
      await supabase
        .from('activity_logs')
        .delete()
        .eq('user_id', selectedAdmin.id);
      
      // Delete podcast likes
      await supabase
        .from('podcast_likes')
        .delete()
        .eq('user_id', selectedAdmin.id);
      
      // Delete user profile
      await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', selectedAdmin.id);
      
      // Delete chat history
      await supabase
        .from('chat_history')
        .delete()
        .eq('user_id', selectedAdmin.id);
      
      // Delete user course assignments
      await supabase
        .from('user_courses')
        .delete()
        .eq('user_id', selectedAdmin.id);
      
      // Delete podcast progress
      await supabase
        .from('podcast_progress')
        .delete()
        .eq('user_id', selectedAdmin.id);
      
      // Delete podcast assignments
      await supabase
        .from('podcast_assignments')
        .delete()
        .eq('user_id', selectedAdmin.id);
      
      // Finally delete the user
      await supabaseHelpers.deleteUser(selectedAdmin.id);
      setIsDeleteModalOpen(false);
      await loadAdminsData(); // Refresh data
    } catch (error) {
      console.error('Failed to delete admin:', error);
      alert('Failed to delete admin. Please try again.');
    }
  };

  const activeAdmins = admins.length;
  const totalCourses = supabaseData.courses.length;
  const uniqueCompanies = new Set(admins.map((admin: any) => admin.company_id).filter(Boolean)).size;

  if (loading) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading admins...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-600">Error: {error}</p>
            <button 
              onClick={loadAdminsData}
              className="mt-2 text-sm text-red-700 hover:text-red-500"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold leading-7 text-black sm:text-3xl sm:truncate dark:text-white">
                All Admins
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Manage all system administrators and their access
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => window.history.back()}
                className="flex items-center px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-100 border border-gray-200 transition-colors dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 dark:border-gray-700"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back
              </button>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:bg-purple-700 dark:hover:bg-purple-600"
              >
                <Plus className="-ml-1 mr-2 h-5 w-5" />
                Add Admin
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { title: 'Total Admins', value: admins.length, icon: UserCog, color: 'bg-purple-600' },
            { title: 'Active Admins', value: activeAdmins, icon: CheckCircle, color: 'bg-purple-600' },
            { title: 'Total Companies', value: uniqueCompanies, icon: Building2, color: 'bg-purple-600' },
            { title: 'Total Courses', value: totalCourses, icon: BookOpen, color: 'bg-purple-600' }
          ].map((card, index) => (
            <div key={index} className="bg-white overflow-hidden shadow rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`${card.color} rounded-md p-3`}>
                      <card.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate dark:text-gray-400">{card.title}</dt>
                      <dd className="text-lg font-medium text-black dark:text-white">{card.value}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg leading-6 font-medium text-black dark:text-white">Admin Details</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">Admin Name • Company Name • Courses • Contact</p>
          </div>
          {filteredAdmins.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {filteredAdmins.map((admin: any) => (
                <div key={admin.id} className="bg-gray-100 rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-200 dark:bg-gray-700 dark:border-gray-600">
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12 rounded-full bg-purple-600/20 flex items-center justify-center">
                          <UserCog className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-medium text-black truncate dark:text-white">
                            {getAdminProfile(admin.id)?.full_name || admin.email}
                          </h3>
                          <div className="mt-1 flex flex-wrap gap-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-400">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {admin.company_id ? 'Active' : 'Unassigned'}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-900/30 text-blue-400">
                              {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleEditAdmin(admin)}
                          className="p-2 text-blue-400 hover:text-blue-300 rounded-full hover:bg-blue-900/20"
                          title="Edit Admin"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(admin)}
                          className="p-2 text-red-400 hover:text-red-300 rounded-full hover:bg-red-900/20"
                          title="Delete Admin"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <Building2 className="h-4 w-4 mr-2" />
                        <span className="truncate">{admin.company_id ? getCompanyName(admin.company_id) : 'No Company Assigned'}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <Mail className="h-4 w-4 mr-2" />
                        <span className="truncate">{admin.email}</span>
                      </div>
                      {getAdminProfile(admin.id)?.phone && (
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <Phone className="h-4 w-4 mr-2" />
                          <span>{getAdminProfile(admin.id)?.phone}</span>
                        </div>
                      )}
                      {getAdminProfile(admin.id)?.department && (
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <Building2 className="h-4 w-4 mr-2" />
                          <span>{getAdminProfile(admin.id)?.department}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="text-center p-2 bg-white rounded dark:bg-gray-800">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Courses</p>
                        <p className="text-sm font-medium text-black dark:text-white">
                          {supabaseData.userCourses.filter((uc: any) => uc.assigned_by === admin.id).length}
                        </p>
                      </div>
                      <div className="text-center p-2 bg-white rounded dark:bg-gray-800">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Joined</p>
                        <p className="text-sm font-medium text-black dark:text-white">
                          {new Date(admin.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
              <div>
                <UserCog className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                <h3 className="mt-2 text-sm font-medium text-black dark:text-white">No admins</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by adding a new admin.</p>
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:bg-purple-700 dark:hover:bg-purple-600"
                  >
                    <Plus className="-ml-1 mr-2 h-5 w-5" />
                    Add Admin
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && selectedAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
              <div className="p-6">
                <h3 className="text-lg font-medium text-black mb-4 dark:text-white">Confirm Delete</h3>
                <p className="text-sm text-gray-500 mb-6 dark:text-gray-400">
                  Are you sure you want to delete the admin <span className="font-semibold text-black dark:text-white">{selectedAdmin.email}</span>? This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-black bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:border-gray-600 dark:text-white dark:bg-gray-700 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAdmin}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <AddAdminModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleAddAdmin}
          companies={supabaseData.companies}
        />

        {selectedAdmin && (
          <EditAdminModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onSubmit={handleUpdateAdmin}
            admin={selectedAdmin}
            companies={supabaseData.companies}
          />
        )}
      </div>
    </div>
  );
}