import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Building2, User, Mail, Phone, MapPin, Users as UsersIcon, CheckCircle, Clock, ArrowLeft } from 'lucide-react';
import { supabaseHelpers } from '../hooks/useSupabase';
import { useRealtimeSync } from '../hooks/useSupabase';
import { supabase } from '../lib/supabase';
import AddUserModal from '../components/Forms/AddUserModal';
import EditUserModal from '../components/Forms/EditUserModal';

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
  position: string;
  employee_id: string;
  created_at: string;
}

interface UserCourse {
  id: string;
  user_id: string;
  course_id: string;
  created_at: string;
}

export default function Users() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
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

  const loadUsersData = async () => {
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
      console.error('Failed to load users data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Real-time sync for all relevant tables
  useRealtimeSync('users', loadUsersData);
  useRealtimeSync('companies', loadUsersData);
  useRealtimeSync('user-courses', loadUsersData);
  useRealtimeSync('courses', loadUsersData);
  useRealtimeSync('podcasts', loadUsersData);
  useRealtimeSync('pdfs', loadUsersData);
  useRealtimeSync('content-categories', loadUsersData);
  useRealtimeSync('podcast-assignments', loadUsersData);
  useRealtimeSync('podcast-progress', loadUsersData);
  useRealtimeSync('podcast-likes', loadUsersData);
  useRealtimeSync('logos', loadUsersData);
  useRealtimeSync('activity-logs', loadUsersData);
  useRealtimeSync('temp-passwords', loadUsersData);
  useRealtimeSync('user-registrations', loadUsersData);
  useRealtimeSync('approval-logs', loadUsersData);
  useRealtimeSync('audit-logs', loadUsersData);
  useRealtimeSync('chat-history', loadUsersData);
  useRealtimeSync('contact-messages', loadUsersData);

  useEffect(() => {
    loadUsersData();
  }, []);
  
  const getUserProfile = (userId: string) => {
    return supabaseData.userProfiles.find((profile: UserProfile) => profile.user_id === userId);
  };


  const getCompanyName = (companyId: string) => {
    const company = supabaseData.companies.find((c: Company) => c.id === companyId);
    return company ? company.name : '';
  };

  const getAdminName = (companyId: string) => {
    const admins = supabaseData.users.filter((user: User) => user.company_id === companyId && user.role === 'admin');
    if (admins.length > 0) {
      const admin = admins[0];
      const profile = getUserProfile(admin.id);
      return profile?.full_name || admin.email;
    }
    return '';
  };

  // Get all regular users
  const users = supabaseData.users.filter((user: User) => 
    user.role === 'user'
  );

  const filteredUsers = users;

  const handleAddUser = async (userData: any): Promise<string | null> => {
    try {
      console.log('User creation completed successfully in modal:', userData);
      await loadUsersData();
      return null; // Success
    } catch (error) {
      console.error('Failed to add user:', error);
      return error instanceof Error ? error.message : 'Failed to add user. Please try again.';
    }
  };

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (userData: any) => {
    try {
      // Update the user in Supabase
      await supabaseHelpers.updateUser(userData.id, {
        email: userData.userEmail,
        company_id: userData.companyId,
        role: 'user'
      });
      
      // Update profile if it exists
      try {
        const profile = await supabaseHelpers.getUserProfile(userData.id);
        if (profile) {
          await supabaseHelpers.updateUserProfile(userData.id, {
            first_name: userData.userName.split(' ')[0] || '',
            last_name: userData.userName.split(' ').slice(1).join(' ') || '',
            full_name: userData.userName,
            phone: userData.userPhone,
            department: userData.department,
            position: userData.position,
            employee_id: userData.employeeId
          });
        } else {
          await supabaseHelpers.createUserProfile({
            user_id: userData.id,
            first_name: userData.userName.split(' ')[0] || '',
            last_name: userData.userName.split(' ').slice(1).join(' ') || '',
            full_name: userData.userName,
            phone: userData.userPhone,
            department: userData.department,
            position: userData.position,
            employee_id: userData.employeeId
          });
        }
      } catch (profileError) {
        console.error('Error updating profile:', profileError);
      }
      
      setIsEditModalOpen(false);
      await loadUsersData(); // Refresh data
    } catch (error) {
      console.error('Failed to update user:', error);
      alert('Failed to update user. Please try again.');
    }
  };

  const handleDeleteClick = (user: any) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      // Delete dependent records first to avoid foreign key constraint violations
      
      // Delete activity logs
      await supabase
        .from('activity_logs')
        .delete()
        .eq('user_id', selectedUser.id);
      
      // Delete podcast likes
      await supabase
        .from('podcast_likes')
        .delete()
        .eq('user_id', selectedUser.id);
      
      // Delete user profile
      await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', selectedUser.id);
      
      // Delete chat history
      await supabase
        .from('chat_history')
        .delete()
        .eq('user_id', selectedUser.id);
      
      // Delete user course assignments
      await supabase
        .from('user_courses')
        .delete()
        .eq('user_id', selectedUser.id);
      
      // Finally delete the user
      await supabaseHelpers.deleteUser(selectedUser.id);
      setIsDeleteModalOpen(false);
      
      // Update state directly instead of reloading all data to prevent flickering
      setSupabaseData(prevData => ({
        ...prevData,
        users: prevData.users.filter(user => user.id !== selectedUser.id)
      }));
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user. Please try again.');
    }
  };

  const activeUsers = users.length;
  const totalCourses = supabaseData.courses.length;
  const uniqueCompanies = new Set(users.map((user: any) => user.company_id).filter(Boolean)).size;

  if (loading) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading users...</p>
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
              onClick={loadUsersData}
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
                All Users
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Manage all system users and their access
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => window.history.back()}
                className="flex items-center px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-100 border border-gray-300 transition-colors dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 dark:border-gray-600"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 border border-purple-600 transition-colors dark:bg-purple-700 dark:hover:bg-purple-600"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { title: 'Total Users', value: users.length, icon: UsersIcon, color: 'bg-purple-600' },
            { title: 'Active Users', value: activeUsers, icon: CheckCircle, color: 'bg-purple-600' },
            { title: 'Total Companies', value: uniqueCompanies, icon: Building2, color: 'bg-purple-600' }
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
                      <dd className="text-2xl font-semibold text-black dark:text-white">{card.value}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg leading-6 font-medium text-black dark:text-white">User Details</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">User Email • Company • Department • Contact • Actions</p>
          </div>
          {filteredUsers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {filteredUsers.map((user: any) => (
                <div key={user.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
                  <div className="p-6">
                    <div className="flex justify-end space-x-2 mb-4">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="p-2 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        title="Edit User"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <div className="relative">
                        <div className="absolute -top-6 left-0 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
                          DELETE BUTTON
                        </div>
                        <div className="border-2 border-dashed border-red-500 rounded-lg p-1 bg-red-50 min-w-[100px]">
                          <div className="relative">
                            <button
                              onClick={() => {
                                console.log('Delete button clicked for user:', user);
                                handleDeleteClick(user);
                              }}
                              className="p-3 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors border-2 border-red-300 hover:border-red-400 dark:border-red-700 dark:hover:border-red-600 bg-yellow-300 dark:bg-yellow-400 flex items-center justify-center shadow-md hover:shadow-lg w-full"
                              title="Delete User"
                            >
                              <Trash2 className="h-5 w-5" />
                              <span className="ml-1 text-xs font-bold text-black">DEL</span>
                            </button>
                            <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold animate-pulse">
                              3
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <User className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                          {getUserProfile(user.id)?.full_name || user.email}
                        </h3>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Created: {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
              <div>
                <User className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                <h3 className="mt-2 text-sm font-medium text-black dark:text-white">No users</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">No users have been created yet.</p>
              </div>
            </div>
          )}

        </div>

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
              <div className="p-6">
                <h3 className="text-lg font-medium text-black mb-4 dark:text-white">Confirm Delete</h3>
                <p className="text-sm text-gray-500 mb-6 dark:text-gray-400">
                  Are you sure you want to delete the user <span className="font-semibold text-black dark:text-white">{selectedUser.email}</span>? This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-black bg-gray-100 hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:border-gray-600 dark:text-white dark:bg-gray-700 dark:hover:bg-gray-800 dark:focus:ring-purple-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteUser}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <AddUserModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleAddUser}
          companies={supabaseData.companies}
          admins={supabaseData.users.filter((user: any) => user.role === 'admin')}
        />

        <EditUserModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={handleUpdateUser}
          user={selectedUser}
          companies={supabaseData.companies}
          admins={supabaseData.users.filter((user: any) => user.role === 'admin')}
        />
      </div>
    </div>
  );
}