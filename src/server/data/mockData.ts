/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ProviderRecord,
  ReadinessDimension,
  PlannerTask,
  IntegrationGuide,
  InvestigationDraft
} from '../../shared/types.ts';

export const DEMO_PROVIDERS: ProviderRecord[] = [
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
    requiredApprovals: [
      'Workspace Admin self-service application creation'
    ],
    keyScopes: ['read', 'write', 'issues:create', 'comments:create'],
    scopeDefinitions: [
      {
        name: 'read',
        tier: 'Standard',
        description: 'Read-only access to organization issues, projects, and cycles.',
        auditRequirement: 'Self-service user/admin consent at authorization prompt.',
        evidenceStatus: 'official_verified',
        sourceUrl: 'https://linear.app/docs/oauth-authentication'
      },
      {
        name: 'write',
        tier: 'Standard',
        description: 'Write permissions to mutate issues, comments, and labels.',
        auditRequirement: 'Self-service authorization; no external security review needed.',
        evidenceStatus: 'official_verified',
        sourceUrl: 'https://linear.app/docs/oauth-authentication'
      }
    ],
    tokenLifespan: '24 hours when refresh tokens are enabled (or non-expiring if refresh tokens are disabled)',
    tokenRefreshModel: 'Single-use rotating refresh token; previous refresh token is invalidated immediately upon exchange',
    rateLimitsSummary: 'Leaky bucket algorithm (LIMIT_AMOUNT / LIMIT_PERIOD); limits vary by workspace plan; webhooks recommended over polling',
    knownUnknowns: [
      'Exact numerical leaky bucket fill rate for high-tier enterprise plans is unpublished',
      'Webhook delivery retry backoff behavior under heavy regional network partitions'
    ],
    claims: [
      {
        claimId: 'claim_lin_01',
        providerId: 'prov_linear',
        claimText: 'Linear OAuth access tokens expire 24 hours after issuance when refresh token exchange is enabled.',
        sourceUrl: 'https://linear.app/docs/oauth-authentication',
        sourceTitle: 'Linear OAuth Authentication Documentation',
        checkedAt: '2026-10-31',
        applicability: 'OAuth 2.0 applications with refresh tokens enabled',
        evidenceStatus: 'independently_corroborated',
        confidence: 'high',
        supportingExcerpt: 'Access tokens are short-lived (24 hours) when issued alongside a refresh token.',
        notes: 'If created without refresh tokens, personal tokens remain valid until revoked.',
        limitations: 'Does not apply to personal API keys generated in user profile settings.'
      },
      {
        claimId: 'claim_lin_02',
        providerId: 'prov_linear',
        claimText: 'Refresh tokens are single-use and rotate upon every token refresh exchange.',
        sourceUrl: 'https://linear.app/docs/oauth-authentication',
        sourceTitle: 'Linear OAuth Specification',
        checkedAt: '2026-10-31',
        applicability: 'All OAuth 2.0 clients using grant_type=refresh_token',
        evidenceStatus: 'independently_corroborated',
        confidence: 'high',
        supportingExcerpt: 'Using a refresh token invalidates it and returns a new refresh token to store.',
        notes: 'Race conditions must be handled with concurrency locks in worker services.',
        limitations: 'Unused refresh tokens expire after an extended period of inactivity.'
      },
      {
        claimId: 'claim_lin_03',
        providerId: 'prov_linear',
        claimText: 'API rate limits use a leaky bucket algorithm rather than a flat per-minute window; polling is discouraged in favor of webhooks.',
        sourceUrl: 'https://linear.app/docs/graphql-api',
        sourceTitle: 'Linear GraphQL API Documentation',
        checkedAt: '2026-10-31',
        applicability: 'All API consumers querying GraphQL endpoints',
        evidenceStatus: 'official_verified',
        confidence: 'high',
        supportingExcerpt: 'The API enforces a leaky bucket rate limit. Webhooks should be used to listen for data updates instead of polling.',
        notes: 'A previous flat claim of 1,440 req/min was removed as it is not universally fixed across plans.',
        limitations: 'Enterprise workspaces can request custom limits on a case-by-case basis.'
      }
    ],
    oauthConfig: {
      clientRegistration: 'Self-service registration in Linear Workspace Settings > API > Applications',
      redirectUris: 'Strict HTTPS redirect URIs required (localhost allowed for development)',
      supportedGrantTypes: ['authorization_code', 'refresh_token'],
      pkceRequirement: 'Required',
      clientSecretsHandling: 'Confidential client secret for web servers; PKCE code_challenge required for all auth flows'
    },
    governanceRequirements: {
      appSubmissionProcess: 'Self-service workspace app creation; directory listing requires submission to Linear team',
      externalReviewTimelines: 'Immediate for private workspace integrations; directory listing review turnaround is variable',
      adminDependencies: ['Linear Workspace Admin must create or install the OAuth application'],
      securityAssessments: 'No third-party security audits mandated; standard user authorization consent screen'
    },
    resourceAccessModel: {
      workspaceVsResource: 'Workspace-level installation granting access to organization teams, issues, and projects',
      sharingModel: 'Organization and team-level access matching the authorized user account role',
      granularity: 'User-scoped authorization (respects member permissions in Linear organization)'
    },
    tokenLifecycleDetails: {
      accessTokenLifespan: '24 hours when issued with a refresh token (or non-expiring personal API keys)',
      refreshTokenModel: 'Single-use rotating refresh token',
      tokenRotation: 'Old refresh token is invalidated immediately upon exchange; concurrency lock required',
      revocationBehavior: 'Revoked immediately upon workspace uninstallation, user removal, or token revocation'
    }
  },
  {
    id: 'prov_notion',
    name: 'Notion',
    slug: 'notion',
    category: 'Productivity & Knowledge',
    authMethod: 'OAuth 2.0 Web (Confidential)',
    evidenceStatus: 'Verified Docs (Sample)',
    lastVerifiedDate: '2026-10-31',
    summary: 'Connected workspace API with distinct authorization models for Internal versus Public integrations.',
    documentationUrl: 'https://developers.notion.com/docs/authorization',
    sampleRecord: true,
    waitingTimeRating: 'Immediate for internal; variable review queue for public directory distribution',
    costTier: 'Free API usage within Notion workspace plan limits',
    complexity: 'Moderate',
    dependencyRisk: 'Medium',
    requiredApprovals: [
      'Workspace Admin installation consent',
      'Per-page / per-database explicit connection grant by workspace member'
    ],
    keyScopes: [
      'Read content',
      'Update content',
      'Insert content',
      'Read user info without email',
      'Read user info with email'
    ],
    scopeDefinitions: [
      {
        name: 'Read content',
        tier: 'Standard',
        description: 'Read blocks, page properties, and databases explicitly shared with the integration.',
        auditRequirement: 'Requires user or admin to share target page via page settings menu.',
        evidenceStatus: 'official_verified',
        sourceUrl: 'https://developers.notion.com/docs/authorization'
      },
      {
        name: 'Read user info with email',
        tier: 'Sensitive',
        description: 'Accesses user email addresses associated with workspace members.',
        auditRequirement: 'Explicitly displayed on OAuth authorization consent screen.',
        evidenceStatus: 'official_verified',
        sourceUrl: 'https://developers.notion.com/docs/authorization'
      }
    ],
    tokenLifespan: 'Non-expiring by default (tokens do not expire on a fixed clock timer)',
    tokenRefreshModel: 'Bearer access tokens persist until explicitly uninstalled or revoked by an administrator',
    rateLimitsSummary: 'Average of 3 requests per second per integration with burst allowance; HTTP 429 Retry-After',
    knownUnknowns: [
      'Public directory review turnaround timeline is unpublished and variable (no SLA guaranteed)',
      'Large workspace block tree recursion latency ceilings'
    ],
    claims: [
      {
        claimId: 'claim_notion_01',
        providerId: 'prov_notion',
        claimText: 'Internal integrations use static secret tokens; Public integrations use OAuth 2.0 authorization code exchange.',
        sourceUrl: 'https://developers.notion.com/docs/authorization',
        sourceTitle: 'Notion API Authorization Guide',
        checkedAt: '2026-10-31',
        applicability: 'All Notion API integrations',
        evidenceStatus: 'official_verified',
        confidence: 'high',
        supportingExcerpt: 'Internal integrations are private to a workspace. Public integrations allow external users to connect via OAuth.',
        notes: 'Internal tokens must never be used in client-side code.',
        limitations: 'Public integrations require a redirect URL and client secret.'
      },
      {
        claimId: 'claim_notion_02',
        providerId: 'prov_notion',
        claimText: 'OAuth authorization provides workspace connection, but access to individual pages or databases requires separate explicit user sharing.',
        sourceUrl: 'https://developers.notion.com/docs/authorization',
        sourceTitle: 'Notion API Authorization Guide',
        checkedAt: '2026-10-31',
        applicability: 'Both Internal and Public integrations',
        evidenceStatus: 'official_verified',
        confidence: 'high',
        supportingExcerpt: 'An integration does not have access to any page or database in the workspace until someone in the workspace explicitly shares it with the integration.',
        notes: 'A common point of confusion for developers expecting ambient workspace-wide access.',
        limitations: 'Integrations cannot query child pages if the parent page connection was revoked.'
      },
      {
        claimId: 'claim_notion_03',
        providerId: 'prov_notion',
        claimText: 'Public integration directory review turnaround does not offer a guaranteed SLA.',
        sourceUrl: 'https://developers.notion.com/docs/authorization',
        sourceTitle: 'Notion Integration Submission Guidelines',
        checkedAt: '2026-10-31',
        applicability: 'Public integrations submitted for directory listing',
        evidenceStatus: 'official_verified',
        confidence: 'high',
        supportingExcerpt: 'Review times depend on submission queue volume.',
        notes: 'Previous claim of 24-72 hours was removed because Notion provides no official turnaround guarantee.',
        limitations: 'Internal integrations bypass public directory review entirely.'
      }
    ],
    oauthConfig: {
      clientRegistration: 'Self-service registration in Notion Developer Portal (notion.so/my-integrations)',
      redirectUris: 'Configured in integration settings; strict HTTPS required in production',
      supportedGrantTypes: ['authorization_code'],
      pkceRequirement: 'Not Supported',
      clientSecretsHandling: 'Requires Client ID and Client Secret exchanged via Basic HTTP Authentication header'
    },
    governanceRequirements: {
      appSubmissionProcess: 'Internal integrations bypass submission; Public integrations require directory review submission',
      externalReviewTimelines: 'Immediate for internal integrations; public directory review turnaround has no SLA guarantee',
      adminDependencies: [
        'Workspace Admin must install integration into target workspace',
        'Workspace members must explicitly share specific pages/databases'
      ],
      securityAssessments: 'Standard Notion team review for directory listing; no mandatory external lab audit'
    },
    resourceAccessModel: {
      workspaceVsResource: 'Dual-layer: workspace installation provides integration identity, but zero ambient access to pages',
      sharingModel: 'Explicit per-page sharing; user must click "Connect to" on individual pages/databases',
      granularity: 'Page-level and database-level access with child inheritance unless parent connection is revoked'
    },
    tokenLifecycleDetails: {
      accessTokenLifespan: 'Non-expiring by default (tokens do not expire on a fixed clock timer)',
      refreshTokenModel: 'No refresh token issued; static bearer access token',
      tokenRotation: 'None (static bearer token)',
      revocationBehavior: 'Revoked immediately when workspace admin or user disconnects the integration'
    }
  },
  {
    id: 'prov_gmail',
    name: 'Gmail (Google Workspace)',
    slug: 'gmail',
    category: 'Communication & Mail',
    authMethod: 'OAuth 2.0 + Scopes',
    evidenceStatus: 'Verified Docs (Sample)',
    lastVerifiedDate: '2026-10-31',
    summary: 'Google Workspace email service with strict separation between Non-Sensitive, Sensitive, and Restricted scope governance tiers.',
    documentationUrl: 'https://developers.google.com/gmail/api/auth/about-auth',
    sampleRecord: true,
    waitingTimeRating: 'Scope-dependent: immediate for dev testing, variable multi-week queue if Restricted scopes require CASA Tier 2',
    costTier: 'Scope-dependent: free for basic scopes; 3rd-party security lab fees apply only if Restricted scopes are used',
    complexity: 'High',
    dependencyRisk: 'High',
    requiredApprovals: [
      'Google Cloud Console OAuth Consent Screen configuration',
      'Google Trust & Safety verification for Sensitive or Restricted scopes',
      'CASA Tier 2 Security Assessment (strictly required ONLY if using Restricted scopes that store or process user data externally)'
    ],
    keyScopes: [
      'https://www.googleapis.com/auth/gmail.send (Sensitive)',
      'https://www.googleapis.com/auth/gmail.readonly (Restricted)',
      'https://www.googleapis.com/auth/gmail.modify (Restricted)'
    ],
    scopeDefinitions: [
      {
        name: 'https://www.googleapis.com/auth/gmail.send',
        tier: 'Sensitive',
        description: 'Send email on user behalf without mailbox reading permissions.',
        auditRequirement: 'Google Trust & Safety OAuth verification (requires demo video, privacy policy, domain verification). Does NOT require CASA Tier 2 third-party lab audit.',
        evidenceStatus: 'official_verified',
        sourceUrl: 'https://developers.google.com/identity/protocols/oauth2/scopes'
      },
      {
        name: 'https://www.googleapis.com/auth/gmail.readonly',
        tier: 'Restricted',
        description: 'Read user emails, message headers, and mailbox metadata.',
        auditRequirement: 'Requires full Google Trust & Safety review AND annual Cloud Application Security Assessment (CASA Tier 2) by an authorized independent security lab if data touches a server.',
        evidenceStatus: 'official_verified',
        sourceUrl: 'https://developers.google.com/gmail/api/auth/about-auth'
      },
      {
        name: 'https://www.googleapis.com/auth/gmail.modify',
        tier: 'Restricted',
        description: 'Modify user emails, labels, and message status.',
        auditRequirement: 'Requires Google Trust & Safety review and annual CASA Tier 2 external security lab assessment if data is processed on external servers.',
        evidenceStatus: 'official_verified',
        sourceUrl: 'https://developers.google.com/gmail/api/auth/about-auth'
      }
    ],
    tokenLifespan: '1 hour access token',
    tokenRefreshModel: 'Standard refresh token; revoked on password reset or after 6 months of continuous inactivity',
    rateLimitsSummary: '250 quota units / user / second; default project quota allocations apply',
    knownUnknowns: [
      'Authorized security lab review turnaround and audit pricing vary by vendor (no universal fixed fee)',
      'Google Trust & Safety review turnaround varies with review queue volume'
    ],
    claims: [
      {
        claimId: 'claim_gmail_01',
        providerId: 'prov_gmail',
        claimText: 'Google separates OAuth scopes into Non-Sensitive, Sensitive, and Restricted tiers with graduated verification requirements.',
        sourceUrl: 'https://developers.google.com/identity/protocols/oauth2/scopes',
        sourceTitle: 'Google Identity OAuth 2.0 Scopes Documentation',
        checkedAt: '2026-10-31',
        applicability: 'All Google Cloud Console OAuth applications',
        evidenceStatus: 'official_verified',
        confidence: 'high',
        supportingExcerpt: 'Scopes are classified as non-sensitive, sensitive, or restricted based on the level of user data access requested.',
        notes: 'Not all Gmail integrations require third-party security audits.',
        limitations: 'Internal domain-wide Google Workspace applications can be exempted from public verification.'
      },
      {
        claimId: 'claim_gmail_02',
        providerId: 'prov_gmail',
        claimText: 'CASA Tier 2 independent security lab assessments are strictly required for Restricted scopes that store or transmit data via external servers, NOT for Sensitive scopes.',
        sourceUrl: 'https://developers.google.com/gmail/api/auth/about-auth',
        sourceTitle: 'Gmail API Authentication & Verification Overview',
        checkedAt: '2026-10-31',
        applicability: 'Applications requesting Restricted scopes such as gmail.readonly or gmail.modify',
        evidenceStatus: 'official_verified',
        confidence: 'high',
        supportingExcerpt: 'Applications requesting restricted scopes that store or transmit Google user data on external servers must undergo security assessment by an authorized CASA lab.',
        notes: 'Sensitive scopes such as gmail.send only require Google verification, not a third-party CASA Tier 2 audit.',
        limitations: 'Client-only applications that do not transmit data to external servers may be subject to alternative verification paths.'
      },
      {
        claimId: 'claim_gmail_03',
        providerId: 'prov_gmail',
        claimText: 'CASA Tier 2 assessment costs and review turnaround times vary by authorized security laboratory; no universal fixed fee ($15k-$75k) is published by Google.',
        sourceUrl: 'https://appdefensealliance.dev/casa',
        sourceTitle: 'App Defense Alliance CASA Guidelines',
        checkedAt: '2026-10-31',
        applicability: 'Restricted scope applications undergoing third-party lab assessment',
        evidenceStatus: 'official_verified',
        confidence: 'high',
        supportingExcerpt: 'Assessment pricing and timelines are negotiated directly between the developer and the authorized assessment laboratory.',
        notes: 'The unsupported $15,000-$75,000 universal claim has been removed.',
        limitations: 'Pricing depends on application architecture complexity, endpoint count, and chosen lab vendor.'
      }
    ],
    oauthConfig: {
      clientRegistration: 'Configured in Google Cloud Console > APIs & Services > Credentials & OAuth Consent Screen',
      redirectUris: 'Strict URI matching; top-level domain must be verified in Google Search Console',
      supportedGrantTypes: ['authorization_code', 'refresh_token'],
      pkceRequirement: 'Supported / Recommended',
      clientSecretsHandling: 'Confidential client secret for web servers; kept strictly server-side'
    },
    governanceRequirements: {
      appSubmissionProcess: 'Google Cloud Console OAuth verification submission including demo video and privacy policy',
      externalReviewTimelines: 'Scope-dependent: immediate for internal/test users (max 100), several weeks for Trust & Safety review',
      adminDependencies: [
        'Google Cloud Project Owner to configure consent screen',
        'Google Workspace Admin to grant domain-wide delegation or allowlist unverified apps (if enterprise)'
      ],
      securityAssessments: 'Annual CASA Tier 2 independent security assessment by authorized lab strictly for Restricted scopes touching external servers'
    },
    resourceAccessModel: {
      workspaceVsResource: 'User-level authorization granting access to the authorized user Google account / mailbox',
      sharingModel: 'Mailbox-wide or label-wide based on requested scope tier (readonly vs modify vs send)',
      granularity: 'Scope-based access; application receives permissions strictly corresponding to consented scopes'
    },
    tokenLifecycleDetails: {
      accessTokenLifespan: '3,600 seconds (1 hour)',
      refreshTokenModel: 'Long-lived refresh token issued with access_type=offline and prompt=consent',
      tokenRotation: 'Refresh token does not automatically rotate on every exchange unless requested',
      revocationBehavior: 'Revoked on user password change, credential reset, or after 6 months continuous inactivity'
    }
  },
  {
    id: 'prov_servicenow',
    name: 'ServiceNow',
    slug: 'servicenow',
    category: 'Enterprise ITSM',
    authMethod: 'OAuth 2.0 + Instance Admin',
    evidenceStatus: 'In Review',
    lastVerifiedDate: '2026-10-31',
    summary: 'Enterprise cloud platform where OAuth clients, scopes, and token lifespans are configured per customer instance by system administrators.',
    documentationUrl: 'https://docs.servicenow.com/bundle/vancouver-application-development/page/administer/security/concept/c_OAuthApplications.html',
    sampleRecord: true,
    waitingTimeRating: 'Customer-specific: depends entirely on customer IT/SecOps change approval windows',
    costTier: 'Customer license dependent (no separate public developer API fee)',
    complexity: 'Extreme',
    dependencyRisk: 'Critical',
    requiredApprovals: [
      'Customer Instance System Administrator entry in Application Registry (oauth_entity)',
      'Cross-Scope Privilege approval (sys_scope_privilege) for protected tables and script includes',
      'Corporate InfoSec firewall / IP whitelist clearance for webhook ingress/egress'
    ],
    keyScopes: ['Custom instance-defined scopes (configured in oauth_entity_scope)'],
    scopeDefinitions: [
      {
        name: 'Instance-Configured Scopes',
        tier: 'Instance-Configured',
        description: 'Scopes in ServiceNow are not universal platform defaults; they are configured per instance in the oauth_entity_scope table.',
        auditRequirement: 'Customer System Administrator approval and assignment per OAuth client profile.',
        evidenceStatus: 'official_verified',
        sourceUrl: 'https://docs.servicenow.com/bundle/vancouver-application-development/page/administer/security/concept/c_OAuthApplications.html'
      }
    ],
    tokenLifespan: 'Instance-configured (default template is 1,800s / 30m, but fully customizable per instance policy)',
    tokenRefreshModel: 'Instance-configured refresh token duration (default template 8,640,000s / 100 days, customizable)',
    rateLimitsSummary: 'Instance-configured REST API rate limiting rules managed by customer system administrators',
    knownUnknowns: [
      'Customer instance plugin customizations and ACL rule variances between release families',
      'Customer-specific IP Access Control rules and mutual TLS (mTLS) requirements'
    ],
    claims: [
      {
        claimId: 'claim_sn_01',
        providerId: 'prov_servicenow',
        claimText: 'ServiceNow OAuth scopes are not universal platform defaults; they are configured per instance in the oauth_entity_scope table by administrators.',
        sourceUrl: 'https://docs.servicenow.com/bundle/vancouver-application-development/page/administer/security/concept/c_OAuthApplications.html',
        sourceTitle: 'ServiceNow Product Documentation: OAuth Applications',
        checkedAt: '2026-10-31',
        applicability: 'All external integrations connecting to ServiceNow instances',
        evidenceStatus: 'official_verified',
        confidence: 'high',
        supportingExcerpt: 'OAuth entity scopes define the scope of access and are configured within the application registry on the target instance.',
        notes: 'Hardcoded universal scope names like useraccount or cmdb_read are customer instance-dependent, not platform standards.',
        limitations: 'Each target customer instance must be provisioned individually.'
      },
      {
        claimId: 'claim_sn_02',
        providerId: 'prov_servicenow',
        claimText: 'Access token and refresh token lifespans in ServiceNow are template defaults that can be overridden by instance security policy.',
        sourceUrl: 'https://docs.servicenow.com/bundle/vancouver-application-development/page/administer/security/concept/c_OAuthApplications.html',
        sourceTitle: 'ServiceNow Product Documentation: OAuth Configuration',
        checkedAt: '2026-10-31',
        applicability: 'oauth_entity records on ServiceNow customer instances',
        evidenceStatus: 'official_verified',
        confidence: 'high',
        supportingExcerpt: 'Administrators specify token lifespans in seconds when creating the Application Registry entry.',
        notes: 'Values like 1,800 seconds are initial template values, not universal immutable defaults.',
        limitations: 'Security policies in heavily regulated enterprises often shorten token lifespans.'
      },
      {
        claimId: 'claim_sn_03',
        providerId: 'prov_servicenow',
        claimText: 'Cross-Scope Privileges (sys_scope_privilege) must be authorized for external integrations accessing protected table data.',
        sourceUrl: 'https://docs.servicenow.com/bundle/vancouver-application-development/page/build/applications/concept/c_CrossScopePrivilegeRecord.html',
        sourceTitle: 'ServiceNow Cross-Scope Privilege Documentation',
        checkedAt: '2026-10-31',
        applicability: 'Scripted REST APIs and direct table API calls',
        evidenceStatus: 'official_verified',
        confidence: 'high',
        supportingExcerpt: 'Cross-scope privilege records grant access to runtime resources outside the caller scope.',
        notes: 'Failure to configure cross-scope privileges triggers silent runtime authorization errors.',
        limitations: 'Applies to scoped applications; global scope has broader privileges.'
      }
    ],
    oauthConfig: {
      clientRegistration: 'Customer instance System Administrator must create entry in Application Registry (oauth_entity)',
      redirectUris: 'Configured per instance client record in oauth_entity',
      supportedGrantTypes: ['authorization_code', 'refresh_token', 'password', 'client_credentials'],
      pkceRequirement: 'Instance-dependent',
      clientSecretsHandling: 'Client Secret generated and stored in customer instance database (encrypted sys_field)'
    },
    governanceRequirements: {
      appSubmissionProcess: 'Internal IT change management request on each customer instance',
      externalReviewTimelines: 'Customer-specific: depends entirely on customer IT/SecOps change approval cadence',
      adminDependencies: [
        'Customer Instance System Administrator (admin role) to configure Application Registry',
        'Sys Admin to authorize Cross-Scope Privileges (sys_scope_privilege)',
        'Corporate Network / InfoSec team to whitelist IP addresses if egress firewall is active'
      ],
      securityAssessments: 'Customer-mandated internal InfoSec architecture and compliance review'
    },
    resourceAccessModel: {
      workspaceVsResource: 'Instance-level registration coupled with user account or service account credentials',
      sharingModel: 'Table ACLs (Access Control Lists), Role-Based Access Control, and Cross-Scope Privileges',
      granularity: 'Row-level and field-level ACLs enforce precise read/write rules per ServiceNow table'
    },
    tokenLifecycleDetails: {
      accessTokenLifespan: 'Instance-configured (default template is 1,800s / 30m, customizable)',
      refreshTokenModel: 'Instance-configured (default template is 8,640,000s / 100 days, customizable)',
      tokenRotation: 'Configurable per instance OAuth profile policies',
      revocationBehavior: 'Tokens can be revoked directly in oauth_credential table by instance administrators'
    }
  }
];

export const READINESS_DIMENSIONS: ReadinessDimension[] = [
  {
    key: 'technical_effort',
    name: 'Technical Effort',
    tagline: 'Engineering hours and architectural complexity',
    description: 'Measures the coding, token lifecycle plumbing, webhook reliability, cryptography (PKCE/HMAC), and schema transformation required to establish and maintain the integration.',
    metricUnits: 'Engineering story points / estimated dev days',
    rubricCriteria: [
      'PKCE vs. confidential client secret management in distributed workers',
      'Token storage encryption, automatic token refresh loops, and atomic mutexes',
      'Webhook signature verification (HMAC SHA-256), idempotency keys, and replay caches',
      'Pagination mechanics (cursor vs offset) and batch payload limits'
    ],
    commonPitfalls: [
      'Assuming token refresh never fails under concurrency (race conditions updating same refresh token)',
      'Underestimating clock skew in JWT / OAuth signature verification'
    ]
  },
  {
    key: 'waiting_time',
    name: 'External Waiting Time',
    tagline: 'Approval calendars and partner verification latency',
    description: 'Quantifies calendar delay spent waiting on third-party security audits, marketplace review queues, domain verification checks, and partner developer support.',
    metricUnits: 'Calendar turnaround (days to weeks)',
    rubricCriteria: [
      'OAuth consent screen brand review lead times',
      'Third-party external pen-testing and SOC2/CASA assessment cycles',
      'Domain verification (DNS TXT record propagation) and brand ownership',
      'Partner marketplace listing review queues and revision feedback cycles'
    ],
    commonPitfalls: [
      'Promising an integration release date before initiating vendor verification',
      'Failing initial video demo submission requirements on consent screen reviews'
    ]
  },
  {
    key: 'direct_cost',
    name: 'Direct Cost',
    tagline: 'Mandatory fees, assessment costs, and licensing',
    description: 'Identifies non-negotiable financial outlays directly caused by integrating with this provider, including third-party audit firm retainers, paid developer tiers, and API consumption fees.',
    metricUnits: 'USD annual recurring or one-off assessment cost',
    rubricCriteria: [
      'Third-party authorized security laboratory assessment fees (scope-dependent; costs vary by vendor)',
      'Mandatory enterprise developer partner program membership fees',
      'Per-seat or per-API-call billing thresholds upon exceeding starter tiers',
      'Dedicated sandbox / developer tenant hosting costs'
    ],
    commonPitfalls: [
      'Assuming third-party security audits are free or have fixed universal fees',
      'Unanticipated egress fees when polling high-volume endpoints'
    ]
  },
  {
    key: 'internal_dependencies',
    name: 'Internal Dependencies',
    tagline: 'Cross-functional approvals inside your organization',
    description: 'Maps internal organizational bottlenecks—Legal, InfoSec, Compliance, Infrastructure, and Customer Success—that must review policies, privacy declarations, and data flows.',
    metricUnits: 'Internal review checkpoints & team involvement',
    rubricCriteria: [
      'Privacy Policy updates for newly captured data fields and third-party data transit',
      'InfoSec review of refresh token storage mechanisms and secret vaults (KMS)',
      'Enterprise customer consent agreements (DPA updates)',
      'Infrastructure setup for static egress IP proxies or webhook receivers'
    ],
    commonPitfalls: [
      'Legal rejection of vendor Terms of Service / Developer Agreement after code completion',
      'Unavailability of dedicated enterprise tenant credentials for staging testing'
    ]
  },
  {
    key: 'dependency_risk',
    name: 'Dependency Risk',
    tagline: 'API instability, breaking changes, and vendor lock-in',
    description: 'Assesses the vendor’s historical change cadence, deprecation policies, rate limit enforcement harshness, and platform governance stability.',
    metricUnits: 'Stability rating & vendor SLA adherence',
    rubricCriteria: [
      'Deprecation notice windows (e.g. 180 days vs sudden silent removals)',
      'Granularity of permission scopes (excessive scopes trigger user distrust)',
      'Reliability of status page and historical webhook delivery uptime',
      'Vendor policy restrictions on competitive workflows or data hoarding'
    ],
    commonPitfalls: [
      'Vendor unexpectedly deprecating basic auth or legacy v1 endpoints without clear migration paths',
      'Overly broad scopes causing enterprise prospect security teams to veto deployment'
    ]
  },
  {
    key: 'evidence_confidence',
    name: 'Evidence Confidence',
    tagline: 'Verification quality and freshness of documentation',
    description: 'Measures whether claims are grounded in verified, authoritative vendor documentation, or whether they rely on outdated blog posts, community speculation, or unverified claims.',
    metricUnits: 'Documentation audit grade (A to F)',
    rubricCriteria: [
      'Direct links to official developer documentation with timestamp validation',
      'Presence of interactive API playground / OpenAPI specifications',
      'Clarity of error response code documentation (specifically 401, 403, 429)',
      'Explicit disclosure of token lifetimes and refresh token revocation rules'
    ],
    commonPitfalls: [
      'Relying on unofficial StackOverflow threads for token refresh behavior',
      'Vendor docs not mentioning hidden tenant-level rate limit overrides'
    ]
  }
];

export const DEMO_TASKS: PlannerTask[] = [
  {
    id: 'task_pkce_gen',
    title: 'Generate PKCE S256 Code Verifier & Challenge Utilities',
    description: 'Implement RFC 7636 cryptographic helper using Web Crypto API / Node crypto for secure authorization code exchange.',
    category: 'agent_prepared',
    status: 'ready_for_review',
    priority: 'high',
    providerName: 'Linear',
    estimatedHours: 3,
    automationCapabilityNote: 'Template code and unit tests can be autonomously generated by developer tooling.'
  },
  {
    id: 'task_refresh_mutex',
    title: 'Construct Distributed Refresh Token Mutex with Exponential Backoff',
    description: 'Prevent concurrent token refresh race conditions when rotating single-use refresh tokens across distributed workers.',
    category: 'agent_prepared',
    status: 'in_progress',
    priority: 'high',
    providerName: 'Linear',
    estimatedHours: 6,
    automationCapabilityNote: 'Deterministic state machine boilerplate ready for architecture review.'
  },
  {
    id: 'task_casa_tier2',
    title: 'Engage Authorized Lab for CASA Tier 2 Security Assessment (If Restricted Scopes Required)',
    description: 'Submit application architecture diagram and security questionnaires only if application requires restricted scopes (e.g. reading mailbox contents).',
    category: 'human_required',
    status: 'todo',
    priority: 'critical',
    providerName: 'Gmail',
    estimatedHours: 40,
    humanOwnerRole: 'Director of Security / Compliance Officer'
  },
  {
    id: 'task_demo_video',
    title: 'Record & Submit OAuth Consent Screen Demo Video',
    description: 'Walkthrough demonstrating user consent flow, OAuth client ID in URL bar, and explicit usage of requested scopes for Google Trust & Safety review.',
    category: 'human_required',
    status: 'in_progress',
    priority: 'medium',
    providerName: 'Gmail',
    estimatedHours: 4,
    humanOwnerRole: 'Product Manager'
  },
  {
    id: 'task_servicenow_registry',
    title: 'Coordinate Application Registry Configuration with Customer ServiceNow System Admin',
    description: 'Work with customer enterprise IT admin to create an Application Registry entry (oauth_entity) and define instance-specific scopes on target instance.',
    category: 'human_required',
    status: 'todo',
    priority: 'high',
    providerName: 'ServiceNow',
    estimatedHours: 8,
    humanOwnerRole: 'Solutions Architect / IT Admin'
  },
  {
    id: 'task_rate_limit_backoff',
    title: 'Determine Leaky Bucket Replenishment Rate for Enterprise Workspace Tier',
    description: 'Linear documentation states leaky bucket algorithm is used, but exact bucket capacity for high-volume enterprise plans requires support inquiry.',
    category: 'blocked_unverified',
    status: 'blocked',
    priority: 'medium',
    providerName: 'Linear',
    blockerReason: 'Awaiting vendor developer support confirmation of enterprise plan refill rate.'
  },
  {
    id: 'task_servicenow_washington',
    title: 'Verify Customer Instance Cross-Scope Privilege Policy for Target Tables',
    description: 'Determine whether customer instance sys_scope_privilege rules require manual admin override for custom Scripted REST APIs.',
    category: 'blocked_unverified',
    status: 'blocked',
    priority: 'high',
    providerName: 'ServiceNow',
    blockerReason: 'Awaiting customer staging instance access to inspect sys_scope_privilege entries.'
  }
];

export const DEMO_GUIDES: IntegrationGuide[] = [
  {
    id: 'guide_linear',
    slug: 'linear-oauth-pkce',
    title: 'Architecting Integrations with Linear OAuth 2.0 & Rotating Refresh Tokens',
    providerName: 'Linear',
    lastUpdated: '2026-10-31',
    evidenceStatus: 'Verified Docs (Sample)',
    readTime: '8 min read',
    summary: 'Technical blueprint for implementing Linear OAuth 2.0 with PKCE authorization code exchange, rotating refresh token storage, and leaky-bucket rate limit backoff.',
    isDemonstration: true,
    sections: [
      {
        title: '1. Authorization Flow & PKCE Parameters',
        content: 'Linear supports standard OAuth 2.0 with Proof Key for Code Exchange (RFC 7636). Both public and confidential clients should utilize code_challenge with code_challenge_method=S256 to safeguard against authorization code interception attacks.',
        codeSnippet: `// Linear Authorization URL Generation
const authUrl = new URL('https://linear.app/oauth/authorize');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', 'read,write,issues:create');
authUrl.searchParams.set('code_challenge', codeChallenge);
authUrl.searchParams.set('code_challenge_method', 'S256');
authUrl.searchParams.set('state', csrfState);`
      },
      {
        title: '2. Token Lifecycle & Rotation Rules',
        content: 'When refresh tokens are enabled, Linear access tokens expire in 24 hours. Refresh tokens are single-use: exchanging a refresh token invalidates it and issues a new refresh token that your application must immediately store.'
      },
      {
        title: '3. Webhook Ingestion & HMAC Verification',
        content: 'Linear sends HTTP POST requests containing events such as Issue.create, Issue.update, and Comment.create. Every webhook payload is signed with an HMAC SHA-256 header (Linear-Signature). Always verify this signature against raw payload bytes prior to JSON parsing.',
        warning: 'Ensure raw express body buffer is preserved. Calling body-parser beforehand will corrupt binary signature calculations.'
      }
    ]
  },
  {
    id: 'guide_gmail',
    slug: 'gmail-restricted-scopes-casa',
    title: 'Scope Tiers & Security Assessments: Navigating Google Workspace Verification',
    providerName: 'Gmail',
    lastUpdated: '2026-10-31',
    evidenceStatus: 'Verified Docs (Sample)',
    readTime: '12 min read',
    summary: 'Essential preparation guide distinguishing Non-Sensitive, Sensitive, and Restricted Google scopes, explaining when CASA Tier 2 is required.',
    isDemonstration: true,
    sections: [
      {
        title: '1. Understanding Scope Categories (Non-Sensitive vs Sensitive vs Restricted)',
        content: 'Google categorizes API scopes into three distinct tiers. Non-sensitive scopes (profile, email) require basic consent screen configuration. Sensitive scopes (gmail.send) require Google Trust & Safety review. Restricted scopes (gmail.readonly, gmail.modify, mail.google.com) trigger mandatory third-party security assessment (CASA Tier 2) if data is processed or stored on external servers.'
      },
      {
        title: '2. CASA Tier 2 Assessment Scope & Cost Realities',
        content: 'The Cloud Application Security Assessment (CASA) is governed by the App Defense Alliance. An authorized assessment laboratory will examine web application endpoints (DAST scan) and compliance questionnaires (SAQ based on OWASP ASVS). Pricing and review schedules are negotiated directly with authorized labs and vary based on application scope.',
        warning: 'CASA audits are an annual requirement for restricted scopes. Do not assume universal fixed fees or fixed review turnaround SLAs.'
      },
      {
        title: '3. Required Application Artifacts',
        content: 'Before initiating review, prepare: (1) A publicly accessible Privacy Policy explicitly explaining how Google user data is accessed, stored, and protected; (2) An unlisted YouTube video showing the OAuth consent screen with the URL bar visible, followed by the user journey requiring the scope; (3) Verified ownership of all redirect domains via Google Search Console.'
      }
    ]
  },
  {
    id: 'guide_notion',
    slug: 'notion-public-integrations',
    title: 'Deploying Notion Integrations: Internal Tokens vs Public OAuth & Page Grants',
    providerName: 'Notion',
    lastUpdated: '2026-10-31',
    evidenceStatus: 'Verified Docs (Sample)',
    readTime: '8 min read',
    summary: 'Understanding Notion authorization models: how internal static tokens differ from public OAuth connections, and why explicit page sharing is required.',
    isDemonstration: true,
    sections: [
      {
        title: '1. Internal vs. Public Integrations',
        content: 'Internal integrations use static secret tokens configured directly within an individual workspace and do not expire on a timer. When building SaaS platforms that serve multiple external customers, you must configure a Public Integration utilizing OAuth 2.0 authorization code exchange.'
      },
      {
        title: '2. The Explicit Page Grant Requirement',
        content: 'Even after a user authorizes your OAuth application, your integration does not possess ambient access to the entire workspace. The authorizing user or workspace admin must explicitly grant the integration access to top-level pages or databases via the page menu.',
        warning: 'Applications must provide clear in-product onboarding guidance instructing users to "Add connection" to specific parent databases.'
      }
    ]
  },
  {
    id: 'guide_servicenow',
    slug: 'servicenow-oauth-enterprise',
    title: 'ServiceNow Enterprise OAuth & Instance Application Registry Guide',
    providerName: 'ServiceNow',
    lastUpdated: '2026-10-31',
    evidenceStatus: 'In Review',
    readTime: '10 min read',
    summary: 'Working with customer-instance-specific OAuth entities, configurable token durations, and Cross-Scope Privileges in enterprise ServiceNow environments.',
    isDemonstration: true,
    sections: [
      {
        title: '1. Tenant-Specific OAuth Entities (oauth_entity)',
        content: 'ServiceNow does not feature a single global OAuth marketplace where an app is registered once. Each customer instance (e.g. customer.service-now.com) requires an entry in the Application Registry table created by a System Administrator with custom or template scopes.'
      },
      {
        title: '2. Cross-Scope Privileges (sys_scope_privilege)',
        content: 'When an incoming OAuth request invokes REST endpoints or Scripted REST APIs that touch protected tables (such as incident or cmdb_ci), the instance evaluates Cross-Scope Privileges. Ensure your onboarding documentation provides the required script includes.'
      }
    ]
  }
];

export const DEMO_INVESTIGATION_HISTORY: InvestigationDraft[] = [
  {
    id: 'inv_stripe_01',
    appName: 'Stripe Connect',
    docUrl: 'https://docs.stripe.com/connect/oauth-reference',
    authMethod: 'OAuth 2.0 Web (Confidential)',
    environmentType: 'Production',
    submittedAt: '2026-10-30T14:22:00Z',
    status: 'staged_not_connected',
    detectedScopes: [
      { name: 'read_write', tier: 'Standard', verificationLabel: 'Sample / Unverified' },
      { name: 'read_only', tier: 'Standard', verificationLabel: 'Sample / Unverified' }
    ],
    identifiedApprovalGates: [
      'Stripe Dashboard Connect Settings Activation',
      'Platform Terms of Service agreement',
      'Merchant KYC / Identity Verification'
    ],
    unknownQuestions: [
      'Standard vs Express vs Custom account onboarding handoff variations',
      'Webhook signature secret rotation schedule for multi-region endpoints'
    ],
    summaryNote: 'Staged intake record. Investigation engine is not connected; autonomous doc crawler pending activation. All detected scopes and requirements are sample unverified models.',
    reviewTimelineNote: 'No guaranteed review timeline; depends on platform verification and underwriting requirements.'
  },
  {
    id: 'inv_slack_02',
    appName: 'Slack App Directory',
    docUrl: 'https://api.slack.com/authentication/oauth-v2',
    authMethod: 'OAuth 2.0 + Scopes',
    environmentType: 'Production',
    submittedAt: '2026-10-28T09:15:00Z',
    status: 'staged_not_connected',
    detectedScopes: [
      { name: 'chat:write', tier: 'Standard', verificationLabel: 'Sample / Unverified' },
      { name: 'channels:read', tier: 'Standard', verificationLabel: 'Sample / Unverified' },
      { name: 'commands', tier: 'Standard', verificationLabel: 'Sample / Unverified' }
    ],
    identifiedApprovalGates: [
      'Slack App Directory Review (timeline is variable; no fixed SLA guaranteed)',
      'Workspace Enterprise Grid Admin installation policies'
    ],
    unknownQuestions: [
      'Granular bot token vs user token permission segregation limits',
      'Rate limit tiering between Free and Enterprise Grid plans'
    ],
    summaryNote: 'Staged intake record. Investigation engine is not connected; autonomous doc crawler pending activation. All detected scopes and requirements are sample unverified models.',
    reviewTimelineNote: 'Review turnaround is variable and depends on App Directory queue volume; no guaranteed SLA.'
  }
];
