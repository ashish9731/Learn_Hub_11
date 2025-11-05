import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    // Check for saved theme in localStorage or system preference
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (systemPrefersDark) {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  }, []);

  useEffect(() => {
    // Apply theme to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.setProperty('--background-primary', '#121212');
      document.documentElement.style.setProperty('--background-secondary', '#1e1e1e');
      document.documentElement.style.setProperty('--background-tertiary', '#252525');
      document.documentElement.style.setProperty('--text-primary', '#ffffff');
      document.documentElement.style.setProperty('--text-secondary', '#f0f0f0');
      document.documentElement.style.setProperty('--text-tertiary', '#d0d0d0');
      document.documentElement.style.setProperty('--accent-primary', '#a855f7');
      document.documentElement.style.setProperty('--accent-secondary', '#9333ea');
      document.documentElement.style.setProperty('--border-color', '#333333');
      document.documentElement.style.setProperty('--card-background', '#1e1e1e');
      document.documentElement.style.setProperty('--card-hover', '#252525');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.setProperty('--background-primary', '#ffffff');
      document.documentElement.style.setProperty('--background-secondary', '#f5f5f5');
      document.documentElement.style.setProperty('--background-tertiary', '#e5e5e5');
      document.documentElement.style.setProperty('--text-primary', '#000000');
      document.documentElement.style.setProperty('--text-secondary', '#333333');
      document.documentElement.style.setProperty('--text-tertiary', '#666666');
      document.documentElement.style.setProperty('--accent-primary', '#8b5cf6');
      document.documentElement.style.setProperty('--accent-secondary', '#7c3aed');
      document.documentElement.style.setProperty('--border-color', '#d1d5db');
      document.documentElement.style.setProperty('--card-background', '#ffffff');
      document.documentElement.style.setProperty('--card-hover', '#f9fafb');
    }
    
    // Save theme preference
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};