import React, { useState } from 'react';
import { Settings as SettingsIcon, Bell, Shield, Database, Globe, Save } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function AdminSettings() {
  const { theme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState({
    notifications: {
      emailNotifications: true,
      pushNotifications: false,
      weeklyReports: true,
      systemAlerts: true,
      courseAssignments: true,
      userProgress: true
    },
    security: {
      twoFactorAuth: true,
      sessionTimeout: '30',
      passwordExpiry: '90'
    },
    preferences: {
      timezone: 'UTC',
      dateFormat: 'MM/DD/YYYY',
      language: 'en',
      defaultView: 'dashboard',
      itemsPerPage: '20',
      theme: theme
    }
  });

  const handleNotificationChange = (key: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value
      }
    }));
  };

  const handleSecurityChange = (key: string, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      security: {
        ...prev.security,
        [key]: value
      }
    }));
  };

  const handlePreferenceChange = (key: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: value
      }
    }));
    
    // If theme is changed, update the context
    if (key === 'theme') {
      if (value !== theme) {
        toggleTheme();
      }
    }
  };

  const handleSaveSettings = () => {
    console.log('Saving admin settings:', settings);
    alert('Settings saved successfully!');
  };

  return (
    <div className="py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-black sm:text-3xl sm:truncate dark:text-white">
              Settings
            </h2>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
              Manage your admin preferences and notification settings
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              onClick={handleSaveSettings}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:bg-purple-700 dark:hover:bg-purple-600"
            >
              <Save className="-ml-1 mr-2 h-5 w-5" />
              Save Settings
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Notifications */}
          <div className="bg-white shadow rounded-lg dark:bg-gray-800">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <Bell className="h-5 w-5 text-gray-700 mr-2 dark:text-gray-300" />
                <h3 className="text-lg font-medium text-black dark:text-white">Notifications</h3>
              </div>
            </div>
            <div className="px-6 py-6">
              <div className="space-y-4">
                {Object.entries(settings.notifications).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-black capitalize dark:text-white">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {key === 'emailNotifications' && 'Receive notifications via email'}
                        {key === 'pushNotifications' && 'Receive push notifications in browser'}
                        {key === 'weeklyReports' && 'Get weekly summary reports'}
                        {key === 'systemAlerts' && 'Receive system maintenance alerts'}
                        {key === 'courseAssignments' && 'Notifications for new course assignments'}
                        {key === 'userProgress' && 'Updates on user progress and completions'}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => handleNotificationChange(key, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 dark:peer-focus:ring-purple-500 dark:peer-checked:bg-purple-700"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="bg-white shadow rounded-lg dark:bg-gray-800">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <Shield className="h-5 w-5 text-gray-700 mr-2 dark:text-gray-300" />
                <h3 className="text-lg font-medium text-black dark:text-white">Security</h3>
              </div>
            </div>
            <div className="px-6 py-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-black dark:text-white">Two-Factor Authentication</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">Add an extra layer of security to your account</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.security.twoFactorAuth}
                      onChange={(e) => handleSecurityChange('twoFactorAuth', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 dark:peer-focus:ring-purple-500 dark:peer-checked:bg-purple-700"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2 dark:text-white">
                    Session Timeout (minutes)
                  </label>
                  <select
                    value={settings.security.sessionTimeout}
                    onChange={(e) => handleSecurityChange('sessionTimeout', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 bg-gray-100 text-black dark:border-gray-600 dark:focus:ring-purple-500 dark:focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="120">2 hours</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2 dark:text-white">
                    Password Expiry (days)
                  </label>
                  <select
                    value={settings.security.passwordExpiry}
                    onChange={(e) => handleSecurityChange('passwordExpiry', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 bg-gray-100 text-black dark:border-gray-600 dark:focus:ring-purple-500 dark:focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="30">30 days</option>
                    <option value="60">60 days</option>
                    <option value="90">90 days</option>
                    <option value="180">180 days</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white shadow rounded-lg dark:bg-gray-800">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <Globe className="h-5 w-5 text-gray-700 mr-2 dark:text-gray-300" />
                <h3 className="text-lg font-medium text-black dark:text-white">Preferences</h3>
              </div>
            </div>
            <div className="px-6 py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2 dark:text-white">
                    Timezone
                  </label>
                  <select
                    value={settings.preferences.timezone}
                    onChange={(e) => handlePreferenceChange('timezone', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 bg-gray-100 text-black dark:border-gray-600 dark:focus:ring-purple-500 dark:focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="UTC">UTC</option>
                    <option value="EST">Eastern Time</option>
                    <option value="PST">Pacific Time</option>
                    <option value="CST">Central Time</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2 dark:text-white">
                    Date Format
                  </label>
                  <select
                    value={settings.preferences.dateFormat}
                    onChange={(e) => handlePreferenceChange('dateFormat', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 bg-gray-100 text-black dark:border-gray-600 dark:focus:ring-purple-500 dark:focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2 dark:text-white">
                    Language
                  </label>
                  <select
                    value={settings.preferences.language}
                    onChange={(e) => handlePreferenceChange('language', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 bg-gray-100 text-black dark:border-gray-600 dark:focus:ring-purple-500 dark:focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2 dark:text-white">
                    Default View
                  </label>
                  <select
                    value={settings.preferences.defaultView}
                    onChange={(e) => handlePreferenceChange('defaultView', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 bg-gray-100 text-black dark:border-gray-600 dark:focus:ring-purple-500 dark:focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="dashboard">Dashboard</option>
                    <option value="courses">Course Assignment</option>
                    <option value="reports">Reports</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2 dark:text-white">
                    Items Per Page
                  </label>
                  <select
                    value={settings.preferences.itemsPerPage}
                    onChange={(e) => handlePreferenceChange('itemsPerPage', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 bg-gray-100 text-black dark:border-gray-600 dark:focus:ring-purple-500 dark:focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2 dark:text-white">
                    Theme
                  </label>
                  <select
                    value={settings.preferences.theme}
                    onChange={(e) => handlePreferenceChange('theme', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 bg-gray-100 text-black dark:border-gray-600 dark:focus:ring-purple-500 dark:focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}