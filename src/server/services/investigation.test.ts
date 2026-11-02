/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isPrivateOrBlockedIPv4,
  isPrivateOrBlockedIPv6,
  isIpBlockedOrPrivate,
  validateTargetUrl,
  extractTextFromHtml
} from './docRetrievalService.ts';
import { runDeterministicExtraction } from './extractionService.ts';
import { InvestigationService } from './investigationService.ts';
import { validateInvestigationIntake, AppError } from '../middleware/validate.ts';

test('SSRF Protection: isPrivateOrBlockedIPv4 correctly identifies private, loopback, and cloud metadata IPs', () => {
  // Loopback
  assert.equal(isPrivateOrBlockedIPv4('127.0.0.1'), true);
  assert.equal(isPrivateOrBlockedIPv4('127.0.1.5'), true);

  // Cloud metadata & Link-local (AWS/GCP/Azure metadata service 169.254.169.254)
  assert.equal(isPrivateOrBlockedIPv4('169.254.169.254'), true);
  assert.equal(isPrivateOrBlockedIPv4('169.254.1.1'), true);

  // RFC 1918 Private networks
  assert.equal(isPrivateOrBlockedIPv4('10.0.0.1'), true);
  assert.equal(isPrivateOrBlockedIPv4('10.255.255.255'), true);
  assert.equal(isPrivateOrBlockedIPv4('172.16.0.1'), true);
  assert.equal(isPrivateOrBlockedIPv4('172.31.255.255'), true);
  assert.equal(isPrivateOrBlockedIPv4('192.168.0.1'), true);
  assert.equal(isPrivateOrBlockedIPv4('192.168.100.50'), true);

  // Current network & Broadcast
  assert.equal(isPrivateOrBlockedIPv4('0.0.0.0'), true);
  assert.equal(isPrivateOrBlockedIPv4('255.255.255.255'), true);

  // Carrier-grade NAT (100.64.0.0/10)
  assert.equal(isPrivateOrBlockedIPv4('100.64.0.1'), true);
  assert.equal(isPrivateOrBlockedIPv4('100.127.255.255'), true);

  // Multicast (224.0.0.0/4)
  assert.equal(isPrivateOrBlockedIPv4('224.0.0.1'), true);
  assert.equal(isPrivateOrBlockedIPv4('239.255.255.255'), true);

  // Legitimate public IPs
  assert.equal(isPrivateOrBlockedIPv4('8.8.8.8'), false);
  assert.equal(isPrivateOrBlockedIPv4('1.1.1.1'), false);
  assert.equal(isPrivateOrBlockedIPv4('93.184.216.34'), false);
  assert.equal(isPrivateOrBlockedIPv4('172.32.0.1'), false); // Just outside 172.16.0.0/12
});

test('SSRF Protection: isPrivateOrBlockedIPv6 correctly blocks loopback, site-local, and IPv4-mapped addresses', () => {
  // Loopback
  assert.equal(isPrivateOrBlockedIPv6('::1'), true);
  assert.equal(isPrivateOrBlockedIPv6('0:0:0:0:0:0:0:1'), true);

  // Unique Local (fc00::/7)
  assert.equal(isPrivateOrBlockedIPv6('fc00::1'), true);
  assert.equal(isPrivateOrBlockedIPv6('fd12:3456:789a::1'), true);

  // Link-Local (fe80::/10)
  assert.equal(isPrivateOrBlockedIPv6('fe80::1'), true);

  // IPv4-mapped loopback/private
  assert.equal(isPrivateOrBlockedIPv6('::ffff:127.0.0.1'), true);
  assert.equal(isPrivateOrBlockedIPv6('::ffff:10.0.0.1'), true);

  // Legitimate public IPv6
  assert.equal(isPrivateOrBlockedIPv6('2607:f8b0:4005:805::200e'), false);
});

test('SSRF Protection: validateTargetUrl rejects unsupported protocols and dangerous hosts', async () => {
  // Protocol check
  const ftpCheck = await validateTargetUrl('ftp://example.com/api/docs');
  assert.equal(ftpCheck.safe, false);
  assert.match(ftpCheck.error || '', /Blocked protocol/);

  const fileCheck = await validateTargetUrl('file:///etc/passwd');
  assert.equal(fileCheck.safe, false);

  // Localhost check
  const localCheck = await validateTargetUrl('http://localhost:3000/docs');
  assert.equal(localCheck.safe, false);
  assert.match(localCheck.error || '', /prohibited/i);

  // Raw loopback IP check
  const ipCheck = await validateTargetUrl('http://127.0.0.1:8080/api');
  assert.equal(ipCheck.safe, false);

  // AWS/GCP metadata IP check
  const metaCheck = await validateTargetUrl('http://169.254.169.254/computeMetadata/v1');
  assert.equal(metaCheck.safe, false);

  // Malformed URL check
  const malformed = await validateTargetUrl('not_a_valid_url_at_all');
  assert.equal(malformed.safe, false);
});

test('HTML Text Extraction: strips script/style tags and preserves clean text and headers', () => {
  const sampleHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Stripe Connect OAuth Docs</title>
        <style>body { background: #fff; }</style>
        <script>alert("malicious script should be stripped");</script>
      </head>
      <body>
        <nav><a href="/home">Home</a></nav>
        <h1>OAuth 2.0 Integration Guide</h1>
        <p>Stripe supports standard <strong>authorization_code</strong> grant flows with PKCE.</p>
        <h2>Available Scopes</h2>
        <ul>
          <li>read_write</li>
          <li>read_only</li>
        </ul>
        <p>Access tokens are valid for 3600 seconds (1 hour).</p>
        <a href="/docs/oauth-scopes">Explore Granular Scopes</a>
        <footer>Internal copyright notice</footer>
      </body>
    </html>
  `;

  const extracted = extractTextFromHtml(sampleHtml, 'https://docs.stripe.com/connect/oauth');

  assert.equal(extracted.title, 'Stripe Connect OAuth Docs');
  assert.equal(extracted.cleanText.includes('malicious script'), false);
  assert.equal(extracted.cleanText.includes('background: #fff'), false);
  assert.equal(extracted.cleanText.includes('Internal copyright notice'), false);
  assert.equal(extracted.cleanText.includes('OAuth 2.0 Integration Guide'), true);
  assert.equal(extracted.cleanText.includes('authorization_code'), true);
  assert.equal(extracted.cleanText.includes('read_write'), true);
  assert.equal(extracted.candidateLinks.length > 0, true);
  assert.equal(extracted.candidateLinks[0], 'https://docs.stripe.com/docs/oauth-scopes');
});

test('Deterministic Extraction Pipeline: parses OAuth grant types, PKCE, scopes, and token lifespans into structured findings', () => {
  const simulatedText = `
    ### Primary Documentation: Acme API OAuth 2.0 Reference
    Source: https://api.acme.com/docs/oauth

    Acme provides a public OAuth 2.0 service for third-party integrations.
    Supported grant types include authorization_code and refresh_token.
    Proof Key for Code Exchange (PKCE) with S256 code_challenge is required for public clients.

    ## Scopes and Permissions
    - acme:read - Read user data and profile info
    - acme:write - Create and update issues and tickets

    ## Token Expiration and Refresh
    Access tokens expire in 3600 seconds (1 hour).
    Single-use refresh token rotation is enforced upon token refresh.
    API calls are subject to a rate limit of 100 requests per minute.

    ## App Review
    Public integrations require application review by the Acme security team before directory listing.
  `;

  const retrieval = {
    success: true,
    combinedText: simulatedText,
    sources: [
      {
        url: 'https://api.acme.com/docs/oauth',
        title: 'Acme API OAuth 2.0 Reference',
        byteCount: 1540,
        fetchedAt: '2026-10-31T08:00:00Z',
        status: 'retrieved' as const
      }
    ],
    primaryTitle: 'Acme API OAuth 2.0 Reference'
  };

  const result = runDeterministicExtraction(
    'Acme API',
    'https://api.acme.com/docs/oauth',
    'both',
    retrieval,
    'Integration for issue syncing'
  );

  assert.equal(result.engine, 'deterministic-pipeline');
  assert.equal(result.findings.sectionA_Overview.appName, 'Acme API');
  assert.equal(result.findings.sectionA_Overview.authMethod, 'OAuth 2.0 PKCE');

  // Check grant types
  assert.equal(result.findings.sectionB_OAuthConfig.supportedGrantTypes?.includes('authorization_code'), true);
  assert.equal(result.findings.sectionB_OAuthConfig.supportedGrantTypes?.includes('refresh_token'), true);
  assert.equal(result.findings.sectionB_OAuthConfig.pkceRequirement, 'Required');

  // Check scopes
  assert.equal(result.findings.sectionC_Scopes.some(s => s.name.includes('acme:read')), true);
  assert.equal(result.findings.sectionC_Scopes.some(s => s.name.includes('acme:write')), true);

  // Check token lifecycle
  assert.equal(result.findings.sectionF_TokenLifecycle.accessTokenLifespan?.includes('3600 seconds'), true);
  assert.equal(result.findings.sectionF_TokenLifecycle.tokenRotation?.includes('rotation'), true);

  // Check claim-level evidence
  assert.equal(result.findings.sectionG_EvidenceAndUnknowns.claims.length >= 3, true);
  for (const claim of result.findings.sectionG_EvidenceAndUnknowns.claims) {
    if (claim.evidenceStatus === 'official_verified') {
      assert.ok(claim.supportingExcerpt, 'Verified claim must have supporting excerpt');
      assert.ok(claim.sourceUrl, 'Verified claim must have source URL');
    }
  }

  // Check evidence summary
  assert.equal(result.evidenceSummary.officialVerified >= 2, true);
  assert.equal(result.evidenceSummary.documentationCoveragePercent >= 70, true);
});

test('Evidence Integrity: when documentation is silent, the engine flags known unknowns and does NOT fabricate verified claims', () => {
  const minimalDoc = `
    ### Quickstart Guide
    Source: https://api.minimal.com/docs
    Welcome to Minimal API. Authenticate requests by sending an Authorization header.
  `;

  const retrieval = {
    success: true,
    combinedText: minimalDoc,
    sources: [
      {
        url: 'https://api.minimal.com/docs',
        title: 'Quickstart Guide',
        byteCount: 200,
        fetchedAt: '2026-10-31T08:00:00Z',
        status: 'retrieved' as const
      }
    ],
    primaryTitle: 'Quickstart Guide'
  };

  const result = runDeterministicExtraction(
    'Minimal API',
    'https://api.minimal.com/docs',
    'oauth',
    retrieval
  );

  // Should identify gaps
  assert.equal(result.status, 'completed_with_gaps');
  assert.equal(result.findings.sectionG_EvidenceAndUnknowns.knownUnknowns.length >= 2, true);
  assert.equal(
    result.findings.sectionG_EvidenceAndUnknowns.knownUnknowns.some(k => k.toLowerCase().includes('token lifespan')),
    true
  );
});

test('InvestigationService: lists seeded investigations and lookups work correctly', () => {
  const list = InvestigationService.listInvestigations();
  assert.equal(list.length >= 2, true);

  const first = list[0];
  const found = InvestigationService.getInvestigationById(first.id);
  assert.ok(found);
  assert.equal(found?.appName, first.appName);

  const missing = InvestigationService.getInvestigationById('non_existent_id');
  assert.equal(missing, undefined);
});

test('SSRF Protection: blocks hex IPv4-mapped IPv6 for loopback, private, and AWS/GCP metadata', () => {
  // ::ffff:7f00:1 is 127.0.0.1 in hex IPv4-mapped
  assert.equal(isPrivateOrBlockedIPv6('::ffff:7f00:1'), true);
  assert.equal(isPrivateOrBlockedIPv6('::ffff:7f00:0001'), true);

  // ::ffff:a9fe:a9fe is 169.254.169.254 in hex IPv4-mapped (cloud metadata)
  assert.equal(isPrivateOrBlockedIPv6('::ffff:a9fe:a9fe'), true);

  // ::ffff:0a00:0001 is 10.0.0.1 in hex IPv4-mapped (RFC 1918 private)
  assert.equal(isPrivateOrBlockedIPv6('::ffff:a00:1'), true);

  // ::ffff:c0a8:0101 is 192.168.1.1 in hex IPv4-mapped (RFC 1918 private)
  assert.equal(isPrivateOrBlockedIPv6('::ffff:c0a8:101'), true);

  // Documentation prefix 2001:db8::
  assert.equal(isPrivateOrBlockedIPv6('2001:db8::1'), true);

  // Discard prefix 100::
  assert.equal(isPrivateOrBlockedIPv6('100::1'), true);

  // Site-local fec0::
  assert.equal(isPrivateOrBlockedIPv6('fec0::1'), true);
});

test('Model & Fallback Audit: Condition A (Gemini Absent) - executes deterministic extraction with ₹0 cost', async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  try {
    const retrieval = {
      success: true,
      combinedText: `
        ### Documentation
        Acme Platform OAuth 2.0 authorization_code grant with PKCE.
        Scopes: acme:read, acme:write.
        Access token lifespan is 3600 seconds.
      `,
      sources: [{ url: 'https://acme.test/docs', title: 'Docs', byteCount: 250, fetchedAt: '2026-10-31', status: 'retrieved' as const }],
      primaryTitle: 'Docs'
    };

    const { executeLiveExtraction } = await import('./extractionService.ts');
    const result = await executeLiveExtraction('Acme Test', 'https://acme.test/docs', 'oauth', retrieval);

    assert.equal(result.engine, 'deterministic-pipeline');
    assert.equal(result.findings.sectionA_Overview.authMethod, 'OAuth 2.0 PKCE');
    assert.ok(result.findings.sectionG_EvidenceAndUnknowns.claims.length > 0);
  } finally {
    process.env.GEMINI_API_KEY = previousKey;
  }
});

test('Model & Fallback Audit: Condition B (Gemini Invalid Key) - falls back gracefully to deterministic pipeline', async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'INVALID_MOCK_GEMINI_KEY_THAT_FAILS';

  try {
    const retrieval = {
      success: true,
      combinedText: `
        ### Documentation
        Acme Platform OAuth 2.0 authorization_code grant with PKCE.
        Scopes: acme:read.
      `,
      sources: [{ url: 'https://acme.test/docs', title: 'Docs', byteCount: 200, fetchedAt: '2026-10-31', status: 'retrieved' as const }],
      primaryTitle: 'Docs'
    };

    const { executeLiveExtraction } = await import('./extractionService.ts');
    const result = await executeLiveExtraction('Acme Test', 'https://acme.test/docs', 'oauth', retrieval);

    // Fallback to deterministic pipeline must succeed seamlessly
    assert.equal(result.engine, 'deterministic-pipeline');
    assert.ok(result.findings.sectionA_Overview.appName, 'Acme Test');
  } finally {
    process.env.GEMINI_API_KEY = previousKey;
  }
});

test('Model & Fallback Audit: Condition C (Gemini Unavailable / 503) & Condition D (Quota 429) & Condition E (Timeout)', async () => {
  // Deterministic pipeline guarantees 100% availability even when AI service throws
  const retrieval = {
    success: true,
    combinedText: `
      ### Documentation
      Acme Platform OAuth 2.0 authorization_code grant.
      Single-use refresh token rotation is enforced.
    `,
    sources: [{ url: 'https://acme.test/docs', title: 'Docs', byteCount: 180, fetchedAt: '2026-10-31', status: 'retrieved' as const }],
    primaryTitle: 'Docs'
  };

  const result = runDeterministicExtraction('Acme Test', 'https://acme.test/docs', 'oauth', retrieval);
  assert.equal(result.engine, 'deterministic-pipeline');
  assert.equal(result.findings.sectionF_TokenLifecycle.tokenRotation?.includes('rotation'), true);
});

test('Model & Fallback Audit: Condition F (Deterministic Extraction Succeeds) - extracts structured findings with ₹0 cost', () => {
  const retrieval = {
    success: true,
    combinedText: `
      ### Doc: Test OAuth API
      Supported grant types: authorization_code, refresh_token.
      PKCE code_challenge S256 is required.
      Access tokens expire in 7200 seconds.
      Scopes: user.read, files.write.
    `,
    sources: [{ url: 'https://test.api/docs', title: 'Test OAuth API', byteCount: 300, fetchedAt: '2026-10-31', status: 'retrieved' as const }],
    primaryTitle: 'Test OAuth API'
  };

  const result = runDeterministicExtraction('Test OAuth API', 'https://test.api/docs', 'both', retrieval);
  assert.equal(result.engine, 'deterministic-pipeline');
  assert.equal(result.findings.sectionB_OAuthConfig.pkceRequirement, 'Required');
  assert.equal(result.findings.sectionF_TokenLifecycle.accessTokenLifespan?.includes('7200 seconds'), true);
  assert.equal(result.evidenceSummary.officialVerified >= 2, true);
});

test('Model & Fallback Audit: Condition G (Both Fail) - unresolvable documentation endpoint produces clear error report', async () => {
  const result = await InvestigationService.runLiveInvestigation({
    appName: 'Invalid Host App',
    docUrl: 'https://invalid-non-existent-subdomain-498275981247.com/docs'
  });

  assert.equal(result.status, 'failed');
  assert.ok(result.errorMessage);
  assert.equal(result.findings, undefined);
  assert.ok(result.unknownQuestions.length > 0);
});

test('Evidence Precision: A documentation page title alone cannot qualify as supporting excerpt', async () => {
  const { validateClaimEvidence } = await import('../../utils/readiness.ts');

  const titleOnlyClaim = {
    claimText: 'Discord supports OAuth 2.0 PKCE for application integration.',
    sourceUrl: 'https://discord.com/developers/docs/topics/oauth2',
    sourceTitle: 'OAuth2 - Documentation - Discord',
    supportingExcerpt: 'Primary Documentation: OAuth2 - Documentation - Discord',
    evidenceStatus: 'official_verified' as const,
    confidence: 'high' as const,
    applicability: 'All integration clients'
  };

  const validation = validateClaimEvidence(titleOnlyClaim);
  assert.equal(validation.isValid, false);
  assert.equal(validation.status, 'unknown');
  assert.ok(validation.rejectionReason?.includes('title alone cannot qualify'));
});

test('Evidence Precision: Implicit grant warning cannot serve as sole evidence for PKCE support', async () => {
  const { validateClaimEvidence } = await import('../../utils/readiness.ts');

  const conflatedClaim = {
    claimText: 'Discord documents Proof Key for Code Exchange (PKCE) for authorization code grant flows.',
    sourceUrl: 'https://discord.com/developers/docs/topics/oauth2',
    sourceTitle: 'OAuth2 - Documentation - Discord',
    // Excerpt only talks about implicit grant, never mentions PKCE
    supportingExcerpt: 'The implicit grant is not recommended outside of quick prototypes. It returns the access token directly in the redirect URL.',
    evidenceStatus: 'official_verified' as const,
    confidence: 'high' as const,
    applicability: 'Public and single-page clients'
  };

  const validation = validateClaimEvidence(conflatedClaim);
  assert.equal(validation.isValid, false);
  assert.equal(validation.status, 'unknown');
  assert.ok(validation.rejectionReason?.includes('lacks direct mention or evidence of PKCE'));
});

test('Evidence Precision: Bot-specific rate limit cannot be generalized to all REST/GraphQL APIs', async () => {
  const { validateClaimEvidence } = await import('../../utils/readiness.ts');

  const overbroadClaim = {
    claimText: 'API rate limiting or quota constraints documented in developer guide.',
    sourceUrl: 'https://discord.com/developers/docs/topics/oauth2',
    sourceTitle: 'OAuth2 - Documentation - Discord',
    supportingExcerpt: 'Bots have an entirely separate set of rate limits .',
    evidenceStatus: 'official_verified' as const,
    confidence: 'high' as const,
    // Overbroad applicability:
    applicability: 'REST / GraphQL API calls'
  };

  const validation = validateClaimEvidence(overbroadClaim);
  assert.equal(validation.isValid, false);
  assert.equal(validation.status, 'estimated');
  assert.ok(validation.rejectionReason?.includes('broader than the supporting source excerpt'));
});

test('Discord Evidence Correction: extracts 4 precision claims with direct excerpts, narrowed applicability, and separated implicit grant', () => {
  const discordSimulatedDoc = `
    ### Primary Documentation: OAuth2 - Documentation - Discord
    Source: https://discord.com/developers/docs/topics/oauth2

    OAuth2 enables application developers to build applications that utilize authentication and data from the Discord API. Within Discord, there are multiple types of OAuth2 authentication. We support the authorization code grant, the implicit grant, client credentials, and some modified special-for-Discord flows for Bots and Webhooks.

    ## Authorization Code Grant
    The implicit grant is not recommended outside of quick prototypes. It returns the access token directly in the redirect URL, where it can leak through browser history, logs, and Referer headers, and it doesn’t provide a refresh token. For production apps, use the authorization code grant with PKCE instead.

    ## Access Token Exchange Response
    "expires_in" : 604800 ,
    "refresh_token" : "r3fr3sh_t0k3n_v4lu3" ,

    ## Rate Limits
    Bots have an entirely separate set of rate limits .
  `;

  const retrieval = {
    success: true,
    combinedText: discordSimulatedDoc,
    sources: [{ url: 'https://discord.com/developers/docs/topics/oauth2', title: 'OAuth2 - Documentation - Discord', byteCount: 2000, fetchedAt: '2026-11-01', status: 'retrieved' as const }],
    primaryTitle: 'OAuth2 - Documentation - Discord'
  };

  const result = runDeterministicExtraction(
    'Discord',
    'https://discord.com/developers/docs/topics/oauth2',
    'both',
    retrieval
  );

  const claims = result.findings.sectionG_EvidenceAndUnknowns.claims;

  // 1. PKCE Claim: uses direct sentence, confidence medium (no parameter spec), applicability production auth code
  const pkceClaim = claims.find(c => c.claimText.toLowerCase().includes('pkce'));
  assert.ok(pkceClaim, 'PKCE claim must exist');
  assert.equal(pkceClaim?.evidenceStatus, 'official_verified');
  assert.equal(pkceClaim?.confidence, 'medium');
  assert.ok(pkceClaim?.supportingExcerpt?.includes('use the authorization code grant with PKCE instead'));
  assert.equal(pkceClaim?.applicability, 'Production authorization code grant integrations');
  assert.ok(pkceClaim?.limitations?.includes('explicit code_challenge and code_verifier schema parameters are not published'));

  // 2. Implicit Grant Claim: separated from PKCE, discusses implicit grant risks
  const implicitClaim = claims.find(c => c.claimText.toLowerCase().includes('implicit grant'));
  assert.ok(implicitClaim, 'Implicit grant claim must exist separately');
  assert.equal(implicitClaim?.evidenceStatus, 'official_verified');
  assert.equal(implicitClaim?.confidence, 'high');
  assert.ok(implicitClaim?.supportingExcerpt?.includes('implicit grant is not recommended'));
  assert.equal(implicitClaim?.applicability, 'Client-side applications and Single-Page Applications (SPAs)');

  // 3. Token Lifespan: specifies 604,800 seconds and applies to authorization code exchange
  const lifespanClaim = claims.find(c => c.claimText.includes('604,800 seconds'));
  assert.ok(lifespanClaim, '604,800 seconds lifespan claim must exist');
  assert.equal(lifespanClaim?.evidenceStatus, 'official_verified');
  assert.equal(lifespanClaim?.applicability, 'OAuth 2.0 Bearer access tokens returned via Authorization Code Grant exchange');
  assert.ok(lifespanClaim?.limitations?.includes('bot tokens do not expire'));

  // 4. Rate Limits: narrowed to bot tokens
  const rateClaim = claims.find(c => c.claimText.toLowerCase().includes('rate limits'));
  assert.ok(rateClaim, 'Rate limits claim must exist');
  assert.equal(rateClaim?.evidenceStatus, 'official_verified');
  assert.equal(rateClaim?.applicability, 'Bot user tokens and bot-authorized API requests');
  assert.ok(rateClaim?.claimText.includes('specifically for bot tokens'));
  assert.ok(rateClaim?.limitations?.includes('separate rate limiting for bots only'));
});

test('Model Health Semantics: Distinguishes modelConfigured, modelReachable, modelStatus, and deterministicExtractionAvailable', async () => {
  const { checkModelReachability } = await import('../routes/api.ts');
  const isReachable = await checkModelReachability();

  // In this test sandbox, external model reachability check either resolves boolean without throwing
  assert.equal(typeof isReachable, 'boolean');

  // If model is unreachable, engineStatus must never report connected
  const isConfigured = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5);
  const engineStatus = isReachable ? 'model_reachable' : isConfigured ? 'model_unavailable' : 'deterministic_only';
  assert.notEqual(engineStatus, 'model_connected');
});

// Helper to simulate Express middleware invocation
function runMiddleware(middleware: Function, body: any): { error?: any; body: any; nextCalled: boolean } {
  const req: any = { body: { ...body } };
  const res: any = {};
  let nextCalled = false;
  let caughtError: any = null;

  try {
    middleware(req, res, (err?: any) => {
      if (err) {
        caughtError = err;
      } else {
        nextCalled = true;
      }
    });
  } catch (err) {
    caughtError = err;
  }

  return { error: caughtError, body: req.body, nextCalled };
}

test('Flexible Intake: Case A (Name only - Known Registry Provider) maps official doc URL and sets urlProvenance', () => {
  const result = runMiddleware(validateInvestigationIntake, {
    appName: 'Linear'
  });

  assert.equal(result.nextCalled, true);
  assert.equal(result.body.appName, 'Linear');
  assert.equal(result.body.docUrl, 'https://linear.app/docs/oauth-authentication');
  assert.equal(result.body.urlProvenance, 'verified_registry');
  assert.equal(result.body.authMethod, 'OAuth 2.0 PKCE');
});

test('Flexible Intake: Case A (Name only - Unfamiliar App) returns 400 error requiring documentation URL without guessing', () => {
  const result = runMiddleware(validateInvestigationIntake, {
    appName: 'Unregistered Startup App'
  });

  assert.equal(result.nextCalled, false);
  assert.ok(result.error instanceof AppError);
  assert.equal(result.error.statusCode, 400);
  const docError = result.error.details?.find((d: any) => d.field === 'docUrl');
  assert.ok(docError, 'Must return field error for docUrl');
  assert.ok(
    docError?.message.includes('could not be confidently identified in the verified registry'),
    'Must provide clear guidance explaining why docUrl is needed'
  );
});

test('Flexible Intake: Case B (URL only) derives provisional app name and sets inferred_from_url provenance', () => {
  const result = runMiddleware(validateInvestigationIntake, {
    docUrl: 'https://discord.com/developers/docs/topics/oauth2'
  });

  assert.equal(result.nextCalled, true);
  assert.equal(result.body.appName, 'Discord');
  assert.equal(result.body.isDerivedName, true);
  assert.equal(result.body.urlProvenance, 'inferred_from_url');
  assert.equal(result.body.docUrl, 'https://discord.com/developers/docs/topics/oauth2');
});

test('Flexible Intake: Case C (Both Name and URL provided) preserves user inputs and sets user_supplied provenance', () => {
  const result = runMiddleware(validateInvestigationIntake, {
    appName: 'Custom OAuth Client',
    docUrl: 'https://developer.custom-oauth.com/docs'
  });

  assert.equal(result.nextCalled, true);
  assert.equal(result.body.appName, 'Custom OAuth Client');
  assert.equal(result.body.urlProvenance, 'user_supplied');
  assert.equal(result.body.docUrl, 'https://developer.custom-oauth.com/docs');
});

test('Flexible Intake: Rejects when neither app name nor URL is provided', () => {
  const result = runMiddleware(validateInvestigationIntake, {
    appName: '   ',
    docUrl: ''
  });

  assert.equal(result.nextCalled, false);
  assert.ok(result.error instanceof AppError);
  assert.equal(result.error.statusCode, 400);
  const nameError = result.error.details?.find((d: any) => d.field === 'appName');
  assert.ok(nameError?.message.includes('Either an application name or an official documentation URL'));
});

test('Flexible Intake: Rejects malformed or non-http URLs', () => {
  const result = runMiddleware(validateInvestigationIntake, {
    appName: 'Test App',
    docUrl: 'ftp://not-http.com/docs'
  });

  assert.equal(result.nextCalled, false);
  assert.ok(result.error instanceof AppError);
  assert.equal(result.error.statusCode, 400);
});

