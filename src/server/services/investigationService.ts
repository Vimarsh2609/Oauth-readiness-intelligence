/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DEMO_INVESTIGATION_HISTORY } from '../data/mockData.ts';
import {
  InvestigationDraft,
  AuthMethod,
  InvestigationPurpose,
  InvestigationSectionFindings,
  InvestigationEvidenceSummary
} from '../../shared/types.ts';
import { retrieveDocumentationSources } from './docRetrievalService.ts';
import { executeLiveExtraction } from './extractionService.ts';

// Enrich demo items with default 7-section findings for demonstration parity
const INITIAL_INVESTIGATIONS: InvestigationDraft[] = DEMO_INVESTIGATION_HISTORY.map((demo) => {
  const isSlack = demo.id.includes('slack');

  const findings: InvestigationSectionFindings = {
    sectionA_Overview: {
      appName: demo.appName,
      category: isSlack ? 'Communication & Mail' : 'Developer Tools',
      authMethod: demo.authMethod,
      summary: demo.summaryNote,
      targetEnvironment: demo.environmentType,
      investigationPurpose: 'both',
      complexity: 'Moderate',
      dependencyRisk: isSlack ? 'High' : 'Medium'
    },
    sectionB_OAuthConfig: {
      clientRegistration: `${demo.appName} Developer Portal registration`,
      redirectUris: 'Strict HTTPS redirect URI required',
      supportedGrantTypes: ['authorization_code'],
      pkceRequirement: 'Supported / Recommended',
      clientSecretsHandling: 'Confidential client secret stored securely'
    },
    sectionC_Scopes: demo.detectedScopes.map(s => ({
      name: s.name,
      tier: s.tier === 'Standard' ? 'Non-Sensitive' : (s.tier as any),
      description: `Access scope: ${s.name}`,
      auditRequirement: 'User consent required upon authorization',
      evidenceStatus: 'independently_corroborated',
      sourceUrl: demo.docUrl
    })),
    sectionD_Governance: {
      appSubmissionProcess: demo.identifiedApprovalGates[0] || 'App review process required for public distribution',
      externalReviewTimelines: demo.reviewTimelineNote,
      adminDependencies: demo.identifiedApprovalGates.slice(1),
      securityAssessments: 'Standard review guidelines'
    },
    sectionE_ResourceAccess: {
      workspaceVsResource: isSlack ? 'Workspace-level installation with granular channel selection' : 'Merchant account scope',
      sharingModel: isSlack ? 'Channel-by-channel invite and permissions' : 'Connected account permissions',
      granularity: 'Granular resource and bot scope permissions'
    },
    sectionF_TokenLifecycle: {
      accessTokenLifespan: isSlack ? 'Non-expiring bot tokens or short-lived rotating user tokens' : 'Standard OAuth token',
      refreshTokenModel: 'Supported via token rotation',
      tokenRotation: 'Optional refresh token rotation',
      revocationBehavior: 'Explicit revocation endpoint available'
    },
    sectionG_EvidenceAndUnknowns: {
      claims: [
        {
          claimId: `claim_${demo.id}_01`,
          providerId: `prov_${demo.appName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          claimText: `${demo.appName} utilizes ${demo.authMethod} for multi-tenant application authorization.`,
          sourceUrl: demo.docUrl,
          sourceTitle: `${demo.appName} Documentation`,
          checkedAt: demo.submittedAt.split('T')[0],
          applicability: 'All public apps',
          evidenceStatus: 'independently_corroborated',
          confidence: 'high',
          supportingExcerpt: demo.summaryNote
        }
      ],
      knownUnknowns: demo.unknownQuestions,
      missingEvidenceNotes: ['Demonstration intake baseline record.']
    }
  };

  const evidenceSummary: InvestigationEvidenceSummary = {
    totalClaims: 1,
    officialVerified: 0,
    corroborated: 1,
    estimated: 0,
    hypothesis: 0,
    unknown: 0,
    missingEvidenceFields: ['Demonstration intake baseline'],
    documentationCoveragePercent: 70
  };

  return {
    ...demo,
    investigationPurpose: 'both' as InvestigationPurpose,
    status: 'completed_with_gaps',
    findings,
    evidenceSummary,
    extractionEngine: 'deterministic-pipeline',
    retrievedSources: [
      {
        url: demo.docUrl,
        title: `${demo.appName} Developer Documentation`,
        byteCount: 42500,
        fetchedAt: demo.submittedAt,
        status: 'retrieved'
      }
    ]
  };
});

const SEEDED_DISCORD_INVESTIGATION: InvestigationDraft = {
  id: 'inv_discord_demo',
  appName: 'Discord',
  docUrl: 'https://discord.com/developers/docs/topics/oauth2',
  authMethod: 'OAuth 2.0 PKCE',
  environmentType: 'Production',
  submittedAt: '2026-11-01T09:00:00Z',
  completedAt: '2026-11-01T09:00:05Z',
  status: 'completed',
  investigationPurpose: 'both',
  extractionEngine: 'deterministic-pipeline',
  findings: {
    sectionA_Overview: {
      appName: 'Discord',
      category: 'Communication & Mail',
      authMethod: 'OAuth 2.0 PKCE',
      summary: 'Discord OAuth 2.0 platform utilizing authorization code grant with PKCE, rotating refresh tokens, and dedicated bot rate limits.',
      targetEnvironment: 'Production',
      investigationPurpose: 'both',
      complexity: 'Moderate',
      dependencyRisk: 'Medium'
    },
    sectionB_OAuthConfig: {
      clientRegistration: 'Discord Developer Portal application registration',
      redirectUris: 'Strict HTTPS redirect URI matching; localhost permitted for development.',
      supportedGrantTypes: ['authorization_code', 'refresh_token'],
      pkceRequirement: 'Supported / Recommended',
      clientSecretsHandling: 'Confidential client secret stored securely in backend vault.'
    },
    sectionC_Scopes: [
      {
        name: 'identify',
        tier: 'Standard',
        description: 'Allows /users/@me without email',
        auditRequirement: 'Self-service user consent',
        evidenceStatus: 'official_verified',
        sourceUrl: 'https://discord.com/developers/docs/topics/oauth2'
      },
      {
        name: 'email',
        tier: 'Standard',
        description: 'Enables /users/@me with email',
        auditRequirement: 'User consent prompt',
        evidenceStatus: 'official_verified',
        sourceUrl: 'https://discord.com/developers/docs/topics/oauth2'
      },
      {
        name: 'guilds',
        tier: 'Standard',
        description: 'Allows /users/@me/guilds',
        auditRequirement: 'User consent prompt',
        evidenceStatus: 'official_verified',
        sourceUrl: 'https://discord.com/developers/docs/topics/oauth2'
      }
    ],
    sectionD_Governance: {
      appSubmissionProcess: 'Self-service for standard applications; Bot verification required at 75+ guilds.',
      externalReviewTimelines: 'Instant self-service registration for OAuth applications.',
      adminDependencies: ['Guild Administrator permissions required for bot integration.']
    },
    sectionE_ResourceAccess: {
      workspaceVsResource: 'Guild-level authorization with channel permission overwrites.',
      sharingModel: 'Guild owner or administrator installs integration.',
      granularity: 'Granular Discord role and permission bitwise flags.'
    },
    sectionF_TokenLifecycle: {
      accessTokenLifespan: '604800 seconds (7 days) for Authorization Code Grant exchange.',
      refreshTokenModel: 'Standard OAuth 2.0 refresh token grant documented; rotation policy is not specified.',
      tokenRotation: 'Unknown / Undocumented (official docs do not document single-use rotation or refresh token reuse policy).',
      revocationBehavior: 'OAuth 2.0 token revocation endpoint supported.'
    },
    sectionG_EvidenceAndUnknowns: {
      claims: [
        {
          claimId: 'claim_discord_1',
          providerId: 'prov_discord',
          claimText: 'Discord officially recommends using the Authorization Code Grant with Proof Key for Code Exchange (PKCE) for production applications.',
          sourceUrl: 'https://discord.com/developers/docs/topics/oauth2',
          sourceTitle: 'OAuth2 - Documentation - Discord',
          checkedAt: '2026-11-01',
          applicability: 'Production authorization code grant integrations',
          evidenceStatus: 'official_verified',
          confidence: 'medium',
          supportingExcerpt: 'For production apps, use the authorization code grant with PKCE instead.',
          limitations: 'While documentation explicitly recommends PKCE for production apps, explicit code_challenge and code_verifier schema parameters are not published on this primary topic page.'
        },
        {
          claimId: 'claim_discord_2',
          providerId: 'prov_discord',
          claimText: 'Discord warns against using the implicit grant in production environments due to token leakage risks and lack of refresh tokens.',
          sourceUrl: 'https://discord.com/developers/docs/topics/oauth2',
          sourceTitle: 'OAuth2 - Documentation - Discord',
          checkedAt: '2026-11-01',
          applicability: 'Client-side applications and Single-Page Applications (SPAs)',
          evidenceStatus: 'official_verified',
          confidence: 'high',
          supportingExcerpt: 'The implicit grant is not recommended outside of quick prototypes. It returns the access token directly in the redirect URL, where it can leak through browser history, logs, and Referer headers, and it doesn’t provide a refresh token.'
        },
        {
          claimId: 'claim_discord_3',
          providerId: 'prov_discord',
          claimText: 'Access tokens issued via the OAuth 2.0 authorization code exchange return an expires_in lifespan of 604,800 seconds (7 days).',
          sourceUrl: 'https://discord.com/developers/docs/topics/oauth2',
          sourceTitle: 'OAuth2 - Documentation - Discord',
          checkedAt: '2026-11-01',
          applicability: 'OAuth 2.0 Bearer access tokens returned via Authorization Code Grant exchange',
          evidenceStatus: 'official_verified',
          confidence: 'high',
          supportingExcerpt: '"expires_in" : 604800 ,',
          limitations: 'Applies strictly to user-authorized access tokens; bot tokens do not expire on this schedule.'
        },
        {
          claimId: 'claim_discord_4',
          providerId: 'prov_discord',
          claimText: 'Discord enforces an isolated, dedicated set of rate limits specifically for bot tokens.',
          sourceUrl: 'https://discord.com/developers/docs/topics/oauth2',
          sourceTitle: 'OAuth2 - Documentation - Discord',
          checkedAt: '2026-11-01',
          applicability: 'Bot user tokens and bot-authorized API requests',
          evidenceStatus: 'official_verified',
          confidence: 'high',
          supportingExcerpt: 'Bots have an entirely separate set of rate limits .',
          limitations: 'Documentation confirms separate rate limiting for bots only; global or user-token rate limits require consulting the dedicated Rate Limits documentation endpoint.'
        }
      ],
      knownUnknowns: [
        'Detailed code_challenge schema parameters are not published on the primary topic page.',
        'Global user-token rate limits require consulting the dedicated rate limits documentation.'
      ],
      missingEvidenceNotes: ['Bot verification requirements trigger at scale.']
    }
  },
  evidenceSummary: {
    totalClaims: 4,
    officialVerified: 4,
    corroborated: 0,
    estimated: 0,
    hypothesis: 0,
    unknown: 0,
    missingEvidenceFields: [],
    documentationCoveragePercent: 88
  },
  retrievedSources: [
    {
      url: 'https://discord.com/developers/docs/topics/oauth2',
      title: 'OAuth2 - Documentation - Discord',
      byteCount: 38400,
      fetchedAt: '2026-11-01T09:00:00Z',
      status: 'retrieved'
    }
  ],
  detectedScopes: [
    { name: 'identify', tier: 'Standard', verificationLabel: 'Corroborated' },
    { name: 'email', tier: 'Standard', verificationLabel: 'Corroborated' },
    { name: 'guilds', tier: 'Standard', verificationLabel: 'Corroborated' }
  ],
  identifiedApprovalGates: ['Guild Administrator permissions'],
  unknownQuestions: ['Non-bot user rate limit quotas'],
  summaryNote: 'Discord official developer guide OAuth 2.0 investigation.',
  reviewTimelineNote: 'Instant self-service registration.'
};

export class InvestigationService {
  private static investigations: InvestigationDraft[] = [SEEDED_DISCORD_INVESTIGATION, ...INITIAL_INVESTIGATIONS];

  public static listInvestigations(): InvestigationDraft[] {
    return [...this.investigations];
  }

  public static getInvestigationById(id: string): InvestigationDraft | undefined {
    return this.investigations.find(item => item.id === id);
  }

  /**
   * Runs a complete live investigation:
   * 1. Validates and securely fetches official documentation with SSRF defense.
   * 2. Runs AI extraction or deterministic pattern-based analysis.
   * 3. Structures 7 standard sections and claim-level evidence ledger.
   * 4. Persists the completed report in memory.
   */
  public static async runLiveInvestigation(input: {
    appName: string;
    docUrl: string;
    authMethod?: AuthMethod;
    environmentType?: 'Production' | 'Staging / Sandbox' | 'Internal Tool';
    investigationPurpose?: InvestigationPurpose;
    description?: string;
    urlProvenance?: 'verified_registry' | 'user_supplied' | 'inferred_from_url';
    isDerivedName?: boolean;
  }): Promise<InvestigationDraft> {
    const id = `inv_live_${Date.now()}`;
    const submittedAt = new Date().toISOString();
    const appName = input.appName.trim();
    const docUrl = input.docUrl.trim();
    const purpose: InvestigationPurpose = input.investigationPurpose || 'oauth';
    const envType = input.environmentType || 'Production';

    // Step 1: Initialize record in queued / fetching state
    const record: InvestigationDraft = {
      id,
      appName,
      docUrl,
      authMethod: input.authMethod || 'OAuth 2.0 PKCE',
      environmentType: envType,
      investigationPurpose: purpose,
      description: input.description?.trim(),
      urlProvenance: input.urlProvenance || 'user_supplied',
      isDerivedName: input.isDerivedName,
      submittedAt,
      status: 'fetching_sources',
      progressPercent: 25,
      progressMessage: 'Retrieving official documentation with SSRF protection...',
      detectedScopes: [],
      identifiedApprovalGates: [],
      unknownQuestions: [],
      summaryNote: `Investigation in progress for ${appName}. Fetching official developer reference at ${docUrl}.`,
      reviewTimelineNote: 'Pending extraction...'
    };

    // Prepend to in-memory list
    this.investigations.unshift(record);

    try {
      // Step 2: Fetch documentation safely
      const retrieval = await retrieveDocumentationSources(docUrl);
      record.retrievedSources = retrieval.sources;

      if (!retrieval.success) {
        record.status = 'failed';
        record.progressPercent = 100;
        record.progressMessage = 'Documentation retrieval failed.';
        record.errorMessage = retrieval.error || 'Failed to securely fetch documentation.';
        record.summaryNote = `Documentation retrieval failed for ${appName}: ${record.errorMessage}`;
        record.unknownQuestions = [
          `Documentation endpoint at ${docUrl} could not be retrieved securely.`,
          'Verify that the URL is public, uses HTTP/HTTPS, and does not block automated audit requests.'
        ];
        return record;
      }

      // Step 3: Extract intelligence
      record.status = 'extracting';
      record.progressPercent = 65;
      record.progressMessage = 'Analyzing authentication protocols, scopes, and lifecycle rules...';

      const extraction = await executeLiveExtraction(
        appName,
        docUrl,
        purpose,
        retrieval,
        input.description
      );

      // Step 4: Validate findings & finalize report
      record.status = extraction.status;
      record.completedAt = new Date().toISOString();
      record.progressPercent = 100;
      record.progressMessage = 'Investigation report generated successfully.';
      record.findings = extraction.findings;
      record.evidenceSummary = extraction.evidenceSummary;
      record.extractionEngine = extraction.engine;
      record.summaryNote = extraction.summaryNote;
      record.reviewTimelineNote = extraction.reviewTimelineNote;

      // Update authMethod if detected
      if (extraction.findings?.sectionA_Overview?.authMethod) {
        record.authMethod = extraction.findings.sectionA_Overview.authMethod;
      }

      // Populate legacy compatibility fields
      record.detectedScopes = extraction.findings.sectionC_Scopes.map(sc => ({
        name: sc.name,
        tier: sc.tier as any,
        verificationLabel: sc.evidenceStatus === 'official_verified' ? 'Corroborated' : 'Sample / Unverified'
      }));

      record.identifiedApprovalGates = [
        extraction.findings.sectionD_Governance.appSubmissionProcess || 'Application review',
        ...(extraction.findings.sectionD_Governance.adminDependencies || [])
      ].filter(Boolean);

      record.unknownQuestions = extraction.findings.sectionG_EvidenceAndUnknowns.knownUnknowns;

      return record;
    } catch (err) {
      record.status = 'failed';
      record.progressPercent = 100;
      record.progressMessage = 'Investigation halted due to an unexpected error.';
      record.errorMessage = err instanceof Error ? err.message : String(err);
      record.summaryNote = `Extraction error: ${record.errorMessage}`;
      return record;
    }
  }

  /**
   * Legacy staging method kept for backward compatibility with previous mock endpoints.
   */
  public static stageInvestigation(input: {
    appName: string;
    docUrl: string;
    authMethod: AuthMethod;
    environmentType?: 'Production' | 'Staging / Sandbox' | 'Internal Tool';
  }): InvestigationDraft {
    const newDraft: InvestigationDraft = {
      id: `inv_stage_${Date.now()}`,
      appName: input.appName.trim(),
      docUrl: input.docUrl.trim(),
      authMethod: input.authMethod,
      environmentType: input.environmentType || 'Production',
      submittedAt: new Date().toISOString(),
      status: 'staged_not_connected',
      detectedScopes: [
        { name: 'identity / read', tier: 'Standard', verificationLabel: 'Sample / Unverified' },
        { name: 'resource:write (pending engine verification)', tier: 'Standard', verificationLabel: 'Sample / Unverified' }
      ],
      identifiedApprovalGates: [
        'OAuth Consent Screen verification requirements pending analysis',
        'Developer organization team role clearance'
      ],
      unknownQuestions: [
        'Token revocation endpoint availability and RFC 7009 compliance',
        'Concurrent refresh token lock semantics'
      ],
      summaryNote: 'Staged intake record. Investigation engine is not connected; doc parsing and scope discovery will run when the worker pipeline is activated.',
      reviewTimelineNote: 'No guaranteed review timeline; engine not connected.'
    };

    this.investigations.unshift(newDraft);
    return newDraft;
  }
}
