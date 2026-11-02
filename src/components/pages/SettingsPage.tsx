/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Server,
  ShieldCheck,
  Cpu,
  Info,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Lock,
  Globe
} from 'lucide-react';
import { HealthResponse } from '../../shared/types.ts';

export const SettingsPage: React.FC = () => {
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState<boolean>(true);
  const [healthError, setHealthError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setIsLoadingHealth(true);
    setHealthError(null);
    try {
      const res = await fetch('/api/health');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to reach health endpoint`);
      }
      const data: HealthResponse = await res.json();
      setHealthData(data);
    } catch (err) {
      setHealthError(err instanceof Error ? err.message : 'Unknown health check error');
    } finally {
      setIsLoadingHealth(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Product Information Card */}
      <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-lime-400/20 p-2 text-lime-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">OAuth Readiness Intelligence</h3>
              <p className="text-xs text-lime-400">"Know the work before you commit to the integration."</p>
            </div>
          </div>
          <span className="rounded bg-slate-800 px-2.5 py-1 text-xs font-mono font-semibold text-slate-300">
            v0.1.0-alpha
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <h4 className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">Product Purpose</h4>
            <p className="mt-1 text-slate-300 leading-relaxed">
              Help developers, technical leaders, and solutions architects evaluate the calendar turnaround, financial outlay, legal compliance hurdles, and internal dependencies required to connect third-party applications before committing engineering resources.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">System Architecture</h4>
            <p className="mt-1 text-slate-300 leading-relaxed">
              Modular Node.js full-stack foundation powered by Express, TypeScript, and Vite. Designed to decouple pure evaluation rules from UI rendering with deterministic governance classification.
            </p>
          </div>
        </div>
      </div>

      {/* Backend & AI Integration Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Backend Node.js Status */}
        <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-lime-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Backend Server Status
              </h3>
            </div>
            <button
              onClick={fetchHealth}
              disabled={isLoadingHealth}
              className="flex items-center gap-1 text-[11px] font-semibold text-lime-400 hover:text-lime-300 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${isLoadingHealth ? 'animate-spin' : ''}`} />
              <span>Ping /api/health</span>
            </button>
          </div>

          {isLoadingHealth ? (
            <div className="flex items-center gap-2 text-xs text-slate-400 py-4">
              <RefreshCw className="h-4 w-4 animate-spin text-lime-400" />
              <span>Checking Node.js health endpoint...</span>
            </div>
          ) : healthError ? (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>Error contacting backend: {healthError}</span>
            </div>
          ) : healthData ? (
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
                <span className="text-slate-400">Endpoint Status:</span>
                <span className="inline-flex items-center gap-1 font-mono font-semibold text-lime-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {healthData.status.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
                <span className="text-slate-400">Service:</span>
                <span className="font-mono text-slate-200">{healthData.service}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
                <span className="text-slate-400">Uptime:</span>
                <span className="font-mono text-slate-200">{healthData.uptimeSeconds} seconds</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
                <span className="text-slate-400">Server Time:</span>
                <span className="font-mono text-[11px] text-slate-400">{healthData.timestamp}</span>
              </div>
            </div>
          ) : null}
        </div>

        {/* AI Integration Status */}
        <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-lime-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Intelligence Engine Status
              </h3>
            </div>
            <span className={`rounded px-2 py-0.5 text-[10px] font-semibold border ${
              healthData?.engineStatus === 'model_reachable'
                ? 'bg-lime-500/10 text-lime-300 border-lime-500/30'
                : healthData?.engineStatus === 'model_unavailable' || healthData?.engineStatus === 'model_configured'
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                : 'bg-sky-500/10 text-sky-300 border-sky-500/30'
            }`}>
              {healthData?.engineStatus === 'model_reachable'
                ? 'Model Reachable'
                : healthData?.modelConfigured
                ? 'Model Configured (Unavailable)'
                : 'Deterministic Only'}
            </span>
          </div>

          <div className="space-y-3 text-xs leading-relaxed text-slate-300">
            <p>
              OAuth Readiness Intelligence operates with <strong>₹0 external dependencies</strong>, providing deterministic regex and structural documentation extraction with optional Gemini 3.8 Flash acceleration.
            </p>
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Live Documentation Retrieval:</span>
                <span className="text-lime-400 font-mono font-medium">Active (SSRF & Pinning Protected)</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Deterministic Extraction Pipeline:</span>
                <span className="text-lime-400 font-mono font-medium">Active (₹0 External Cost)</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Gemini Model Configuration:</span>
                <span className="text-slate-200 font-mono">
                  {healthData?.modelConfigured ? 'Configured (API Key Present)' : 'Not Configured'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Gemini Model Reachability:</span>
                <span className={`font-mono ${healthData?.modelReachable ? 'text-lime-400 font-medium' : healthData?.modelConfigured ? 'text-amber-400' : 'text-slate-400'}`}>
                  {healthData?.modelReachable ? 'Reachable' : healthData?.modelConfigured ? 'Unavailable (Deterministic Fallback)' : 'Offline'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Billing Account Required:</span>
                <span className="text-slate-200 font-mono">None (₹0 Required)</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Live investigations always prioritize verified public documentation excerpts and flag missing information as Unknown.
            </p>
          </div>
        </div>
      </div>

      {/* Data & Privacy Notice */}
      <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Lock className="h-4 w-4 text-lime-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Data, Security & Privacy Statement
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5 space-y-2">
            <h4 className="font-semibold text-slate-200">Zero Credential Storage</h4>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              The platform never collects or stores client secrets, private keys, or refresh tokens. We evaluate public API documentation and governance policies only.
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5 space-y-2">
            <h4 className="font-semibold text-slate-200">Tenant Isolation</h4>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Investigation intakes and assessment notes are isolated per organization. Data is never aggregated into shared training corpora without explicit consent.
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5 space-y-2">
            <h4 className="font-semibold text-slate-200">Deterministic Auditability</h4>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Every assessment claim references the specific section of vendor documentation or RFC specification from which the requirement was derived.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
