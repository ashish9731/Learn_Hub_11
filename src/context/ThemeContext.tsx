import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Force dark theme only
  const [theme] = useState<Theme>('dark');

  // Update theme in localStorage and apply to document when theme changes
  useEffect(() => {
    localStorage.setItem('theme', 'dark');
    
    // Always apply dark theme to document
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  }, []);


  const toggleTheme = () => {
    // Do nothing - theme is locked to dark
    console.log('Theme is locked to dark mode');
  };

  return (
    <ThemeContext.Provider value={{ theme: 'dark', toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};