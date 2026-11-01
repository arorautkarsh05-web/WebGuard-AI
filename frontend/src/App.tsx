import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { AuthPage } from './pages/AuthPage';
import { OverviewDashboard } from './pages/OverviewDashboard';
import { WebsiteMonitoring } from './pages/WebsiteMonitoring';
import { FunctionalTesting } from './pages/FunctionalTesting';
import { CompetitorIntelligence } from './pages/CompetitorIntelligence';
import { ChangeDetection } from './pages/ChangeDetection';
import { IncidentManagement } from './pages/IncidentManagement';
import { MonitoringHistory } from './pages/MonitoringHistory';
import { SettingsPage } from './pages/SettingsPage';
import { api, setUnauthorizedHandler } from './api/client';
import type {
  DashboardOverview as IDashboardOverview,
  DashboardActivityItem,
  Website,
  Competitor,
  Incident,
  MonitoringTask
} from './types';

export function App() {
  // Authentication State
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('webguard_token'));
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = localStorage.getItem('webguard_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isVerifyingAuth, setIsVerifyingAuth] = useState<boolean>(true);

  // App Navigation & Data State
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isTinyFishConnected, setIsTinyFishConnected] = useState<boolean>(true);

  const [overview, setOverview] = useState<IDashboardOverview | null>(null);
  const [activities, setActivities] = useState<DashboardActivityItem[]>([]);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [tasks, setTasks] = useState<MonitoringTask[]>([]);

  const handleLogout = () => {
    localStorage.removeItem('webguard_token');
    localStorage.removeItem('webguard_user');
    setToken(null);
    setCurrentUser(null);
  };

  useEffect(() => {
    setUnauthorizedHandler(handleLogout);

    const verifyExistingSession = async () => {
      const storedToken = localStorage.getItem('webguard_token');
      if (storedToken) {
        try {
          const res = await api.get('/auth/me');
          setCurrentUser(res.data);
          localStorage.setItem('webguard_user', JSON.stringify(res.data));
        } catch (err) {
          handleLogout();
        }
      }
      setIsVerifyingAuth(false);
    };

    verifyExistingSession();
  }, []);

  const handleAuthSuccess = (newToken: string, user: any) => {
    localStorage.setItem('webguard_token', newToken);
    localStorage.setItem('webguard_user', JSON.stringify(user));
    setToken(newToken);
    setCurrentUser(user);
    fetchAllData();
  };

  const fetchAllData = async () => {
    if (!token) return;
    setIsRefreshing(true);
    try {
      const [ovRes, actRes, webRes, compRes, incRes, taskRes, tfRes] = await Promise.allSettled([
        api.get('/dashboard/overview'),
        api.get('/dashboard/activity'),
        api.get('/websites'),
        api.get('/competitors'),
        api.get('/incidents'),
        api.get('/monitoring/tasks'),
        api.get('/tinyfish/status'),
      ]);

      if (ovRes.status === 'fulfilled') setOverview(ovRes.value.data);
      if (actRes.status === 'fulfilled') setActivities(actRes.value.data);
      if (webRes.status === 'fulfilled') setWebsites(webRes.value.data);
      if (compRes.status === 'fulfilled') setCompetitors(compRes.value.data);
      if (incRes.status === 'fulfilled') setIncidents(incRes.value.data);
      if (taskRes.status === 'fulfilled') setTasks(taskRes.value.data);
      if (tfRes.status === 'fulfilled') {
        setIsTinyFishConnected(tfRes.value.data?.status === 'connected' || tfRes.value.data?.configured);
      }
    } catch (err) {
      console.error('Failed to load application data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAllData();
      const interval = setInterval(fetchAllData, 30000);
      return () => clearInterval(interval);
    }
  }, [token]);

  // Loading state during initial token verification
  if (isVerifyingAuth) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#8B5CF6] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If not authenticated, render the dedicated brand login/registration interface
  if (!token || !currentUser) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  const getPageInfo = () => {
    switch (currentTab) {
      case 'dashboard':
        return {
          title: 'Executive Monitoring Dashboard',
          subtitle: 'High-level fleet uptime metrics, active alerts, and real-time telemetry',
        };
      case 'websites':
        return {
          title: 'Website Health & Availability Fleet',
          subtitle: 'Autonomous HTTP availability checks, latency benchmarking, and redirect audits',
        };
      case 'testing':
        return {
          title: 'Autonomous Functional Testing Agent',
          subtitle: 'Execute goal-based browser automation funnels powered by TinyFish Agent API',
        };
      case 'competitors':
        return {
          title: 'Competitor Intelligence & Price Surveillance',
          subtitle: 'Monitor competitor pricing structures, discounts, and market positioning',
        };
      case 'changes':
        return {
          title: 'Website Change Detection & Diff Viewer',
          subtitle: 'Snapshot web surfaces with TinyFish Fetch and evaluate structural changes',
        };
      case 'incidents':
        return {
          title: 'AI Incident Intelligence & Remediation',
          subtitle: 'Diagnose anomalies, classify severity, and review recommended action plans',
        };
      case 'history':
        return {
          title: 'Audit Logs & API Executions',
          subtitle: 'Chronological telemetry audit trail of background tasks and TinyFish API calls',
        };
      case 'settings':
        return {
          title: 'Settings & Security Configurations',
          subtitle: 'Manage TinyFish credentials, endpoint statuses, and SSRF guardrails',
        };
      default:
        return {
          title: 'WebGuard AI',
          subtitle: 'Intelligent Website Monitoring & Competitive Intelligence',
        };
    }
  };

  const pageInfo = getPageInfo();

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white flex select-none">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isTinyFishConnected={isTinyFishConnected}
        onLogout={handleLogout}
        user={currentUser}
      />

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <Header
          title={pageInfo.title}
          subtitle={pageInfo.subtitle}
          onRefresh={fetchAllData}
          isRefreshing={isRefreshing}
          onQuickAction={() => {
            if (currentTab !== 'websites') setCurrentTab('websites');
          }}
          quickActionLabel={currentTab === 'dashboard' ? 'Add Target' : undefined}
          user={currentUser}
          onLogout={handleLogout}
        />

        <main className="flex-1 p-8 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <OverviewDashboard
              overview={overview}
              activities={activities}
              websites={websites}
              incidents={incidents}
              onNavigate={(tab) => setCurrentTab(tab)}
            />
          )}

          {currentTab === 'websites' && (
            <WebsiteMonitoring
              websites={websites}
              onRefresh={fetchAllData}
            />
          )}

          {currentTab === 'testing' && <FunctionalTesting />}

          {currentTab === 'competitors' && (
            <CompetitorIntelligence
              competitors={competitors}
              onRefresh={fetchAllData}
            />
          )}

          {currentTab === 'changes' && (
            <ChangeDetection
              tasks={tasks}
              onRefresh={fetchAllData}
            />
          )}

          {currentTab === 'incidents' && (
            <IncidentManagement
              incidents={incidents}
              onRefresh={fetchAllData}
            />
          )}

          {currentTab === 'history' && <MonitoringHistory />}

          {currentTab === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}

export default App;
