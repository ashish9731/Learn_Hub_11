import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { testSupabaseConnection } from './lib/supabase';

// Global real-time sync manager
const setupGlobalRealtimeSync = () => {
  // Create a global channel for all table changes
  const globalChannel = supabase
    .channel('global-realtime-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
      console.log('🔄 REALTIME: Users table changed:', payload);
      window.dispatchEvent(new CustomEvent('supabase-users-changed', { detail: payload }));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, (payload) => {
      console.log('🔄 REALTIME: Companies table changed:', payload);
      window.dispatchEvent(new CustomEvent('supabase-companies-changed', { detail: payload }));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, (payload) => {
      console.log('🔄 REALTIME: Courses table changed:', payload);
      window.dispatchEvent(new CustomEvent('supabase-courses-changed', { detail: payload }));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'user_courses' }, (payload) => {
      console.log('🔄 REALTIME: User courses table changed:', payload);
      window.dispatchEvent(new CustomEvent('supabase-user-courses-changed', { detail: payload }));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'podcasts' }, (payload) => {
      console.log('🔄 REALTIME: Podcasts table changed:', payload);
      window.dispatchEvent(new CustomEvent('supabase-podcasts-changed', { detail: payload }));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'podcast_progress' }, (payload) => {
      console.log('🔄 REALTIME: Podcast progress table changed:', payload);
      window.dispatchEvent(new CustomEvent('supabase-podcast-progress-changed', { detail: payload }));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'podcast_assignments' }, (payload) => {
      console.log('🔄 REALTIME: Podcast assignments table changed:', payload);
      window.dispatchEvent(new CustomEvent('supabase-podcast-assignments-changed', { detail: payload }));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, (payload) => {
      console.log('🔄 REALTIME: User profiles table changed:', payload);
      window.dispatchEvent(new CustomEvent('supabase-user-profiles-changed', { detail: payload }));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'content_categories' }, (payload) => {
      console.log('🔄 REALTIME: Content categories table changed:', payload);
      window.dispatchEvent(new CustomEvent('supabase-content-categories-changed', { detail: payload }));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pdfs' }, (payload) => {
      console.log('🔄 REALTIME: PDFs table changed:', payload);
      window.dispatchEvent(new CustomEvent('supabase-pdfs-changed', { detail: payload }));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'podcast_likes' }, (payload) => {
      console.log('🔄 REALTIME: Podcast likes table changed:', payload);
      window.dispatchEvent(new CustomEvent('supabase-podcast-likes-changed', { detail: payload }));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'logos' }, (payload) => {
      console.log('🔄 REALTIME: Logos table changed:', payload);
      window.dispatchEvent(new CustomEvent('supabase-logos-changed', { detail: payload }));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, (payload) => {
      console.log('🔄 REALTIME: Activity logs table changed:', payload);
      window.dispatchEvent(new CustomEvent('supabase-activity-logs-changed', { detail: payload }));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_history' }, (payload) => {
      console.log('🔄 REALTIME: Chat history table changed:', payload);
      window.dispatchEvent(new CustomEvent('supabase-chat-history-changed', { detail: payload }));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'temp_passwords' }, (payload) => {
      console.log('🔄 REALTIME: Temp passwords table changed:', payload);
      window.dispatchEvent(new CustomEvent('supabase-temp-passwords-changed', { detail: payload }));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'user_registrations' }, (payload) => {
      console.log('🔄 REALTIME: User registrations table changed:', payload);
      window.dispatchEvent(new CustomEvent('supabase-user-registrations-changed', { detail: payload }));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'approval_logs' }, (payload) => {
      console.log('🔄 REALTIME: Approval logs table changed:', payload);
      window.dispatchEvent(new CustomEvent('supabase-approval-logs-changed', { detail: payload }));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, (payload) => {
      console.log('🔄 REALTIME: Audit logs table changed:', payload);
      window.dispatchEvent(new CustomEvent('supabase-audit-logs-changed', { detail: payload }));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_messages' }, (payload) => {
      console.log('🔄 REALTIME: Contact messages table changed:', payload);
      window.dispatchEvent(new CustomEvent('supabase-contact-messages-changed', { detail: payload }));
    })
    .subscribe();

  return globalChannel;
};

import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Analytics from './pages/Analytics';
import ContentUpload from './pages/ContentUpload';
import CourseAssignmentCreation from './pages/CourseAssignmentCreation';
import Companies from './pages/Companies';
import Admins from './pages/Admins';
import Users from './pages/Users';
import UserApproval from './pages/UserApproval';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import AdminSidebar from './components/Layout/AdminSidebar';
import AdminHeader from './components/Layout/AdminHeader';
import UserSidebar from './components/Layout/UserSidebar';
import UserHeader from './components/Layout/UserHeader';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProfile from './pages/admin/AdminProfile';
import AdminSettings from './pages/admin/AdminSettings';
import Reports from './pages/admin/Reports';
import CourseAssignment from './pages/admin/CourseAssignment';
import UserDashboard from './pages/user/UserDashboard';
import UserProfile from './pages/user/UserProfile';
import UserSettings from './pages/user/UserSettings';
import MyCourses from './pages/user/MyCourses';
import CourseDetail from './pages/user/CourseDetail';
import AIChat from './pages/user/AIChat';
import AuthPage from './components/Auth/AuthPage';
import { useTheme } from './context/ThemeContext';

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<'super_admin' | 'admin' | 'user'>('user');
  const [isLoading, setIsLoading] = useState(true); 
  const [connectionTested, setConnectionTested] = useState(false);
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [globalChannel, setGlobalChannel] = useState<any>(null);

  // Set up global real-time sync on app start
  useEffect(() => {
    const channel = setupGlobalRealtimeSync();
    setGlobalChannel(channel);
    
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setIsAuthenticated(true);
          setUserEmail(session.user.email || '');

          // Get user role from database
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role, company_id')
            .eq('id', session.user.id)
            .maybeSingle();

          if (!userError) {
            if (userData) {
              setUserRole(userData.role as 'super_admin' | 'admin' | 'user');
              
              // Sync user metadata with auth
              try {
                await supabase.auth.updateUser({
                  data: {
                    role: userData.role,
                    company_id: userData.company_id || null
                  }
                });
              } catch (syncError) {
                console.error('Error syncing user metadata:', syncError);
              }
              
              console.log('User role set from database:', userData.role);
            } else {
              // User exists in auth but not in users table - create entry
              console.log('Creating user entry in database for authenticated user');
              const { data: newUserData, error: createError } = await supabase
                .from('users')
                .insert({
                  id: session.user.id,
                  email: session.user.email,
                  role: 'user',
                  company_id: null
                })
                .select('role')
                .single();

              if (!createError && newUserData) {
                setUserRole(newUserData.role as 'super_admin' | 'admin' | 'user');
                console.log('User entry created with role:', newUserData.role);
              } else {
                console.error('Error creating user entry:', createError);
                setUserRole('user');
                console.warn('Defaulting to user role due to creation error');
              }
            }
          } else {
            console.error('Error fetching user role:', userError);
            setUserRole('user');
            console.warn('Defaulting to user role due to fetch error');
          }
        } else {
          // No session exists - user is not authenticated
          setIsAuthenticated(false);
          setUserEmail('');
          setUserRole('user');
        }
      } catch (error: any) {
        console.error('Auth check error:', error);
        // Handle refresh token errors specifically
        if (error.message && typeof error.message === 'string' && error.message.includes('Refresh Token')) {
          console.log('Refresh token error detected, clearing session');
          setIsAuthenticated(false);
          setUserEmail('');
          setUserRole('user');
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    const testConnection = async () => {
      if (!connectionTested) {
        const isConnected = await testSupabaseConnection();
        setConnectionTested(true);
        
        if (!isConnected) {
          console.warn('Supabase connection test failed. Some features may not work correctly.');
        }
      }
    };
    
    testConnection();
  }, [connectionTested]);

  const handleLogin = async (email: string, role?: string) => {
    setIsAuthenticated(true);
    setUserEmail(email);
    
    // If role is provided, use it; otherwise fetch from database
    let finalRole = role || 'user';
    
    if (!role) {
      try {
        // Get current user session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Get user role from database
          const { data: userData, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single();
            
          if (!error && userData) {
            finalRole = userData.role;
          }
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    }
    
    setUserRole(finalRole as 'super_admin' | 'admin' | 'user');
    console.log('User role set during login:', finalRole);
    
    // Force immediate navigation based on role
    setTimeout(() => {
      if (finalRole === 'super_admin') {
        console.log('Navigating to super admin dashboard');
        navigate('/', { replace: true });
      } else if (finalRole === 'admin') {
        console.log('Navigating to admin dashboard');
        navigate('/admin', { replace: true });
      } else {
        console.log('Navigating to user dashboard');
        navigate('/user', { replace: true });
      }
    }, 100);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setUserEmail('');
      setUserRole('user');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#121212]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8b5cf6] mx-auto"></div>
          <p className="mt-4 text-white">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen dark bg-[#121212]">
      {isAuthenticated ? (
        <>
          {userRole === 'super_admin' && (
            <>
              <main className="min-h-screen bg-[#121212]">
                <div className="py-6">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/profile" element={<Profile userEmail={userEmail} />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/content" element={<ContentUpload />} />
                    <Route path="/companies" element={<Companies />} />
                    <Route path="/admins" element={<Admins />} />
                    <Route path="/users" element={<Users />} />
                    <Route path="/user-approval" element={<UserApproval />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </div>
              </main>
            </>
          )}

          {userRole === 'admin' && (
            <>
              <AdminSidebar />
              <AdminHeader onLogout={handleLogout} userEmail={userEmail} userRole={userRole} />
              <main className="lg:pl-64 min-h-screen bg-[#121212]">
                <div className="py-6">
                  <Routes>
                    <Route path="/admin" element={<AdminDashboard userEmail={userEmail} />} />
                    <Route path="/admin/profile" element={<AdminProfile userEmail={userEmail} />} />
                    <Route path="/admin/settings" element={<AdminSettings />} />
                    <Route path="/admin/reports" element={<Reports />} />
                    <Route path="/admin/courses" element={<CourseAssignment />} />
                    <Route path="*" element={<Navigate to="/admin" replace />} />
                  </Routes>
                </div>
              </main>
            </>
          )}

          {userRole === 'user' && (
            <>
              <UserSidebar />
              <UserHeader onLogout={handleLogout} userEmail={userEmail} userRole={userRole} />
              <main className="lg:pl-64 min-h-screen bg-[#121212]">
                <div className="py-6">
                  <Routes>
                    <Route path="/" element={<Navigate to="/user" replace />} />
                    <Route path="/user" element={<UserDashboard userEmail={userEmail} />} /> 
                    <Route path="/user/profile" element={<UserProfile userEmail={userEmail} />} />
                    <Route path="/user/settings" element={<UserSettings />} />
                    <Route path="/user/courses" element={<MyCourses />} />
                    <Route path="/user/courses/:courseId" element={<CourseDetail />} />
                    <Route path="/user/ai-chat" element={<AIChat userEmail={userEmail} />} />
                    <Route path="*" element={<Navigate to="/user" replace />} />
                  </Routes>
                </div>
              </main>
            </>
          )}
        </>
      ) : (
        <AuthPage onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;