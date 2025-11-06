import React, { useState } from 'react';
import { Search, User, LogOut, Settings, ChevronDown, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../../hooks/useProfile';
import { extractFirstNameFromEmail } from '../../utils/timeGreeting';
import { useTheme } from '../../context/ThemeContext';

interface HeaderProps {
  onLogout?: () => void;
  userEmail?: string;
  userRole?: 'super_admin' | 'admin' | 'user';
}

export default function Header({ onLogout, userEmail, userRole }: HeaderProps) {
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const { profile } = useProfile();
  const { theme, toggleTheme } = useTheme();
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
        <div className="sticky top-0 z-40 flex h-16 flex-shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="relative flex flex-1 items-center">
              <div className="flex items-center space-x-4">
                <div>
                  <h1 className="text-lg font-semibold text-black dark:text-white">Professional Learning Management</h1>
                  <p className="text-sm text-gray-700 dark:text-gray-300">Super Admin</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <div className="relative">
                <Search className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-gray-700 pl-3 dark:text-gray-300" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="block w-full rounded-md border-0 py-1.5 pl-10 pr-3 text-black ring-1 ring-inset ring-gray-300 bg-white placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-purple-500 sm:text-sm sm:leading-6 dark:text-white dark:ring-gray-600 dark:bg-gray-700 dark:placeholder:text-gray-400 dark:focus:ring-purple-500"
                />
              </div>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:bg-gray-700 dark:hover:bg-gray-600"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5 text-black dark:text-white" />
                ) : (
                  <Moon className="h-5 w-5 text-black dark:text-white" />
                )}
              </button>

              {/* Profile Dropdown */}
              <div className="relative">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-black dark:text-white">
                    {getGreeting()}
                  </span>
                  <div className="relative">
                    <button
                      onClick={handleProfileClick}
                      className="flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-2 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:bg-gray-700 dark:hover:bg-gray-600"
                    >
                      {profile?.profile_picture_url ? (
                        <img
                          src={profile.profile_picture_url}
                          alt="Profile"
                          className="h-6 w-6 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-black dark:text-white" />
                      )}
                      <span className="text-sm text-black dark:text-white">Profile & Settings</span>
                      <ChevronDown className="h-4 w-4 text-black dark:text-white" />
                    </button>

                    {/* Profile Dropdown Menu */}
                    {isProfileDropdownOpen && (
                      <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 ring-gray-200 focus:outline-none dark:bg-gray-800 dark:ring-gray-700">
                        <button
                          onClick={handleProfile}
                          className="flex w-full items-center px-4 py-2 text-sm text-black hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
                        >
                          <User className="mr-3 h-4 w-4" />
                          View Profile
                        </button>
                        <button
                          onClick={handleSettings}
                          className="flex w-full items-center px-4 py-2 text-sm text-black hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
                        >
                          <Settings className="mr-3 h-4 w-4" />
                          Settings
                        </button>
                        <hr className="my-1 border-gray-200 dark:border-gray-700" />
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