import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Building2, User, Mail, Phone, MapPin, Users as UsersIcon, CheckCircle, Clock } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');
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

  const filteredUsers = users.filter((user: User) => {
    const companyName = user.company_id ? getCompanyName(user.company_id) : '';
    return user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
           (companyName && companyName.toLowerCase().includes(searchTerm.toLowerCase()));
  });

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
      await loadUsersData(); // Refresh data
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user. Please try again.');
    }
  };

  const activeUsers = users.length;
  const totalCourses = supabaseData.courses.length;
  const uniqueCompanies = new Set(users.map((user: any) => user.company_id).filter(Boolean)).size;
  const avgCompletionHours = '24';

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
              <h2 className="text-2xl font-bold leading-7 text-white sm:text-3xl sm:truncate">
                All Users
              </h2>
              <p className="mt-1 text-sm text-[#a0a0a0]">
                Manage all system users and their access
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8b5cf6] hover:bg-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8b5cf6]"
            >
              <Plus className="-ml-1 mr-2 h-5 w-5" />
              Add User
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute inset-y-0 left-0 pl-3 h-full w-5 text-[#a0a0a0] pointer-events-none" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-[#333333] rounded-md leading-5 bg-[#252525] placeholder-[#a0a0a0] text-white focus:outline-none focus:placeholder-[#a0a0a0] focus:ring-1 focus:ring-[#8b5cf6] focus:border-[#8b5cf6]"
            />
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute inset-y-0 left-0 pl-3 h-full w-5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { title: 'Total Users', value: users.length, icon: UsersIcon, color: 'bg-[#8b5cf6]' },
            { title: 'Active Users', value: activeUsers, icon: CheckCircle, color: 'bg-[#8b5cf6]' },
            { title: 'Total Companies', value: uniqueCompanies, icon: Building2, color: 'bg-[#8b5cf6]' },
            { title: 'Avg Completion Hours', value: avgCompletionHours, icon: Clock, color: 'bg-[#8b5cf6]' }
          ].map((card, index) => (
            <div key={index} className="bg-[#1e1e1e] overflow-hidden shadow rounded-lg border border-[#333333]">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`${card.color} rounded-md p-3`}>
                      <card.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-[#a0a0a0] truncate">{card.title}</dt>
                      <dd className="text-2xl font-semibold text-white">{card.value}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-[#1e1e1e] shadow overflow-hidden sm:rounded-md border border-[#333333]">
          <div className="px-4 py-5 sm:px-6 border-b border-[#333333]">
            <h3 className="text-lg leading-6 font-medium text-white">User Details</h3>
            <p className="mt-1 max-w-2xl text-sm text-[#a0a0a0]">User Email • Company • Department • Contact • Actions</p>
          </div>
          {filteredUsers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {filteredUsers.map((user: any) => (
                <div key={user.id} className="bg-[#252525] rounded-lg border border-[#333333] overflow-hidden hover:shadow-lg transition-shadow duration-200">
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        <div className="h-12 w-12 rounded-full bg-[#8b5cf6]/20 flex items-center justify-center">
                          <User className="h-6 w-6 text-[#8b5cf6]" />
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-medium text-white truncate">
                            {getUserProfile(user.id)?.full_name || user.email}
                          </h3>
                          <div className="mt-1 flex flex-wrap gap-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-400">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {user.company_id ? 'Active' : 'Unassigned'}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-900/30 text-blue-400">
                              User
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="p-2 text-blue-400 hover:text-blue-300 rounded-full hover:bg-blue-900/20"
                          title="Edit User"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(user)}
                          className="p-2 text-red-400 hover:text-red-300 rounded-full hover:bg-red-900/20"
                          title="Delete User"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center text-sm text-[#a0a0a0]">
                        <Building2 className="h-4 w-4 mr-2" />
                        <span className="truncate">{user.company_id ? getCompanyName(user.company_id) : 'No Company Assigned'}</span>
                      </div>
                      <div className="flex items-center text-sm text-[#a0a0a0]">
                        <Mail className="h-4 w-4 mr-2" />
                        <span className="truncate">{user.email}</span>
                      </div>
                      {getUserProfile(user.id)?.phone && (
                        <div className="flex items-center text-sm text-[#a0a0a0]">
                          <Phone className="h-4 w-4 mr-2" />
                          <span>{getUserProfile(user.id)?.phone}</span>
                        </div>
                      )}
                      {getUserProfile(user.id)?.department && (
                        <div className="flex items-center text-sm text-[#a0a0a0]">
                          <Building2 className="h-4 w-4 mr-2" />
                          <span>{getUserProfile(user.id)?.department}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="text-center p-2 bg-[#1e1e1e] rounded">
                        <p className="text-xs text-[#a0a0a0]">Admin</p>
                        <p className="text-sm font-medium text-white truncate">{getAdminName(user.company_id) || 'No Admin'}</p>
                      </div>
                      <div className="text-center p-2 bg-[#1e1e1e] rounded">
                        <p className="text-xs text-[#a0a0a0]">Courses</p>
                        <p className="text-sm font-medium text-white">
                          {supabaseData.userCourses.filter((uc: any) => uc.user_id === user.id).length}
                        </p>
                      </div>
                      <div className="text-center p-2 bg-[#1e1e1e] rounded">
                        <p className="text-xs text-[#a0a0a0]">Joined</p>
                        <p className="text-sm font-medium text-white">
                          {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-[#a0a0a0]">
              {users.length === 0 ? (
                <div>
                  <User className="mx-auto h-12 w-12 text-[#333333]" />
                  <h3 className="mt-2 text-sm font-medium text-white">No users</h3>
                  <p className="mt-1 text-sm text-[#a0a0a0]">Get started by adding a new user.</p>
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#8b5cf6] hover:bg-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8b5cf6]"
                    >
                      <Plus className="-ml-1 mr-2 h-5 w-5" />
                      Add User
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <Search className="mx-auto h-12 w-12 text-[#333333]" />
                  <h3 className="mt-2 text-sm font-medium text-white">No users found</h3>
                  <p className="mt-1 text-sm text-[#a0a0a0]">Try adjusting your search filter.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1e1e1e] rounded-lg shadow-xl max-w-md w-full border border-[#333333]">
              <div className="p-6">
                <h3 className="text-lg font-medium text-white mb-4">Confirm Delete</h3>
                <p className="text-sm text-[#a0a0a0] mb-6">
                  Are you sure you want to delete the user <span className="font-semibold text-white">{selectedUser.email}</span>? This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="px-4 py-2 border border-[#333333] rounded-md shadow-sm text-sm font-medium text-white bg-[#252525] hover:bg-[#333333] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8b5cf6]"
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

        {/* Add User Modal would go here */}
        <AddUserModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleAddUser}
          companies={supabaseData.companies}
          admins={supabaseData.users.filter(user => user.role === 'admin')}
        />
        
        {/* Edit User Modal */}
        {selectedUser && (
          <EditUserModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onSubmit={handleUpdateUser}
            user={selectedUser}
            admins={supabaseData.users.filter(user => user.role === 'admin')}
            companies={supabaseData.companies}
          />
        )}
      </div>
    </div>
  );
}