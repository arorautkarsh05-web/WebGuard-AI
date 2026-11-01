import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { OverviewDashboard } from './pages/OverviewDashboard';
import { WebsiteMonitoring } from './pages/WebsiteMonitoring';
import { FunctionalTesting } from './pages/FunctionalTesting';
import { CompetitorIntelligence } from './pages/CompetitorIntelligence';
import { ChangeDetection } from './pages/ChangeDetection';
import { IncidentManagement } from './pages/IncidentManagement';
import { MonitoringHistory } from './pages/MonitoringHistory';
import { SettingsPage } from './pages/SettingsPage';
import { api } from './api/client';
import {
  DashboardOverview as IDashboardOverview,
  DashboardActivityItem,
  Website,
  Competitor,
  Incident,
  MonitoringTask
} from './types';

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isTinyFishConnected, setIsTinyFishConnected] = useState<boolean>(true);

  // Application Data States
  const [overview, setOverview] = useState<IDashboardOverview | null>(null);
  const [activities, setActivities] = useState<DashboardActivityItem[]>([]);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [tasks, setTasks] = useState<MonitoringTask[]>([]);

  const fetchAllData = async () => {
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
    fetchAllData();
    // Poll every 30 seconds for live updates
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getPageInfo = () => {
    switch (currentTab) {
      case 'dashboard':
        return {
          title: 'Executive Monitoring Dashboard',
          subtitle: 'High-level uptime metrics, fleet status, and active incidents',
        };
      case 'websites':
        return {
          title: 'Website Health & Availability Fleet',
          subtitle: 'Continuous HTTP health checks, latency tracking, and redirect validation',
        };
      case 'testing':
        return {
          title: 'Autonomous Functional Testing Agent',
          subtitle: 'Execute goal-based browser automation funnels powered by TinyFish Agent',
        };
      case 'competitors':
        return {
          title: 'Competitor Intelligence & Price Surveillance',
          subtitle: 'Track competitor pricing changes, discounts, and market positioning',
        };
      case 'changes':
        return {
          title: 'Website Change Detection & Diff Viewer',
          subtitle: 'Extract page snapshots with TinyFish Fetch and detect content adjustments',
        };
      case 'incidents':
        return {
          title: 'AI Incident Intelligence & Remediation',
          subtitle: 'Diagnose outages, classify severity, and review recommended action plans',
        };
      case 'history':
        return {
          title: 'Audit Logs & API Executions',
          subtitle: 'Comprehensive audit trail of background tasks and TinyFish API calls',
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isTinyFishConnected={isTinyFishConnected}
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
          quickActionLabel={currentTab === 'dashboard' ? 'Add Website' : undefined}
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
