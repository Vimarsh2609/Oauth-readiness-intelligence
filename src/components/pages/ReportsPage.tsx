/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Share2,
  Lock,
  FileText,
  Shield,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Printer
} from 'lucide-react';
import { NavigationPage } from '../../shared/types.ts';

interface ReportsPageProps {
  onNavigate: (page: NavigationPage) => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-6 pb-12">
      {/* Notice: No fake public URLs */}
      <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 shadow-sm space-y-3">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-lime-400 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Public Read-Only Reports Architecture
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-lime-300">Enterprise Integrity Policy:</strong> No simulated or fake public URLs are generated. In production, shared reports generate cryptographically signed, immutable snapshot links designed for Architecture Review Boards (ARB), Security & InfoSec audits, and executive stakeholders.
            </p>
          </div>
        </div>
      </div>

      {/* Three Pillars of Shared Reports */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-lime-400/10 p-2 text-lime-400">
              <Lock className="h-4 w-4" />
            </div>
            <h4 className="text-sm font-bold text-white">Immutable Snapshots</h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            When a readiness assessment report is published, a point-in-time cryptographic digest is created. Revisions to internal notes do not alter the published compliance artifact without issuing a new report version.
          </p>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800">
            Prevents scope drift during vendor procurement cycles.
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-sky-400/10 p-2 text-sky-400">
              <Shield className="h-4 w-4" />
            </div>
            <h4 className="text-sm font-bold text-white">Data Sanitization</h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Internal comments, draft tickets, and sensitive network topology notes are automatically scrubbed from public exports. Only official evidence links, identified approval gates, and architectural requirements are included.
          </p>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800">
            Safe for external partners and security auditors.
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-amber-400/10 p-2 text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
            <h4 className="text-sm font-bold text-white">Time-To-Live & Revocation</h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Owners can set expiration policies (e.g. 7 days, 30 days, or on-demand instant revocation) for external share tokens. Access logs track when the report was opened by prospective clients or auditors.
          </p>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800">
            Enforces strict data retention hygiene.
          </div>
        </div>
      </div>

      {/* Visual Report Wireframe / Spec Preview */}
      <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-lime-400">
              Deliverable Preview
            </span>
            <h3 className="text-base font-bold text-white mt-0.5">
              Example Shared Report Artifact Layout
            </h3>
          </div>
          <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400">
            Read-Only Public Spec
          </span>
        </div>

        <div className="rounded-xl border border-slate-700/80 bg-slate-900/60 p-6 space-y-4 max-w-2xl mx-auto shadow-inner">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <div className="text-xs font-mono text-lime-400 uppercase">Architecture Review Board Packet</div>
              <div className="text-base font-bold text-white mt-1">Integration Readiness Audit: Gmail API (Restricted Scopes)</div>
            </div>
            <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-medium text-amber-300">
              Sample Report Artifact
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded bg-slate-950/60 p-2.5">
              <span className="text-slate-400 block text-[10px]">Estimated Waiting Delay</span>
              <span className="font-bold text-amber-300">2-6 Weeks (Scope-dependent security assessment)</span>
            </div>
            <div className="rounded bg-slate-950/60 p-2.5">
              <span className="text-slate-400 block text-[10px]">Potential Provider / Infrastructure Cost</span>
              <span className="font-bold text-white">$15k - $75k annual lab certification</span>
            </div>
          </div>

          <div className="space-y-1.5 text-xs">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              Mandatory Governance Gates
            </span>
            <div className="rounded bg-slate-950/60 p-2 text-slate-300 text-[11px] space-y-1">
              <div>✓ Google OAuth Consent Screen Brand Approval</div>
              <div>✓ CASA Authorized Laboratory Code & Cloud Assessment</div>
              <div>✓ YouTube Verification Walkthrough Submission</div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80">
            <span>Watermark: Read-Only Internal ARB Review</span>
            <span>Cryptographic Digest: sha256:7f4c...09e1</span>
          </div>
        </div>

        <div className="text-center pt-2">
          <button
            onClick={() => onNavigate('discovery')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
          >
            <span>Select an App to Prepare for Review</span>
            <span>&rarr;</span>
          </button>
        </div>
      </div>
    </div>
  );
};
