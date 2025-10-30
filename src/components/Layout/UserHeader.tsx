import React, { useState } from 'react';
import { User, LogOut, Settings, ChevronDown, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../../hooks/useProfile';
import { extractFirstNameFromEmail } from '../../utils/timeGreeting';
import { useTheme } from '../../context/ThemeContext';

interface UserHeaderProps {
  onLogout: () => void;
  userEmail?: string;
  userRole?: 'super_admin' | 'admin' | 'user';
}

export default function UserHeader({ onLogout, userEmail, userRole }: UserHeaderProps) {
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const { profile } = useProfile();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleProfileClick = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const handleSettings = () => {
    navigate('/user/settings');
    setIsProfileDropdownOpen(false);
  };

  const handleProfile = () => {
    navigate('/user/profile');
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
        <div className="sticky top-0 z-40 flex h-16 flex-shrink-0 items-center gap-x-4 border-b border-[var(--border-color)] bg-[var(--background-secondary)] px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="relative flex flex-1 items-center">
              <div className="flex items-center space-x-4">
                <div>
                  <h1 className="text-lg font-semibold text-[var(--text-primary)]">Learning Dashboard</h1>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {userRole === 'user' ? 'Your personalized learning journey' : 'User View'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-[var(--background-tertiary)] hover:bg-[var(--card-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5 text-[var(--text-primary)]" />
                ) : (
                  <Moon className="h-5 w-5 text-[var(--text-primary)]" />
                )}
              </button>

              {/* Profile Dropdown */}
              <div className="relative">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {getGreeting()}
                  </span>
                  <div className="relative">
                    <button
                      onClick={handleProfileClick}
                      className="flex items-center space-x-2 bg-[var(--background-tertiary)] rounded-lg px-3 py-2 hover:bg-[var(--card-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2"
                    >
                      {profile?.profile_picture_url ? (
                        <img
                          src={profile.profile_picture_url}
                          alt="Profile"
                          className="h-6 w-6 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-[var(--text-secondary)]" />
                      )}
                      <span className="text-sm text-[var(--text-primary)]">Profile & Settings</span>
                      <ChevronDown className="h-4 w-4 text-[var(--text-secondary)]" />
                    </button>

                    {/* Profile Dropdown Menu */}
                    {isProfileDropdownOpen && (
                      <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-[var(--card-background)] py-1 shadow-lg ring-1 ring-black ring-opacity-5 ring-[var(--border-color)] focus:outline-none">
                        <button
                          onClick={handleProfile}
                          className="flex w-full items-center px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--card-hover)]"
                        >
                          <User className="mr-3 h-4 w-4" />
                          View Profile
                        </button>
                        <button
                          onClick={handleSettings}
                          className="flex w-full items-center px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--card-hover)]"
                        >
                          <Settings className="mr-3 h-4 w-4" />
                          Settings
                        </button>
                        <hr className="my-1 border-[var(--border-color)]" />
                        <button
                          onClick={onLogout}
                          className="flex w-full items-center px-4 py-2 text-sm text-red-400 hover:bg-red-900/20"
                        >
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