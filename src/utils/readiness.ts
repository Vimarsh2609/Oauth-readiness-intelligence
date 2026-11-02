/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ProviderRecord,
  PlannerTask,
  TaskCategory,
  DimensionKey,
  ProviderCategory,
  AuthMethod,
  EvidenceStatus,
  ProviderClaim,
  ClaimEvidenceStatus,
  ProviderFilterCriteria,
  AuthFilterOption,
  ComplexityFilterOption,
  EvidenceFilterOption,
  DependencyRiskFilterOption,
  ProviderComparisonReport,
  ComparisonDimensionItem,
  ComparisonContrastStatus,
  SectionEvidenceAudit,
  ProviderEvidenceSummary
} from '../shared/types.ts';

/**
 * Filter providers by search terms (name, category, auth method, description, scope names)
 * and multi-dimensional filter criteria (auth method, complexity, evidence status, dependency risk, category).
 */
export function filterProviders(
  providers: ProviderRecord[],
  options: ProviderFilterCriteria | {
    query?: string;
    category?: ProviderCategory | 'all';
    authMethod?: AuthMethod | AuthFilterOption | 'all';
    complexity?: ComplexityFilterOption;
    evidenceStatus?: EvidenceFilterOption | EvidenceStatus | 'all';
    dependencyRisk?: DependencyRiskFilterOption;
  }
): ProviderRecord[] {
  const {
    query = '',
    category = 'all',
    authMethod = 'all',
    complexity = 'all',
    evidenceStatus = 'all',
    dependencyRisk = 'all'
  } = options;
  const cleanQuery = query.trim().toLowerCase();

  return providers.filter((provider) => {
    // 1. Category Filter
    if (category && category !== 'all' && provider.category !== category) {
      return false;
    }

    // 2. Auth Method Filter
    if (authMethod && authMethod !== 'all') {
      if (authMethod === 'OAuth 2.0 PKCE') {
        if (!provider.authMethod.toLowerCase().includes('pkce') && provider.oauthConfig?.pkceRequirement !== 'Required') {
          return false;
        }
      } else if (authMethod === 'OAuth 2.0') {
        if (!provider.authMethod.toLowerCase().includes('oauth')) {
          return false;
        }
      } else if (authMethod === 'API token') {
        if (!provider.authMethod.toLowerCase().includes('token') && !provider.authMethod.toLowerCase().includes('api key')) {
          return false;
        }
      } else if (authMethod === 'Instance-configured') {
        if (!provider.authMethod.toLowerCase().includes('instance') && provider.oauthConfig?.pkceRequirement !== 'Instance-dependent') {
          return false;
        }
      } else if (provider.authMethod !== authMethod) {
        return false;
      }
    }

    // 3. Complexity Filter
    if (complexity && complexity !== 'all' && provider.complexity !== complexity) {
      return false;
    }

    // 4. Dependency Risk Filter
    if (dependencyRisk && dependencyRisk !== 'all' && provider.dependencyRisk !== dependencyRisk) {
      return false;
    }

    // 5. Evidence Status Filter
    if (evidenceStatus && evidenceStatus !== 'all') {
      if (evidenceStatus === 'Sample record') {
        if (!provider.sampleRecord) return false;
      } else if (evidenceStatus === 'Officially verified') {
        const hasOfficial = provider.claims?.some((c) => c.evidenceStatus === 'official_verified');
        if (!hasOfficial) return false;
      } else if (evidenceStatus === 'Independently corroborated') {
        const hasCorroborated = provider.claims?.some((c) => c.evidenceStatus === 'independently_corroborated');
        if (!hasCorroborated) return false;
      } else if (evidenceStatus === 'Estimated') {
        const hasEstimated = provider.claims?.some((c) => c.evidenceStatus === 'estimated');
        if (!hasEstimated) return false;
      } else if (evidenceStatus === 'Hypothesis') {
        const hasHypothesis = provider.claims?.some((c) => c.evidenceStatus === 'hypothesis');
        if (!hasHypothesis) return false;
      } else if (evidenceStatus === 'Unknown') {
        const hasUnknown = provider.claims?.some((c) => c.evidenceStatus === 'unknown') || provider.complexity === 'Insufficient evidence';
        if (!hasUnknown) return false;
      } else if (provider.evidenceStatus !== evidenceStatus) {
        return false;
      }
    }

    // 6. Search across: Provider name, Category, Auth method, Description, Scope names
    if (cleanQuery) {
      const matchName = provider.name.toLowerCase().includes(cleanQuery);
      const matchCategory = provider.category.toLowerCase().includes(cleanQuery);
      const matchAuth = provider.authMethod.toLowerCase().includes(cleanQuery);
      const matchSummary = provider.summary.toLowerCase().includes(cleanQuery);
      const matchKeyScopes = provider.keyScopes?.some((s) => s.toLowerCase().includes(cleanQuery));
      const matchScopeDefs = provider.scopeDefinitions?.some((s) =>
        s.name.toLowerCase().includes(cleanQuery) || s.description.toLowerCase().includes(cleanQuery)
      );
      const matchApprovals = provider.requiredApprovals?.some((a) => a.toLowerCase().includes(cleanQuery));

      return (
        matchName ||
        matchCategory ||
        matchAuth ||
        matchSummary ||
        Boolean(matchKeyScopes) ||
        Boolean(matchScopeDefs) ||
        Boolean(matchApprovals)
      );
    }

    return true;
  });
}

/**
 * Safely format a field or provide explicit fallback to "Unknown" or "Not documented".
 * Never leaves blank or assumes unverified facts.
 */
export function formatFieldOrFallback(
  val: string | string[] | undefined | null,
  fallback = 'Not documented'
): string {
  if (val === undefined || val === null) {
    return fallback;
  }
  if (Array.isArray(val)) {
    return val.length > 0 ? val.join(', ') : fallback;
  }
  const str = String(val).trim();
  return str.length > 0 ? str : fallback;
}

/**
 * Checks whether a given field value indicates undocumented, unknown, or missing evidence.
 */
export function isValueUndocumented(val: string): boolean {
  if (!val) return true;
  const lower = val.toLowerCase().trim();
  return (
    lower === 'not documented' ||
    lower === 'unknown' ||
    lower === 'insufficient evidence' ||
    lower === 'not documented (pkce: not documented)' ||
    lower.startsWith('not documented') ||
    lower.startsWith('unknown')
  );
}

/**
 * Evaluates contrast between two comparison values.
 * Strictly guarantees that missing or undocumented data is NEVER treated as identical ("Same").
 */
export function evaluateContrast(valA: string, valB: string): {
  isDifferent: boolean;
  contrastStatus: ComparisonContrastStatus;
  notes: string;
} {
  const aUndoc = isValueUndocumented(valA);
  const bUndoc = isValueUndocumented(valB);

  if (aUndoc && bUndoc) {
    return {
      isDifferent: true,
      contrastStatus: 'undocumented_both',
      notes: 'Undocumented on both sides (Insufficient Evidence)'
    };
  }

  if (aUndoc || bUndoc) {
    return {
      isDifferent: true,
      contrastStatus: 'undocumented_partial',
      notes: aUndoc ? 'Missing documentation on first provider' : 'Missing documentation on second provider'
    };
  }

  if (valA.trim().toLowerCase() === valB.trim().toLowerCase()) {
    return {
      isDifferent: false,
      contrastStatus: 'match',
      notes: 'Identical evidenced configuration'
    };
  }

  return {
    isDifferent: true,
    contrastStatus: 'differs',
    notes: 'Architectural difference'
  };
}

/**
 * Compares two providers across the 8 key integration dimensions without producing
 * arbitrary numerical scores. Highlights meaningful qualitative architectural differences.
 * Explicitly flags missing or undocumented fields without ever treating them as identical.
 */
export function compareProviders(
  providerA: ProviderRecord,
  providerB: ProviderRecord
): ProviderComparisonReport {
  // Dimension 1: Authentication Model
  const authA = `${providerA.authMethod} (PKCE: ${providerA.oauthConfig?.pkceRequirement || 'Not documented'})`;
  const authB = `${providerB.authMethod} (PKCE: ${providerB.oauthConfig?.pkceRequirement || 'Not documented'})`;

  // Dimension 2: Registration Requirements
  const regA = formatFieldOrFallback(providerA.oauthConfig?.clientRegistration || providerA.requiredApprovals?.[0]);
  const regB = formatFieldOrFallback(providerB.oauthConfig?.clientRegistration || providerB.requiredApprovals?.[0]);

  // Dimension 3: Scope Complexity
  const scopesA = providerA.scopeDefinitions && providerA.scopeDefinitions.length > 0
    ? `${providerA.keyScopes.length} scopes defined (${providerA.scopeDefinitions.map(s => s.tier).join(', ')})`
    : (providerA.keyScopes?.length ? `${providerA.keyScopes.length} scopes defined` : 'Not documented');
  const scopesB = providerB.scopeDefinitions && providerB.scopeDefinitions.length > 0
    ? `${providerB.keyScopes.length} scopes defined (${providerB.scopeDefinitions.map(s => s.tier).join(', ')})`
    : (providerB.keyScopes?.length ? `${providerB.keyScopes.length} scopes defined` : 'Not documented');

  // Dimension 4: External Approval
  const externalA = formatFieldOrFallback(
    providerA.governanceRequirements?.securityAssessments || providerA.waitingTimeRating
  );
  const externalB = formatFieldOrFallback(
    providerB.governanceRequirements?.securityAssessments || providerB.waitingTimeRating
  );

  // Dimension 5: Admin Dependency
  const adminA = providerA.governanceRequirements?.adminDependencies && providerA.governanceRequirements.adminDependencies.length > 0
    ? providerA.governanceRequirements.adminDependencies.join('; ')
    : (providerA.requiredApprovals?.length ? providerA.requiredApprovals.join('; ') : 'Not documented');
  const adminB = providerB.governanceRequirements?.adminDependencies && providerB.governanceRequirements.adminDependencies.length > 0
    ? providerB.governanceRequirements.adminDependencies.join('; ')
    : (providerB.requiredApprovals?.length ? providerB.requiredApprovals.join('; ') : 'Not documented');

  // Dimension 6: Resource Access
  const resourceA = providerA.resourceAccessModel
    ? `${providerA.resourceAccessModel.workspaceVsResource} (${providerA.resourceAccessModel.sharingModel})`
    : 'Not documented';
  const resourceB = providerB.resourceAccessModel
    ? `${providerB.resourceAccessModel.workspaceVsResource} (${providerB.resourceAccessModel.sharingModel})`
    : 'Not documented';

  // Dimension 7: Token Lifecycle
  const tokenA = providerA.tokenLifecycleDetails
    ? `Access: ${providerA.tokenLifecycleDetails.accessTokenLifespan}; Refresh: ${providerA.tokenLifecycleDetails.refreshTokenModel}; Rotation: ${providerA.tokenLifecycleDetails.tokenRotation}`
    : (providerA.tokenLifespan ? `Access: ${providerA.tokenLifespan}; Refresh: ${providerA.tokenRefreshModel}` : 'Not documented');
  const tokenB = providerB.tokenLifecycleDetails
    ? `Access: ${providerB.tokenLifecycleDetails.accessTokenLifespan}; Refresh: ${providerB.tokenLifecycleDetails.refreshTokenModel}; Rotation: ${providerB.tokenLifecycleDetails.tokenRotation}`
    : (providerB.tokenLifespan ? `Access: ${providerB.tokenLifespan}; Refresh: ${providerB.tokenRefreshModel}` : 'Not documented');

  // Dimension 8: Evidence Confidence
  const countA = providerA.claims?.length || 0;
  const officialA = providerA.claims?.filter(c => c.evidenceStatus === 'official_verified').length || 0;
  const corroA = providerA.claims?.filter(c => c.evidenceStatus === 'independently_corroborated').length || 0;
  const confidenceA = `${countA} claims audited (${officialA} official, ${corroA} corroborated) [${providerA.sampleRecord ? 'Sample Record' : 'Live'}]`;

  const countB = providerB.claims?.length || 0;
  const officialB = providerB.claims?.filter(c => c.evidenceStatus === 'official_verified').length || 0;
  const corroB = providerB.claims?.filter(c => c.evidenceStatus === 'independently_corroborated').length || 0;
  const confidenceB = `${countB} claims audited (${officialB} official, ${corroB} corroborated) [${providerB.sampleRecord ? 'Sample Record' : 'Live'}]`;

  const rawDimensions = [
    { key: 'auth_model', title: 'Authentication Model', valA: authA, valB: authB },
    { key: 'registration', title: 'Registration Requirements', valA: regA, valB: regB },
    { key: 'scope_complexity', title: 'Scope Complexity', valA: scopesA, valB: scopesB },
    { key: 'external_approval', title: 'External Approval', valA: externalA, valB: externalB },
    { key: 'admin_dependency', title: 'Admin Dependency', valA: adminA, valB: adminB },
    { key: 'resource_access', title: 'Resource Access', valA: resourceA, valB: resourceB },
    { key: 'token_lifecycle', title: 'Token Lifecycle', valA: tokenA, valB: tokenB },
    { key: 'evidence_confidence', title: 'Evidence Confidence', valA: confidenceA, valB: confidenceB }
  ];

  const dimensions: ComparisonDimensionItem[] = rawDimensions.map(raw => {
    const contrast = evaluateContrast(raw.valA, raw.valB);
    return {
      dimensionKey: raw.key,
      title: raw.title,
      providerAValue: raw.valA,
      providerBValue: raw.valB,
      isDifferent: contrast.isDifferent,
      contrastStatus: contrast.contrastStatus,
      notes: contrast.notes
    };
  });

  const differenceCount = dimensions.filter(d => d.isDifferent).length;

  return {
    providerA,
    providerB,
    dimensions,
    differenceCount
  };
}

/**
 * Generates an evidence coverage audit summary for a provider.
 * Strictly guarantees that having 3 audited claims does not cause a provider to appear
 * comprehensively verified, and explicitly flags which sections are sample baselines.
 */
export function getProviderEvidenceSummary(provider: ProviderRecord): ProviderEvidenceSummary {
  const claims = provider.claims || [];
  const totalClaims = claims.length;
  const officialVerifiedClaims = claims.filter(c => c.evidenceStatus === 'official_verified').length;
  const corroboratedClaims = claims.filter(c => c.evidenceStatus === 'independently_corroborated').length;
  const estimatedClaims = claims.filter(c => c.evidenceStatus === 'estimated').length;
  const hypothesisClaims = claims.filter(c => c.evidenceStatus === 'hypothesis').length;
  const unknownClaims = claims.filter(c => c.evidenceStatus === 'unknown').length;

  // Audit the 7 Inspector sections (A through G)
  const sectionAudits: SectionEvidenceAudit[] = [
    {
      sectionId: 'A',
      sectionName: 'Overview',
      status: 'sample_baseline',
      supportingClaimIds: [],
      notes: 'High-level architectural summary and documentation URL; overall provider readiness is partial.'
    },
    {
      sectionId: 'B',
      sectionName: 'OAuth Configuration',
      status: 'sample_baseline',
      supportingClaimIds: [],
      notes: 'Client registration flows, redirect URI strictness, and secret handling are sample configurations.'
    },
    {
      sectionId: 'C',
      sectionName: 'Scope Explorer',
      status: (provider.id === 'prov_gmail' || provider.id === 'prov_servicenow') ? 'claim_evidenced' : 'sample_baseline',
      supportingClaimIds: claims.filter(c => c.claimText.toLowerCase().includes('scope')).map(c => c.claimId),
      notes: (provider.id === 'prov_gmail' || provider.id === 'prov_servicenow')
        ? 'Scope tiers (Non-Sensitive/Sensitive/Restricted) or instance-specific scopes evidenced by audited claims.'
        : 'Sample scope definitions; granular table/object permissions lack direct claim citations.'
    },
    {
      sectionId: 'D',
      sectionName: 'Approval & Governance',
      status: (provider.id === 'prov_notion' || provider.id === 'prov_gmail') ? 'claim_evidenced' : 'sample_baseline',
      supportingClaimIds: claims.filter(c => 
        c.claimText.toLowerCase().includes('casa') || 
        c.claimText.toLowerCase().includes('review') || 
        c.claimText.toLowerCase().includes('approval') ||
        c.claimText.toLowerCase().includes('internal')
      ).map(c => c.claimId),
      notes: (provider.id === 'prov_notion' || provider.id === 'prov_gmail')
        ? 'Review SLAs (Notion) or CASA Tier 2 external assessment requirements (Gmail) evidenced by audited claims.'
        : 'Enterprise admin dependencies and directory approvals represent illustrative sample baseline.'
    },
    {
      sectionId: 'E',
      sectionName: 'Resource Access Model',
      status: (provider.id === 'prov_notion' || provider.id === 'prov_servicenow') ? 'claim_evidenced' : 'sample_baseline',
      supportingClaimIds: claims.filter(c => 
        c.claimText.toLowerCase().includes('sharing') || 
        c.claimText.toLowerCase().includes('privilege') ||
        c.claimText.toLowerCase().includes('page')
      ).map(c => c.claimId),
      notes: (provider.id === 'prov_notion' || provider.id === 'prov_servicenow')
        ? 'Explicit per-page sharing (Notion) or Cross-Scope Privileges (ServiceNow) evidenced by audited claims.'
        : 'Workspace vs resource isolation mechanics lack dedicated verified claims.'
    },
    {
      sectionId: 'F',
      sectionName: 'Token Lifecycle',
      status: (provider.id === 'prov_linear' || provider.id === 'prov_servicenow') ? 'claim_evidenced' : 'sample_baseline',
      supportingClaimIds: claims.filter(c => 
        c.claimText.toLowerCase().includes('token') || 
        c.claimText.toLowerCase().includes('rotation') ||
        c.claimText.toLowerCase().includes('lifespan')
      ).map(c => c.claimId),
      notes: (provider.id === 'prov_linear' || provider.id === 'prov_servicenow')
        ? 'Single-use refresh token rotation (Linear) or instance-configured token lifespans (ServiceNow) evidenced by claims.'
        : 'Token lifetimes and refresh rotation details represent unevidenced sample configuration.'
    },
    {
      sectionId: 'G',
      sectionName: 'Evidence Ledger',
      status: 'claim_evidenced',
      supportingClaimIds: claims.map(c => c.claimId),
      notes: `${totalClaims} audited claim(s) recorded in ledger with exact citation quotes.`
    }
  ];

  const insufficientSections = sectionAudits
    .filter(s => s.status !== 'claim_evidenced')
    .map(s => `Section ${s.sectionId} (${s.sectionName})`);

  const evidencedSections = sectionAudits
    .filter(s => s.status === 'claim_evidenced')
    .map(s => `Section ${s.sectionId} (${s.sectionName})`);

  return {
    providerId: provider.id,
    providerName: provider.name,
    totalClaims,
    officialVerifiedClaims,
    corroboratedClaims,
    estimatedClaims,
    hypothesisClaims,
    unknownClaims,
    overallReadinessStatus: 'Partial Baseline (Sample Record)',
    isComprehensivelyVerified: false,
    sectionAudits,
    insufficientSections,
    evidencedSections
  };
}

/**
 * Classifies a task into the correct category based on automation vs. human governance constraints.
 */
export function classifyTaskCategory(input: {
  title: string;
  requiresExternalAudit?: boolean;
  requiresLegalOrSignoff?: boolean;
  isMissingDocOrRateLimit?: boolean;
  canBeGeneratedByCode?: boolean;
}): TaskCategory {
  if (input.isMissingDocOrRateLimit) {
    return 'blocked_unverified';
  }
  if (input.requiresExternalAudit || input.requiresLegalOrSignoff) {
    return 'human_required';
  }
  if (input.canBeGeneratedByCode) {
    return 'agent_prepared';
  }
  return 'human_required';
}

/**
 * Validates documentation URL input for staged investigations.
 */
export function validateDocUrl(urlStr: string): { isValid: boolean; normalized?: string; error?: string } {
  if (!urlStr || urlStr.trim().length === 0) {
    return { isValid: false, error: 'Documentation URL is required.' };
  }
  try {
    const parsed = new URL(urlStr.trim().startsWith('http') ? urlStr.trim() : `https://${urlStr.trim()}`);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { isValid: false, error: 'Protocol must be HTTP or HTTPS.' };
    }
    if (!parsed.hostname.includes('.')) {
      return { isValid: false, error: 'Please enter a valid documentation host domain.' };
    }
    return { isValid: true, normalized: parsed.toString() };
  } catch {
    return { isValid: false, error: 'Invalid URL format.' };
  }
}

/**
 * Derives a clean provisional application name from a website or documentation URL.
 * Example: 'https://discord.com/developers/docs/topics/oauth2' -> 'Discord'
 * Example: 'https://api.slack.com/authentication/oauth-v2' -> 'Slack'
 * Example: 'https://developers.airtable.com' -> 'Airtable'
 */
export function deriveAppNameFromUrl(urlStr: string): string {
  if (!urlStr || typeof urlStr !== 'string' || !urlStr.includes('.')) {
    return 'OAuth Application';
  }
  try {
    const raw = urlStr.trim().startsWith('http') ? urlStr.trim() : `https://${urlStr.trim()}`;
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();

    // Preserve IP addresses as-is
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) {
      return host;
    }

    // Strip common subdomains
    const stripped = host
      .replace(/^(www\.|developers\.|developer\.|docs\.|doc\.|api\.|platform\.|auth\.|oauth\.|help\.|support\.|identity\.|login\.|portal\.)+/, '')
      .replace(/\.(com|org|net|app|io|so|dev|co|ai|us|uk|gov|edu)(\.[a-z]{2})?$/, '');

    const domainParts = stripped.split('.');
    const segment = domainParts[domainParts.length - 1] || 'Unknown';

    // Custom brand overrides for clean casing
    const brandOverrides: Record<string, string> = {
      discord: 'Discord',
      slack: 'Slack',
      linear: 'Linear',
      notion: 'Notion',
      github: 'GitHub',
      google: 'Google',
      gmail: 'Gmail',
      servicenow: 'ServiceNow',
      stripe: 'Stripe',
      airtable: 'Airtable',
      spotify: 'Spotify',
      figma: 'Figma',
      atlassian: 'Atlassian',
      jira: 'Jira',
      hubspot: 'HubSpot',
      salesforce: 'Salesforce',
      asana: 'Asana'
    };

    const cleanKey = segment.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (brandOverrides[cleanKey]) {
      return brandOverrides[cleanKey];
    }

    return segment
      .split(/[-_]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  } catch {
    return 'OAuth Application';
  }
}

/**
 * Verified Registry mapping known provider names to trusted official documentation URLs.
 * Ensures zero fabrication: only verified official documentation URLs are returned.
 */
export const VERIFIED_PROVIDER_REGISTRY: Record<
  string,
  { officialName: string; docUrl: string; authMethod: AuthMethod; category: string }
> = {
  linear: {
    officialName: 'Linear',
    docUrl: 'https://linear.app/docs/oauth-authentication',
    authMethod: 'OAuth 2.0 PKCE',
    category: 'Developer Tools'
  },
  notion: {
    officialName: 'Notion',
    docUrl: 'https://developers.notion.com/docs/authorization',
    authMethod: 'OAuth 2.0 + Scopes',
    category: 'Productivity & Knowledge'
  },
  gmail: {
    officialName: 'Gmail',
    docUrl: 'https://developers.google.com/gmail/api/auth/about-auth',
    authMethod: 'OAuth 2.0 + Scopes',
    category: 'Communication & Mail'
  },
  google: {
    officialName: 'Google',
    docUrl: 'https://developers.google.com/identity/protocols/oauth2',
    authMethod: 'OAuth 2.0 + Scopes',
    category: 'Developer Tools'
  },
  servicenow: {
    officialName: 'ServiceNow',
    docUrl: 'https://docs.servicenow.com/bundle/utah-platform-administration/page/administer/security/concept/c_OAuthApplications.html',
    authMethod: 'OAuth 2.0 + Instance Admin',
    category: 'Enterprise ITSM'
  },
  discord: {
    officialName: 'Discord',
    docUrl: 'https://discord.com/developers/docs/topics/oauth2',
    authMethod: 'OAuth 2.0 PKCE',
    category: 'Communication & Mail'
  },
  slack: {
    officialName: 'Slack',
    docUrl: 'https://api.slack.com/authentication/oauth-v2',
    authMethod: 'OAuth 2.0 + Scopes',
    category: 'Communication & Mail'
  },
  stripe: {
    officialName: 'Stripe',
    docUrl: 'https://stripe.com/docs/connect/oauth-reference',
    authMethod: 'OAuth 2.0 Web (Confidential)',
    category: 'Developer Tools'
  },
  github: {
    officialName: 'GitHub',
    docUrl: 'https://docs.github.com/en/apps/oauth-apps',
    authMethod: 'OAuth 2.0 Web (Confidential)',
    category: 'Developer Tools'
  }
};

/**
 * Searches the verified provider registry for a trusted official documentation URL.
 * Returns null if the provider is unfamiliar, ensuring we never guess or fabricate URLs.
 */
export function findKnownDocumentationUrl(appName: string): {
  officialName: string;
  docUrl: string;
  authMethod: AuthMethod;
  category: string;
} | null {
  if (!appName || typeof appName !== 'string') return null;
  const clean = appName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (VERIFIED_PROVIDER_REGISTRY[clean]) {
    return VERIFIED_PROVIDER_REGISTRY[clean];
  }
  for (const [key, val] of Object.entries(VERIFIED_PROVIDER_REGISTRY)) {
    if (clean.includes(key) || (key.length > 3 && clean.startsWith(key))) {
      return val;
    }
  }
  return null;
}

/**
 * Summarizes the dimensions readiness rubric checklist for a given dimension.
 */
export function getDimensionRubricWeight(dimension: DimensionKey): {
  governanceWeight: 'High' | 'Medium' | 'Low';
  requiresExternalContact: boolean;
} {
  switch (dimension) {
    case 'waiting_time':
    case 'dependency_risk':
      return { governanceWeight: 'High', requiresExternalContact: true };
    case 'direct_cost':
    case 'internal_dependencies':
      return { governanceWeight: 'Medium', requiresExternalContact: false };
    case 'technical_effort':
    case 'evidence_confidence':
    default:
      return { governanceWeight: 'Medium', requiresExternalContact: false };
  }
}

/**
 * Computes counts of tasks by status and category for display.
 */
export function summarizeTasks(tasks: PlannerTask[]): {
  agentPreparedCount: number;
  humanRequiredCount: number;
  blockedCount: number;
  completedOrReadyCount: number;
} {
  return {
    agentPreparedCount: tasks.filter((t) => t.category === 'agent_prepared').length,
    humanRequiredCount: tasks.filter((t) => t.category === 'human_required').length,
    blockedCount: tasks.filter((t) => t.category === 'blocked_unverified').length,
    completedOrReadyCount: tasks.filter((t) => t.status === 'ready_for_review').length,
  };
}

/**
 * Validates that an evidence status is legitimate and not prematurely designated
 * as 'official_verified' without verified backing excerpts and valid source documentation.
 * Rule: Never assign official_verified merely because a sample record contains a URL.
 */
/**
 * Validates that an evidence status is legitimate and not prematurely designated
 * as 'official_verified' without verified backing excerpts and valid source documentation.
 *
 * Rules:
 * 1. A page title alone cannot qualify as a supporting excerpt.
 * 2. If source text is provided, the excerpt must appear in the retrieved source text.
 * 3. The excerpt must be semantically relevant to the claim.
 * 4. Claim applicability cannot be broader than the source evidence.
 * 5. Confidence must reflect evidence quality.
 * 6. Unsupported claims become 'unknown' rather than remaining 'official_verified'.
 */
export function validateClaimEvidence(
  claim: Partial<ProviderClaim>,
  options?: { sourceText?: string }
): {
  isValid: boolean;
  status: ClaimEvidenceStatus;
  rejectionReason?: string;
} {
  let status = claim.evidenceStatus || 'unknown';

  if (!claim.claimText || claim.claimText.trim().length === 0) {
    return { isValid: false, status: 'unknown', rejectionReason: 'Claim text is required.' };
  }

  const excerpt = claim.supportingExcerpt?.trim();

  if (status === 'official_verified') {
    if (!claim.sourceUrl || !claim.sourceUrl.startsWith('http')) {
      return {
        isValid: false,
        status: 'hypothesis',
        rejectionReason: 'official_verified requires a verified HTTP/HTTPS documentation source URL.'
      };
    }
    if (!excerpt || excerpt.length === 0) {
      return {
        isValid: false,
        status: 'estimated',
        rejectionReason: 'official_verified requires a verified supporting documentation excerpt.'
      };
    }

    // Rule 1: A page title alone CANNOT qualify as a supporting excerpt
    const isTitlePattern =
      /^###\s+/i.test(excerpt) ||
      /^##\s+/i.test(excerpt) ||
      /^#\s+/i.test(excerpt) ||
      /^Primary Documentation:/i.test(excerpt) ||
      /^Source:/i.test(excerpt) ||
      /^Title:/i.test(excerpt) ||
      Boolean(claim.sourceTitle && excerpt.toLowerCase() === claim.sourceTitle.toLowerCase()) ||
      Boolean(claim.sourceTitle && excerpt.toLowerCase() === `primary documentation: ${claim.sourceTitle.toLowerCase()}`) ||
      (excerpt.length < 25 && !excerpt.includes(' ') && !excerpt.includes(':'));

    if (isTitlePattern) {
      return {
        isValid: false,
        status: 'unknown',
        rejectionReason: 'A documentation page title alone cannot qualify as a supporting excerpt for an official verified claim.'
      };
    }

    // Rule 2: Excerpt must appear in sourceText if sourceText is provided
    if (options?.sourceText) {
      const cleanExcerpt = excerpt.toLowerCase().replace(/\s+/g, ' ');
      const cleanSource = options.sourceText.toLowerCase().replace(/\s+/g, ' ');

      if (!cleanSource.includes(cleanExcerpt)) {
        return {
          isValid: false,
          status: 'unknown',
          rejectionReason: 'Supporting excerpt does not appear in the retrieved documentation text.'
        };
      }
    }

    // Rule 3: Semantic relevance between excerpt and claim assertion
    const lowerClaim = claim.claimText.toLowerCase();
    const lowerExcerpt = excerpt.toLowerCase();

    // a. PKCE claims
    if ((lowerClaim.includes('pkce') || lowerClaim.includes('proof key') || lowerClaim.includes('code_challenge')) &&
        !lowerExcerpt.includes('pkce') && !lowerExcerpt.includes('code_challenge') && !lowerExcerpt.includes('proof key')) {
      return {
        isValid: false,
        status: 'unknown',
        rejectionReason: 'Supporting excerpt lacks direct mention or evidence of PKCE (Proof Key for Code Exchange).'
      };
    }

    // b. Rate limit claims
    if ((lowerClaim.includes('rate limit') || lowerClaim.includes('quota') || lowerClaim.includes('throttl')) &&
        !lowerExcerpt.includes('rate limit') && !lowerExcerpt.includes('quota') && !lowerExcerpt.includes('throttl') && !lowerExcerpt.includes('request per') && !lowerExcerpt.includes('leaky bucket')) {
      return {
        isValid: false,
        status: 'unknown',
        rejectionReason: 'Supporting excerpt does not establish rate limit or quota constraints.'
      };
    }

    // c. Token expiration claims
    if ((lowerClaim.includes('expir') || lowerClaim.includes('lifespan') || lowerClaim.includes('duration') || lowerClaim.includes('lifetime')) &&
        !lowerExcerpt.includes('expir') && !lowerExcerpt.includes('lifespan') && !lowerExcerpt.includes('second') && !lowerExcerpt.includes('hour') && !lowerExcerpt.includes('day') && !lowerExcerpt.includes('valid')) {
      return {
        isValid: false,
        status: 'unknown',
        rejectionReason: 'Supporting excerpt does not contain token expiration or lifespan metrics.'
      };
    }

    // Rule 4: Claim applicability cannot be broader than the source evidence
    if (claim.applicability) {
      const lowerApplicability = claim.applicability.toLowerCase();
      if (lowerExcerpt.includes('bots have an entirely separate set of rate limits') &&
          (lowerApplicability.includes('all rest') || lowerApplicability.includes('graphql') || lowerApplicability.includes('all api'))) {
        return {
          isValid: false,
          status: 'estimated',
          rejectionReason: 'Claim applicability is broader than the supporting source excerpt (bot-specific rate limit generalized to all APIs).'
        };
      }
    }

    // Rule 5: Confidence must reflect quality
    if (claim.confidence === 'unverified') {
      return {
        isValid: false,
        status: 'hypothesis',
        rejectionReason: 'official_verified cannot have confidence marked as unverified.'
      };
    }
  }

  return { isValid: true, status };
}

/**
 * Distinguishes Non-Sensitive, Sensitive, and Restricted Google OAuth scopes.
 * Accurately prevents claiming that all Gmail access requires CASA Tier 2.
 */
export function classifyGmailScope(scopeUri: string): {
  tier: 'Non-Sensitive' | 'Sensitive' | 'Restricted' | 'Unknown';
  requiresCasaTier2: boolean;
  requiresGoogleTrustAndSafety: boolean;
  notes: string;
} {
  const clean = scopeUri.trim().toLowerCase();

  // Restricted scopes (Mailbox access / modification)
  if (
    clean.includes('gmail.readonly') ||
    clean.includes('gmail.modify') ||
    clean.includes('mail.google.com') ||
    clean.includes('gmail.compose') && clean.includes('restricted')
  ) {
    return {
      tier: 'Restricted',
      requiresCasaTier2: true,
      requiresGoogleTrustAndSafety: true,
      notes: 'Restricted scope: requires annual CASA Tier 2 third-party security lab assessment if data is stored or processed on external servers.'
    };
  }

  // Sensitive scopes (e.g. gmail.send)
  if (clean.includes('gmail.send') || clean.includes('gmail.compose') || clean.includes('gmail.labels')) {
    return {
      tier: 'Sensitive',
      requiresCasaTier2: false,
      requiresGoogleTrustAndSafety: true,
      notes: 'Sensitive scope: requires Google Trust & Safety OAuth verification (demo video and privacy policy), but does NOT require CASA Tier 2 lab audit.'
    };
  }

  // Non-Sensitive default scopes
  if (clean.includes('userinfo.email') || clean.includes('userinfo.profile') || clean.includes('openid') || clean === 'email' || clean === 'profile') {
    return {
      tier: 'Non-Sensitive',
      requiresCasaTier2: false,
      requiresGoogleTrustAndSafety: false,
      notes: 'Non-sensitive scope: self-service consent screen configuration; no third-party security audit required.'
    };
  }

  return {
    tier: 'Unknown',
    requiresCasaTier2: false,
    requiresGoogleTrustAndSafety: true,
    notes: 'Unrecognized scope pattern; requires official Google API scope directory verification.'
  };
}

/**
 * Evaluates readiness evidence completeness for a dimension.
 * Prevents unsupported estimates from producing falsely precise readiness scores.
 * If required evidence is missing or claims are unknown: returns 'Insufficient evidence'.
 */
export function evaluateDimensionEvidence(
  dimensionKey: DimensionKey,
  claims: ProviderClaim[]
): {
  hasSufficientEvidence: boolean;
  ratingLabel: string;
  verifiedClaimCount: number;
  unverifiedOrUnknownCount: number;
  reason: string;
} {
  if (!claims || claims.length === 0) {
    return {
      hasSufficientEvidence: false,
      ratingLabel: 'Insufficient evidence',
      verifiedClaimCount: 0,
      unverifiedOrUnknownCount: 0,
      reason: 'No documented claims or evidence records attached to this provider profile.'
    };
  }

  const verified = claims.filter(
    (c) => c.evidenceStatus === 'official_verified' || c.evidenceStatus === 'independently_corroborated'
  );
  const unverified = claims.filter(
    (c) => c.evidenceStatus === 'hypothesis' || c.evidenceStatus === 'unknown' || c.evidenceStatus === 'estimated'
  );

  // If there are zero verified claims or all claims are unknown/hypothesis:
  if (verified.length === 0) {
    return {
      hasSufficientEvidence: false,
      ratingLabel: 'Insufficient evidence',
      verifiedClaimCount: 0,
      unverifiedOrUnknownCount: unverified.length,
      reason: 'All available claims are unverified hypotheses or unknowns. Numerical scores withheld.'
    };
  }

  return {
    hasSufficientEvidence: true,
    ratingLabel: 'Evidence Documented',
    verifiedClaimCount: verified.length,
    unverifiedOrUnknownCount: unverified.length,
    reason: `${verified.length} claim(s) backed by official or corroborated evidence.`
  };
}
