/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Menu,
  Search,
  Bell,
  SlidersHorizontal,
  ChevronRight,
  Shield,
  Info,
  CheckCircle2,
  X
} from 'lucide-react';
import { NavigationPage } from '../../shared/types.ts';

interface HeaderProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  onToggleSidebar: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onNavigate,
  onToggleSidebar,
  searchQuery,
  onSearchChange,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);

  const pageTitles: Record<NavigationPage, { title: string; subtitle: string; category: string }> = {
    overview: {
      title: 'OAuth Readiness Overview',
      subtitle: 'Know the work before you commit to the integration.',
      category: 'Intelligence'
    },
    discovery: {
      title: 'App Discovery Catalog',
      subtitle: 'Examine authentication methods, verification tiers, and approval requirements.',
      category: 'Catalog'
    },
    investigations: {
      title: 'Investigation Workspace',
      subtitle: 'Stage and evaluate OAuth 2.0 integration targets before code commitment.',
      category: 'Analysis'
    },
    readiness: {
      title: 'Readiness Assessment Dimensions',
      subtitle: 'Six critical dimensions evaluated across technical, temporal, and governance criteria.',
      category: 'Evaluation'
    },
    planner: {
      title: 'Action Planner',
      subtitle: 'Segregated workstreams: agent-prepared vs human-required vs blocked verification.',
      category: 'Execution'
    },
    guides: {
      title: 'Integration Guide Library',
      subtitle: 'Verified architectural patterns, PKCE implementation notes, and security audit checklists.',
      category: 'Documentation'
    },
    reports: {
      title: 'Shared Reports Architecture',
      subtitle: 'Audit-ready compliance artifacts and cross-functional review deliverables.',
      category: 'Compliance'
    },
    settings: {
      title: 'Platform Settings & Backend Status',
      subtitle: 'System configuration, data privacy statements, and Node.js server health.',
      category: 'System'
    }
  };

  const meta = pageTitles[currentPage];

  return (
    <header className="sticky top-0 z-30 flex flex-col border-b border-slate-800 bg-[#0B1120]/95 backdrop-blur-md">
      {/* Top Header Bar */}
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Toggle Navigation Sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <span className="font-medium text-slate-400">Platform</span>
            <ChevronRight className="h-3 w-3 text-slate-400" />
            <span className="font-medium text-slate-400">{meta.category}</span>
            <ChevronRight className="h-3 w-3 text-slate-400" />
            <span className="font-semibold text-slate-200">{meta.title}</span>
          </nav>
        </div>

        {/* Global Search and Action Controls */}
        <div className="flex items-center gap-3">
          <div className="relative w-48 sm:w-72 lg:w-96">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                if (currentPage !== 'discovery' && currentPage !== 'guides' && currentPage !== 'planner') {
                  onNavigate('discovery');
                }
              }}
              placeholder="Search providers, scopes, guides..."
              className="h-9 w-full rounded-lg border border-slate-800 bg-slate-900/90 pl-9 pr-8 text-xs text-slate-100 placeholder:text-slate-400 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Notification Placeholder Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              aria-label="System Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-lime-400 ring-2 ring-slate-950" />
            </button>

            {/* Notifications Dropdown Panel */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-700 bg-[#0F172A] p-4 shadow-xl z-50">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-lime-400" />
                    <span className="text-xs font-semibold text-white">System Notifications</span>
                  </div>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-3 space-y-2 text-xs">
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-slate-200">Demonstration Mode Active</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Autonomous intelligence scraper pipeline is pending connection. All provider records are demonstration models.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-lime-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-slate-200">Backend Online</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Node.js server-side backend verified on GET /api/health.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Settings Icon */}
          <button
            onClick={() => onNavigate('settings')}
            className="hidden sm:flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            title="System Settings"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Page Title Banner */}
      <div className="border-t border-slate-800/60 bg-gradient-to-r from-slate-950 via-[#0B1120] to-slate-950 px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              {meta.title}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {meta.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-slate-800/70 px-2.5 py-1 text-[11px] font-medium text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-lime-400"></span>
              B2B Developer Standard
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
