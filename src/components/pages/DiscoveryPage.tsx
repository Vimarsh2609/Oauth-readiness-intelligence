/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Layers,
  ChevronRight,
  Info,
  X,
  FileText,
  AlertCircle,
  Lock,
  ArrowUpRight,
  Zap,
  CheckCircle2,
  GitCompare,
  Key,
  Shield,
  FolderLock,
  RefreshCw,
  SlidersHorizontal,
  RotateCcw,
  Scale,
  Eye,
  CheckSquare,
  Square,
  HelpCircle
} from 'lucide-react';
import {
  ProviderRecord,
  ProviderCategory,
  AuthMethod,
  EvidenceStatus,
  NavigationPage,
  AuthFilterOption,
  ComplexityFilterOption,
  EvidenceFilterOption,
  DependencyRiskFilterOption
} from '../../shared/types.ts';
import {
  filterProviders,
  compareProviders,
  formatFieldOrFallback,
  getProviderEvidenceSummary
} from '../../utils/readiness.ts';

interface DiscoveryPageProps {
  providers: ProviderRecord[];
  onNavigate: (page: NavigationPage) => void;
  externalSearchQuery?: string;
}

export const DiscoveryPage: React.FC<DiscoveryPageProps> = ({
  providers,
  onNavigate,
  externalSearchQuery = '',
}) => {
  const [search, setSearch] = useState(externalSearchQuery);
  const [selectedCategory, setSelectedCategory] = useState<ProviderCategory | 'all'>('all');
  const [selectedAuth, setSelectedAuth] = useState<AuthFilterOption>('all');
  const [selectedComplexity, setSelectedComplexity] = useState<ComplexityFilterOption>('all');
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceFilterOption>('all');
  const [selectedDependencyRisk, setSelectedDependencyRisk] = useState<DependencyRiskFilterOption>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  
  // Active Inspector Modal State
  const [activeProvider, setActiveProvider] = useState<ProviderRecord | null>(null);
  const [activeTabSection, setActiveTabSection] = useState<'all' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'>('all');

  // Comparison State (up to 2 selected provider IDs)
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);

  // Active provider evidence summary
  const activeEvidenceSummary = useMemo(
    () => (activeProvider ? getProviderEvidenceSummary(activeProvider) : null),
    [activeProvider]
  );

  const categories: (ProviderCategory | 'all')[] = [
    'all',
    'Developer Tools',
    'Productivity & Knowledge',
    'Communication & Mail',
    'Enterprise ITSM'
  ];

  const authOptions: { label: string; value: AuthFilterOption }[] = [
    { label: 'All Protocols', value: 'all' },
    { label: 'OAuth 2.0 (Any)', value: 'OAuth 2.0' },
    { label: 'OAuth 2.0 PKCE', value: 'OAuth 2.0 PKCE' },
    { label: 'API Token', value: 'API token' },
    { label: 'Instance-configured', value: 'Instance-configured' }
  ];

  const complexityOptions: { label: string; value: ComplexityFilterOption }[] = [
    { label: 'All Complexities', value: 'all' },
    { label: 'Low Complexity', value: 'Low' },
    { label: 'Moderate Complexity', value: 'Moderate' },
    { label: 'High Complexity', value: 'High' },
    { label: 'Extreme Complexity', value: 'Extreme' }
  ];

  const evidenceOptions: { label: string; value: EvidenceFilterOption }[] = [
    { label: 'All Evidence Tiers', value: 'all' },
    { label: 'Officially Verified', value: 'Officially verified' },
    { label: 'Independently Corroborated', value: 'Independently corroborated' },
    { label: 'Estimated', value: 'Estimated' },
    { label: 'Hypothesis', value: 'Hypothesis' },
    { label: 'Unknown / Insufficient', value: 'Unknown' },
    { label: 'Sample Record Only', value: 'Sample record' }
  ];

  const riskOptions: { label: string; value: DependencyRiskFilterOption }[] = [
    { label: 'All Dependency Risks', value: 'all' },
    { label: 'Low Dependency Risk', value: 'Low' },
    { label: 'Medium Dependency Risk', value: 'Medium' },
    { label: 'High Dependency Risk', value: 'High' },
    { label: 'Critical Dependency Risk', value: 'Critical' }
  ];

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'all') count++;
    if (selectedAuth !== 'all') count++;
    if (selectedComplexity !== 'all') count++;
    if (selectedEvidence !== 'all') count++;
    if (selectedDependencyRisk !== 'all') count++;
    return count;
  }, [selectedCategory, selectedAuth, selectedComplexity, selectedEvidence, selectedDependencyRisk]);

  const resetAllFilters = () => {
    setSearch('');
    setSelectedCategory('all');
    setSelectedAuth('all');
    setSelectedComplexity('all');
    setSelectedEvidence('all');
    setSelectedDependencyRisk('all');
  };

  // Filtered providers
  const filteredProviders = useMemo(() => {
    return filterProviders(providers, {
      query: search,
      category: selectedCategory,
      authMethod: selectedAuth,
      complexity: selectedComplexity,
      evidenceStatus: selectedEvidence,
      dependencyRisk: selectedDependencyRisk
    });
  }, [
    providers,
    search,
    selectedCategory,
    selectedAuth,
    selectedComplexity,
    selectedEvidence,
    selectedDependencyRisk
  ]);

  // Handle comparison selection
  const toggleComparisonSelection = (id: string) => {
    setSelectedForComparison((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 2) {
        // Replace second provider with newly clicked one
        return [prev[0], id];
      }
      return [...prev, id];
    });
  };

  // Comparison report calculation
  const comparisonReport = useMemo(() => {
    if (selectedForComparison.length === 2) {
      const pA = providers.find((p) => p.id === selectedForComparison[0]);
      const pB = providers.find((p) => p.id === selectedForComparison[1]);
      if (pA && pB) {
        return compareProviders(pA, pB);
      }
    }
    return null;
  }, [providers, selectedForComparison]);

  return (
    <div className="space-y-6 pb-16">
      {/* Sample demonstration banner */}
      <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#0F172A] px-4 py-3 text-xs text-slate-300">
        <div className="flex items-center gap-2.5">
          <Info className="h-4 w-4 shrink-0 text-lime-400" />
          <span>
            <strong className="text-white font-semibold">Integration Discovery Catalog (4 Demo Providers):</strong> Linear, Notion, Gmail, and ServiceNow. All records represent initial baseline specifications and are marked as sample demonstration records, clearly distinguished from independently verified provider evidence.
          </span>
        </div>
        <span className="shrink-0 rounded bg-lime-400/10 px-2 py-0.5 text-[10px] font-mono text-lime-400 font-semibold border border-lime-400/20">
          Sample Records
        </span>
      </div>

      {/* Comparison Floating Action Bar (when 1 or 2 providers selected) */}
      {selectedForComparison.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-lime-500/30 bg-slate-900/95 p-3.5 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-lime-300">
              <GitCompare className="h-4 w-4" />
              <span>Side-by-Side Comparison ({selectedForComparison.length}/2 selected):</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {selectedForComparison.map((id) => {
                const prov = providers.find((p) => p.id === id);
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1 text-xs font-medium text-white border border-slate-700"
                  >
                    <span>{prov?.name || id}</span>
                    <button
                      onClick={() => toggleComparisonSelection(id)}
                      className="text-slate-400 hover:text-white"
                      title="Remove from comparison"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
              {selectedForComparison.length === 1 && (
                <span className="text-xs text-slate-400 italic">
                  Select 1 more provider to compare
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedForComparison([])}
              className="rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              Clear Selection
            </button>
            <button
              data-testid="launch-comparison-btn"
              disabled={selectedForComparison.length < 2}
              onClick={() => setIsComparisonModalOpen(true)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                selectedForComparison.length === 2
                  ? 'bg-lime-400 text-slate-950 hover:bg-lime-300 shadow-sm'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <Scale className="h-3.5 w-3.5" />
              <span>Launch Comparison Matrix</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Controls Bar */}
      <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Field */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by provider name, category, auth method, description, or scope names..."
              className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900 pl-9 pr-8 text-xs text-slate-100 placeholder:text-slate-400 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* View mode toggle & Action */}
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-0.5 text-xs">
              <button
                onClick={() => setViewMode('cards')}
                className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Cards View
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Data Table
              </button>
            </div>

            <button
              onClick={() => onNavigate('investigations')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-lime-400 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-lime-300 transition-colors"
            >
              <span>+ Stage Intake</span>
            </button>
          </div>
        </div>

        {/* Multi-Dimensional Filter Selectors */}
        <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <SlidersHorizontal className="h-3.5 w-3.5 text-lime-400" />
              <span>Multi-Dimensional Filters</span>
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-lime-400/20 px-2 py-0.2 text-[10px] font-mono text-lime-300 font-bold border border-lime-400/30">
                  {activeFilterCount} active
                </span>
              )}
            </div>

            {(search || activeFilterCount > 0) && (
              <button
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-lime-400 hover:text-lime-300 hover:underline"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Clear All Filters</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs">
            {/* Authentication Filter */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                Authentication
              </label>
              <select
                value={selectedAuth}
                onChange={(e) => setSelectedAuth(e.target.value as AuthFilterOption)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 focus:border-lime-500 focus:outline-none"
              >
                {authOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Complexity Filter */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                Complexity
              </label>
              <select
                value={selectedComplexity}
                onChange={(e) => setSelectedComplexity(e.target.value as ComplexityFilterOption)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 focus:border-lime-500 focus:outline-none"
              >
                {complexityOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Evidence Status Filter */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                Evidence Status
              </label>
              <select
                value={selectedEvidence}
                onChange={(e) => setSelectedEvidence(e.target.value as EvidenceFilterOption)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 focus:border-lime-500 focus:outline-none"
              >
                {evidenceOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Dependency Risk Filter */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                Dependency Risk
              </label>
              <select
                value={selectedDependencyRisk}
                onChange={(e) => setSelectedDependencyRisk(e.target.value as DependencyRiskFilterOption)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 focus:border-lime-500 focus:outline-none"
              >
                {riskOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as ProviderCategory | 'all')}
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 focus:border-lime-500 focus:outline-none"
              >
                <option value="all">All Categories</option>
                {categories.filter((c) => c !== 'all').map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>
          Showing <strong className="text-white font-mono">{filteredProviders.length}</strong> of{' '}
          <strong className="text-white font-mono">{providers.length}</strong> providers
        </span>
        <span className="text-[11px] text-slate-400 hidden sm:inline">
          Click any card to inspect all 7 readiness sections &bull; Checkbox to compare side-by-side
        </span>
      </div>

      {/* Empty State when no providers match */}
      {filteredProviders.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-[#0F172A] p-12 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800/80 text-slate-400">
            <Search className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No integration providers match your criteria</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              We couldn't find any provider matching your active search terms and multi-dimensional filters.
            </p>
          </div>
          <button
            onClick={resetAllFilters}
            className="inline-flex items-center gap-1.5 rounded-lg bg-lime-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-lime-300"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset All Filters</span>
          </button>
        </div>
      )}

      {/* Render Providers View: Cards */}
      {viewMode === 'cards' && filteredProviders.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredProviders.map((provider) => {
            const isSelectedForComp = selectedForComparison.includes(provider.id);
            const verifiedClaimsCount = provider.claims?.filter(
              (c) => c.evidenceStatus === 'official_verified' || c.evidenceStatus === 'independently_corroborated'
            ).length || 0;

            return (
              <div
                key={provider.id}
                className={`group relative rounded-xl border bg-[#0F172A] p-5 shadow-sm transition-all space-y-4 ${
                  isSelectedForComp
                    ? 'border-lime-500/60 bg-[#121f36]'
                    : 'border-slate-800 hover:border-slate-700 hover:bg-[#131d35]'
                }`}
              >
                {/* Card Top Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3
                        onClick={() => setActiveProvider(provider)}
                        className="text-base font-bold text-white group-hover:text-lime-300 cursor-pointer transition-colors"
                      >
                        {provider.name}
                      </h3>
                      {provider.sampleRecord && (
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 border border-slate-700">
                          Sample Demonstration Record
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-medium text-slate-400">{provider.category}</span>
                  </div>

                  {/* Compare Toggle Button */}
                  <button
                    data-testid={`compare-btn-${provider.id}`}
                    onClick={() => toggleComparisonSelection(provider.id)}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors border ${
                      isSelectedForComp
                        ? 'border-lime-500 bg-lime-400/20 text-lime-300'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                    title="Select provider for side-by-side comparison"
                  >
                    {isSelectedForComp ? (
                      <CheckSquare className="h-3.5 w-3.5 text-lime-400" />
                    ) : (
                      <Square className="h-3.5 w-3.5" />
                    )}
                    <span>Compare</span>
                  </button>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                  {provider.summary}
                </p>

                {/* Dimension Badges Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                  {/* Auth Method */}
                  <div className="rounded border border-slate-800 bg-slate-900/60 p-2">
                    <span className="text-[10px] text-slate-400 block">Auth Method</span>
                    <span className="font-semibold text-slate-200 truncate block mt-0.5" title={provider.authMethod}>
                      {provider.authMethod}
                    </span>
                  </div>

                  {/* Evidence Status */}
                  <div className="rounded border border-slate-800 bg-slate-900/60 p-2">
                    <span className="text-[10px] text-slate-400 block">Audited Claims</span>
                    <span
                      className="font-semibold text-lime-300 truncate block mt-0.5"
                      title={`${verifiedClaimsCount} audited claims in ledger; baseline sample documentation remains partial`}
                    >
                      {verifiedClaimsCount} Audited (Partial)
                    </span>
                  </div>

                  {/* Complexity */}
                  <div className="rounded border border-slate-800 bg-slate-900/60 p-2">
                    <span className="text-[10px] text-slate-400 block">Complexity</span>
                    <span
                      className={`font-semibold truncate block mt-0.5 ${
                        provider.complexity === 'Low'
                          ? 'text-emerald-400'
                          : provider.complexity === 'Moderate'
                          ? 'text-sky-400'
                          : provider.complexity === 'High'
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {provider.complexity}
                    </span>
                  </div>

                  {/* Dependency Risk */}
                  <div className="rounded border border-slate-800 bg-slate-900/60 p-2">
                    <span className="text-[10px] text-slate-400 block">Dependency Risk</span>
                    <span
                      className={`font-semibold truncate block mt-0.5 ${
                        provider.dependencyRisk === 'Low'
                          ? 'text-emerald-400'
                          : provider.dependencyRisk === 'Medium'
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {provider.dependencyRisk}
                    </span>
                  </div>
                </div>

                {/* Scopes snippet & Last Checked */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Scopes:</span>
                    {provider.keyScopes.slice(0, 3).map((scope, idx) => (
                      <code
                        key={idx}
                        className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-mono text-lime-300 border border-slate-800 max-w-[120px] truncate"
                      >
                        {scope}
                      </code>
                    ))}
                    {provider.keyScopes.length > 3 && (
                      <span className="text-[10px] text-slate-400">+{provider.keyScopes.length - 3} more</span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-400">
                    <Clock className="h-3 w-3 inline mr-1 text-slate-400" />
                    <span>Checked: {provider.lastVerifiedDate || 'Not documented'}</span>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <a
                    href={provider.documentationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-slate-400 hover:text-white"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Official Docs</span>
                  </a>

                  <button
                    data-testid={`details-btn-${provider.id}`}
                    onClick={() => setActiveProvider(provider)}
                    className="inline-flex items-center gap-1 font-semibold text-lime-400 hover:text-lime-300 group-hover:translate-x-0.5 transition-transform"
                  >
                    <span>View Details (7 Sections)</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Render Providers View: Data Table */}
      {viewMode === 'table' && filteredProviders.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0F172A] shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-900/90 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3.5 font-semibold">Compare</th>
                <th className="px-4 py-3.5 font-semibold">Provider</th>
                <th className="px-4 py-3.5 font-semibold">Category</th>
                <th className="px-4 py-3.5 font-semibold">Auth Method</th>
                <th className="px-4 py-3.5 font-semibold">Complexity</th>
                <th className="px-4 py-3.5 font-semibold">Dependency Risk</th>
                <th className="px-4 py-3.5 font-semibold">Evidence Status</th>
                <th className="px-4 py-3.5 font-semibold">Last Checked</th>
                <th className="px-4 py-3.5 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredProviders.map((provider) => {
                const isSelectedForComp = selectedForComparison.includes(provider.id);
                return (
                  <tr
                    key={provider.id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isSelectedForComp ? 'bg-lime-400/5' : ''
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => toggleComparisonSelection(provider.id)}
                        className="text-slate-400 hover:text-white"
                      >
                        {isSelectedForComp ? (
                          <CheckSquare className="h-4 w-4 text-lime-400" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{provider.name}</span>
                        {provider.sampleRecord && (
                          <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[9px] font-mono text-slate-400">
                            Sample
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-300">{provider.category}</td>
                    <td className="px-4 py-3.5 font-mono text-slate-200">{provider.authMethod}</td>
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-slate-200">{provider.complexity}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-slate-200">{provider.dependencyRisk}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium border border-slate-700 bg-slate-800 text-slate-200">
                        {provider.evidenceStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-400">{provider.lastVerifiedDate || 'Unknown'}</td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => setActiveProvider(provider)}
                        className="font-semibold text-lime-400 hover:underline"
                      >
                        View Details &rarr;
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. PROVIDER DETAIL INSPECTOR (7 DISTINCT SECTIONS A THROUGH G)            */}
      {/* ========================================================================= */}
      {activeProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-700 bg-[#0A0F1D] p-6 shadow-2xl space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-2xl font-bold text-white">{activeProvider.name}</h3>
                  {activeProvider.sampleRecord && (
                    <span className="rounded bg-lime-400/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-lime-400 border border-lime-400/30">
                      Sample Demonstration Record
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {activeProvider.category} &bull; Protocol: <span className="font-mono text-slate-300">{activeProvider.authMethod}</span> &bull; Last Checked: <span className="font-mono text-slate-300">{activeProvider.lastVerifiedDate || 'Not documented'}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleComparisonSelection(activeProvider.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border ${
                    selectedForComparison.includes(activeProvider.id)
                      ? 'border-lime-500 bg-lime-400/20 text-lime-300'
                      : 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <GitCompare className="h-3.5 w-3.5" />
                  <span>{selectedForComparison.includes(activeProvider.id) ? 'Selected for Compare' : 'Add to Compare'}</span>
                </button>

                <button
                  data-testid="close-inspector-btn"
                  onClick={() => setActiveProvider(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                  title="Close Inspector"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Evidence Coverage & Partial Readiness Notice Banner */}
            {activeEvidenceSummary && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 font-bold text-amber-300">
                    <AlertCircle className="h-4 w-4 text-amber-400" />
                    <span>Evidence Coverage Audit: Partial Baseline ({activeEvidenceSummary.totalClaims} Audited Claims)</span>
                  </div>
                  <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-mono text-amber-200 border border-amber-500/30">
                    Incomplete Readiness Baseline
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  A provider with {activeEvidenceSummary.totalClaims} verified claims is not comprehensively verified. Only {activeEvidenceSummary.evidencedSections.length} of 7 sections contain direct claim-level citations ({activeEvidenceSummary.evidencedSections.join(', ')}). The remaining {activeEvidenceSummary.insufficientSections.length} sections ({activeEvidenceSummary.insufficientSections.join(', ')}) contain unverified sample configurations or undocumented fields.
                </p>
              </div>
            )}

            {/* Quick Section Navigation Pills */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800/80 pb-3 text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">Jump to:</span>
              {[
                { id: 'all', label: 'All 7 Sections', tag: 'Full View' },
                { id: 'A', label: 'A. Overview', tag: 'Sample' },
                { id: 'B', label: 'B. OAuth Config', tag: 'Sample' },
                {
                  id: 'C',
                  label: 'C. Scope Explorer',
                  tag: (activeProvider.id === 'prov_gmail' || activeProvider.id === 'prov_servicenow') ? 'Evidenced' : 'Sample'
                },
                {
                  id: 'D',
                  label: 'D. Governance',
                  tag: (activeProvider.id === 'prov_notion' || activeProvider.id === 'prov_gmail') ? 'Evidenced' : 'Sample'
                },
                {
                  id: 'E',
                  label: 'E. Resource Access',
                  tag: (activeProvider.id === 'prov_notion' || activeProvider.id === 'prov_servicenow') ? 'Evidenced' : 'Sample'
                },
                {
                  id: 'F',
                  label: 'F. Token Lifecycle',
                  tag: (activeProvider.id === 'prov_linear' || activeProvider.id === 'prov_servicenow') ? 'Evidenced' : 'Sample'
                },
                { id: 'G', label: 'G. Evidence Ledger', tag: `${activeProvider.claims?.length || 0} Claims` }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTabSection(tab.id as any)}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors border ${
                    activeTabSection === tab.id
                      ? 'bg-lime-400 text-slate-950 font-bold border-lime-400'
                      : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-800'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded px-1 py-0.2 text-[9px] font-mono ${
                      activeTabSection === tab.id
                        ? 'bg-slate-950 text-lime-400'
                        : tab.tag === 'Evidenced'
                        ? 'bg-lime-500/20 text-lime-300'
                        : tab.tag.includes('Claims')
                        ? 'bg-sky-500/20 text-sky-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tab.tag}
                  </span>
                </button>
              ))}
            </div>

            {/* Content Sections Container */}
            <div className="space-y-6 text-xs text-slate-200">
              {/* SECTION A: OVERVIEW */}
              {(activeTabSection === 'all' || activeTabSection === 'A') && (
                <section className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-lime-400/20 text-[10px] font-mono text-lime-400 font-bold">A</span>
                      <span>Overview</span>
                    </h4>
                    <span className="text-[11px] text-slate-400">Baseline Architecture Profile</span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Integration Summary</span>
                      <p className="mt-1 text-slate-300 leading-relaxed text-xs">
                        {formatFieldOrFallback(activeProvider.summary, 'Not documented')}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                      <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-2.5">
                        <span className="text-[10px] text-slate-400 block">Category</span>
                        <span className="font-semibold text-white mt-0.5 block">{activeProvider.category}</span>
                      </div>
                      <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-2.5">
                        <span className="text-[10px] text-slate-400 block">Authentication Method</span>
                        <span className="font-semibold text-slate-200 mt-0.5 block">{activeProvider.authMethod}</span>
                      </div>
                      <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-2.5">
                        <span className="text-[10px] text-slate-400 block">Last Checked Date</span>
                        <span className="font-mono text-amber-300 mt-0.5 block">{formatFieldOrFallback(activeProvider.lastVerifiedDate, 'Unknown')}</span>
                      </div>
                      <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-2.5">
                        <span className="text-[10px] text-slate-400 block">Record Type</span>
                        <span className="font-mono text-lime-400 mt-0.5 block">
                          {activeProvider.sampleRecord ? 'Sample Record (Demo)' : 'Verified Live'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <a
                        href={activeProvider.documentationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-lime-400 hover:text-lime-300 hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Official Provider Documentation: {activeProvider.documentationUrl}</span>
                      </a>
                    </div>
                  </div>
                </section>
              )}

              {/* SECTION B: OAUTH CONFIGURATION */}
              {(activeTabSection === 'all' || activeTabSection === 'B') && (
                <section className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-2 gap-2">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-lime-400/20 text-[10px] font-mono text-lime-400 font-bold">B</span>
                      <span>OAuth Configuration</span>
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400 border border-slate-700">
                        Sample Baseline (No Direct Claim Citation)
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block flex items-center gap-1">
                          <Key className="h-3 w-3 text-lime-400" />
                          <span>Client Registration Requirements</span>
                        </span>
                        <span className="text-[9px] font-mono text-slate-500 bg-slate-800/60 px-1.5 py-0.2 rounded">Sample Config</span>
                      </div>
                      <p className="text-slate-300 text-xs">
                        {formatFieldOrFallback(activeProvider.oauthConfig?.clientRegistration, 'Not documented')}
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block flex items-center gap-1">
                          <Lock className="h-3 w-3 text-lime-400" />
                          <span>PKCE Requirement</span>
                        </span>
                        <span className="text-[9px] font-mono text-slate-500 bg-slate-800/60 px-1.5 py-0.2 rounded">Sample Config</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-mono font-bold text-lime-300 border border-slate-700">
                          {formatFieldOrFallback(activeProvider.oauthConfig?.pkceRequirement, 'Unknown')}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                          Redirect URIs
                        </span>
                        <span className="text-[9px] font-mono text-slate-500 bg-slate-800/60 px-1.5 py-0.2 rounded">Sample Config</span>
                      </div>
                      <p className="text-slate-300 text-xs">
                        {formatFieldOrFallback(activeProvider.oauthConfig?.redirectUris, 'Not documented')}
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                          Supported Grant Types
                        </span>
                        <span className="text-[9px] font-mono text-slate-500 bg-slate-800/60 px-1.5 py-0.2 rounded">Sample Config</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {activeProvider.oauthConfig?.supportedGrantTypes && activeProvider.oauthConfig.supportedGrantTypes.length > 0 ? (
                          activeProvider.oauthConfig.supportedGrantTypes.map((grant, idx) => (
                            <code key={idx} className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-mono text-slate-200 border border-slate-700">
                              {grant}
                            </code>
                          ))
                        ) : (
                          <span className="text-slate-400 italic">Not documented</span>
                        )}
                      </div>
                    </div>

                    <div className="sm:col-span-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                          Client Secrets Handling
                        </span>
                        <span className="text-[9px] font-mono text-slate-500 bg-slate-800/60 px-1.5 py-0.2 rounded">Sample Config</span>
                      </div>
                      <p className="text-slate-300 text-xs">
                        {formatFieldOrFallback(activeProvider.oauthConfig?.clientSecretsHandling, 'Not documented')}
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {/* SECTION C: PERMISSIONS & SCOPE EXPLORER */}
              {(activeTabSection === 'all' || activeTabSection === 'C') && (
                <section className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-2 gap-2">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-lime-400/20 text-[10px] font-mono text-lime-400 font-bold">C</span>
                      <span>Permissions & Scope Explorer</span>
                    </h4>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-mono border ${
                        (activeProvider.id === 'prov_gmail' || activeProvider.id === 'prov_servicenow')
                          ? 'bg-lime-500/10 text-lime-300 border-lime-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {(activeProvider.id === 'prov_gmail' || activeProvider.id === 'prov_servicenow')
                        ? 'Claim Evidenced (Scope Tiers/Instance Scopes)'
                        : 'Sample Baseline (Generic Scopes)'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {activeProvider.scopeDefinitions && activeProvider.scopeDefinitions.length > 0 ? (
                      activeProvider.scopeDefinitions.map((scope, idx) => (
                        <div key={idx} className="rounded-lg border border-slate-800 bg-slate-900/70 p-3.5 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <code className="font-mono text-xs text-lime-300 font-bold">{scope.name}</code>
                            <span
                              className={`rounded px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                                scope.tier === 'Restricted'
                                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                                  : scope.tier === 'Sensitive'
                                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                  : scope.tier === 'Instance-Configured'
                                  ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              {scope.tier} Tier
                            </span>
                          </div>

                          <p className="text-slate-300 text-xs">{scope.description}</p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-slate-800/70 text-slate-400">
                            <div>
                              <strong className="text-slate-300">Audit Rule:</strong> {scope.auditRequirement}
                            </div>
                            <div className="sm:text-right font-mono text-lime-400">
                              Status: {scope.evidenceStatus.replace('_', ' ')}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-center text-slate-400 italic">
                        No individual scope tiers documented. Scopes defined: {activeProvider.keyScopes.join(', ')}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* SECTION D: APPROVAL & GOVERNANCE */}
              {(activeTabSection === 'all' || activeTabSection === 'D') && (
                <section className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-2 gap-2">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-lime-400/20 text-[10px] font-mono text-lime-400 font-bold">D</span>
                      <span>Approval & Governance</span>
                    </h4>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-mono border ${
                        (activeProvider.id === 'prov_notion' || activeProvider.id === 'prov_gmail')
                          ? 'bg-lime-500/10 text-lime-300 border-lime-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {(activeProvider.id === 'prov_notion' || activeProvider.id === 'prov_gmail')
                        ? 'Claim Evidenced (Review SLAs / CASA)'
                        : 'Sample Baseline (Illustrative Policies)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                        App Submission Process
                      </span>
                      <p className="text-slate-300 text-xs">
                        {formatFieldOrFallback(activeProvider.governanceRequirements?.appSubmissionProcess, 'Not documented')}
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                        External Review Timelines
                      </span>
                      <p className="text-slate-300 text-xs">
                        {formatFieldOrFallback(activeProvider.governanceRequirements?.externalReviewTimelines, 'Not documented')}
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                        Administrator Dependencies
                      </span>
                      <ul className="mt-1 space-y-1 text-slate-300 text-xs">
                        {activeProvider.governanceRequirements?.adminDependencies && activeProvider.governanceRequirements.adminDependencies.length > 0 ? (
                          activeProvider.governanceRequirements.adminDependencies.map((dep, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-lime-400 mt-0.5">&bull;</span>
                              <span>{dep}</span>
                            </li>
                          ))
                        ) : (
                          activeProvider.requiredApprovals.map((dep, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-lime-400 mt-0.5">&bull;</span>
                              <span>{dep}</span>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>

                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                        Security Assessments (e.g. CASA Tier 2)
                      </span>
                      <p className="text-slate-300 text-xs">
                        {formatFieldOrFallback(activeProvider.governanceRequirements?.securityAssessments, 'Not documented')}
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {/* SECTION E: RESOURCE ACCESS */}
              {(activeTabSection === 'all' || activeTabSection === 'E') && (
                <section className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-2 gap-2">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-lime-400/20 text-[10px] font-mono text-lime-400 font-bold">E</span>
                      <span>Resource Access Model</span>
                    </h4>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-mono border ${
                        (activeProvider.id === 'prov_notion' || activeProvider.id === 'prov_servicenow')
                          ? 'bg-lime-500/10 text-lime-300 border-lime-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {(activeProvider.id === 'prov_notion' || activeProvider.id === 'prov_servicenow')
                        ? 'Claim Evidenced (Resource Isolation / Privileges)'
                        : 'Sample Baseline (Generic Access)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                        Workspace vs Resource
                      </span>
                      <p className="text-slate-300 text-xs">
                        {formatFieldOrFallback(activeProvider.resourceAccessModel?.workspaceVsResource, 'Not documented')}
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                        Sharing Model
                      </span>
                      <p className="text-slate-300 text-xs">
                        {formatFieldOrFallback(activeProvider.resourceAccessModel?.sharingModel, 'Not documented')}
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                        Granularity
                      </span>
                      <p className="text-slate-300 text-xs">
                        {formatFieldOrFallback(activeProvider.resourceAccessModel?.granularity, 'Not documented')}
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {/* SECTION F: TOKEN LIFECYCLE */}
              {(activeTabSection === 'all' || activeTabSection === 'F') && (
                <section className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-2 gap-2">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-lime-400/20 text-[10px] font-mono text-lime-400 font-bold">F</span>
                      <span>Token Lifecycle</span>
                    </h4>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-mono border ${
                        (activeProvider.id === 'prov_linear' || activeProvider.id === 'prov_servicenow')
                          ? 'bg-lime-500/10 text-lime-300 border-lime-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {(activeProvider.id === 'prov_linear' || activeProvider.id === 'prov_servicenow')
                        ? 'Claim Evidenced (Token Expiration / Rotation)'
                        : 'Sample Baseline (Illustrative Tokens)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block flex items-center gap-1">
                        <Clock className="h-3 w-3 text-lime-400" />
                        <span>Access Token Lifespan</span>
                      </span>
                      <p className="text-slate-300 text-xs font-mono">
                        {formatFieldOrFallback(activeProvider.tokenLifecycleDetails?.accessTokenLifespan || activeProvider.tokenLifespan, 'Not documented')}
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block flex items-center gap-1">
                        <RefreshCw className="h-3 w-3 text-lime-400" />
                        <span>Refresh Token Model</span>
                      </span>
                      <p className="text-slate-300 text-xs">
                        {formatFieldOrFallback(activeProvider.tokenLifecycleDetails?.refreshTokenModel || activeProvider.tokenRefreshModel, 'Not documented')}
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                        Token Rotation
                      </span>
                      <p className="text-slate-300 text-xs">
                        {formatFieldOrFallback(activeProvider.tokenLifecycleDetails?.tokenRotation, 'Not documented')}
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                        Revocation Behaviour
                      </span>
                      <p className="text-slate-300 text-xs">
                        {formatFieldOrFallback(activeProvider.tokenLifecycleDetails?.revocationBehavior, 'Not documented')}
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {/* SECTION G: CLAIM-LEVEL EVIDENCE LEDGER */}
              {(activeTabSection === 'all' || activeTabSection === 'G') && (
                <section className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-lime-400/20 text-[10px] font-mono text-lime-400 font-bold">G</span>
                      <span>Claim-Level Evidence Ledger ({activeProvider.claims?.length || 0} Audited Claims)</span>
                    </h4>
                    <span className="text-[11px] text-slate-400">Direct Documentation Quotes & Traceability</span>
                  </div>

                  {/* Section Coverage Audit Breakdown */}
                  {activeEvidenceSummary && (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                          Section-by-Section Evidence Coverage Audit
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {activeEvidenceSummary.evidencedSections.length} of 7 Evidenced &bull; {activeEvidenceSummary.insufficientSections.length} of 7 Sample Baselines
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px]">
                          <thead>
                            <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                              <th className="py-2 px-2.5">Section</th>
                              <th className="py-2 px-2.5">Coverage Status</th>
                              <th className="py-2 px-2.5">Supporting Claims</th>
                              <th className="py-2 px-2.5">Audit Assessment</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {activeEvidenceSummary.sectionAudits.map((audit) => (
                              <tr key={audit.sectionId} className="hover:bg-slate-800/30">
                                <td className="py-2 px-2.5 font-bold text-white whitespace-nowrap">
                                  Section {audit.sectionId}: {audit.sectionName}
                                </td>
                                <td className="py-2 px-2.5">
                                  <span
                                    className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                                      audit.status === 'claim_evidenced'
                                        ? 'bg-lime-500/20 text-lime-300 border border-lime-500/40'
                                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                                    }`}
                                  >
                                    {audit.status === 'claim_evidenced' ? 'Claim Evidenced' : 'Sample Baseline'}
                                  </span>
                                </td>
                                <td className="py-2 px-2.5 font-mono text-[10px] text-slate-300">
                                  {audit.supportingClaimIds.length > 0 ? audit.supportingClaimIds.join(', ') : 'None (Sample)'}
                                </td>
                                <td className="py-2 px-2.5 text-slate-400 leading-snug">
                                  {audit.notes}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3.5">
                    {activeProvider.claims && activeProvider.claims.length > 0 ? (
                      activeProvider.claims.map((claim) => (
                        <div
                          key={claim.claimId}
                          className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-2.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-slate-400 font-bold bg-slate-800 px-1.5 py-0.5 rounded">
                                {claim.claimId}
                              </span>
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider border ${
                                  claim.evidenceStatus === 'official_verified'
                                    ? 'border-lime-500/40 bg-lime-500/10 text-lime-300'
                                    : claim.evidenceStatus === 'independently_corroborated'
                                    ? 'border-sky-500/40 bg-sky-500/10 text-sky-300'
                                    : claim.evidenceStatus === 'estimated'
                                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                                    : claim.evidenceStatus === 'hypothesis'
                                    ? 'border-purple-500/40 bg-purple-500/10 text-purple-300'
                                    : 'border-slate-600 bg-slate-800 text-slate-300'
                                }`}
                              >
                                {claim.evidenceStatus.replace('_', ' ')}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              <span>Checked: <strong className="text-slate-300 font-mono">{formatFieldOrFallback(claim.checkedAt, 'Unknown')}</strong></span>
                              <span>&bull;</span>
                              <span>Confidence: <strong className="text-slate-300 font-mono">{claim.confidence}</strong></span>
                            </div>
                          </div>

                          <p className="text-slate-100 font-medium text-xs leading-relaxed">
                            "{claim.claimText}"
                          </p>

                          {claim.supportingExcerpt ? (
                            <div className="rounded bg-slate-950/80 p-2.5 text-[11px] text-slate-300 border-l-2 border-lime-400">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Supporting Excerpt:</span>
                              <p className="italic mt-0.5">"{claim.supportingExcerpt}"</p>
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400 italic">Supporting excerpt: Not documented</div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1.5 border-t border-slate-800/60">
                            <div>
                              <span className="font-bold text-slate-300">Applicability:</span> {formatFieldOrFallback(claim.applicability, 'Unknown')}
                            </div>
                            <div>
                              <span className="font-bold text-slate-300">Limitations:</span> {formatFieldOrFallback(claim.limitations, 'Not documented')}
                            </div>
                            {claim.notes && (
                              <div className="sm:col-span-2">
                                <span className="font-bold text-slate-300">Engineering Notes:</span> {claim.notes}
                              </div>
                            )}
                          </div>

                          <div className="pt-1 text-[11px]">
                            {claim.sourceUrl ? (
                              <a
                                href={claim.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-lime-400 hover:text-lime-300 hover:underline"
                              >
                                <ExternalLink className="h-3 w-3" />
                                <span>Source: {claim.sourceTitle || claim.sourceUrl}</span>
                              </a>
                            ) : (
                              <span className="text-slate-400 italic">Source URL: Unknown / Not documented</span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-center text-slate-400 italic">
                        No claims registered in evidence ledger.
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
              <a
                href={activeProvider.documentationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white"
              >
                <span>Read Official Documentation</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setActiveProvider(null);
                    onNavigate('readiness');
                  }}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                >
                  View Readiness Rubric
                </button>
                <button
                  onClick={() => {
                    setActiveProvider(null);
                    onNavigate('investigations');
                  }}
                  className="rounded-lg bg-lime-400 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-lime-300"
                >
                  Stage Custom Investigation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. PROVIDER SIDE-BY-SIDE COMPARISON MODAL                                */}
      {/* ========================================================================= */}
      {isComparisonModalOpen && comparisonReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="relative max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-700 bg-[#0A0F1D] p-6 shadow-2xl space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Scale className="h-6 w-6 text-lime-400" />
                    <span>Provider Architectural Comparison</span>
                  </h3>
                  <span className="rounded bg-lime-400/20 px-2 py-0.5 text-xs font-mono font-bold text-lime-300 border border-lime-400/30">
                    {comparisonReport.differenceCount} of 8 Dimensions Differ
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Comparing <strong className="text-white">{comparisonReport.providerA.name}</strong> vs{' '}
                  <strong className="text-white">{comparisonReport.providerB.name}</strong> across 8 key integration dimensions.
                  Meaningful architectural differences are highlighted without arbitrary numerical scores.
                </p>
              </div>

              <button
                data-testid="close-comparison-x-btn"
                onClick={() => setIsComparisonModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                title="Close Comparison"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Side-by-Side Comparison Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0F172A]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-300">
                    <th className="p-4 w-1/4 font-bold uppercase tracking-wider text-[11px] text-slate-400">
                      Dimension
                    </th>
                    <th className="p-4 w-[35%] font-bold text-sm text-lime-300 border-l border-slate-800">
                      {comparisonReport.providerA.name}
                      <span className="block text-[10px] font-normal text-slate-400 mt-0.5">
                        {comparisonReport.providerA.category}
                      </span>
                    </th>
                    <th className="p-4 w-[35%] font-bold text-sm text-sky-300 border-l border-slate-800">
                      {comparisonReport.providerB.name}
                      <span className="block text-[10px] font-normal text-slate-400 mt-0.5">
                        {comparisonReport.providerB.category}
                      </span>
                    </th>
                    <th className="p-4 w-[5%] font-bold text-[10px] uppercase text-slate-400 border-l border-slate-800 text-center">
                      Contrast
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {comparisonReport.dimensions.map((dim, idx) => (
                    <tr
                      key={dim.dimensionKey}
                      className={`hover:bg-slate-800/30 transition-colors ${
                        dim.isDifferent ? 'bg-slate-900/40' : ''
                      }`}
                    >
                      <td className="p-4 font-bold text-slate-200">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-slate-500">{idx + 1}.</span>
                          <span>{dim.title}</span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-300 leading-relaxed border-l border-slate-800/80 font-mono text-[11px]">
                        {dim.providerAValue}
                      </td>
                      <td className="p-4 text-slate-300 leading-relaxed border-l border-slate-800/80 font-mono text-[11px]">
                        {dim.providerBValue}
                      </td>
                      <td className="p-4 text-center border-l border-slate-800/80">
                        {dim.contrastStatus === 'undocumented_both' ? (
                          <div className="space-y-0.5">
                            <span className="inline-block rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono font-medium text-slate-400 border border-slate-700">
                              Undocumented
                            </span>
                            <span className="block text-[9px] text-slate-500 whitespace-nowrap">Both Missing</span>
                          </div>
                        ) : dim.contrastStatus === 'undocumented_partial' ? (
                          <div className="space-y-0.5">
                            <span className="inline-block rounded bg-amber-400/10 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300 border border-amber-400/30">
                              Differs (Partial)
                            </span>
                            <span className="block text-[9px] text-amber-400/70 whitespace-nowrap">One Undocumented</span>
                          </div>
                        ) : dim.isDifferent ? (
                          <div className="space-y-0.5">
                            <span className="inline-block rounded bg-amber-400/10 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300 border border-amber-400/30">
                              Differs
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-block rounded bg-emerald-400/10 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300 border border-emerald-400/30">
                              Aligned
                            </span>
                            <span className="block text-[9px] text-emerald-400/70 whitespace-nowrap">Same</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <span className="text-xs text-slate-400">
                Architectural differences represent operational prerequisites, not quality ratings.
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    // Swap providers
                    setSelectedForComparison([selectedForComparison[1], selectedForComparison[0]]);
                  }}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                >
                  Swap Sides
                </button>
                <button
                  data-testid="close-comparison-footer-btn"
                  onClick={() => setIsComparisonModalOpen(false)}
                  className="rounded-lg bg-lime-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-lime-300"
                >
                  Close Comparison
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
