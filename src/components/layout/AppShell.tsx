/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar.tsx';
import { Header } from './Header.tsx';
import { OverviewPage } from '../pages/OverviewPage.tsx';
import { DiscoveryPage } from '../pages/DiscoveryPage.tsx';
import { InvestigationsPage } from '../pages/InvestigationsPage.tsx';
import { ReadinessPage } from '../pages/ReadinessPage.tsx';
import { PlannerPage } from '../pages/PlannerPage.tsx';
import { GuidesPage } from '../pages/GuidesPage.tsx';
import { ReportsPage } from '../pages/ReportsPage.tsx';
import { SettingsPage } from '../pages/SettingsPage.tsx';

import {
  NavigationPage,
  ProviderRecord,
  ReadinessDimension,
  PlannerTask,
  IntegrationGuide,
  InvestigationDraft
} from '../../shared/types.ts';

import {
  DEMO_PROVIDERS,
  READINESS_DIMENSIONS,
  DEMO_TASKS,
  DEMO_GUIDES,
  DEMO_INVESTIGATION_HISTORY
} from '../../server/data/mockData.ts';

export const AppShell: React.FC = () => {
  // Parse initial shareable URL parameters (?plan=<planId> or ?guide=<guideId>)
  const [sharedPlanId, setSharedPlanId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        return params.get('plan') || params.get('guide') || null;
      } catch {
        return null;
      }
    }
    return null;
  });

  const [isSharedReadOnly, setIsSharedReadOnly] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        return Boolean(params.get('plan') || params.get('guide'));
      } catch {
        return false;
      }
    }
    return false;
  });

  const [currentPage, setCurrentPage] = useState<NavigationPage>(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.get('plan') || params.get('guide')) {
          return 'planner';
        }
      } catch {
        // Fall back to overview
      }
    }
    return 'overview';
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  // Application Data States (seeded deterministically, refreshed from backend API)
  const [providers, setProviders] = useState<ProviderRecord[]>(DEMO_PROVIDERS);
  const [dimensions, setDimensions] = useState<ReadinessDimension[]>(READINESS_DIMENSIONS);
  const [tasks, setTasks] = useState<PlannerTask[]>(DEMO_TASKS);
  const [guides, setGuides] = useState<IntegrationGuide[]>(DEMO_GUIDES);
  const [investigations, setInvestigations] = useState<InvestigationDraft[]>(DEMO_INVESTIGATION_HISTORY);
  const [activeInvestigationId, setActiveInvestigationId] = useState<string>('inv_discord_demo');

  const handleExitSharedView = () => {
    setIsSharedReadOnly(false);
    setSharedPlanId(null);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', window.location.pathname);
    }
  };

  const handlePageNavigation = (page: NavigationPage) => {
    if (isSharedReadOnly) {
      handleExitSharedView();
    }
    setCurrentPage(page);
  };

  // Sync with backend API on mount
  useEffect(() => {
    async function loadBackendData() {
      try {
        const [resProviders, resDim, resTasks, resGuides, resInv] = await Promise.all([
          fetch('/api/providers').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/dimensions').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/tasks').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/guides').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/investigations').then((r) => (r.ok ? r.json() : null)),
        ]);

        if (resProviders?.data) setProviders(resProviders.data);
        if (resDim?.data) setDimensions(resDim.data);
        if (resTasks?.data) setTasks(resTasks.data);
        if (resGuides?.data) setGuides(resGuides.data);
        if (resInv?.data) setInvestigations(resInv.data);
      } catch (err) {
        // Deterministic fallback already set in state
        console.warn('[AppShell] Using seeded data fallback:', err);
      }
    }

    loadBackendData();
  }, []);

  const handleAddInvestigation = (newDraft: InvestigationDraft) => {
    setInvestigations((prev) => [newDraft, ...prev]);
    setActiveInvestigationId(newDraft.id);
  };

  const handleNavigateToPlanner = (investigationId?: string) => {
    if (investigationId) {
      setActiveInvestigationId(investigationId);
    }
    handlePageNavigation('planner');
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'overview':
        return (
          <OverviewPage
            onNavigate={handlePageNavigation}
            providers={providers}
            investigations={investigations}
            dimensions={dimensions}
            guides={guides}
          />
        );
      case 'discovery':
        return (
          <DiscoveryPage
            providers={providers}
            onNavigate={handlePageNavigation}
            externalSearchQuery={globalSearch}
          />
        );
      case 'investigations':
        return (
          <InvestigationsPage
            investigations={investigations}
            onAddInvestigation={handleAddInvestigation}
            onNavigate={handlePageNavigation}
            onNavigateToPlanner={handleNavigateToPlanner}
          />
        );
      case 'readiness':
        return (
          <ReadinessPage
            dimensions={dimensions}
            providers={providers}
            onNavigate={handlePageNavigation}
          />
        );
      case 'planner':
        return (
          <PlannerPage
            initialTasks={tasks}
            investigations={investigations}
            activeInvestigationId={activeInvestigationId}
            sharedPlanId={sharedPlanId}
            isSharedReadOnly={isSharedReadOnly}
            onNavigate={handlePageNavigation}
            onExitSharedView={handleExitSharedView}
          />
        );
      case 'guides':
        return (
          <GuidesPage
            guides={guides}
            onNavigate={handlePageNavigation}
          />
        );
      case 'reports':
        return <ReportsPage onNavigate={setCurrentPage} />;
      case 'settings':
        return <SettingsPage />;
      default:
        return (
          <OverviewPage
            onNavigate={setCurrentPage}
            providers={providers}
            investigations={investigations}
            dimensions={dimensions}
            guides={guides}
          />
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-[#070B14] text-slate-100">
      {/* Persistent Left Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        isOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 bg-[#0B1120]">
        <Header
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          searchQuery={globalSearch}
          onSearchChange={setGlobalSearch}
        />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto">
          {renderCurrentPage()}
        </main>
      </div>
    </div>
  );
};
