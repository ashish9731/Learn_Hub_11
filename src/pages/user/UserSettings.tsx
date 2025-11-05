import React, { useState } from 'react';
import { Settings as SettingsIcon, Bell, Shield, Globe, Save, BookOpen, Target } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function UserSettings() {
  const { theme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState({
    notifications: {
      courseAssignments: true,
      progressUpdates: false,
      weeklyReports: true,
      achievementAlerts: true,
      emailNotifications: true
    },
    learning: {
      autoPlay: false,
      showSubtitles: true,
      playbackSpeed: '1.0',
      reminderTime: '09:00',
      studyGoal: '30'
    },
    preferences: {
      timezone: 'UTC',
      dateFormat: 'MM/DD/YYYY',
      language: 'en',
      theme: theme // Use the theme from context
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

  const handleLearningChange = (key: string, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      learning: {
        ...prev.learning,
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
              Customize your learning experience and preferences
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
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
                        {key === 'courseAssignments' && 'Get notified when new courses are assigned'}
                        {key === 'progressUpdates' && 'Updates on your learning progress'}
                        {key === 'weeklyReports' && 'Weekly summary of your learning activities'}
                        {key === 'achievementAlerts' && 'Notifications for completed courses and achievements'}
                        {key === 'emailNotifications' && 'Receive notifications via email'}
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

          {/* Learning Preferences */}
          <div className="bg-[var(--card-background)] shadow rounded-lg">
            <div className="px-6 py-4 border-b border-[var(--border-color)]">
              <div className="flex items-center">
                <BookOpen className="h-5 w-5 text-[var(--text-secondary)] mr-2" />
                <h3 className="text-lg font-medium text-[var(--text-primary)]">Learning Preferences</h3>
              </div>
            </div>
            <div className="px-6 py-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-[var(--text-primary)]">Auto-play Videos</h4>
                    <p className="text-sm text-[var(--text-secondary)]">Automatically play next video in sequence</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.learning.autoPlay}
                      onChange={(e) => handleLearningChange('autoPlay', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--accent-primary)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-[var(--text-primary)]">Show Subtitles</h4>
                    <p className="text-sm text-[var(--text-secondary)]">Display subtitles for video content</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.learning.showSubtitles}
                      onChange={(e) => handleLearningChange('showSubtitles', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--accent-primary)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Default Playback Speed
                  </label>
                  <select
                    value={settings.learning.playbackSpeed}
                    onChange={(e) => handleLearningChange('playbackSpeed', e.target.value)}
                    className="block w-full px-3 py-2 border border-[var(--border-color)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] bg-[var(--background-tertiary)] text-[var(--text-primary)]"
                  >
                    <option value="0.5">0.5x</option>
                    <option value="0.75">0.75x</option>
                    <option value="1.0">1.0x (Normal)</option>
                    <option value="1.25">1.25x</option>
                    <option value="1.5">1.5x</option>
                    <option value="2.0">2.0x</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Daily Study Reminder
                  </label>
                  <input
                    type="time"
                    value={settings.learning.reminderTime}
                    onChange={(e) => handleLearningChange('reminderTime', e.target.value)}
                    className="block w-full px-3 py-2 border border-[var(--border-color)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] bg-[var(--background-tertiary)] text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Daily Study Goal (minutes)
                  </label>
                  <select
                    value={settings.learning.studyGoal}
                    onChange={(e) => handleLearningChange('studyGoal', e.target.value)}
                    className="block w-full px-3 py-2 border border-[var(--border-color)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] bg-[var(--background-tertiary)] text-[var(--text-primary)]"
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                    <option value="120">2 hours</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* General Preferences */}
          <div className="bg-[var(--card-background)] shadow rounded-lg">
            <div className="px-6 py-4 border-b border-[var(--border-color)]">
              <div className="flex items-center">
                <Globe className="h-5 w-5 text-[var(--text-secondary)] mr-2" />
                <h3 className="text-lg font-medium text-[var(--text-primary)]">General Preferences</h3>
              </div>
            </div>
            <div className="px-6 py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Timezone
                  </label>
                  <select
                    value={settings.preferences.timezone}
                    onChange={(e) => handlePreferenceChange('timezone', e.target.value)}
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
                    value={settings.preferences.dateFormat}
                    onChange={(e) => handlePreferenceChange('dateFormat', e.target.value)}
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
                    value={settings.preferences.language}
                    onChange={(e) => handlePreferenceChange('language', e.target.value)}
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
                    value={settings.preferences.theme}
                    onChange={(e) => handlePreferenceChange('theme', e.target.value)}
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
      </div>
    </div>
  );
}