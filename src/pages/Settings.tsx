import React, { useState } from 'react';
import { Shield, Key, Bell, Globe, ArrowLeft, Database, Save } from 'lucide-react';
import TempPasswordsManager from '../components/TempPasswords/TempPasswordsManager';
import { useTheme } from '../context/ThemeContext';

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState({
    notifications: {
      emailNotifications: true,
      pushNotifications: false,
      weeklyReports: true,
      systemAlerts: true
    },
    security: {
      twoFactorAuth: true,
      sessionTimeout: '30',
      passwordExpiry: '90'
    },
    system: {
      maintenanceMode: false,
      debugMode: false,
      autoBackup: true,
      backupFrequency: 'daily'
    },
    general: {
      timezone: 'UTC',
      dateFormat: 'MM/DD/YYYY',
      language: 'en',
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

  const handleSystemChange = (key: string, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      system: {
        ...prev.system,
        [key]: value
      }
    }));
  };

  const handleGeneralChange = (key: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      general: {
        ...prev.general,
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
    console.log('Saving settings:', settings);
    alert('Settings saved successfully!');
  };

  return (
    <div className="py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-[var(--text-primary)] sm:text-3xl sm:truncate">
              Settings
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Manage your application preferences and system configuration
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4 space-x-2">
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center px-4 py-2 border border-[var(--border-color)] rounded-md shadow-sm text-sm font-medium text-[var(--text-primary)] bg-[var(--card-background)] hover:bg-[var(--card-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent-primary)]"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back
            </button>
            <button
              onClick={handleSaveSettings}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent-primary)]"
            >
              <Save className="-ml-1 mr-2 h-5 w-5" />
              Save Settings
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Notifications */}
          <div className="bg-[var(--card-background)] shadow rounded-lg">
            <div className="px-6 py-4 border-b border-[var(--border-color)]">
              <div className="flex items-center">
                <Bell className="h-5 w-5 text-[var(--text-secondary)] mr-2" />
                <h3 className="text-lg font-medium text-[var(--text-primary)]">Notifications</h3>
              </div>
            </div>
            <div className="px-6 py-6">
              <div className="space-y-4">
                {Object.entries(settings.notifications).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-[var(--text-primary)] capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </h4>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {key === 'emailNotifications' && 'Receive notifications via email'}
                        {key === 'pushNotifications' && 'Receive push notifications in browser'}
                        {key === 'weeklyReports' && 'Get weekly summary reports'}
                        {key === 'systemAlerts' && 'Receive system maintenance alerts'}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => handleNotificationChange(key, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--accent-primary)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="bg-[var(--card-background)] shadow rounded-lg">
            <div className="px-6 py-4 border-b border-[var(--border-color)]">
              <div className="flex items-center">
                <Shield className="h-5 w-5 text-[var(--text-secondary)] mr-2" />
                <h3 className="text-lg font-medium text-[var(--text-primary)]">Security</h3>
              </div>
            </div>
            <div className="px-6 py-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-[var(--text-primary)]">Two-Factor Authentication</h4>
                    <p className="text-sm text-[var(--text-secondary)]">Add an extra layer of security to your account</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.security.twoFactorAuth}
                      onChange={(e) => handleSecurityChange('twoFactorAuth', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--accent-primary)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Session Timeout (minutes)
                  </label>
                  <select
                    value={settings.security.sessionTimeout}
                    onChange={(e) => handleSecurityChange('sessionTimeout', e.target.value)}
                    className="block w-full px-3 py-2 border border-[var(--border-color)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] bg-[var(--background-tertiary)] text-[var(--text-primary)]"
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="120">2 hours</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Password Expiry (days)
                  </label>
                  <select
                    value={settings.security.passwordExpiry}
                    onChange={(e) => handleSecurityChange('passwordExpiry', e.target.value)}
                    className="block w-full px-3 py-2 border border-[var(--border-color)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] bg-[var(--background-tertiary)] text-[var(--text-primary)]"
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

          {/* System */}
          <div className="bg-[var(--card-background)] shadow rounded-lg">
            <div className="px-6 py-4 border-b border-[var(--border-color)]">
              <div className="flex items-center">
                <Database className="h-5 w-5 text-[var(--text-secondary)] mr-2" />
                <h3 className="text-lg font-medium text-[var(--text-primary)]">System</h3>
              </div>
            </div>
            <div className="px-6 py-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-[var(--text-primary)]">Maintenance Mode</h4>
                    <p className="text-sm text-[var(--text-secondary)]">Put the system in maintenance mode</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.system.maintenanceMode}
                      onChange={(e) => handleSystemChange('maintenanceMode', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-[var(--text-primary)]">Auto Backup</h4>
                    <p className="text-sm text-[var(--text-secondary)]">Automatically backup system data</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.system.autoBackup}
                      onChange={(e) => handleSystemChange('autoBackup', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--accent-primary)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Backup Frequency
                  </label>
                  <select
                    value={settings.system.backupFrequency}
                    onChange={(e) => handleSystemChange('backupFrequency', e.target.value)}
                    className="block w-full px-3 py-2 border border-[var(--border-color)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] bg-[var(--background-tertiary)] text-[var(--text-primary)]"
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* General */}
          <div className="bg-[var(--card-background)] shadow rounded-lg">
            <div className="px-6 py-4 border-b border-[var(--border-color)]">
              <div className="flex items-center">
                <Globe className="h-5 w-5 text-[var(--text-secondary)] mr-2" />
                <h3 className="text-lg font-medium text-[var(--text-primary)]">General</h3>
              </div>
            </div>
            <div className="px-6 py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Timezone
                  </label>
                  <select
                    value={settings.general.timezone}
                    onChange={(e) => handleGeneralChange('timezone', e.target.value)}
                    className="block w-full px-3 py-2 border border-[var(--border-color)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] bg-[var(--background-tertiary)] text-[var(--text-primary)]"
                  >
                    <option value="UTC">UTC</option>
                    <option value="EST">Eastern Time</option>
                    <option value="PST">Pacific Time</option>
                    <option value="CST">Central Time</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Date Format
                  </label>
                  <select
                    value={settings.general.dateFormat}
                    onChange={(e) => handleGeneralChange('dateFormat', e.target.value)}
                    className="block w-full px-3 py-2 border border-[var(--border-color)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] bg-[var(--background-tertiary)] text-[var(--text-primary)]"
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Language
                  </label>
                  <select
                    value={settings.general.language}
                    onChange={(e) => handleGeneralChange('language', e.target.value)}
                    className="block w-full px-3 py-2 border border-[var(--border-color)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] bg-[var(--background-tertiary)] text-[var(--text-primary)]"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Theme
                  </label>
                  <select
                    value={settings.general.theme}
                    onChange={(e) => handleGeneralChange('theme', e.target.value)}
                    className="block w-full px-3 py-2 border border-[var(--border-color)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] bg-[var(--background-tertiary)] text-[var(--text-primary)]"
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Temporary Passwords Management */}
        <div className="bg-[var(--card-background)] shadow rounded-lg">
          <div className="px-6 py-4 border-b border-[var(--border-color)]">
            <div className="flex items-center">
              <Database className="h-5 w-5 text-[var(--text-secondary)] mr-2" />
              <h3 className="text-lg font-medium text-[var(--text-primary)]">Temporary Passwords</h3>
            </div>
          </div>
          <div className="px-6 py-6">
            <TempPasswordsManager />
          </div>
        </div>
      </div>
    </div>
  );
}