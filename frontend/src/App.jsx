import React, { useState, useEffect } from 'react';
import { SettingsProvider } from './context/SettingsContext';
import { useSettings } from './context/SettingsContext';
import Header from './components/Header';
import Sidebar, { BottomTabBar } from './components/Sidebar';
import Home from './pages/Home';
import { useStudyHistory } from './hooks/useStudyHistory';
import { checkHealth } from './services/api';
import { isDemoMode } from './services/demoData';

function AppContent() {
  const { t } = useSettings();
  const { seedDemoData } = useStudyHistory();
  const [activeTool, setActiveTool] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [health, setHealth] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(true);

  const fetchHealth = async () => {
    setLoadingHealth(true);
    try {
      const data = await checkHealth();
      setHealth(data);
    } catch (err) {
      setHealth({
        status: 'offline',
        ai_configured: false,
        model: 'unavailable',
        version: '1.0.0',
      });
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  useEffect(() => {
    if (isDemoMode(window.location.search)) {
      seedDemoData();
    }
  }, [seedDemoData]);

  return (
    <div className="min-h-screen bg-[#FAFAF7] dark:bg-[#0F1117] text-[#1B1B1F] dark:text-[#ECEDF2] transition-colors flex flex-col">
      {/* Top Header */}
      <Header
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        health={health}
        loadingHealth={loadingHealth}
        onRefreshHealth={fetchHealth}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Left Sidebar */}
        <Sidebar
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        {/* Main Content Area */}
        <main className="flex-1 lg:pl-60 min-w-0 pb-20 sm:pb-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <Home
              activeTool={activeTool}
              setActiveTool={setActiveTool}
              health={health}
              loadingHealth={loadingHealth}
              onRefreshHealth={fetchHealth}
            />

            {/* Footer */}
            <footer className="mt-12 pt-6 border-t border-[#E5E3DA] dark:border-[#2C3140] text-center text-xs text-gray-400 dark:text-gray-500">
              {t('safetyFooter')}
            </footer>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <BottomTabBar activeTool={activeTool} onSelectTool={setActiveTool} />
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
}
