import React, { createContext, useContext, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

const SETTINGS_STORAGE_KEY = 'studyspark:settings:v1';

const defaultSettings = {
  theme: 'system', // 'light' | 'dark' | 'system'
  language: 'en',  // 'en' | 'hi'
};

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useLocalStorage(SETTINGS_STORAGE_KEY, defaultSettings);

  // Sync theme with document element
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const isDark =
        settings.theme === 'dark' ||
        (settings.theme === 'system' && mediaQuery.matches);

      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();

    // Listen for OS theme changes when theme is set to 'system'
    const handleChange = () => {
      if (settings.theme === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [settings.theme]);

  // Sync language attribute on document element
  useEffect(() => {
    document.documentElement.lang = settings.language;
  }, [settings.language]);

  const setTheme = (theme) => {
    setSettings((prev) => ({ ...prev, theme }));
  };

  const setLanguage = (language) => {
    setSettings((prev) => ({ ...prev, language }));
  };

  const toggleLanguage = () => {
    setLanguage(settings.language === 'en' ? 'hi' : 'en');
  };

  const toggleTheme = () => {
    const isDark =
      settings.theme === 'dark' ||
      (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <SettingsContext.Provider
      value={{
        theme: settings.theme,
        language: settings.language,
        setTheme,
        setLanguage,
        toggleTheme,
        toggleLanguage,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
