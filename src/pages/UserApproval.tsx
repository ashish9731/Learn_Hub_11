import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, UserCheck, Mail, Phone, MapPin, Building2, ArrowLeft, User, Clock, CheckCircle, XCircle, Eye } from 'lucide-react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { useRealtimeSync } from '../hooks/useSupabase';

export default function UserApproval() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegistration, setSelectedRegistration] = useState<any>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'regular' | 'company' | 'reject'>('regular');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [registrationsData, companiesData] = await Promise.all([
        supabase
          .from('user_registrations')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('companies')
          .select('*')
          .order('name')
      ]);
      
      if (registrationsData.error) throw registrationsData.error;
      if (companiesData.error) throw companiesData.error;
      
      setRegistrations(registrationsData.data || []);
      setCompanies(companiesData.data || []);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Real-time sync for all relevant tables
  useRealtimeSync('user-registrations', loadData);
  useRealtimeSync('users', loadData);
  useRealtimeSync('companies', loadData);
  useRealtimeSync('approval-logs', loadData);
  useRealtimeSync('user-profiles', loadData);
  useRealtimeSync('courses', loadData);
  useRealtimeSync('user-courses', loadData);
  useRealtimeSync('podcasts', loadData);
  useRealtimeSync('pdfs', loadData);
  useRealtimeSync('content-categories', loadData);
  useRealtimeSync('podcast-assignments', loadData);
  useRealtimeSync('podcast-progress', loadData);
  useRealtimeSync('podcast-likes', loadData);
  useRealtimeSync('logos', loadData);
  useRealtimeSync('activity-logs', loadData);
  useRealtimeSync('temp-passwords', loadData);
  useRealtimeSync('audit-logs', loadData);
  useRealtimeSync('chat-history', loadData);
  useRealtimeSync('contact-messages', loadData);

  useEffect(() => {
    loadData();
  }, []);


  const handleApproval = async () => {
    if (!selectedRegistration) return;

    try {
      setIsProcessing(true);
      
      if (approvalAction === 'reject') {
        // Reject the registration
        const { data, error } = await supabase.rpc('reject_user_registration', {
          registration_id_param: selectedRegistration.id,
          notes_param: approvalNotes
        });

        if (error) throw error;
        
        alert('Registration rejected successfully');
      } else {
        // Approve the registration
        if (!supabaseAdmin) {
          throw new Error('Admin operations not configured');
        }

        // Create user in auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: selectedRegistration.email,
          password: selectedRegistration.password_hash,
          email_confirm: true,
          user_metadata: {
            first_name: selectedRegistration.first_name,
            last_name: selectedRegistration.last_name,
            full_name: selectedRegistration.full_name
          }
        });

        if (authError) throw authError;

        // Create user record
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: selectedRegistration.email,
            role: 'user',
            company_id: approvalAction === 'company' ? selectedCompanyId : null,
            approval_status: 'approved',
            approved_by: (await supabase.auth.getUser()).data.user?.id,
            approved_at: new Date().toISOString()
          });

        if (userError) throw userError;

        // Create user profile
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: authData.user.id,
            first_name: selectedRegistration.first_name,
            last_name: selectedRegistration.last_name,
            full_name: selectedRegistration.full_name,
            phone: selectedRegistration.phone,
            bio: selectedRegistration.bio,
            department: selectedRegistration.department,
            position: selectedRegistration.position,
            employee_id: selectedRegistration.employee_id,
            profile_picture_url: selectedRegistration.profile_picture_url
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          // Continue anyway, profile can be created later
        }

        // Update registration status
        const { error: updateError } = await supabase
          .from('user_registrations')
          .update({ status: 'approved' })
          .eq('id', selectedRegistration.id);

        if (updateError) throw updateError;

        // Log approval
        const { error: logError } = await supabase
          .from('approval_logs')
          .insert({
            registration_id: selectedRegistration.id,
            user_id: authData.user.id,
            approved_by: (await supabase.auth.getUser()).data.user?.id,
            action: approvalAction === 'company' ? 'approved_with_company' : 'approved_as_regular',
            company_id: approvalAction === 'company' ? selectedCompanyId : null,
            notes: approvalNotes
          });

        if (logError) {
          console.error('Logging error:', logError);
          // Continue anyway
        }

        alert(`User approved successfully as ${approvalAction === 'company' ? 'company user' : 'regular user'}`);
      }

      // Reset form and close modal
      setIsApprovalModalOpen(false);
      setSelectedRegistration(null);
      setApprovalAction('regular');
      setSelectedCompanyId('');
      setApprovalNotes('');
      
      // Reload data
      await loadData();

    } catch (error: any) {
      console.error('Approval error:', error);
      alert('Failed to process approval: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRegistrations = registrations.filter(registration => {
    const matchesSearch = registration.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         registration.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         registration.department?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || registration.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (status) {
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'approved':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'rejected':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  if (loading) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading registrations...</p>
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
              onClick={loadData}
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
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-white sm:text-3xl sm:truncate">
              User Approval Management
            </h2>
            <p className="mt-1 text-sm text-[#a0a0a0]">
              Review and approve user registrations
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center px-4 py-2 border border-[#333333] rounded-md shadow-sm text-sm font-medium text-white bg-[#1e1e1e] hover:bg-[#252525] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8b5cf6]"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute inset-y-0 left-0 pl-3 h-full w-5 text-[#a0a0a0] pointer-events-none" />
            <input
              type="text"
              placeholder="Search registrations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-[#333333] rounded-md leading-5 bg-[#252525] placeholder-[#a0a0a0] text-white focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] focus:border-[#8b5cf6]"
            />
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-[#333333] rounded-md bg-[#252525] text-white focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] focus:border-[#8b5cf6]"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { title: 'Total Registrations', value: registrations.length, icon: User, color: 'bg-[#8b5cf6]' },
            { title: 'Pending Approval', value: registrations.filter(r => r.status === 'pending').length, icon: Clock, color: 'bg-yellow-500' },
            { title: 'Approved', value: registrations.filter(r => r.status === 'approved').length, icon: CheckCircle, color: 'bg-green-500' },
            { title: 'Rejected', value: registrations.filter(r => r.status === 'rejected').length, icon: XCircle, color: 'bg-red-500' }
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

        {/* Registrations List */}
        <div className="bg-[#1e1e1e] shadow overflow-hidden sm:rounded-md border border-[#333333]">
          <div className="px-4 py-5 sm:px-6 border-b border-[#333333]">
            <h3 className="text-lg leading-6 font-medium text-white">User Registrations</h3>
            <p className="mt-1 max-w-2xl text-sm text-[#a0a0a0]">Review and approve user profile registrations</p>
          </div>
          {filteredRegistrations.length > 0 ? (
            <ul className="divide-y divide-[#333333]">
              {filteredRegistrations.map((registration) => (
                <li key={registration.id} className="px-4 py-4 hover:bg-[#252525]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-12 w-12 rounded-full bg-[#8b5cf6]/20 flex items-center justify-center">
                        <User className="h-6 w-6 text-[#8b5cf6]" />
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <p className="text-lg font-medium text-white">
                            {registration.full_name || registration.email}
                          </p>
                          <span className={`ml-2 ${getStatusBadge(registration.status)}`}>
                            {getStatusIcon(registration.status)}
                            <span className="ml-1 capitalize">{registration.status}</span>
                          </span>
                        </div>
                        <div className="flex items-center mt-1 space-x-4">
                          <div className="flex items-center text-sm text-[#a0a0a0]">
                            <Mail className="h-4 w-4 mr-1" />
                            {registration.email}
                          </div>
                          {registration.phone && (
                            <div className="flex items-center text-sm text-[#a0a0a0]">
                              <Phone className="h-4 w-4 mr-1" />
                              {registration.phone}
                            </div>
                          )}
                          {registration.department && (
                            <div className="flex items-center text-sm text-[#a0a0a0]">
                              <Building2 className="h-4 w-4 mr-1" />
                              {registration.department}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <p className="text-sm font-medium text-[#a0a0a0]">Registered</p>
                        <p className="text-sm text-white">
                          {new Date(registration.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {registration.status === 'pending' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedRegistration(registration);
                              setIsApprovalModalOpen(true);
                            }}
                            className="p-2 text-blue-400 hover:text-blue-300 rounded-full hover:bg-blue-900/20"
                            title="Review Registration"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-6 py-8 text-center text-[#a0a0a0]">
              {registrations.length === 0 ? 'No registrations found.' : 'No registrations match your search.'}
            </div>
          )}
        </div>

        {/* Approval Modal */}
        {isApprovalModalOpen && selectedRegistration && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1e1e1e] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#333333]">
              <div className="flex items-center justify-between p-6 border-b border-[#333333]">
                <div className="flex items-center">
                  <UserCheck className="h-6 w-6 text-[#8b5cf6] mr-2" />
                  <h2 className="text-xl font-semibold text-white">Review Registration</h2>
                </div>
                <button
                  onClick={() => setIsApprovalModalOpen(false)}
                  className="text-[#a0a0a0] hover:text-white focus:outline-none"
                >
                  ×
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* User Information */}
                <div className="bg-[#252525] rounded-lg p-4">
                  <h3 className="text-lg font-medium text-white mb-4">User Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-[#a0a0a0]">Name:</span>
                      <p className="text-white">{selectedRegistration.full_name}</p>
                    </div>
                    <div>
                      <span className="text-[#a0a0a0]">Email:</span>
                      <p className="text-white">{selectedRegistration.email}</p>
                    </div>
                    <div>
                      <span className="text-[#a0a0a0]">Phone:</span>
                      <p className="text-white">{selectedRegistration.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <span className="text-[#a0a0a0]">Department:</span>
                      <p className="text-white">{selectedRegistration.department || 'Not provided'}</p>
                    </div>
                    <div>
                      <span className="text-[#a0a0a0]">Position:</span>
                      <p className="text-white">{selectedRegistration.position || 'Not provided'}</p>
                    </div>
                    <div>
                      <span className="text-[#a0a0a0]">Employee ID:</span>
                      <p className="text-white">{selectedRegistration.employee_id || 'Not provided'}</p>
                    </div>
                  </div>
                  {selectedRegistration.bio && (
                    <div className="mt-4">
                      <span className="text-[#a0a0a0]">Bio:</span>
                      <p className="text-white mt-1">{selectedRegistration.bio}</p>
                    </div>
                  )}
                </div>

                {/* Approval Options */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Approval Decision</h3>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="approvalAction"
                        value="regular"
                        checked={approvalAction === 'regular'}
                        onChange={(e) => setApprovalAction(e.target.value as any)}
                        className="h-4 w-4 text-[#8b5cf6] focus:ring-[#8b5cf6] border-[#333333]"
                      />
                      <span className="ml-3 text-white">Approve as Regular User</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="approvalAction"
                        value="company"
                        checked={approvalAction === 'company'}
                        onChange={(e) => setApprovalAction(e.target.value as any)}
                        className="h-4 w-4 text-[#8b5cf6] focus:ring-[#8b5cf6] border-[#333333]"
                      />
                      <span className="ml-3 text-white">Approve and Assign to Company</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="approvalAction"
                        value="reject"
                        checked={approvalAction === 'reject'}
                        onChange={(e) => setApprovalAction(e.target.value as any)}
                        className="h-4 w-4 text-red-500 focus:ring-red-500 border-[#333333]"
                      />
                      <span className="ml-3 text-white">Reject Registration</span>
                    </label>
                  </div>
                </div>

                {/* Company Selection */}
                {approvalAction === 'company' && (
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Select Company *
                    </label>
                    <select
                      value={selectedCompanyId}
                      onChange={(e) => setSelectedCompanyId(e.target.value)}
                      className="block w-full px-3 py-2 border border-[#333333] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] bg-[#252525] text-white"
                    >
                      <option value="">Choose a company...</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    className="block w-full px-3 py-2 border border-[#333333] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] bg-[#252525] text-white"
                    placeholder="Add any notes about this approval decision..."
                  />
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-[#333333]">
                  <button
                    type="button"
                    onClick={() => setIsApprovalModalOpen(false)}
                    className="px-4 py-2 border border-[#333333] rounded-md shadow-sm text-sm font-medium text-white bg-[#252525] hover:bg-[#333333] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8b5cf6]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApproval}
                    disabled={isProcessing || (approvalAction === 'company' && !selectedCompanyId)}
                    className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
                      approvalAction === 'reject' 
                        ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                        : 'bg-[#8b5cf6] hover:bg-[#7c3aed] focus:ring-[#8b5cf6]'
                    }`}
                  >
                    {isProcessing ? 'Processing...' : 
                     approvalAction === 'reject' ? 'Reject Registration' : 'Approve User'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}