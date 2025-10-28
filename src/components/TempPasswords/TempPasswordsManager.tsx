import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Copy, Trash2, CheckCircle, Clock, User, UserCog } from 'lucide-react';
import { supabaseHelpers } from '../../hooks/useSupabase';
import { supabase } from '../../lib/supabase';

export default function TempPasswordsManager() {
  const [tempPasswords, setTempPasswords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadTempPasswords();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('temp-passwords-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'temp_passwords' }, () => {
        loadTempPasswords();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        loadTempPasswords();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, () => {
        loadTempPasswords();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadTempPasswords = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await supabaseHelpers.getTempPasswords();
      setTempPasswords(data);
    } catch (err) {
      console.error('Failed to load temporary passwords:', err);
      setError(err instanceof Error ? err.message : 'Failed to load temporary passwords');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert(`${type} copied to clipboard!`);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert(`Failed to copy ${type.toLowerCase()}`);
    }
  };

  const markAsUsed = async (id: string) => {
    try {
      await supabaseHelpers.markTempPasswordAsUsed(id);
      await loadTempPasswords();
    } catch (err) {
      console.error('Failed to mark as used:', err);
      alert('Failed to mark password as used');
    }
  };

  const deletePassword = async (id: string) => {
    if (!confirm('Are you sure you want to delete this temporary password?')) return;
    
    try {
      await supabaseHelpers.deleteTempPassword(id);
      await loadTempPasswords();
    } catch (err) {
      console.error('Failed to delete password:', err);
      alert('Failed to delete temporary password');
    }
  };

  const filteredPasswords = tempPasswords.filter(tp => 
    tp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tp.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-600">Error: {error}</p>
        <button 
          onClick={loadTempPasswords}
          className="mt-2 text-sm text-red-700 hover:text-red-500"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-medium text-gray-900">Generated Temporary Passwords</h4>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Total: {tempPasswords.length}</span>
          <span className="text-sm text-green-600">
            Unused: {tempPasswords.filter(tp => !tp.is_used).length}
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search by email or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {filteredPasswords.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Password
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPasswords.map((tempPassword) => (
                <tr key={tempPassword.id} className={tempPassword.is_used ? 'bg-gray-50' : 'bg-white'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          {tempPassword.role === 'admin' || tempPassword.role === 'super_admin' ? (
                            <UserCog className="h-4 w-4 text-blue-600" />
                          ) : (
                            <User className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {tempPassword.full_name || 'No name'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      tempPassword.role === 'super_admin' ? 'bg-red-100 text-red-800' :
                      tempPassword.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {tempPassword.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-900">{tempPassword.email}</span>
                      <button
                        onClick={() => copyToClipboard(tempPassword.email, 'Email')}
                        className="ml-2 text-gray-400 hover:text-gray-600"
                        title="Copy email"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm font-mono text-gray-900">
                        {visiblePasswords[tempPassword.id] ? tempPassword.temp_password : '••••••••••••'}
                      </span>
                      <button
                        onClick={() => togglePasswordVisibility(tempPassword.id)}
                        className="ml-2 text-gray-400 hover:text-gray-600"
                        title={visiblePasswords[tempPassword.id] ? 'Hide password' : 'Show password'}
                      >
                        {visiblePasswords[tempPassword.id] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => copyToClipboard(tempPassword.temp_password, 'Password')}
                        className="ml-2 text-gray-400 hover:text-gray-600"
                        title="Copy password"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {tempPassword.is_used ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Used
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(tempPassword.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {!tempPassword.is_used && (
                        <button
                          onClick={() => markAsUsed(tempPassword.id)}
                          className="text-green-600 hover:text-green-900"
                          title="Mark as used"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deletePassword(tempPassword.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          {tempPasswords.length === 0 ? 'No temporary passwords generated yet' : 'No passwords match your search'}
        </div>
      )}
    </div>
  );
}