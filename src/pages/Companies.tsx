import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Building2, User, Users, Mail, Phone, MapPin, Image, X, CheckCircle, BookOpen } from 'lucide-react';
import { supabaseHelpers } from '../hooks/useSupabase';
import { useRealtimeSync } from '../hooks/useSupabase';
import { supabase } from '../lib/supabase';
import AddCompanyModal from '../components/Forms/AddCompanyModal';
import CompanyLogo from '../components/Logo/CompanyLogo';
import LogoUpload from '../components/Logo/LogoUpload';

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

interface Logo {
  id: string;
  company_id: string;
  logo_url: string;
  created_at: string;
}

interface UserCourse {
  id: string;
  user_id: string;
  course_id: string;
  created_at: string;
}

export default function Companies() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [supabaseData, setSupabaseData] = useState<{
    companies: Company[];
    users: User[];
    courses: Course[];
    userProfiles: UserProfile[];
    logos: Logo[];
    userCourses: UserCourse[];
  }>({
    companies: [],
    users: [],
    courses: [],
    userProfiles: [],
    logos: [],
    userCourses: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCompaniesData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [companiesData, usersData, coursesData, userProfilesData, logosData, userCoursesData] = await Promise.all([
        supabaseHelpers.getCompanies(),
        supabaseHelpers.getUsers(),
        supabaseHelpers.getCourses(),
        supabaseHelpers.getAllUserProfiles(),
        supabaseHelpers.getLogos(),
        supabaseHelpers.getAllUserCourses()
      ]);
      
      setSupabaseData({
        companies: companiesData,
        users: usersData,
        courses: coursesData,
        userProfiles: userProfilesData,
        logos: logosData,
        userCourses: userCoursesData
      });
    } catch (err) {
      console.error('Failed to load companies data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Real-time sync for all relevant tables
  useRealtimeSync('companies', loadCompaniesData);
  useRealtimeSync('users', loadCompaniesData);
  useRealtimeSync('logos', loadCompaniesData);
  useRealtimeSync('courses', loadCompaniesData);
  useRealtimeSync('user-courses', loadCompaniesData);
  useRealtimeSync('podcast-assignments', loadCompaniesData);
  useRealtimeSync('user-profiles', loadCompaniesData);
  useRealtimeSync('podcasts', loadCompaniesData);
  useRealtimeSync('pdfs', loadCompaniesData);
  useRealtimeSync('content-categories', loadCompaniesData);
  useRealtimeSync('podcast-progress', loadCompaniesData);
  useRealtimeSync('podcast-likes', loadCompaniesData);
  useRealtimeSync('activity-logs', loadCompaniesData);
  useRealtimeSync('temp-passwords', loadCompaniesData);
  useRealtimeSync('user-registrations', loadCompaniesData);
  useRealtimeSync('approval-logs', loadCompaniesData);
  useRealtimeSync('audit-logs', loadCompaniesData);
  useRealtimeSync('chat-history', loadCompaniesData);
  useRealtimeSync('contact-messages', loadCompaniesData);

  useEffect(() => {
    loadCompaniesData();
  }, []);

  const getCompanyLogo = (companyId: string) => {
    const logo = supabaseData.logos.find((logo: Logo) => logo.company_id === companyId);
    return logo ? logo.logo_url : null;
  };

  const getCompanyAdmins = (companyId: string) => {
    return supabaseData.users.filter((user: User) => user.company_id === companyId && user.role === 'admin');
  };

  const getCompanyUsers = (companyId: string) => {
    return supabaseData.users.filter((user: User) => user.company_id === companyId && user.role === 'user');
  };

  const getCompanyCourses = (companyId: string) => {
    return supabaseData.courses.filter((course: Course) => course.company_id === companyId);
  };

  const filteredCompanies = supabaseData.companies.filter((company: Company) => {
    return company.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleAddCompany = async (companyData: any) => {
    try {
      await supabaseHelpers.createCompany({
        name: companyData.companyName
      });
      
      await loadCompaniesData();
    } catch (error) {
      console.error('Failed to add company:', error);
      alert('Failed to add company. Please try again.');
    }
  };

  const handleEditCompany = (company: any) => {
    setSelectedCompany(company);
    setIsEditModalOpen(true);
  };
  
  const handleEditLogo = (company: any) => {
    setSelectedCompany(company);
    setIsLogoModalOpen(true);
  };

  const handleUpdateCompany = async (companyData: any) => {
    try {
      await supabaseHelpers.updateCompany(companyData.id, {
        name: companyData.companyName
      });
      
      setIsEditModalOpen(false);
      await loadCompaniesData();
    } catch (error) {
      console.error('Failed to update company:', error);
      alert('Failed to update company. Please try again.');
    }
  };

  const handleDeleteClick = (company: any) => {
    setSelectedCompany(company);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteCompany = async () => {
    if (!selectedCompany) return;
    
    try {
      // Use the improved deleteCompany function that handles all dependent records
      await supabaseHelpers.deleteCompany(selectedCompany.id);
      setIsDeleteModalOpen(false);
      await loadCompaniesData();
    } catch (error) {
      console.error('Failed to delete company:', error);
      alert('Failed to delete company. Please try again.');
    }
  };

  const handleLogoUpload = async (companyId: string, logoUrl: string) => {
    await loadCompaniesData();
  };

  const handleLogoDelete = async (companyId: string) => {
    try {
      // Find the logo for this company
      const logo = supabaseData.logos.find(logo => logo.company_id === companyId);
      if (logo) {
        // Delete the logo
        await supabaseHelpers.deleteLogo(logo.id);
        await loadCompaniesData();
      }
    } catch (error) {
      console.error('Failed to delete logo:', error);
      alert('Failed to delete logo. Please try again.');
    }
  };

  const totalCompanies = supabaseData.companies.length;
  const totalAdmins = supabaseData.users.filter(user => user.role === 'admin').length;
  const totalUsers = supabaseData.users.filter(user => user.role === 'user').length;
  const totalCourses = supabaseData.courses.length;

  if (loading) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8b5cf6] mx-auto"></div>
              <p className="mt-4 text-[#a0a0a0]">Loading companies...</p>
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
          <div className="bg-red-900/20 border border-red-800 rounded-md p-4">
            <p className="text-red-400">Error: {error}</p>
            <button 
              onClick={loadCompaniesData}
              className="mt-2 text-sm text-red-400 hover:text-red-300"
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
                All Companies
              </h2>
              <p className="mt-1 text-sm text-[#a0a0a0]">
                Manage all companies and their access
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8b5cf6] hover:bg-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8b5cf6]"
            >
              <Plus className="-ml-1 mr-2 h-5 w-5" />
              Add Company
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute inset-y-0 left-0 pl-3 h-full w-5 text-[#a0a0a0] pointer-events-none" />
            <input
              type="text"
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-[#333333] rounded-md leading-5 bg-[#252525] placeholder-[#a0a0a0] text-white focus:outline-none focus:placeholder-[#a0a0a0] focus:ring-1 focus:ring-[#8b5cf6] focus:border-[#8b5cf6]"
            />
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute inset-y-0 left-0 pl-3 h-full w-5 text-[#a0a0a0] pointer-events-none" />
            <input
              type="text"
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-[#333333] rounded-md leading-5 bg-[#252525] placeholder-[#a0a0a0] text-white focus:outline-none focus:placeholder-[#a0a0a0] focus:ring-1 focus:ring-[#8b5cf6] focus:border-[#8b5cf6]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { title: 'Total Companies', value: totalCompanies, icon: Building2, color: 'bg-[#8b5cf6]' },
            { title: 'Total Admins', value: totalAdmins, icon: Users, color: 'bg-[#8b5cf6]' },
            { title: 'Total Users', value: totalUsers, icon: Users, color: 'bg-[#8b5cf6]' },
            { title: 'Total Courses', value: totalCourses, icon: BookOpen, color: 'bg-[#8b5cf6]' }
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
                      <dd className="text-lg font-medium text-white">{card.value}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-[#1e1e1e] shadow overflow-hidden sm:rounded-md border border-[#333333]">
          <div className="px-4 py-5 sm:px-6 border-b border-[#333333]">
            <h3 className="text-lg leading-6 font-medium text-white">Company Details</h3>
            <p className="mt-1 max-w-2xl text-sm text-[#a0a0a0]">Company Name • Admins • Users • Courses</p>
          </div>
          {filteredCompanies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCompanies.map((company: any) => {
                const companyAdmins = getCompanyAdmins(company.id);
                const companyUsers = getCompanyUsers(company.id);
                const companyCourses = getCompanyCourses(company.id);
                
                return (
                  <div key={company.id} className="bg-[#252525] rounded-lg border border-[#333333] overflow-hidden hover:shadow-lg transition-shadow duration-200">
                    <div className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-16 w-16 rounded-lg overflow-hidden">
                            <CompanyLogo companyId={company.id} size="md" />
                          </div>
                          <div className="ml-4">
                            <h3 className="text-lg font-medium text-white truncate">
                              {company.name}
                            </h3>
                            <div className="mt-1">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-400">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Active
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleEditCompany(company)}
                            className="p-2 text-blue-400 hover:text-blue-300 rounded-full hover:bg-blue-900/20"
                            title="Edit Company"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditLogo(company)}
                            className="p-2 text-green-400 hover:text-green-300 rounded-full hover:bg-green-900/20"
                            title="Edit Logo"
                          >
                            <Image className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(company)}
                            className="p-2 text-red-400 hover:text-red-300 rounded-full hover:bg-red-900/20"
                            title="Delete Company"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <div className="text-center p-2 bg-[#1e1e1e] rounded">
                          <p className="text-xs text-[#a0a0a0]">Admins</p>
                          <p className="text-sm font-medium text-white">{companyAdmins.length}</p>
                        </div>
                        <div className="text-center p-2 bg-[#1e1e1e] rounded">
                          <p className="text-xs text-[#a0a0a0]">Users</p>
                          <p className="text-sm font-medium text-white">{companyUsers.length}</p>
                        </div>
                        <div className="text-center p-2 bg-[#1e1e1e] rounded">
                          <p className="text-xs text-[#a0a0a0]">Courses</p>
                          <p className="text-sm font-medium text-white">{companyCourses.length}</p>
                        </div>
                      </div>
                      
                      <div className="mt-3 text-xs text-[#a0a0a0]">
                        Created: {new Date(company.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-[#a0a0a0]">
              {supabaseData.companies.length === 0 ? (
                <div>
                  <Building2 className="mx-auto h-12 w-12 text-[#333333]" />
                  <h3 className="mt-2 text-sm font-medium text-white">No companies</h3>
                  <p className="mt-1 text-sm text-[#a0a0a0]">Get started by adding a new company.</p>
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#8b5cf6] hover:bg-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8b5cf6]"
                    >
                      <Plus className="-ml-1 mr-2 h-5 w-5" />
                      Add Company
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <Search className="mx-auto h-12 w-12 text-[#333333]" />
                  <h3 className="mt-2 text-sm font-medium text-white">No companies found</h3>
                  <p className="mt-1 text-sm text-[#a0a0a0]">Try adjusting your search filter.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && selectedCompany && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1e1e1e] rounded-lg shadow-xl max-w-md w-full border border-[#333333]">
              <div className="p-6">
                <h3 className="text-lg font-medium text-white mb-4">Confirm Delete</h3>
                <p className="text-sm text-[#a0a0a0] mb-6">
                  Are you sure you want to delete the company <span className="font-semibold text-white">{selectedCompany.name}</span>? This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="px-4 py-2 border border-[#333333] rounded-md shadow-sm text-sm font-medium text-white bg-[#252525] hover:bg-[#333333] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8b5cf6]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteCompany}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Logo Upload Modal */}
        {isLogoModalOpen && selectedCompany && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1e1e1e] rounded-lg shadow-xl max-w-md w-full border border-[#333333]">
              <div className="flex items-center justify-between p-6 border-b border-[#333333]">
                <div className="flex items-center">
                  <Building2 className="h-6 w-6 text-[#8b5cf6] mr-2" />
                  <h2 className="text-xl font-semibold text-white">Company Logo: {selectedCompany.name}</h2>
                </div>
                <button
                  onClick={() => setIsLogoModalOpen(false)}
                  className="text-[#a0a0a0] hover:text-white focus:outline-none"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="p-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="flex-shrink-0">
                    <LogoUpload 
                      companyId={selectedCompany.id}
                      currentLogoUrl={getCompanyLogo(selectedCompany.id)}
                      onUploadComplete={(logoUrl) => {
                        handleLogoUpload(selectedCompany.id, logoUrl);
                        setIsLogoModalOpen(false);
                      }}
                      onDelete={() => {
                        handleLogoDelete(selectedCompany.id);
                        setIsLogoModalOpen(false);
                      }}
                      size="lg"
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-[#a0a0a0]">
                      {getCompanyLogo(selectedCompany.id) 
                        ? 'Company logo uploaded. Click to change.' 
                        : 'No logo uploaded. Click to add.'}
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => setIsLogoModalOpen(false)}
                    className="px-4 py-2 border border-[#333333] rounded-md shadow-sm text-sm font-medium text-white bg-[#252525] hover:bg-[#333333] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8b5cf6]"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Company Modal */}
        <AddCompanyModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleAddCompany}
        />

        {/* Edit Company Modal */}
        {selectedCompany && (
          <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 ${isEditModalOpen ? '' : 'hidden'}`}>
            <div className="bg-[#1e1e1e] rounded-lg shadow-xl max-w-md w-full border border-[#333333]">
              <div className="flex items-center justify-between p-6 border-b border-[#333333]">
                <div className="flex items-center">
                  <Building2 className="h-6 w-6 text-[#8b5cf6] mr-2" />
                  <h2 className="text-xl font-semibold text-white">Edit Company</h2>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-[#a0a0a0] hover:text-white focus:outline-none"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                handleUpdateCompany({
                  id: selectedCompany.id,
                  companyName: (e.target as any).companyName.value
                });
              }} className="p-6">
                <div className="mb-6">
                  <label className="block text-sm font-medium text-white mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    defaultValue={selectedCompany.name}
                    className="block w-full px-3 py-2 border border-[#333333] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] bg-[#252525] text-white"
                    placeholder="Enter company name"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 border border-[#333333] rounded-md shadow-sm text-sm font-medium text-white bg-[#252525] hover:bg-[#333333] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8b5cf6]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8b5cf6] hover:bg-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8b5cf6]"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Companies;