import React, { useState } from 'react';
import { Search, User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../../hooks/useProfile';
import { extractFirstNameFromEmail } from '../../utils/timeGreeting';

interface HeaderProps {
  onLogout?: () => void;
  userEmail?: string;
  userRole?: 'super_admin' | 'admin' | 'user';
}

export default function Header({ onLogout, userEmail, userRole }: HeaderProps) {
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const { profile } = useProfile();
  const navigate = useNavigate();

  const handleProfileClick = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      console.log('Logging out...');
      // In a real app, this would clear auth tokens and redirect
      window.location.reload();
    }
  };

  const handleSettings = () => {
    navigate('/settings');
    setIsProfileDropdownOpen(false);
  };

  const handleProfile = () => {
    navigate('/profile');
    setIsProfileDropdownOpen(false);
  };

  const getGreeting = () => {
    const now = new Date();
    const hour = now.getHours();
    
    let greeting = 'Good Evening';
    if (hour >= 5 && hour < 12) {
      greeting = 'Good Morning';
    } else if (hour >= 12 && hour < 17) {
      greeting = 'Good Afternoon';
    }
    
    const firstName = profile?.first_name || extractFirstNameFromEmail(userEmail || '');
    return `${greeting}, ${firstName}`;
  };

  return (
    <>
      <div className="lg:pl-64">
        <div className="sticky top-0 z-40 flex h-16 flex-shrink-0 items-center gap-x-4 border-b border-[#333333] bg-[#1e1e1e] px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="relative flex flex-1 items-center">
              <div className="flex items-center space-x-4">
                <div>
                  <h1 className="text-lg font-semibold text-white">Professional Learning Management</h1>
                  <p className="text-sm text-[#a0a0a0]">Super Admin</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <div className="relative">
                <Search className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-[#a0a0a0] pl-3" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="block w-full rounded-md border-0 py-1.5 pl-10 pr-3 text-white ring-1 ring-inset ring-[#333333] bg-[#252525] placeholder:text-[#a0a0a0] focus:ring-2 focus:ring-inset focus:ring-[#8b5cf6] sm:text-sm sm:leading-6"
                />
              </div>

              {/* Profile Dropdown */}
              <div className="relative">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-white">
                    {getGreeting()}
                  </span>
                  <div className="relative">
                    <button
                      onClick={handleProfileClick}
                      className="flex items-center space-x-2 bg-[#252525] rounded-lg px-3 py-2 hover:bg-[#333333] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] focus:ring-offset-2"
                    >
                      {profile?.profile_picture_url ? (
                        <img
                          src={profile.profile_picture_url}
                          alt="Profile"
                          className="h-6 w-6 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-[#a0a0a0]" />
                      )}
                      <span className="text-sm text-white">Profile & Settings</span>
                      <ChevronDown className="h-4 w-4 text-[#a0a0a0]" />
                    </button>

                    {/* Profile Dropdown Menu */}
                    {isProfileDropdownOpen && (
                      <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-[#1e1e1e] py-1 shadow-lg ring-1 ring-black ring-opacity-5 ring-[#333333] focus:outline-none">
                        <button
                          onClick={handleProfile}
                          className="flex w-full items-center px-4 py-2 text-sm text-white hover:bg-[#252525]"
                        >
                          <User className="mr-3 h-4 w-4" />
                          View Profile
                        </button>
                        <button
                          onClick={handleSettings}
                          className="flex w-full items-center px-4 py-2 text-sm text-white hover:bg-[#252525]"
                        >
                          <Settings className="mr-3 h-4 w-4" />
                          Settings
                        </button>
                        <hr className="my-1" />
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center px-4 py-2 text-sm text-red-400 hover:bg-red-900/20"
                        >
                          {userRole === 'super_admin' && <span className="absolute -top-1 -right-1 bg-red-500 rounded-full w-3 h-3"></span>}
                          <LogOut className="mr-3 h-4 w-4" />
                          Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay to close dropdown when clicking outside */}
      {isProfileDropdownOpen && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setIsProfileDropdownOpen(false)}
        />
      )}
    </>
  );
}