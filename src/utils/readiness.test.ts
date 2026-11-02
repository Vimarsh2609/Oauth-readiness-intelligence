/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterProviders,
  classifyTaskCategory,
  validateDocUrl,
  summarizeTasks,
  getDimensionRubricWeight,
  validateClaimEvidence,
  classifyGmailScope,
  evaluateDimensionEvidence,
  compareProviders,
  formatFieldOrFallback,
  getProviderEvidenceSummary,
  evaluateContrast,
  isValueUndocumented,
  deriveAppNameFromUrl,
  findKnownDocumentationUrl
} from './readiness.ts';
import { ProviderRecord, PlannerTask, ProviderClaim } from '../shared/types.ts';
import { DEMO_PROVIDERS } from '../server/data/mockData.ts';

const SAMPLE_PROVIDERS: ProviderRecord[] = [
  {
    id: 'prov_linear',
    name: 'Linear',
    slug: 'linear',
    category: 'Developer Tools',
    authMethod: 'OAuth 2.0 PKCE',
    evidenceStatus: 'Verified Docs (Sample)',
    lastVerifiedDate: '2026-10-31',
    summary: 'Developer tracking system supporting OAuth 2.0 with PKCE and leaky-bucket API rate limiting.',
    documentationUrl: 'https://linear.app/docs/oauth-authentication',
    sampleRecord: true,
    waitingTimeRating: 'Immediate self-service registration',
    costTier: 'Free API access included with workspace tier',
    complexity: 'Low',
    dependencyRisk: 'Low',
    requiredApprovals: ['Workspace Admin self-service application creation'],
    keyScopes: ['read', 'write', 'issues:create'],
    tokenLifespan: '24 hours with refresh tokens enabled',
    tokenRefreshModel: 'Single-use rotating refresh token',
    rateLimitsSummary: 'Leaky bucket algorithm; limits vary by workspace plan',
    knownUnknowns: ['Exact leaky bucket capacity for custom enterprise tiers'],
    claims: [
      {
        claimId: 'c1',
        providerId: 'prov_linear',
        claimText: 'Access tokens expire in 24 hours when refresh tokens are used',
        sourceUrl: 'https://linear.app/docs/oauth-authentication',
        sourceTitle: 'Linear OAuth Docs',
        checkedAt: '2026-10-31',
        applicability: 'OAuth 2.0 clients',
        evidenceStatus: 'independently_corroborated',
        confidence: 'high',
        supportingExcerpt: 'Access tokens are short-lived (24 hours).'
      }
    ]
  },
  {
    id: 'prov_gmail',
    name: 'Gmail',
    slug: 'gmail',
    category: 'Communication & Mail',
    authMethod: 'OAuth 2.0 + Scopes',
    evidenceStatus: 'Verified Docs (Sample)',
    lastVerifiedDate: '2026-10-31',
    summary: 'Email API with separate Sensitive and Restricted scope tiers.',
    documentationUrl: 'https://developers.google.com/gmail/api/auth/about-auth',
    sampleRecord: true,
    waitingTimeRating: 'Scope-dependent: variable review queues',
    costTier: 'Scope-dependent: free for basic scopes; 3rd-party lab fees apply if restricted',
    complexity: 'High',
    dependencyRisk: 'High',
    requiredApprovals: ['Google OAuth Consent Screen configuration', 'Google Trust & Safety review'],
    keyScopes: ['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.readonly'],
    tokenLifespan: '1 hour access token',
    tokenRefreshModel: 'Standard refresh token',
    rateLimitsSummary: '250 quota units / user / sec',
    knownUnknowns: ['Lab pricing varies by vendor'],
    claims: [
      {
        claimId: 'c2',
        providerId: 'prov_gmail',
        claimText: 'CASA Tier 2 lab audit applies strictly to Restricted scopes, not Sensitive scopes.',
        sourceUrl: 'https://developers.google.com/gmail/api/auth/about-auth',
        sourceTitle: 'Gmail API Authentication Overview',
        checkedAt: '2026-10-31',
        applicability: 'Restricted scopes storing/transmitting data on external servers',
        evidenceStatus: 'official_verified',
        confidence: 'high',
        supportingExcerpt: 'Applications requesting restricted scopes must undergo security assessment by an authorized CASA lab.'
      }
    ]
  }
];

// 1. Evidence status validation
test('validateClaimEvidence rejects official_verified when sourceUrl or excerpt is missing', () => {
  const invalidClaim: Partial<ProviderClaim> = {
    claimText: 'Some unverified assertion',
    evidenceStatus: 'official_verified',
    // Missing sourceUrl and supportingExcerpt
  };

  const result = validateClaimEvidence(invalidClaim);
  assert.equal(result.isValid, false);
  assert.notEqual(result.status, 'official_verified');
  assert.ok(result.rejectionReason?.includes('requires a verified HTTP/HTTPS'));
});

test('validateClaimEvidence rejects official_verified when confidence is unverified', () => {
  const invalidClaim: Partial<ProviderClaim> = {
    claimText: 'Some claim with a URL but marked unverified',
    sourceUrl: 'https://example.com/docs',
    supportingExcerpt: 'Direct quote here',
    evidenceStatus: 'official_verified',
    confidence: 'unverified'
  };

  const result = validateClaimEvidence(invalidClaim);
  assert.equal(result.isValid, false);
  assert.equal(result.status, 'hypothesis');
  assert.ok(result.rejectionReason?.includes('cannot have confidence marked as unverified'));
});

// 2. Missing source handling
test('validateClaimEvidence handles missing source URL gracefully without assigning official_verified', () => {
  const claimWithoutSource: Partial<ProviderClaim> = {
    claimText: 'Estimated turnaround time is 2-4 weeks',
    evidenceStatus: 'estimated',
    confidence: 'medium'
  };

  const result = validateClaimEvidence(claimWithoutSource);
  assert.equal(result.isValid, true);
  assert.equal(result.status, 'estimated');
});

// 3. Sample versus verified data handling
test('sample records are clearly distinguished from verified provider evidence', () => {
  SAMPLE_PROVIDERS.forEach((provider) => {
    assert.equal(provider.sampleRecord, true);
    assert.ok(provider.evidenceStatus.includes('Sample') || provider.evidenceStatus === 'In Review');
  });
});

// 4. Unknown claim handling
test('evaluateDimensionEvidence returns Insufficient evidence when claims are missing or unknown', () => {
  // Empty claims
  const emptyResult = evaluateDimensionEvidence('waiting_time', []);
  assert.equal(emptyResult.hasSufficientEvidence, false);
  assert.equal(emptyResult.ratingLabel, 'Insufficient evidence');

  // Only unknown or hypothesis claims
  const unknownClaims: ProviderClaim[] = [
    {
      claimId: 'u1',
      providerId: 'prov_test',
      claimText: 'Rate limit ceiling is unknown',
      evidenceStatus: 'unknown',
      confidence: 'unverified',
      applicability: 'All plans'
    },
    {
      claimId: 'u2',
      providerId: 'prov_test',
      claimText: 'Review turnaround is a hypothesis',
      evidenceStatus: 'hypothesis',
      confidence: 'low',
      applicability: 'Public apps'
    }
  ];

  const evalResult = evaluateDimensionEvidence('waiting_time', unknownClaims);
  assert.equal(evalResult.hasSufficientEvidence, false);
  assert.equal(evalResult.ratingLabel, 'Insufficient evidence');
  assert.equal(evalResult.verifiedClaimCount, 0);
  assert.equal(evalResult.unverifiedOrUnknownCount, 2);
});

test('evaluateDimensionEvidence succeeds when official or corroborated claims exist', () => {
  const verifiedClaims: ProviderClaim[] = [
    {
      claimId: 'v1',
      providerId: 'prov_test',
      claimText: 'Access tokens expire in 24 hours',
      sourceUrl: 'https://docs.example.com',
      sourceTitle: 'Example Docs',
      checkedAt: '2026-10-31',
      evidenceStatus: 'official_verified',
      confidence: 'high',
      supportingExcerpt: 'Tokens expire in 24 hours.',
      applicability: 'OAuth clients'
    }
  ];

  const evalResult = evaluateDimensionEvidence('technical_effort', verifiedClaims);
  assert.equal(evalResult.hasSufficientEvidence, true);
  assert.equal(evalResult.ratingLabel, 'Evidence Documented');
  assert.equal(evalResult.verifiedClaimCount, 1);
});

// 5. Gmail scope classification separation (Sensitive vs Restricted)
test('classifyGmailScope separates Sensitive and Restricted scopes accurately', () => {
  // Sensitive scope (gmail.send) -> does NOT require CASA Tier 2
  const sendScope = classifyGmailScope('https://www.googleapis.com/auth/gmail.send');
  assert.equal(sendScope.tier, 'Sensitive');
  assert.equal(sendScope.requiresCasaTier2, false);
  assert.equal(sendScope.requiresGoogleTrustAndSafety, true);

  // Restricted scope (gmail.readonly) -> REQUIRES CASA Tier 2 if storing/processing externally
  const readScope = classifyGmailScope('https://www.googleapis.com/auth/gmail.readonly');
  assert.equal(readScope.tier, 'Restricted');
  assert.equal(readScope.requiresCasaTier2, true);
  assert.equal(readScope.requiresGoogleTrustAndSafety, true);

  // Restricted scope (gmail.modify)
  const modifyScope = classifyGmailScope('https://www.googleapis.com/auth/gmail.modify');
  assert.equal(modifyScope.tier, 'Restricted');
  assert.equal(modifyScope.requiresCasaTier2, true);

  // Non-Sensitive scope (userinfo.email)
  const emailScope = classifyGmailScope('https://www.googleapis.com/auth/userinfo.email');
  assert.equal(emailScope.tier, 'Non-Sensitive');
  assert.equal(emailScope.requiresCasaTier2, false);
  assert.equal(emailScope.requiresGoogleTrustAndSafety, false);
});

// 6. No fabricated provider verification
test('no fabricated provider verification: official_verified is never assigned merely because a URL exists', () => {
  const fakeSampleWithUrl: Partial<ProviderClaim> = {
    claimText: 'Fabricated SLA claim with just a random link',
    sourceUrl: 'https://example.com/unrelated',
    evidenceStatus: 'official_verified',
    // Missing supportingExcerpt quote
  };

  const validation = validateClaimEvidence(fakeSampleWithUrl);
  assert.notEqual(validation.status, 'official_verified');
});

// Existing filter and classification tests
test('filterProviders by search text in name', () => {
  const result = filterProviders(SAMPLE_PROVIDERS, { query: 'linear' });
  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'Linear');
});

test('filterProviders by category filter', () => {
  const devTools = filterProviders(SAMPLE_PROVIDERS, { category: 'Developer Tools' });
  assert.equal(devTools.length, 1);
  assert.equal(devTools[0].name, 'Linear');

  const comTools = filterProviders(SAMPLE_PROVIDERS, { category: 'Communication & Mail' });
  assert.equal(comTools.length, 1);
  assert.equal(comTools[0].name, 'Gmail');
});

test('classifyTaskCategory correctly identifies human required vs agent prepared', () => {
  assert.equal(
    classifyTaskCategory({ title: 'Google CASA Tier 2 Audit submission', requiresExternalAudit: true }),
    'human_required'
  );

  assert.equal(
    classifyTaskCategory({ title: 'Generate PKCE code challenge helper', canBeGeneratedByCode: true }),
    'agent_prepared'
  );

  assert.equal(
    classifyTaskCategory({ title: 'Obtain undisclosed rate limit header', isMissingDocOrRateLimit: true }),
    'blocked_unverified'
  );
});

test('validateDocUrl validates valid and invalid URLs', () => {
  assert.equal(validateDocUrl('').isValid, false);
  assert.equal(validateDocUrl('invalid-doc').isValid, false);
  
  const valid = validateDocUrl('https://docs.linear.app/oauth');
  assert.equal(valid.isValid, true);
  assert.ok(valid.normalized?.startsWith('https://'));
});

test('summarizeTasks aggregates counts properly', () => {
  const tasks: PlannerTask[] = [
    {
      id: 't1',
      title: 'Task 1',
      description: 'Desc',
      category: 'agent_prepared',
      status: 'ready_for_review',
      priority: 'medium',
      providerName: 'Linear'
    },
    {
      id: 't2',
      title: 'Task 2',
      description: 'Desc',
      category: 'human_required',
      status: 'in_progress',
      priority: 'high',
      providerName: 'Gmail'
    },
    {
      id: 't3',
      title: 'Task 3',
      description: 'Desc',
      category: 'blocked_unverified',
      status: 'blocked',
      priority: 'critical',
      providerName: 'ServiceNow'
    }
  ];

  const summary = summarizeTasks(tasks);
  assert.equal(summary.agentPreparedCount, 1);
  assert.equal(summary.humanRequiredCount, 1);
  assert.equal(summary.blockedCount, 1);
  assert.equal(summary.completedOrReadyCount, 1);
});

test('getDimensionRubricWeight assigns governance weights', () => {
  const waitingTime = getDimensionRubricWeight('waiting_time');
  assert.equal(waitingTime.governanceWeight, 'High');
  assert.equal(waitingTime.requiresExternalContact, true);

  const techEffort = getDimensionRubricWeight('technical_effort');
  assert.equal(techEffort.governanceWeight, 'Medium');
  assert.equal(techEffort.requiresExternalContact, false);
});

// Comprehensive Audit Tests for Stored Claims in DEMO_PROVIDERS
test('all 12 stored claims across the 4 providers pass evidence validation and maintain complete audit fields', () => {
  assert.equal(DEMO_PROVIDERS.length, 4);

  let totalClaimsCount = 0;
  DEMO_PROVIDERS.forEach((provider) => {
    assert.equal(provider.sampleRecord, true, `${provider.name} must be labelled as sampleRecord`);
    assert.ok(provider.claims && provider.claims.length > 0, `${provider.name} must contain audited claims`);
    totalClaimsCount += provider.claims.length;

    provider.claims.forEach((claim) => {
      // 1. Structural audit fields
      assert.ok(claim.claimId, 'claimId must be present');
      assert.equal(claim.providerId, provider.id, 'providerId must match parent provider');
      assert.ok(claim.claimText.length > 10, 'claimText must be non-trivial');
      assert.ok(claim.checkedAt, 'checkedAt timestamp must be specified');
      assert.ok(claim.applicability, 'applicability scope must be specified');
      assert.ok(claim.limitations, 'limitations must be specified');

      // 2. Validate evidence rule enforcement
      const validation = validateClaimEvidence(claim);
      assert.equal(validation.isValid, true, `Claim ${claim.claimId} must pass validation: ${validation.rejectionReason}`);
      assert.equal(validation.status, claim.evidenceStatus);

      // 3. For official_verified or independently_corroborated:
      if (claim.evidenceStatus === 'official_verified' || claim.evidenceStatus === 'independently_corroborated') {
        assert.ok(claim.sourceUrl?.startsWith('https://'), `Claim ${claim.claimId} requires HTTPS source URL`);
        assert.ok(claim.sourceTitle, `Claim ${claim.claimId} requires source title`);
        assert.ok(claim.supportingExcerpt, `Claim ${claim.claimId} requires direct supporting excerpt`);
        assert.ok(claim.confidence === 'high' || claim.confidence === 'medium', `Claim ${claim.claimId} requires substantiated confidence`);
      }
    });
  });

  assert.equal(totalClaimsCount, 12, 'Must have exactly 12 audited claims across 4 providers');
});

test('recheck Linear claims: token expiry, single-use refresh token rotation, and leaky bucket rate limiting', () => {
  const linear = DEMO_PROVIDERS.find((p) => p.slug === 'linear');
  assert.ok(linear);

  const claim1 = linear.claims.find((c) => c.claimId === 'claim_lin_01');
  assert.ok(claim1);
  assert.ok(claim1.claimText.includes('24 hours'));
  assert.equal(claim1.evidenceStatus, 'independently_corroborated');
  assert.equal(claim1.applicability, 'OAuth 2.0 applications with refresh tokens enabled');

  const claim2 = linear.claims.find((c) => c.claimId === 'claim_lin_02');
  assert.ok(claim2);
  assert.ok(claim2.claimText.includes('single-use') && claim2.claimText.includes('rotate'));
  assert.equal(claim2.evidenceStatus, 'independently_corroborated');

  const claim3 = linear.claims.find((c) => c.claimId === 'claim_lin_03');
  assert.ok(claim3);
  assert.ok(claim3.claimText.includes('leaky bucket'));
  assert.ok(!claim3.claimText.includes('1,440 req/min'));
  assert.equal(claim3.evidenceStatus, 'official_verified');
});

test('recheck Notion claims: internal vs public integrations, explicit page sharing, and review turnaround', () => {
  const notion = DEMO_PROVIDERS.find((p) => p.slug === 'notion');
  assert.ok(notion);

  const claim1 = notion.claims.find((c) => c.claimId === 'claim_notion_01');
  assert.ok(claim1);
  assert.ok(claim1.claimText.includes('Internal') && claim1.claimText.includes('Public'));
  assert.equal(claim1.evidenceStatus, 'official_verified');

  const claim2 = notion.claims.find((c) => c.claimId === 'claim_notion_02');
  assert.ok(claim2);
  assert.ok(claim2.claimText.includes('explicit user sharing'));
  assert.equal(claim2.evidenceStatus, 'official_verified');

  const claim3 = notion.claims.find((c) => c.claimId === 'claim_notion_03');
  assert.ok(claim3);
  assert.ok(claim3.claimText.includes('guaranteed SLA'));
  assert.equal(claim3.evidenceStatus, 'official_verified');
});

test('recheck Gmail claims: scope tier separation, CASA Tier 2 isolation to Restricted scopes, and no fixed universal fee', () => {
  const gmail = DEMO_PROVIDERS.find((p) => p.slug === 'gmail');
  assert.ok(gmail);

  const claim1 = gmail.claims.find((c) => c.claimId === 'claim_gmail_01');
  assert.ok(claim1);
  assert.ok(claim1.claimText.includes('Non-Sensitive, Sensitive, and Restricted tiers'));
  assert.equal(claim1.evidenceStatus, 'official_verified');

  const claim2 = gmail.claims.find((c) => c.claimId === 'claim_gmail_02');
  assert.ok(claim2);
  assert.ok(claim2.claimText.includes('Restricted scopes') && claim2.claimText.includes('NOT for Sensitive scopes'));
  assert.equal(claim2.evidenceStatus, 'official_verified');

  const claim3 = gmail.claims.find((c) => c.claimId === 'claim_gmail_03');
  assert.ok(claim3);
  assert.ok(claim3.claimText.includes('no universal fixed fee') && claim3.claimText.includes('$15k-$75k'));
  assert.equal(claim3.evidenceStatus, 'official_verified');
});

test('recheck ServiceNow claims: instance-configured scopes, token lifespans, and Cross-Scope Privileges', () => {
  const sn = DEMO_PROVIDERS.find((p) => p.slug === 'servicenow');
  assert.ok(sn);

  const claim1 = sn.claims.find((c) => c.claimId === 'claim_sn_01');
  assert.ok(claim1);
  assert.ok(claim1.claimText.includes('oauth_entity_scope') && claim1.claimText.includes('configured per instance'));
  assert.equal(claim1.evidenceStatus, 'official_verified');

  const claim2 = sn.claims.find((c) => c.claimId === 'claim_sn_02');
  assert.ok(claim2);
  assert.ok(claim2.claimText.includes('template defaults'));
  assert.equal(claim2.evidenceStatus, 'official_verified');

  const claim3 = sn.claims.find((c) => c.claimId === 'claim_sn_03');
  assert.ok(claim3);
  assert.ok(claim3.claimText.includes('Cross-Scope Privileges') && claim3.claimText.includes('sys_scope_privilege'));
  assert.equal(claim3.evidenceStatus, 'official_verified');
});

// =========================================================================
// STEP 2: APP DISCOVERY INTELLIGENCE UNIT TESTS
// =========================================================================

// 20. Search across multiple fields
test('search functionality finds providers by name, category, authMethod, description, and scope names', () => {
  // Search by name
  const linearResults = filterProviders(DEMO_PROVIDERS, { query: 'linear' });
  assert.equal(linearResults.length, 1);
  assert.equal(linearResults[0].slug, 'linear');

  // Search by category
  const itsmResults = filterProviders(DEMO_PROVIDERS, { query: 'Enterprise ITSM' });
  assert.equal(itsmResults.length, 1);
  assert.equal(itsmResults[0].slug, 'servicenow');

  // Search by auth method
  const pkceResults = filterProviders(DEMO_PROVIDERS, { query: 'PKCE' });
  assert.ok(pkceResults.some((p) => p.slug === 'linear'));

  // Search by description content (summary)
  const leakyResults = filterProviders(DEMO_PROVIDERS, { query: 'leaky-bucket' });
  assert.equal(leakyResults.length, 1);
  assert.equal(leakyResults[0].slug, 'linear');

  // Search by scope name
  const gmailScopeResults = filterProviders(DEMO_PROVIDERS, { query: 'gmail.readonly' });
  assert.equal(gmailScopeResults.length, 1);
  assert.equal(gmailScopeResults[0].slug, 'gmail');

  // Empty result on non-existent query
  const emptyResults = filterProviders(DEMO_PROVIDERS, { query: 'nonexistent-custom-app-12345' });
  assert.equal(emptyResults.length, 0);
});

// 21. Multi-dimensional filtering: Authentication
test('filterProviders by Authentication options (OAuth 2.0 PKCE, Instance-configured, OAuth 2.0, All)', () => {
  const pkceOnly = filterProviders(DEMO_PROVIDERS, { authMethod: 'OAuth 2.0 PKCE' });
  assert.equal(pkceOnly.length, 1);
  assert.equal(pkceOnly[0].slug, 'linear');

  const instanceOnly = filterProviders(DEMO_PROVIDERS, { authMethod: 'Instance-configured' });
  assert.equal(instanceOnly.length, 1);
  assert.equal(instanceOnly[0].slug, 'servicenow');

  const anyOAuth = filterProviders(DEMO_PROVIDERS, { authMethod: 'OAuth 2.0' });
  assert.equal(anyOAuth.length, 4); // All 4 demo providers utilize OAuth 2.0 variants

  const allAuth = filterProviders(DEMO_PROVIDERS, { authMethod: 'all' });
  assert.equal(allAuth.length, 4);
});

// 22. Multi-dimensional filtering: Complexity
test('filterProviders by Complexity tiers (Low, Moderate, High, Extreme)', () => {
  const low = filterProviders(DEMO_PROVIDERS, { complexity: 'Low' });
  assert.equal(low.length, 1);
  assert.equal(low[0].slug, 'linear');

  const moderate = filterProviders(DEMO_PROVIDERS, { complexity: 'Moderate' });
  assert.equal(moderate.length, 1);
  assert.equal(moderate[0].slug, 'notion');

  const high = filterProviders(DEMO_PROVIDERS, { complexity: 'High' });
  assert.equal(high.length, 1);
  assert.equal(high[0].slug, 'gmail');

  const extreme = filterProviders(DEMO_PROVIDERS, { complexity: 'Extreme' });
  assert.equal(extreme.length, 1);
  assert.equal(extreme[0].slug, 'servicenow');
});

// 23. Multi-dimensional filtering: Evidence Status
test('filterProviders by Evidence Status (Officially verified, Independently corroborated, Sample record)', () => {
  const official = filterProviders(DEMO_PROVIDERS, { evidenceStatus: 'Officially verified' });
  assert.ok(official.length >= 3); // Notion, Gmail, ServiceNow have official_verified claims

  const corroborated = filterProviders(DEMO_PROVIDERS, { evidenceStatus: 'Independently corroborated' });
  assert.ok(corroborated.some((p) => p.slug === 'linear'));

  const sampleRecords = filterProviders(DEMO_PROVIDERS, { evidenceStatus: 'Sample record' });
  assert.equal(sampleRecords.length, 4); // All 4 are sample demonstration records
});

// 24. Multi-dimensional filtering: Dependency Risk
test('filterProviders by Dependency Risk (Low, Medium, High, Critical)', () => {
  const lowRisk = filterProviders(DEMO_PROVIDERS, { dependencyRisk: 'Low' });
  assert.equal(lowRisk.length, 1);
  assert.equal(lowRisk[0].slug, 'linear');

  const medRisk = filterProviders(DEMO_PROVIDERS, { dependencyRisk: 'Medium' });
  assert.equal(medRisk.length, 1);
  assert.equal(medRisk[0].slug, 'notion');

  const highRisk = filterProviders(DEMO_PROVIDERS, { dependencyRisk: 'High' });
  assert.equal(highRisk.length, 1);
  assert.equal(highRisk[0].slug, 'gmail');

  const critRisk = filterProviders(DEMO_PROVIDERS, { dependencyRisk: 'Critical' });
  assert.equal(critRisk.length, 1);
  assert.equal(critRisk[0].slug, 'servicenow');
});

// 25. Clearing all filters restores the complete set of providers
test('clearing all filter criteria restores the full demonstration provider directory', () => {
  // First apply restrictive filters
  const filtered = filterProviders(DEMO_PROVIDERS, {
    query: 'linear',
    complexity: 'Low',
    authMethod: 'OAuth 2.0 PKCE'
  });
  assert.equal(filtered.length, 1);

  // Clear all filters back to defaults
  const reset = filterProviders(DEMO_PROVIDERS, {
    query: '',
    category: 'all',
    authMethod: 'all',
    complexity: 'all',
    evidenceStatus: 'all',
    dependencyRisk: 'all'
  });
  assert.equal(reset.length, 4);
});

// 26. Provider Comparison Matrix across 8 dimensions
test('compareProviders generates side-by-side comparison across all 8 dimensions without arbitrary numerical scores', () => {
  const linear = DEMO_PROVIDERS.find((p) => p.slug === 'linear')!;
  const notion = DEMO_PROVIDERS.find((p) => p.slug === 'notion')!;
  assert.ok(linear && notion);

  const report = compareProviders(linear, notion);

  assert.equal(report.providerA.name, 'Linear');
  assert.equal(report.providerB.name, 'Notion');
  assert.equal(report.dimensions.length, 8);

  // Check all 8 required dimension keys exist
  const keys = report.dimensions.map((d) => d.dimensionKey);
  assert.ok(keys.includes('auth_model'));
  assert.ok(keys.includes('registration'));
  assert.ok(keys.includes('scope_complexity'));
  assert.ok(keys.includes('external_approval'));
  assert.ok(keys.includes('admin_dependency'));
  assert.ok(keys.includes('resource_access'));
  assert.ok(keys.includes('token_lifecycle'));
  assert.ok(keys.includes('evidence_confidence'));

  // Ensure meaningful differences are flagged
  const authDiff = report.dimensions.find((d) => d.dimensionKey === 'auth_model');
  assert.equal(authDiff?.isDifferent, true); // PKCE vs confidential grant

  const tokenDiff = report.dimensions.find((d) => d.dimensionKey === 'token_lifecycle');
  assert.equal(tokenDiff?.isDifferent, true); // 24h rotating vs non-expiring

  assert.ok(report.differenceCount > 0);

  // Confirm NO arbitrary numerical score or fake ratings
  report.dimensions.forEach((dim) => {
    assert.equal(typeof dim.providerAValue, 'string');
    assert.equal(typeof dim.providerBValue, 'string');
    assert.ok(dim.providerAValue.length > 0);
    assert.ok(dim.providerBValue.length > 0);
  });
});

// 27. Handling missing evidence fields gracefully
test('formatFieldOrFallback returns explicit fallback when fields are missing or empty', () => {
  assert.equal(formatFieldOrFallback(undefined), 'Not documented');
  assert.equal(formatFieldOrFallback(null, 'Unknown'), 'Unknown');
  assert.equal(formatFieldOrFallback(''), 'Not documented');
  assert.equal(formatFieldOrFallback('   ', 'Not documented'), 'Not documented');
  assert.equal(formatFieldOrFallback([]), 'Not documented');
  assert.equal(formatFieldOrFallback(['A', 'B']), 'A, B');
  assert.equal(formatFieldOrFallback('Valid data'), 'Valid data');

  // Verify compareProviders handles providers with partial or missing optional sections
  const sparseProviderA: ProviderRecord = {
    ...DEMO_PROVIDERS[0],
    id: 'sparse_a',
    oauthConfig: undefined,
    governanceRequirements: undefined,
    resourceAccessModel: undefined,
    tokenLifecycleDetails: undefined
  };

  const sparseProviderB: ProviderRecord = {
    ...DEMO_PROVIDERS[1],
    id: 'sparse_b',
    oauthConfig: undefined,
    governanceRequirements: undefined,
    resourceAccessModel: undefined,
    tokenLifecycleDetails: undefined
  };

  const sparseReport = compareProviders(sparseProviderA, sparseProviderB);
  assert.equal(sparseReport.dimensions.length, 8);
  sparseReport.dimensions.forEach((d) => {
    assert.ok(d.providerAValue.length > 0);
    assert.ok(d.providerBValue.length > 0);
  });
});

// 28. Preserving sample record tags and distinguishing from verified live data
test('all provider records strictly preserve sampleRecord tag and distinguish sample demonstration state', () => {
  DEMO_PROVIDERS.forEach((prov) => {
    assert.equal(prov.sampleRecord, true);
    assert.ok(prov.claims && prov.claims.length > 0);
    prov.claims.forEach((claim) => {
      assert.ok(claim.claimId.startsWith('claim_'));
      assert.ok(['official_verified', 'independently_corroborated', 'estimated', 'hypothesis', 'unknown'].includes(claim.evidenceStatus));
    });
  });
});

// 29. Comparison integrity: Missing data is NEVER treated as identical ("Same")
test('evaluateContrast strictly treats missing or undocumented data on both sides as undocumented_both, not match', () => {
  const bothMissing = evaluateContrast('Not documented', 'Not documented');
  assert.equal(bothMissing.isDifferent, true);
  assert.equal(bothMissing.contrastStatus, 'undocumented_both');
  assert.ok(bothMissing.notes.includes('Undocumented on both sides'));

  const oneMissing = evaluateContrast('OAuth 2.0 PKCE', 'Not documented');
  assert.equal(oneMissing.isDifferent, true);
  assert.equal(oneMissing.contrastStatus, 'undocumented_partial');

  const identicalDocumented = evaluateContrast('Strict HTTPS required', 'Strict HTTPS required');
  assert.equal(identicalDocumented.isDifferent, false);
  assert.equal(identicalDocumented.contrastStatus, 'match');

  const differentDocumented = evaluateContrast('24 hours', '1 hour');
  assert.equal(differentDocumented.isDifferent, true);
  assert.equal(differentDocumented.contrastStatus, 'differs');
});

// 30. Comparison matrix operates without arbitrary numerical scores and flags sparse fields
test('compareProviders handles undocumented dimensions without treating them as Same or generating numerical scores', () => {
  const dummyA: ProviderRecord = {
    ...DEMO_PROVIDERS[0],
    id: 'dummy_a',
    oauthConfig: undefined,
    governanceRequirements: undefined,
    resourceAccessModel: undefined,
    tokenLifecycleDetails: undefined
  };

  const dummyB: ProviderRecord = {
    ...DEMO_PROVIDERS[1],
    id: 'dummy_b',
    oauthConfig: undefined,
    governanceRequirements: undefined,
    resourceAccessModel: undefined,
    tokenLifecycleDetails: undefined
  };

  const report = compareProviders(dummyA, dummyB);
  assert.equal(report.dimensions.length, 8);

  // Check resource access dimension which was undefined in both
  const resourceDim = report.dimensions.find(d => d.dimensionKey === 'resource_access');
  assert.ok(resourceDim);
  assert.equal(resourceDim.contrastStatus, 'undocumented_both');
  assert.equal(resourceDim.isDifferent, true);

  // Ensure no arbitrary numerical score property exists in the report
  assert.equal((report as any).score, undefined);
  assert.equal((report as any).percentage, undefined);
  assert.equal((report as any).ratingNumber, undefined);
});

// 31. Evidence coverage audit: 3 claims audited must NEVER appear comprehensively verified
test('getProviderEvidenceSummary enforces isComprehensivelyVerified: false for all providers with partial claims', () => {
  DEMO_PROVIDERS.forEach((prov) => {
    const summary = getProviderEvidenceSummary(prov);
    assert.equal(summary.isComprehensivelyVerified, false);
    assert.equal(summary.overallReadinessStatus, 'Partial Baseline (Sample Record)');
    assert.equal(summary.totalClaims, 3);
    assert.ok(summary.insufficientSections.length > 0);
    assert.ok(summary.evidencedSections.length > 0);
  });
});

// 32. Provider configuration audit: Accurately identifies evidenced vs sample sections per provider
test('getProviderEvidenceSummary correctly identifies insufficient and evidenced sections for each provider', () => {
  const linear = DEMO_PROVIDERS.find(p => p.id === 'prov_linear')!;
  const linearSummary = getProviderEvidenceSummary(linear);
  assert.equal(linearSummary.totalClaims, 3);
  assert.equal(linearSummary.officialVerifiedClaims, 1);
  assert.equal(linearSummary.corroboratedClaims, 2);
  assert.equal(linearSummary.estimatedClaims, 0);
  assert.equal(linearSummary.hypothesisClaims, 0);
  assert.equal(linearSummary.unknownClaims, 0);
  // Linear has Token Lifecycle evidenced, but OAuth config, scopes, governance, resource access are sample baseline
  assert.ok(linearSummary.evidencedSections.some(s => s.includes('Token Lifecycle')));
  assert.ok(linearSummary.insufficientSections.some(s => s.includes('OAuth Configuration')));
  assert.ok(linearSummary.insufficientSections.some(s => s.includes('Scope Explorer')));
  assert.ok(linearSummary.insufficientSections.some(s => s.includes('Governance')));

  const gmail = DEMO_PROVIDERS.find(p => p.id === 'prov_gmail')!;
  const gmailSummary = getProviderEvidenceSummary(gmail);
  assert.equal(gmailSummary.totalClaims, 3);
  assert.equal(gmailSummary.officialVerifiedClaims, 3);
  assert.equal(gmailSummary.corroboratedClaims, 0);
  assert.ok(gmailSummary.evidencedSections.some(s => s.includes('Scope Explorer')));
  assert.ok(gmailSummary.evidencedSections.some(s => s.includes('Governance')));
  assert.ok(gmailSummary.insufficientSections.some(s => s.includes('OAuth Configuration')));
  assert.ok(gmailSummary.insufficientSections.some(s => s.includes('Token Lifecycle')));
});

// 33. Flexible intake: deriveAppNameFromUrl extracts clean application names from URLs
test('deriveAppNameFromUrl extracts clean app names and handles brand casing overrides', () => {
  // Brand casing overrides
  assert.equal(deriveAppNameFromUrl('https://discord.com/developers/docs/topics/oauth2'), 'Discord');
  assert.equal(deriveAppNameFromUrl('https://api.slack.com/authentication/oauth-v2'), 'Slack');
  assert.equal(deriveAppNameFromUrl('https://docs.github.com/en/apps/oauth-apps'), 'GitHub');
  assert.equal(deriveAppNameFromUrl('https://airtable.com/developers/web/api/oauth-reference'), 'Airtable');
  assert.equal(deriveAppNameFromUrl('https://linear.app/docs/oauth-authentication'), 'Linear');
  assert.equal(deriveAppNameFromUrl('https://developers.notion.com/docs/authorization'), 'Notion');
  assert.equal(deriveAppNameFromUrl('https://developer.servicenow.com/dev.do'), 'ServiceNow');

  // Generic and developer subdomains
  assert.equal(deriveAppNameFromUrl('https://developer.spotify.com/documentation/web-api'), 'Spotify');
  assert.equal(deriveAppNameFromUrl('https://api.stripe.com/v1/oauth'), 'Stripe');
  assert.equal(deriveAppNameFromUrl('https://oauth.custom-service.io/authorize'), 'Custom Service');
  assert.equal(deriveAppNameFromUrl('http://my-company-app.com/api/v2'), 'My Company App');

  // Edge cases: IP addresses and fallback
  assert.equal(deriveAppNameFromUrl('https://192.168.1.1/docs'), '192.168.1.1');
  assert.equal(deriveAppNameFromUrl('not-a-url'), 'OAuth Application');
});

// 34. Flexible intake: findKnownDocumentationUrl resolves verified registry entries without inventing URLs
test('findKnownDocumentationUrl resolves known providers and returns null for unfamiliar apps', () => {
  // Case-insensitive exact matches
  const slack = findKnownDocumentationUrl('slack');
  assert.ok(slack, 'Slack must be found in verified registry');
  assert.equal(slack?.officialName, 'Slack');
  assert.equal(slack?.docUrl, 'https://api.slack.com/authentication/oauth-v2');
  assert.equal(slack?.authMethod, 'OAuth 2.0 + Scopes');

  const linear = findKnownDocumentationUrl('Linear');
  assert.ok(linear, 'Linear must be found in verified registry');
  assert.equal(linear?.officialName, 'Linear');
  assert.equal(linear?.docUrl, 'https://linear.app/docs/oauth-authentication');
  assert.equal(linear?.authMethod, 'OAuth 2.0 PKCE');

  const discord = findKnownDocumentationUrl('DISCORD');
  assert.ok(discord, 'Discord must be found regardless of case');
  assert.equal(discord?.officialName, 'Discord');

  // Prefix / substring match
  const github = findKnownDocumentationUrl('GitHub OAuth App');
  assert.ok(github, 'GitHub should match by name');
  assert.equal(github?.officialName, 'GitHub');

  // Unfamiliar app: MUST return null so user is prompted for doc URL, never fabricating or guessing
  const unfamiliar = findKnownDocumentationUrl('Acme Custom Internal Tool 99');
  assert.equal(unfamiliar, null, 'Unfamiliar app must return null without guessing URLs');

  const empty = findKnownDocumentationUrl('');
  assert.equal(empty, null, 'Empty string must return null');
});



