/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LayoutDashboard,
  Compass,
  SearchCode,
  Gauge,
  ListTodo,
  BookOpen,
  Share2,
  Settings,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Cpu
} from 'lucide-react';
import { NavigationPage } from '../../shared/types.ts';

interface SidebarProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  isOpen: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  isOpen,
  onCloseMobile
}) => {
  const navItems: { id: NavigationPage; label: string; icon: React.FC<{ className?: string }>; badge?: string }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'discovery', label: 'App Discovery', icon: Compass, badge: '4' },
    { id: 'investigations', label: 'Investigations', icon: SearchCode, badge: '2' },
    { id: 'readiness', label: 'Readiness Assessment', icon: Gauge },
    { id: 'planner', label: 'Action Planner', icon: ListTodo, badge: '7' },
    { id: 'guides', label: 'Integration Guides', icon: BookOpen, badge: '4' },
    { id: 'reports', label: 'Shared Reports', icon: Share2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (page: NavigationPage) => {
    onNavigate(page);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800 bg-[#070B14] transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-18 items-center gap-3 border-b border-slate-800/80 px-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-lime-400 to-lime-600 text-slate-950 font-bold shadow-md shadow-lime-500/10">
            <ShieldCheck className="h-6 w-6 stroke-[2.2]" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="truncate text-sm font-bold tracking-tight text-white uppercase">
              OAuth Readiness
            </span>
            <span className="truncate text-[11px] font-medium tracking-wide text-lime-400/90">
              INTELLIGENCE PLATFORM
            </span>
          </div>
        </div>

        {/* Engine status indicator pill */}
        <div className="mx-4 mt-3 rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
              </span>
              <span className="text-[11px] font-medium text-slate-300">Analysis Engine</span>
            </div>
            <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
              Standby
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-tight text-slate-400">
            Engine disconnected. Showing sample records, clearly distinguished from verified provider evidence.
          </p>
        </div>

        {/* Main Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Navigation
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-slate-800/90 text-white shadow-sm ring-1 ring-slate-700/60'
                      : 'text-slate-300 hover:bg-slate-800/40 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`h-4 w-4 transition-colors ${
                        isActive
                          ? 'text-lime-400'
                          : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {item.badge && (
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          isActive
                            ? 'bg-lime-400/20 text-lime-300'
                            : 'bg-slate-800 text-slate-300 group-hover:bg-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isActive && <ChevronRight className="h-3.5 w-3.5 text-lime-400" />}
                  </div>
                </button>
              );
            })}
          </nav>

          <div className="mt-6 mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Governance & Scope
          </div>
          <div className="space-y-1 px-1">
            <div className="rounded-lg border border-slate-800/80 bg-slate-900/30 p-3 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                <Cpu className="h-3.5 w-3.5 text-lime-400" />
                <span>Zero Secret Guarantee</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                This platform analyzes public documentation and compliance requirements only. Client secrets and tokens are never requested or stored.
              </p>
            </div>
          </div>
        </div>

        {/* Footer info & Workspace selector */}
        <div className="border-t border-slate-800/80 bg-slate-950/40 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-200 ring-1 ring-slate-700">
                DP
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-200">Engineering Team</span>
                <span className="text-[10px] text-slate-400">Platform Architect</span>
              </div>
            </div>
            <button
              onClick={() => handleNavClick('settings')}
              title="Workspace Settings"
              className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
