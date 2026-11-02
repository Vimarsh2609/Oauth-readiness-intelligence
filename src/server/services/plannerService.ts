/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  InvestigationDraft,
  PlannerTask,
  PlannerFunctionalCategory,
  ResponsibleParty,
  TaskStatus,
  TaskPriority,
  TaskProvenance,
  InstructionProvenance,
  PlanStorageInfo,
  TaskEvidenceStatus,
  EffortEstimation,
  RiskRegisterItem,
  StructuredImplementationGuide,
  GuideSectionDetail,
  TechnicalInstruction,
  IntegrationPlan
} from '../../shared/types.ts';

/**
 * Calculates topological order, earliest start/finish, latest start/finish,
 * slack, and the Critical Path through the task dependency network (CPM method).
 */
export function calculateCriticalPath(tasks: PlannerTask[]): {
  criticalPathTaskIds: string[];
  criticalPathHours: number;
  hasCycles: boolean;
  tasks: PlannerTask[];
} {
  const taskMap = new Map<string, PlannerTask>();
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>(); // u -> v (u precedes v)
  const revAdj = new Map<string, string[]>(); // v -> u (u precedes v)

  tasks.forEach((t) => {
    const id = t.taskId || t.id;
    taskMap.set(id, { ...t, id, taskId: id, title: t.taskTitle || t.title, taskTitle: t.taskTitle || t.title });
    inDegree.set(id, 0);
    adj.set(id, []);
    revAdj.set(id, []);
  });

  tasks.forEach((t) => {
    const id = t.taskId || t.id;
    const deps = t.dependencies || [];
    deps.forEach((depId) => {
      if (taskMap.has(depId)) {
        adj.get(depId)!.push(id);
        revAdj.get(id)!.push(depId);
        inDegree.set(id, (inDegree.get(id) || 0) + 1);
      }
    });
  });

  // Kahn's algorithm for topological sorting and cycle detection
  const queue: string[] = [];
  inDegree.forEach((deg, id) => {
    if (deg === 0) queue.push(id);
  });

  const topoOrder: string[] = [];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    topoOrder.push(curr);
    for (const next of adj.get(curr) || []) {
      const newDeg = (inDegree.get(next) || 0) - 1;
      inDegree.set(next, newDeg);
      if (newDeg === 0) queue.push(next);
    }
  }

  const hasCycles = topoOrder.length !== tasks.length;

  // Forward pass: Earliest Start (ES) and Earliest Finish (EF)
  const es = new Map<string, number>();
  const ef = new Map<string, number>();

  const orderToUse = hasCycles ? tasks.map((t) => t.taskId || t.id) : topoOrder;

  orderToUse.forEach((id) => {
    const task = taskMap.get(id)!;
    const duration = task.estimatedHours || 2;
    const deps = revAdj.get(id) || [];
    let maxPredEf = 0;
    deps.forEach((d) => {
      const dEf = ef.get(d) || 0;
      if (dEf > maxPredEf) maxPredEf = dEf;
    });
    es.set(id, maxPredEf);
    ef.set(id, maxPredEf + duration);
  });

  let projectDuration = 0;
  ef.forEach((val) => {
    if (val > projectDuration) projectDuration = val;
  });

  // Backward pass: Latest Finish (LF) and Latest Start (LS)
  const lf = new Map<string, number>();
  const ls = new Map<string, number>();

  [...orderToUse].reverse().forEach((id) => {
    const task = taskMap.get(id)!;
    const duration = task.estimatedHours || 2;
    const succs = adj.get(id) || [];
    if (succs.length === 0) {
      lf.set(id, projectDuration);
    } else {
      let minSuccLs = Infinity;
      succs.forEach((s) => {
        const sLs = ls.get(s);
        if (sLs !== undefined && sLs < minSuccLs) minSuccLs = sLs;
      });
      lf.set(id, minSuccLs === Infinity ? projectDuration : minSuccLs);
    }
    ls.set(id, (lf.get(id) || projectDuration) - duration);
  });

  // Calculate slack and critical path
  const criticalPathTaskIds: string[] = [];
  const enrichedTasks = tasks.map((t) => {
    const id = t.taskId || t.id;
    const duration = t.estimatedHours || 2;
    const taskEs = es.get(id) || 0;
    const taskEf = ef.get(id) || duration;
    const taskLf = lf.get(id) || projectDuration;
    const taskLs = ls.get(id) || 0;
    const slack = Math.max(0, taskLs - taskEs);
    const isCritical = !hasCycles && slack <= 0.01;

    if (isCritical) {
      criticalPathTaskIds.push(id);
    }

    return {
      ...t,
      id,
      taskId: id,
      title: t.taskTitle || t.title,
      taskTitle: t.taskTitle || t.title,
      earliestStartHour: taskEs,
      earliestFinishHour: taskEf,
      latestStartHour: taskLs,
      latestFinishHour: taskLf,
      slack,
      isCriticalPath: isCritical
    };
  });

  return {
    criticalPathTaskIds,
    criticalPathHours: projectDuration,
    hasCycles,
    tasks: enrichedTasks
  };
}

/**
 * Calculates Hands-on Dev Effort, External Waiting Time, and Total Elapsed Time
 * with strictly separated assumptions, conditional verification delays, and documented facts.
 */
export function calculateEffortAndTimeline(
  tasks: PlannerTask[],
  investigation: InvestigationDraft,
  criticalPathHours: number
): EffortEstimation {
  const findings = investigation.findings;
  const gov = findings?.sectionD_Governance;
  const claims = findings?.sectionG_EvidenceAndUnknowns?.claims || [];

  // 1. Hands-on engineering effort (developer hours)
  const totalDevHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 2), 0);
  const handsOnDevHoursMin = Math.max(4, Math.round(totalDevHours * 0.85));
  const handsOnDevHoursMax = Math.round(totalDevHours * 1.3);
  const handsOnDevHoursLabel = `${handsOnDevHoursMin} – ${handsOnDevHoursMax} active developer hours`;
  const assumedProductiveHoursPerDay = 6;

  // 2. External waiting time (vendor reviews, admin approvals)
  const reviewTimelineText = gov?.externalReviewTimelines || investigation.reviewTimelineNote || '';
  let isExternalWaitDocumented = false;
  let externalWaitDaysMin: number | undefined;
  let externalWaitDaysMax: number | undefined;
  let externalWaitDaysLabel = 'Unknown waiting period (vendor documentation does not publish a guaranteed SLA)';
  let conditionalVerificationNote: string | undefined;

  // Handle Discord conditional bot review vs instant OAuth registration
  if (/discord/i.test(investigation.appName)) {
    isExternalWaitDocumented = true;
    externalWaitDaysMin = 0;
    externalWaitDaysMax = 1;
    externalWaitDaysLabel = '0 – 1 business days (Instant self-service registration for OAuth applications)';
    conditionalVerificationNote =
      'Conditional Verification Requirement: Bot identity verification and review (estimated 5–10 business days) is triggered ONLY if the bot is added to 75 or more guilds. It is NOT required for basic OAuth 2.0 application integrations.';
  } else if (/instant|self-service|immediate/i.test(reviewTimelineText)) {
    isExternalWaitDocumented = true;
    externalWaitDaysMin = 0;
    externalWaitDaysMax = 1;
    externalWaitDaysLabel = '0 – 1 business days (Immediate self-service registration)';
  } else if (/(\d+)\s*(?:-|to)\s*(\d+)\s*(?:day|business day|week)/i.test(reviewTimelineText)) {
    const match = reviewTimelineText.match(/(\d+)\s*(?:-|to)\s*(\d+)\s*(day|business day|week)/i);
    if (match) {
      isExternalWaitDocumented = true;
      const isWeek = /week/i.test(match[3]);
      const factor = isWeek ? 5 : 1;
      externalWaitDaysMin = parseInt(match[1], 10) * factor;
      externalWaitDaysMax = parseInt(match[2], 10) * factor;
      externalWaitDaysLabel = `${externalWaitDaysMin} – ${externalWaitDaysMax} business days (documented range)`;
    }
  }

  // 3. Total elapsed time based on critical path + external wait
  const devWorkDaysMin = Math.max(1, Math.ceil(criticalPathHours / assumedProductiveHoursPerDay));
  const devWorkDaysMax = Math.max(2, Math.ceil((criticalPathHours * 1.25) / assumedProductiveHoursPerDay));
  const waitMin = externalWaitDaysMin !== undefined ? externalWaitDaysMin : 2;
  const waitMax = externalWaitDaysMax !== undefined ? externalWaitDaysMax : 7;

  const totalElapsedDaysMin = devWorkDaysMin + waitMin;
  const totalElapsedDaysMax = devWorkDaysMax + waitMax;
  const totalElapsedDaysLabel = `${totalElapsedDaysMin} – ${totalElapsedDaysMax} business days (Estimated range based on assumptions; NOT guaranteed)`;

  // Documented facts vs engineering assumptions
  const documentedFacts: string[] = [];
  const assumptions: string[] = [
    `Critical path duration (${criticalPathHours}h) represents the longest sequential path, distinct from total task effort (${totalDevHours}h) due to parallel task execution.`,
    `Assumes 1 full-time software engineer dedicated to the integration allocating ${assumedProductiveHoursPerDay} productive engineering hours/day.`,
    'Estimates reflect realistic engineering variance (±25%) based on environment complexity and testing feedback.',
    'External approval queues are governed by third-party vendor review queues and cannot be expedited by developer velocity.'
  ];

  if (findings?.sectionB_OAuthConfig?.pkceRequirement) {
    documentedFacts.push(`OAuth grant pattern: ${findings.sectionB_OAuthConfig.pkceRequirement} PKCE verification.`);
  }
  if (findings?.sectionF_TokenLifecycle?.accessTokenLifespan) {
    documentedFacts.push(`Token duration specification: ${findings.sectionF_TokenLifecycle.accessTokenLifespan}`);
  }
  if (isExternalWaitDocumented) {
    documentedFacts.push(`Provider review timeline: ${reviewTimelineText}`);
  } else {
    assumptions.push('Vendor review turnaround is undocumented in public guides; budgeted as 2 – 7 business days queue wait.');
  }

  return {
    handsOnDevHoursMin,
    handsOnDevHoursMax,
    handsOnDevHoursLabel,
    assumedProductiveHoursPerDay,
    externalWaitDaysMin,
    externalWaitDaysMax,
    externalWaitDaysLabel,
    isExternalWaitDocumented,
    conditionalVerificationNote,
    totalElapsedDaysMin,
    totalElapsedDaysMax,
    totalElapsedDaysLabel,
    isEstimateGuaranteed: false,
    disclaimer: 'Estimated (Not Guaranteed) — figures reflect engineering modeling based on stated assumptions and are subject to environment variability.',
    assumptions,
    documentedFacts
  };
}

/**
 * Generates an evidence-backed Risk Register from investigation findings.
 */
export function generateRiskRegister(investigation: InvestigationDraft): RiskRegisterItem[] {
  const risks: RiskRegisterItem[] = [];
  const findings = investigation.findings;
  const appName = investigation.appName;
  const claims = findings?.sectionG_EvidenceAndUnknowns?.claims || [];

  let seq = 1;

  // Risk 1: Administrative Approval / Consent Gate
  const gov = findings?.sectionD_Governance;
  const adminGates = gov?.adminDependencies || investigation.identifiedApprovalGates || [];
  if (adminGates.length > 0) {
    risks.push({
      riskId: `risk_${appName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${seq++}`,
      risk: 'Workspace Administrator Installation Block',
      cause: `Integration requires tenant administrator pre-approval: ${adminGates.join(', ')}.`,
      impact: 'high',
      likelihood: 'high',
      evidence: gov?.appSubmissionProcess || 'Tenant admin consent is required for non-admin accounts.',
      mitigation: 'Prepare an enterprise security one-pager detailing required scopes and data retention before initiating tenant rollout.',
      owner: 'Workspace Administrator',
      status: 'open'
    });
  }

  // Risk 2: Scope Sensitivity & Third-party Review
  const scopes = findings?.sectionC_Scopes || [];
  const sensitiveScopes = scopes.filter(
    (s) => s.tier === 'Sensitive' || s.tier === 'Restricted' || s.tier === 'Instance-Configured'
  );
  if (sensitiveScopes.length > 0) {
    const isRestricted = sensitiveScopes.some((s) => s.tier === 'Restricted');
    risks.push({
      riskId: `risk_${appName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${seq++}`,
      risk: isRestricted ? 'Mandatory Third-Party Security Assessment' : 'Elevated Scope Trust & Safety Review',
      cause: `Requested scopes (${sensitiveScopes.map((s) => s.name).join(', ')}) belong to elevated permission tiers.`,
      impact: isRestricted ? 'critical' : 'high',
      likelihood: 'medium',
      evidence: sensitiveScopes[0]?.auditRequirement || 'Elevated scope tier detected in investigation.',
      mitigation: 'Conduct scope minimization review to verify whether lower-privilege standard scopes suffice for MVP features.',
      owner: 'Security / Compliance',
      status: 'open'
    });
  }

  // Risk 3: PKCE Parameter Specification Ambiguity
  const pkceClaim = claims.find((c) => /pkce/i.test(c.claimText));
  if (pkceClaim && pkceClaim.confidence === 'medium') {
    risks.push({
      riskId: `risk_${appName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${seq++}`,
      risk: 'PKCE Challenge Parameter Schema Ambiguity',
      cause: 'Documentation officially recommends PKCE but does not publish detailed code_challenge / code_verifier schema parameters on primary page.',
      impact: 'medium',
      likelihood: 'medium',
      evidence: pkceClaim.supportingExcerpt || 'PKCE recommended but schema details unverified.',
      supportingClaimId: pkceClaim.claimId,
      mitigation: 'Implement standard RFC 7636 S256 challenge generation and test against sandbox endpoint early during Phase 1.',
      owner: 'Engineering',
      status: 'open'
    });
  }

  // Risk 4: Refresh Token Rotation Concurrency Risk (Corrected: flagged as unknown for Discord)
  const isDiscord = /discord/i.test(appName);
  risks.push({
    riskId: `risk_${appName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${seq++}`,
    risk: isDiscord
      ? 'Unverified Refresh Token Rotation Semantics'
      : 'Distributed Token Refresh Concurrency Invalidation',
    cause: isDiscord
      ? 'Official Discord documentation does not publish refresh token rotation policy (single-use vs multi-use). If single-use rotation is enforced, concurrent refresh calls without locking will trigger 400 invalid_grant.'
      : 'Single-use rotating refresh tokens are invalidated immediately upon exchange, causing 400 invalid_grant if multiple workers refresh concurrently.',
    impact: 'high',
    likelihood: isDiscord ? 'low' : 'high',
    evidence: isDiscord
      ? 'Refresh-token rotation policy is undocumented in official Discord developer guides.'
      : 'Single-use refresh token rotation documented by provider.',
    mitigation: 'Deploy distributed refresh token mutex lock as a generic safety precaution and log token response headers comprehensively.',
    owner: 'Engineering',
    status: 'open'
  });

  // Risk 5: Rate Limiting & Quota Backoff
  const rateLimitClaim = claims.find((c) => /rate limit/i.test(c.claimText));
  if (rateLimitClaim) {
    risks.push({
      riskId: `risk_${appName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${seq++}`,
      risk: 'API Rate Limit Throttling (HTTP 429)',
      cause: rateLimitClaim.claimText.includes('specifically for bot tokens')
        ? 'Dedicated bot rate limits apply; burst requests will trigger 429 responses with Retry-After headers.'
        : 'API quotas require client-side throttling to avoid request rejection.',
      impact: 'medium',
      likelihood: 'medium',
      evidence: rateLimitClaim.supportingExcerpt || 'API rate limits documented in developer guide.',
      supportingClaimId: rateLimitClaim.claimId,
      mitigation: 'Implement Leaky Bucket or Token Bucket client-side queue with jittered exponential backoff honoring Retry-After headers.',
      owner: 'Engineering',
      status: 'open'
    });
  }

  // Risk 6: Undocumented Lifecycle / Known Unknowns
  const unknowns = findings?.sectionG_EvidenceAndUnknowns?.knownUnknowns || [];
  if (unknowns.length > 0) {
    risks.push({
      riskId: `risk_${appName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${seq++}`,
      risk: 'Undocumented Integration Edge Cases',
      cause: `Documentation is silent on key behaviors: ${unknowns[0]}`,
      impact: 'medium',
      likelihood: 'high',
      evidence: `Identified known unknowns in official documentation: ${unknowns.join('; ')}`,
      mitigation: 'Deploy feature flags around optional OAuth capabilities and log token exchange responses comprehensively.',
      owner: 'Engineering',
      status: 'open'
    });
  }

  return risks;
}

/**
 * Generates tasks supported by investigation findings across the 12 required categories
 * with explicit source provenance:
 * - PROVIDER_DOCUMENTED
 * - GENERIC_ENGINEERING_RECOMMENDATION
 * - PROJECT_ASSUMPTION
 * - UNVERIFIED_DEPENDENCY
 */
export function generateTasksFromInvestigation(investigation: InvestigationDraft): PlannerTask[] {
  const appName = investigation.appName;
  const isDiscord = /discord/i.test(appName);
  const slug = appName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const findings = investigation.findings;
  const claims = findings?.sectionG_EvidenceAndUnknowns?.claims || [];
  const oauthConfig = findings?.sectionB_OAuthConfig;
  const scopes = findings?.sectionC_Scopes || [];
  const gov = findings?.sectionD_Governance;
  const resource = findings?.sectionE_ResourceAccess;
  const lifecycle = findings?.sectionF_TokenLifecycle;

  // Claim mappings
  const pkceClaim = claims.find((c) => /pkce/i.test(c.claimText));
  const implicitClaim = claims.find((c) => /implicit grant/i.test(c.claimText));
  const lifespanClaim = claims.find((c) => /expires_in|lifespan/i.test(c.claimText));
  const rateLimitClaim = claims.find((c) => /rate limit/i.test(c.claimText));
  const authProtocolClaim = claims.find((c) => /supports oauth|authentication/i.test(c.claimText));

  const tasks: PlannerTask[] = [];

  // 1. Application Registration
  const task1Id = `task_${slug}_app_reg`;
  tasks.push({
    id: task1Id,
    taskId: task1Id,
    title: `Register ${appName} OAuth Application in Developer Portal`,
    taskTitle: `Register ${appName} OAuth Application in Developer Portal`,
    description: `Create an OAuth 2.0 application entry in the official ${appName} Developer Console. Retrieve Client ID and configure basic application branding.`,
    category: 'human_required',
    functionalCategory: 'application_registration',
    responsibleParty: 'human_required',
    provenance: authProtocolClaim ? 'PROVIDER_DOCUMENTED' : 'UNVERIFIED_DEPENDENCY',
    status: 'pending',
    priority: 'critical',
    providerName: appName,
    requiredInputs: ['Developer Portal login credentials', 'Application name & icon', 'Privacy Policy URL'],
    dependencies: [],
    supportingClaimIds: authProtocolClaim ? [authProtocolClaim.claimId] : [],
    evidenceStatus: authProtocolClaim ? authProtocolClaim.evidenceStatus : 'recommended_practice',
    completionCriteria: 'Client ID provisioned and stored in developer secrets vault.',
    estimatedHours: 1,
    humanOwnerRole: 'Engineering Lead / DevOps'
  });

  // 2. OAuth Configuration
  const task2Id = `task_${slug}_oauth_config`;
  const isPkceRecommended = /pkce/i.test(oauthConfig?.pkceRequirement || '') || Boolean(pkceClaim);
  tasks.push({
    id: task2Id,
    taskId: task2Id,
    title: `Configure Authorization Code Grant & ${isPkceRecommended ? 'PKCE Parameters' : 'Client Secrets'}`,
    taskTitle: `Configure Authorization Code Grant & ${isPkceRecommended ? 'PKCE Parameters' : 'Client Secrets'}`,
    description: isPkceRecommended
      ? `Implement RFC 7636 PKCE S256 code challenge generation and authorization code exchange handlers per official recommendation.`
      : `Configure server-side confidential client authorization code grant exchange.`,
    category: 'agent_prepared',
    functionalCategory: 'oauth_configuration',
    responsibleParty: 'agent_prepared',
    provenance: pkceClaim ? 'PROVIDER_DOCUMENTED' : 'GENERIC_ENGINEERING_RECOMMENDATION',
    status: 'pending',
    priority: 'critical',
    providerName: appName,
    requiredInputs: ['Client ID', 'Grant type: authorization_code', isPkceRecommended ? 'PKCE S256 helper' : 'Client Secret'],
    dependencies: [task1Id],
    supportingClaimIds: pkceClaim ? [pkceClaim.claimId] : (authProtocolClaim ? [authProtocolClaim.claimId] : []),
    evidenceStatus: pkceClaim ? pkceClaim.evidenceStatus : 'recommended_practice',
    completionCriteria: 'Authorization request URL generator and code exchange client successfully constructed.',
    estimatedHours: 4,
    automationCapabilityNote: 'Autonomous scaffolding can generate RFC 7636 Web Crypto verifier/challenge utilities.'
  });

  // 3. Redirect URI Setup
  const task3Id = `task_${slug}_redirect_uri`;
  tasks.push({
    id: task3Id,
    taskId: task3Id,
    title: 'Configure Strict HTTPS Redirect URIs in Developer Console',
    taskTitle: 'Configure Strict HTTPS Redirect URIs in Developer Console',
    description: `Register staging and production OAuth callback endpoints (${appName} enforces strict redirect URI matching; wildcard paths are forbidden).`,
    category: 'human_required',
    functionalCategory: 'redirect_uri_setup',
    responsibleParty: 'human_required',
    provenance: 'PROVIDER_DOCUMENTED',
    status: 'pending',
    priority: 'high',
    providerName: appName,
    requiredInputs: ['Production HTTPS callback domain', 'Staging HTTPS callback domain', 'Local development URI'],
    dependencies: [task1Id],
    supportingClaimIds: [],
    evidenceStatus: 'recommended_practice',
    completionCriteria: 'Redirect URI verified and saved in Developer Console without wildcard characters.',
    estimatedHours: 1,
    humanOwnerRole: 'DevOps / Platform Engineer'
  });

  // 4. Scope and Permission Configuration
  const task4Id = `task_${slug}_scope_config`;
  const scopeNames = scopes.map((s) => s.name);
  tasks.push({
    id: task4Id,
    taskId: task4Id,
    title: `Specify and Justify Minimal Scope Permissions (${scopeNames.slice(0, 3).join(', ') || 'Default Scopes'})`,
    taskTitle: `Specify and Justify Minimal Scope Permissions (${scopeNames.slice(0, 3).join(', ') || 'Default Scopes'})`,
    description: `Define exact OAuth scopes requested during authorization. Ensure compliance with principle of least privilege.`,
    category: 'agent_prepared',
    functionalCategory: 'scope_configuration',
    responsibleParty: 'agent_prepared',
    provenance: scopes.length > 0 ? 'PROVIDER_DOCUMENTED' : 'GENERIC_ENGINEERING_RECOMMENDATION',
    status: 'pending',
    priority: 'high',
    providerName: appName,
    requiredInputs: ['Scope list: ' + (scopeNames.join(', ') || 'identified API permissions'), 'Feature functional mapping'],
    dependencies: [task2Id],
    supportingClaimIds: scopes.filter((s) => s.evidenceStatus === 'official_verified').map((s) => s.name),
    evidenceStatus: scopes.length > 0 ? 'independently_corroborated' : 'recommended_practice',
    completionCriteria: 'Scope string constructed and verified against developer permission requirements.',
    estimatedHours: 2,
    automationCapabilityNote: 'Scope manifest and justification documentation can be drafted autonomously.'
  });

  // 5. Administrator Approval
  const task5Id = `task_${slug}_admin_approval`;
  const hasAdminGate = (gov?.adminDependencies && gov.adminDependencies.length > 0) || /enterprise|admin/i.test(appName);
  tasks.push({
    id: task5Id,
    taskId: task5Id,
    title: `Obtain Workspace / Tenant Administrator Authorization`,
    taskTitle: `Obtain Workspace / Tenant Administrator Authorization`,
    description: `Coordinate with customer IT / security administrators to pre-authorize integration or approve tenant-wide permissions.`,
    category: 'human_required',
    functionalCategory: 'administrator_approval',
    responsibleParty: 'human_required',
    provenance: 'PROJECT_ASSUMPTION',
    status: hasAdminGate ? 'pending' : 'completed',
    priority: hasAdminGate ? 'critical' : 'low',
    providerName: appName,
    requiredInputs: ['Application architecture summary', 'Data access justification', 'Tenant admin credentials'],
    dependencies: [task4Id],
    supportingClaimIds: [],
    evidenceStatus: hasAdminGate ? 'independently_corroborated' : 'recommended_practice',
    completionCriteria: 'Admin consent granted or verified that user self-service authorization is active.',
    estimatedHours: hasAdminGate ? 6 : 0.5,
    externalWaitDays: hasAdminGate ? '2 – 5 business days' : 0,
    humanOwnerRole: 'IT Administrator / Security Officer'
  });

  // 6. External Provider Verification
  const task6Id = `task_${slug}_provider_verification`;
  tasks.push({
    id: task6Id,
    taskId: task6Id,
    title: `Submit ${appName} App Review & Verification (Conditional: Public Distribution / Scale)`,
    taskTitle: `Submit ${appName} App Review & Verification (Conditional: Public Distribution / Scale)`,
    description: isDiscord
      ? `Discord OAuth applications operate self-service with zero approval delay. Bot verification is ONLY required when reaching 75 or more guilds.`
      : `Complete developer verification, submit OAuth consent screen details, and upload demo walkthrough if publishing to public marketplace.`,
    category: 'human_required',
    functionalCategory: 'external_provider_verification',
    responsibleParty: 'human_required',
    provenance: 'UNVERIFIED_DEPENDENCY',
    status: 'pending',
    priority: 'medium',
    providerName: appName,
    requiredInputs: ['Privacy Policy URL', 'Demo video recording', 'Production app URL'],
    dependencies: [task3Id, task4Id],
    supportingClaimIds: [],
    evidenceStatus: 'recommended_practice',
    completionCriteria: 'Application review submitted to vendor and pending approval or self-service verified.',
    estimatedHours: 4,
    externalWaitDays: isDiscord ? '0 business days (instant self-service for standard OAuth)' : (gov?.externalReviewTimelines || 'Unknown waiting period'),
    humanOwnerRole: 'Product Manager / Compliance Officer'
  });

  // 7. Resource Access Configuration
  const task7Id = `task_${slug}_resource_access`;
  tasks.push({
    id: task7Id,
    taskId: task7Id,
    title: 'Implement Granular Resource Access Boundaries & Sharing Validation',
    taskTitle: 'Implement Granular Resource Access Boundaries & Sharing Validation',
    description: `Configure application logic to handle ${resource?.sharingModel || 'resource-level permission checks'} and gracefully handle unauthorized resource errors.`,
    category: 'agent_prepared',
    functionalCategory: 'resource_access_configuration',
    responsibleParty: 'agent_prepared',
    provenance: 'GENERIC_ENGINEERING_RECOMMENDATION',
    status: 'pending',
    priority: 'medium',
    providerName: appName,
    requiredInputs: ['Resource ID mapping', 'Permission boundary model'],
    dependencies: [task4Id],
    supportingClaimIds: [],
    evidenceStatus: 'recommended_practice',
    completionCriteria: 'Resource authorization validation middleware operational.',
    estimatedHours: 3,
    automationCapabilityNote: 'Resource permission check guards can be prepared deterministically.'
  });

  // 8. Token Lifecycle Implementation
  const task8Id = `task_${slug}_token_lifecycle`;
  const lifespanNote = lifespanClaim?.claimText || lifecycle?.accessTokenLifespan || 'Standard RFC lifespan';
  tasks.push({
    id: task8Id,
    taskId: task8Id,
    title: 'Implement Token Storage, Expiration Timer & Safe Refresh Token Handling',
    taskTitle: 'Implement Token Storage, Expiration Timer & Safe Refresh Token Handling',
    description: isDiscord
      ? `Configure encrypted token storage and 604,800-second access token expiration timer (7 days per documented exchange schema). Note: Provider-specific refresh-token rotation semantics (single-use vs multi-use) are undocumented in official Discord guides; mutex locking is recommended as a generic safety practice.`
      : `Configure token storage with secure encryption and expiration handling (${lifespanNote}).`,
    category: 'agent_prepared',
    functionalCategory: 'token_lifecycle_implementation',
    responsibleParty: 'agent_prepared',
    provenance: isDiscord ? 'GENERIC_ENGINEERING_RECOMMENDATION' : (lifespanClaim ? 'PROVIDER_DOCUMENTED' : 'GENERIC_ENGINEERING_RECOMMENDATION'),
    status: 'pending',
    priority: 'critical',
    providerName: appName,
    requiredInputs: ['Encrypted token database schema', 'TTL expiration timer', 'Token refresh handler'],
    dependencies: [task2Id],
    supportingClaimIds: lifespanClaim ? [lifespanClaim.claimId] : [],
    evidenceStatus: lifespanClaim ? lifespanClaim.evidenceStatus : 'recommended_practice',
    completionCriteria: 'Token expiration timer operational; refresh token handler and locking deployed with error handling for 400 invalid_grant.',
    estimatedHours: 5,
    automationCapabilityNote: 'Token lifecycle handler and expiration state machine can be scaffolded autonomously.'
  });

  // 9. Backend Integration
  const task9Id = `task_${slug}_backend_integration`;
  tasks.push({
    id: task9Id,
    taskId: task9Id,
    title: `Construct ${appName} API Client with Rate Limiting Backoff`,
    taskTitle: `Construct ${appName} API Client with Rate Limiting Backoff`,
    description: `Build API client wrapping token injection, Bearer authentication headers, and automatic retry with exponential backoff on HTTP 429.`,
    category: 'agent_prepared',
    functionalCategory: 'backend_integration',
    responsibleParty: 'agent_prepared',
    provenance: rateLimitClaim ? 'PROVIDER_DOCUMENTED' : 'GENERIC_ENGINEERING_RECOMMENDATION',
    status: 'pending',
    priority: 'high',
    providerName: appName,
    requiredInputs: ['API base URL', 'Rate limit specification', 'Token retrieval provider'],
    dependencies: [task2Id, task8Id],
    supportingClaimIds: rateLimitClaim ? [rateLimitClaim.claimId] : [],
    evidenceStatus: rateLimitClaim ? rateLimitClaim.evidenceStatus : 'recommended_practice',
    completionCriteria: 'Authenticated API client operational with 429 Retry-After header parsing.',
    estimatedHours: 6,
    automationCapabilityNote: 'API wrapper and backoff queue boilerplate prepared autonomously.'
  });

  // 10. Security Validation
  const task10Id = `task_${slug}_security_validation`;
  tasks.push({
    id: task10Id,
    taskId: task10Id,
    title: 'Execute OAuth Security Suite (CSRF State, PKCE Verifier & Leakage Prevention)',
    taskTitle: 'Execute OAuth Security Suite (CSRF State, PKCE Verifier & Leakage Prevention)',
    description: `Verify that CSRF state mismatch is rejected, PKCE code_verifier is strictly matched, and access tokens are never transmitted via URL fragments or Referer headers.`,
    category: 'agent_prepared',
    functionalCategory: 'security_validation',
    responsibleParty: 'agent_prepared',
    provenance: implicitClaim ? 'PROVIDER_DOCUMENTED' : 'GENERIC_ENGINEERING_RECOMMENDATION',
    status: 'pending',
    priority: 'critical',
    providerName: appName,
    requiredInputs: ['Automated security test suite', 'Adversarial state tampering test cases'],
    dependencies: [task9Id],
    supportingClaimIds: implicitClaim ? [implicitClaim.claimId] : (pkceClaim ? [pkceClaim.claimId] : []),
    evidenceStatus: implicitClaim ? implicitClaim.evidenceStatus : 'recommended_practice',
    completionCriteria: 'All security test cases pass (CSRF rejection, PKCE verification, secret protection).',
    estimatedHours: 3,
    automationCapabilityNote: 'Adversarial security unit tests can be scaffolded deterministically.'
  });

  // 11. Functional Testing
  const task11Id = `task_${slug}_functional_testing`;
  tasks.push({
    id: task11Id,
    taskId: task11Id,
    title: 'Execute End-to-End User Authorization Flow in Staging Environment',
    taskTitle: 'Execute End-to-End User Authorization Flow in Staging Environment',
    description: `Perform complete walkthrough with test user: initiation -> OAuth consent prompt -> code callback -> token exchange -> authenticated API query.`,
    category: 'human_required',
    functionalCategory: 'functional_testing',
    responsibleParty: 'human_required',
    provenance: 'PROJECT_ASSUMPTION',
    status: 'pending',
    priority: 'high',
    providerName: appName,
    requiredInputs: ['Staging deployment URL', 'Test user account credentials', 'Verification checklist'],
    dependencies: [task9Id, task5Id],
    supportingClaimIds: [],
    evidenceStatus: 'recommended_practice',
    completionCriteria: 'End-to-end integration verified from user prompt to database persist.',
    estimatedHours: 3,
    humanOwnerRole: 'QA Engineer / Full-Stack Engineer'
  });

  // 12. Production Readiness
  const task12Id = `task_${slug}_prod_readiness`;
  tasks.push({
    id: task12Id,
    taskId: task12Id,
    title: 'Production Deployment, Credential Vaulting & Alerting Sign-off',
    taskTitle: 'Production Deployment, Credential Vaulting & Alerting Sign-off',
    description: `Inject production credentials via environment vault, configure alerts for 401/429 spikes, and execute production release verification.`,
    category: 'human_required',
    functionalCategory: 'production_readiness',
    responsibleParty: 'human_required',
    provenance: 'PROJECT_ASSUMPTION',
    status: 'pending',
    priority: 'critical',
    providerName: appName,
    requiredInputs: ['Production secrets vault access', 'Datadog / Prometheus alerting rules', 'Rollback plan'],
    dependencies: [task10Id, task11Id, task6Id],
    supportingClaimIds: [],
    evidenceStatus: 'recommended_practice',
    completionCriteria: 'Production deployment live with zero unhandled OAuth exceptions and active monitoring.',
    estimatedHours: 2,
    humanOwnerRole: 'DevOps / Release Manager'
  });

  return tasks;
}

/**
 * Generates all 14 structured implementation guide sections linking to actual investigation claims,
 * with explicit provenance on every technical instruction.
 */
export function generateImplementationGuide(
  investigation: InvestigationDraft,
  tasks: PlannerTask[]
): StructuredImplementationGuide {
  const appName = investigation.appName;
  const isDiscord = /discord/i.test(appName);
  const findings = investigation.findings;
  const claims = findings?.sectionG_EvidenceAndUnknowns?.claims || [];
  const oauth = findings?.sectionB_OAuthConfig;
  const scopes = findings?.sectionC_Scopes || [];
  const gov = findings?.sectionD_Governance;
  const resource = findings?.sectionE_ResourceAccess;
  const lifecycle = findings?.sectionF_TokenLifecycle;

  const pkceClaim = claims.find((c) => /pkce/i.test(c.claimText));
  const implicitClaim = claims.find((c) => /implicit grant/i.test(c.claimText));
  const lifespanClaim = claims.find((c) => /expires_in|lifespan/i.test(c.claimText));
  const rateLimitClaim = claims.find((c) => /rate limit/i.test(c.claimText));
  const authClaim = claims.find((c) => /supports oauth|authentication/i.test(c.claimText));

  const sections: GuideSectionDetail[] = [
    // 1. Integration Overview
    {
      sectionNumber: 1,
      id: 'integration_overview',
      title: '1. Integration Overview',
      summary: `Architectural blueprint and integration readiness profile for ${appName}.`,
      contentMarkdown: `This implementation guide provides verified engineering specifications for integrating with ${appName}. The design follows the evidence-backed findings extracted from the official developer documentation (${investigation.docUrl}).`,
      technicalInstructions: [
        {
          step: '1.1',
          instruction: `Target authentication method: ${investigation.authMethod}.`,
          supportingClaimId: authClaim?.claimId,
          evidenceText: authClaim?.supportingExcerpt,
          isRecommendation: false,
          provenance: authClaim ? 'OFFICIALLY_DOCUMENTED' : 'GENERIC_ENGINEERING_RECOMMENDATION'
        },
        {
          step: '1.2',
          instruction: 'Architecture enforces strict separation of public client authorization and backend secret storage.',
          isRecommendation: true,
          provenance: 'GENERIC_ENGINEERING_RECOMMENDATION'
        }
      ]
    },

    // 2. Prerequisites
    {
      sectionNumber: 2,
      id: 'prerequisites',
      title: '2. Prerequisites & Credentials',
      summary: 'Required developer credentials, administrative privileges, and infrastructure.',
      contentMarkdown: `Before writing code, verify that your engineering team possesses the necessary administrative and developer assets for ${appName}.`,
      technicalInstructions: [
        {
          step: '2.1',
          instruction: `Obtain a verified developer account on the official ${appName} Developer Portal.`,
          isRecommendation: false,
          provenance: 'OFFICIALLY_DOCUMENTED'
        },
        {
          step: '2.2',
          instruction: 'Ensure HTTPS endpoint infrastructure is available for staging and production OAuth callback handling.',
          isRecommendation: true,
          provenance: 'GENERIC_ENGINEERING_RECOMMENDATION'
        }
      ]
    },

    // 3. Provider Application Registration
    {
      sectionNumber: 3,
      id: 'application_registration',
      title: '3. Provider Application Registration',
      summary: 'Registering the OAuth application and securing client identifiers.',
      contentMarkdown: `Navigate to the ${appName} Developer Console and register a new application.`,
      technicalInstructions: [
        {
          step: '3.1',
          instruction: `Create the application record: ${oauth?.clientRegistration || 'Self-service registration in developer portal'}.`,
          supportingClaimId: authClaim?.claimId,
          evidenceText: authClaim?.supportingExcerpt,
          isRecommendation: false,
          provenance: authClaim ? 'OFFICIALLY_DOCUMENTED' : 'INDEPENDENTLY_CORROBORATED'
        },
        {
          step: '3.2',
          instruction: 'Store the issued Client ID and Client Secret in an environment secrets manager (e.g. AWS Secrets Manager or GCP Secret Manager). Never commit secrets to source repositories.',
          isRecommendation: true,
          provenance: 'GENERIC_ENGINEERING_RECOMMENDATION'
        }
      ]
    },

    // 4. OAuth Configuration
    {
      sectionNumber: 4,
      id: 'oauth_configuration',
      title: '4. OAuth 2.0 Configuration',
      summary: 'Grant type selection, PKCE parameter requirement, and client configuration.',
      contentMarkdown: `Configure the OAuth 2.0 exchange mechanisms based on documented provider capabilities.`,
      technicalInstructions: [
        {
          step: '4.1',
          instruction: pkceClaim
            ? `Officially recommended grant: Authorization Code Grant with PKCE. ${pkceClaim.claimText}`
            : 'Configure Authorization Code Grant for server-side confidential client exchanges.',
          supportingClaimId: pkceClaim?.claimId,
          evidenceText: pkceClaim?.supportingExcerpt,
          isRecommendation: false,
          provenance: pkceClaim ? 'OFFICIALLY_DOCUMENTED' : 'GENERIC_ENGINEERING_RECOMMENDATION'
        },
        {
          step: '4.2',
          instruction: implicitClaim
            ? `Do NOT use the Implicit Grant: ${implicitClaim.claimText}`
            : 'Avoid legacy implicit flows; prefer authorization code exchange.',
          supportingClaimId: implicitClaim?.claimId,
          evidenceText: implicitClaim?.supportingExcerpt,
          isRecommendation: false,
          provenance: implicitClaim ? 'OFFICIALLY_DOCUMENTED' : 'GENERIC_ENGINEERING_RECOMMENDATION'
        }
      ],
      codeSnippet: {
        language: 'typescript',
        caption: 'PKCE S256 Code Challenge Generation (RFC 7636)',
        code: `import crypto from 'node:crypto';

export function generatePkcePair() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
  return { verifier, challenge, method: 'S256' };
}`
      }
    },

    // 5. Redirect URI Setup
    {
      sectionNumber: 5,
      id: 'redirect_uri_setup',
      title: '5. Redirect URI Setup',
      summary: 'Registering exact HTTPS redirect endpoints and preventing open redirection.',
      contentMarkdown: `${appName} enforces strict redirect URI matching. Every redirect URI must be explicitly registered prior to initiating authorization requests.`,
      technicalInstructions: [
        {
          step: '5.1',
          instruction: `Configured redirect policy: ${oauth?.redirectUris || 'Strict HTTPS redirect URI matching required.'}`,
          isRecommendation: false,
          provenance: 'OFFICIALLY_DOCUMENTED'
        },
        {
          step: '5.2',
          instruction: 'Ensure the callback URI does not contain wildcards, fragment identifiers (#), or HTTP schemes in production.',
          isRecommendation: true,
          provenance: 'GENERIC_ENGINEERING_RECOMMENDATION'
        }
      ]
    },

    // 6. Scope Selection
    {
      sectionNumber: 6,
      id: 'scope_selection',
      title: '6. Scope Selection & Justifications',
      summary: 'Selecting minimal necessary permission strings and managing scope tiers.',
      contentMarkdown: `Request only the scopes required for your application\'s active features. Excess scopes increase user abandonment and may trigger mandatory compliance reviews.`,
      technicalInstructions: scopes.map((s, idx) => ({
        step: `6.${idx + 1}`,
        instruction: `Scope '${s.name}' [${s.tier}]: ${s.description}. Audit requirement: ${s.auditRequirement}`,
        supportingClaimId: s.sourceUrl,
        evidenceText: s.description,
        isRecommendation: false,
        provenance: s.evidenceStatus === 'official_verified' ? 'OFFICIALLY_DOCUMENTED' : 'INDEPENDENTLY_CORROBORATED'
      }))
    },

    // 7. Authentication Flow
    {
      sectionNumber: 7,
      id: 'authentication_flow',
      title: '7. Authentication Flow Walkthrough',
      summary: 'Assembling the authorization URL, user consent handoff, and code exchange.',
      contentMarkdown: `The authorization workflow begins when a user initiates the integration handoff in your application.`,
      technicalInstructions: [
        {
          step: '7.1',
          instruction: 'Generate a cryptographically secure random `state` parameter and persist it in a session cookie.',
          isRecommendation: true,
          provenance: 'GENERIC_ENGINEERING_RECOMMENDATION'
        },
        {
          step: '7.2',
          instruction: 'Redirect user to provider authorization endpoint with client_id, redirect_uri, response_type=code, scope, state, and code_challenge.',
          isRecommendation: true,
          provenance: 'GENERIC_ENGINEERING_RECOMMENDATION'
        },
        {
          step: '7.3',
          instruction: 'Upon callback, verify `state` matches session cookie before submitting code exchange POST request.',
          isRecommendation: true,
          provenance: 'GENERIC_ENGINEERING_RECOMMENDATION'
        }
      ],
      codeSnippet: {
        language: 'typescript',
        caption: 'Token Exchange Request Structure',
        code: `// POST token exchange request
const response = await fetch(TOKEN_ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: authCode,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    code_verifier: pkceVerifier
  })
});
const tokenData = await response.json();`
      }
    },

    // 8. Token Management (Corrected for Discord: rotation is unknown, not assumed single-use)
    {
      sectionNumber: 8,
      id: 'token_management',
      title: '8. Token Management & Rotation',
      summary: 'Access token expiration handling, refresh token safety, and storage security.',
      contentMarkdown: `Handle issued credentials according to documented token lifespan and rotation semantics.`,
      technicalInstructions: [
        {
          step: '8.1',
          instruction: lifespanClaim
            ? `${lifespanClaim.claimText} (Applicability: ${lifespanClaim.applicability})`
            : `Token expiration: ${lifecycle?.accessTokenLifespan || 'Check expires_in in token response'}`,
          supportingClaimId: lifespanClaim?.claimId,
          evidenceText: lifespanClaim?.supportingExcerpt,
          isRecommendation: false,
          provenance: lifespanClaim ? 'OFFICIALLY_DOCUMENTED' : 'UNKNOWN'
        },
        {
          step: '8.2',
          instruction: 'GENERIC ENGINEERING RECOMMENDATION: In high-concurrency environments, implement a mutex lock around refresh requests to prevent race conditions in case single-use rotation is enforced.',
          isRecommendation: true,
          provenance: 'GENERIC_ENGINEERING_RECOMMENDATION'
        },
        {
          step: '8.3',
          instruction: isDiscord
            ? 'PROVIDER REFRESH ROTATION BEHAVIOR UNKNOWN: Discord developer documentation does not publish whether refresh tokens are single-use or reusable. Do not assume single-use rotation is enforced until verified.'
            : 'Validate provider refresh token reuse policy against official guides.',
          isRecommendation: false,
          provenance: 'UNKNOWN'
        }
      ],
      warnings: lifespanClaim?.limitations ? [lifespanClaim.limitations] : undefined
    },

    // 9. Resource Access Validation
    {
      sectionNumber: 9,
      id: 'resource_access_validation',
      title: '9. Resource Access Validation',
      summary: 'Resource-level authorization checks and workspace sharing models.',
      contentMarkdown: `Respect the boundary between ambient account authorization and specific resource access.`,
      technicalInstructions: [
        {
          step: '9.1',
          instruction: `Workspace sharing model: ${resource?.sharingModel || 'Standard account-wide access'}.`,
          isRecommendation: false,
          provenance: 'INDEPENDENTLY_CORROBORATED'
        },
        {
          step: '9.2',
          instruction: 'Catch HTTP 403 Forbidden responses specifically indicating that the authorized user lacks access to the requested target document/channel.',
          isRecommendation: true,
          provenance: 'GENERIC_ENGINEERING_RECOMMENDATION'
        }
      ]
    },

    // 10. Error Handling
    {
      sectionNumber: 10,
      id: 'error_handling',
      title: '10. Error Handling & Rate Limit Backoff',
      summary: 'Handling OAuth errors, rate limit quotas, and transient network failures.',
      contentMarkdown: `Implement robust error handling for standard OAuth 2.0 error codes and rate limit headers.`,
      technicalInstructions: [
        {
          step: '10.1',
          instruction: rateLimitClaim
            ? `${rateLimitClaim.claimText} (Applicability: ${rateLimitClaim.applicability})`
            : 'Respect API rate limit headers and implement client-side request budgeting.',
          supportingClaimId: rateLimitClaim?.claimId,
          evidenceText: rateLimitClaim?.supportingExcerpt,
          isRecommendation: false,
          provenance: rateLimitClaim ? 'OFFICIALLY_DOCUMENTED' : 'GENERIC_ENGINEERING_RECOMMENDATION'
        },
        {
          step: '10.2',
          instruction: 'On HTTP 429, parse the `Retry-After` response header and queue requests with jittered exponential backoff.',
          isRecommendation: true,
          provenance: 'GENERIC_ENGINEERING_RECOMMENDATION'
        }
      ]
    },

    // 11. Security Considerations
    {
      sectionNumber: 11,
      id: 'security_considerations',
      title: '11. Security Considerations',
      summary: 'CSRF defense, secret leakage prevention, and secure token storage.',
      contentMarkdown: `Security safeguards are mandatory to protect user tokens from interception or leakage.`,
      technicalInstructions: [
        {
          step: '11.1',
          instruction: 'Encrypt access and refresh tokens at rest in database using AES-256-GCM.',
          isRecommendation: true,
          provenance: 'GENERIC_ENGINEERING_RECOMMENDATION'
        },
        {
          step: '11.2',
          instruction: 'Never return access tokens or refresh tokens to client-side browsers or single-page applications.',
          isRecommendation: true,
          provenance: 'GENERIC_ENGINEERING_RECOMMENDATION'
        }
      ]
    },

    // 12. Testing Checklist
    {
      sectionNumber: 12,
      id: 'testing_checklist',
      title: '12. Testing Checklist',
      summary: 'Pre-production test scenarios covering happy path, revocation, and failure states.',
      contentMarkdown: `Execute these automated and manual verification tests in a staging environment prior to production deployment.`,
      technicalInstructions: [
        {
          step: '12.1',
          instruction: 'Test 1: User initiates authorization and grants consent -> code exchanged -> tokens persisted.',
          isRecommendation: true,
          provenance: 'PROJECT_ASSUMPTION'
        },
        {
          step: '12.2',
          instruction: 'Test 2: Tampered state parameter is rejected with HTTP 400 Bad Request.',
          isRecommendation: true,
          provenance: 'GENERIC_ENGINEERING_RECOMMENDATION'
        },
        {
          step: '12.3',
          instruction: 'Test 3: Token expiration simulated -> refresh token exchanged -> new access token stored.',
          isRecommendation: true,
          provenance: 'PROJECT_ASSUMPTION'
        },
        {
          step: '12.4',
          instruction: 'Test 4: User revokes connection in provider portal -> application handles 401 and prompts reconnect.',
          isRecommendation: true,
          provenance: 'PROJECT_ASSUMPTION'
        }
      ]
    },

    // 13. Production Deployment Checklist
    {
      sectionNumber: 13,
      id: 'production_deployment_checklist',
      title: '13. Production Deployment Checklist',
      summary: 'Operational verification for launch, telemetry, and secret rotation.',
      contentMarkdown: `Verify all operational readiness items before enabling integration in production.`,
      technicalInstructions: [
        {
          step: '13.1',
          instruction: 'Production client credentials provisioned and injected into production vault.',
          isRecommendation: true,
          provenance: 'PROJECT_ASSUMPTION'
        },
        {
          step: '13.2',
          instruction: 'Production redirect URIs registered and verified in provider developer portal.',
          isRecommendation: true,
          provenance: 'PROJECT_ASSUMPTION'
        },
        {
          step: '13.3',
          instruction: 'Monitoring alerts configured for 401 Unauthorized spikes (>5% in 5m) and 429 Throttling events.',
          isRecommendation: true,
          provenance: 'GENERIC_ENGINEERING_RECOMMENDATION'
        }
      ]
    },

    // 14. Known Limitations & Unresolved Questions
    {
      sectionNumber: 14,
      id: 'known_limitations_and_unresolved_questions',
      title: '14. Known Limitations & Unresolved Questions',
      summary: 'Unpublished documentation areas, known constraints, and provider-specific nuances.',
      contentMarkdown: `The following items represent areas where the investigated documentation was silent or where engineering limitations exist.`,
      technicalInstructions: (findings?.sectionG_EvidenceAndUnknowns?.knownUnknowns || [
        'Detailed high-volume tier quotas require direct provider developer inquiry.',
        'Webhook retry backoff behavior under network partition is undocumented.'
      ]).map((uk, idx) => ({
        step: `14.${idx + 1}`,
        instruction: `Documented limitation: ${uk}`,
        isRecommendation: false,
        provenance: 'UNKNOWN'
      }))
    }
  ];

  return {
    id: `guide_${investigation.id}`,
    planId: `plan_${investigation.id}`,
    appName,
    generatedAt: new Date().toISOString(),
    sections
  };
}

/**
 * Generates an end-to-end IntegrationPlan from a completed investigation draft.
 */
export function generatePlanFromInvestigation(investigation: InvestigationDraft): IntegrationPlan {
  const rawTasks = generateTasksFromInvestigation(investigation);
  const { criticalPathTaskIds, criticalPathHours, tasks } = calculateCriticalPath(rawTasks);
  const effort = calculateEffortAndTimeline(tasks, investigation, criticalPathHours);
  const risks = generateRiskRegister(investigation);
  const guide = generateImplementationGuide(investigation, tasks);

  const agentPreparedCount = tasks.filter((t) => t.responsibleParty === 'agent_prepared').length;
  const humanRequiredCount = tasks.filter((t) => t.responsibleParty === 'human_required').length;
  const blockedCount = tasks.filter((t) => t.status === 'blocked').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  return {
    id: `plan_${investigation.id}`,
    investigationId: investigation.id,
    appName: investigation.appName,
    docUrl: investigation.docUrl,
    authMethod: investigation.authMethod,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    storageInfo: {
      storageType: 'local_file_json',
      filePath: 'data/plans.json',
      survivesServerRestart: true,
      survivesBrowserRefresh: true,
      persistenceNote:
        'Durable local file-based JSON storage on container filesystem (data/plans.json). Survives browser refresh and server process restarts.'
    },
    tasks,
    criticalPathTaskIds,
    criticalPathHours,
    effort,
    responsibilityMatrix: {
      agentPreparedCount,
      humanRequiredCount,
      blockedCount,
      completedCount,
      totalTasks: tasks.length
    },
    risks,
    guide
  };
}

/**
 * Local file-backed persistent storage for integration plans.
 * Stores plans in `data/plans.json` on the server container filesystem.
 * Survives both browser refreshes and server process restarts.
 */
export class PersistentPlanStore {
  private plans: Map<string, IntegrationPlan> = new Map();
  private dataDir: string;
  private plansFilePath: string;
  private isFileStorageActive: boolean = false;

  constructor() {
    this.dataDir = path.resolve(process.cwd(), 'data');
    this.plansFilePath = path.join(this.dataDir, 'plans.json');
    this.initializeStore();
  }

  private initializeStore() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      if (fs.existsSync(this.plansFilePath)) {
        const fileContent = fs.readFileSync(this.plansFilePath, 'utf-8');
        if (fileContent.trim().length > 0) {
          const parsed = JSON.parse(fileContent) as IntegrationPlan[];
          parsed.forEach((p) => {
            p.storageInfo = {
              storageType: 'local_file_json',
              filePath: 'data/plans.json',
              survivesServerRestart: true,
              survivesBrowserRefresh: true,
              persistenceNote:
                'Durable local file-based JSON storage on container filesystem. Survives browser refresh and server process restarts.'
            };
            this.plans.set(p.id, p);
          });
          this.isFileStorageActive = true;
          return;
        }
      }

      // If file does not exist, seed default Discord plan
      this.seedDefaultPlans();
      this.flushToDisk();
      this.isFileStorageActive = true;
    } catch (err) {
      console.warn('[PlanStore] File storage unavailable, falling back to in-memory store:', err);
      this.isFileStorageActive = false;
      this.seedDefaultPlans();
    }
  }

  private flushToDisk() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      const serialized = JSON.stringify(Array.from(this.plans.values()), null, 2);
      fs.writeFileSync(this.plansFilePath, serialized, 'utf-8');
      this.isFileStorageActive = true;
    } catch (err) {
      console.warn('[PlanStore] Failed to flush plans to disk:', err);
      this.isFileStorageActive = false;
    }
  }

  private seedDefaultPlans() {
    const discordInvestigation: InvestigationDraft = {
      id: 'inv_discord_demo',
      appName: 'Discord',
      docUrl: 'https://discord.com/developers/docs/topics/oauth2',
      authMethod: 'OAuth 2.0 PKCE',
      environmentType: 'Production',
      submittedAt: '2026-11-01T09:00:00Z',
      status: 'completed',
      findings: {
        sectionA_Overview: {
          appName: 'Discord',
          category: 'Communication & Mail',
          authMethod: 'OAuth 2.0 PKCE',
          summary: 'Discord OAuth 2.0 developer platform with PKCE authorization code exchange and bot token rate limits.',
          targetEnvironment: 'Production',
          investigationPurpose: 'both',
          complexity: 'Moderate',
          dependencyRisk: 'Medium'
        },
        sectionB_OAuthConfig: {
          clientRegistration: 'Discord Developer Portal application registration',
          redirectUris: 'Strict HTTPS redirect URI matching; localhost permitted in dev.',
          supportedGrantTypes: ['authorization_code', 'refresh_token'],
          pkceRequirement: 'Supported / Recommended',
          clientSecretsHandling: 'Store in backend secrets manager.'
        },
        sectionC_Scopes: [
          {
            name: 'identify',
            tier: 'Standard',
            description: 'Allows /users/@me without email',
            auditRequirement: 'User authorization prompt',
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
          externalReviewTimelines: 'Instant self-service for OAuth; Bot review takes 5–10 business days.',
          adminDependencies: ['Guild administrator authorization required to add bot or modify permissions.']
        },
        sectionE_ResourceAccess: {
          workspaceVsResource: 'Guild-level authorization with channel permission overwrites.',
          sharingModel: 'Guild owner or admin installs integration.',
          granularity: 'Granular Discord role and permission bitwise flags.'
        },
        sectionF_TokenLifecycle: {
          accessTokenLifespan: '604800 seconds (7 days) for Authorization Code Grant exchange.',
          refreshTokenModel: 'Standard refresh token grant documented; rotation policy is not specified.',
          tokenRotation: 'Unknown / Undocumented (official docs do not document single-use rotation or refresh token reuse policy).',
          revocationBehavior: 'Explicit OAuth 2.0 token revocation endpoint supported.'
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
            'Explicit code_challenge parameter formats are not documented on the primary oauth2 page.',
            'Global REST rate limits for non-bot user access tokens require separate inquiry.',
            'Refresh token rotation semantics (single-use vs multi-use) are undocumented in developer guides.'
          ],
          missingEvidenceNotes: ['Bot verification requirements trigger at scale.']
        }
      },
      detectedScopes: [
        { name: 'identify', tier: 'Standard', verificationLabel: 'Corroborated' },
        { name: 'email', tier: 'Standard', verificationLabel: 'Corroborated' }
      ],
      identifiedApprovalGates: ['Guild Administrator permissions'],
      unknownQuestions: ['Non-bot rate limit thresholds'],
      summaryNote: 'Discord OAuth 2.0 live investigation baseline.',
      reviewTimelineNote: 'Instant self-service registration.'
    };

    const discordPlan = generatePlanFromInvestigation(discordInvestigation);
    this.plans.set(discordPlan.id, discordPlan);
  }

  public getStorageInfo(): PlanStorageInfo {
    return {
      storageType: this.isFileStorageActive ? 'local_file_json' : 'in_memory_fallback',
      filePath: this.isFileStorageActive ? 'data/plans.json' : undefined,
      survivesServerRestart: this.isFileStorageActive,
      survivesBrowserRefresh: true,
      persistenceNote: this.isFileStorageActive
        ? 'Durable local file-based JSON storage on container filesystem (data/plans.json). Survives browser refresh and server process restarts; resets on container re-provisioning.'
        : 'In-memory process storage fallback. Survives browser refresh while dev server is running, but resets on server process restart.'
    };
  }

  public listPlans(): IntegrationPlan[] {
    return Array.from(this.plans.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  public getPlanById(id: string): IntegrationPlan | undefined {
    return this.plans.get(id);
  }

  public savePlan(plan: IntegrationPlan): IntegrationPlan {
    plan.updatedAt = new Date().toISOString();
    plan.storageInfo = this.getStorageInfo();
    this.plans.set(plan.id, plan);
    this.flushToDisk();
    return plan;
  }

  public deletePlan(id: string): boolean {
    const deleted = this.plans.delete(id);
    if (deleted) {
      this.flushToDisk();
    }
    return deleted;
  }

  public updateTaskStatus(
    planId: string,
    taskId: string,
    status: TaskStatus,
    notes?: string
  ): IntegrationPlan | undefined {
    const plan = this.plans.get(planId);
    if (!plan) return undefined;

    const taskIndex = plan.tasks.findIndex((t) => t.id === taskId || t.taskId === taskId);
    if (taskIndex === -1) return undefined;

    const task = plan.tasks[taskIndex];
    task.status = status;
    if (status === 'blocked') {
      task.blockerInfo = {
        isBlocked: true,
        blockedReason: notes || 'Marked as blocked by engineering lead.'
      };
      task.blockerReason = notes || 'Marked as blocked.';
    } else {
      if (task.blockerInfo) task.blockerInfo.isBlocked = false;
      task.blockerReason = undefined;
    }

    // Recompute responsibility matrix
    plan.responsibilityMatrix = {
      agentPreparedCount: plan.tasks.filter((t) => t.responsibleParty === 'agent_prepared').length,
      humanRequiredCount: plan.tasks.filter((t) => t.responsibleParty === 'human_required').length,
      blockedCount: plan.tasks.filter((t) => t.status === 'blocked').length,
      completedCount: plan.tasks.filter((t) => t.status === 'completed').length,
      totalTasks: plan.tasks.length
    };

    plan.updatedAt = new Date().toISOString();
    plan.storageInfo = this.getStorageInfo();
    this.plans.set(planId, plan);
    this.flushToDisk();
    return plan;
  }

  public exportPlanMarkdown(plan: IntegrationPlan): string {
    const lines: string[] = [];
    lines.push(`# Integration Readiness Plan: ${plan.appName}`);
    lines.push(`Generated: ${plan.createdAt} | Last Updated: ${plan.updatedAt}`);
    lines.push(`Documentation Reference: ${plan.docUrl}`);
    lines.push(`Authentication Pattern: ${plan.authMethod}`);
    lines.push(`Storage Guarantee: ${plan.storageInfo?.persistenceNote || 'Local filesystem JSON'}`);
    lines.push('');
    lines.push('## 1. Executive Summary & Effort Timeline');
    lines.push(`- **Hands-on Developer Effort:** ${plan.effort.handsOnDevHoursLabel}`);
    lines.push(`  - Assumed Productive Velocity: ${plan.effort.assumedProductiveHoursPerDay} hours/developer/day`);
    lines.push(`- **External Waiting Time:** ${plan.effort.externalWaitDaysLabel}`);
    if (plan.effort.conditionalVerificationNote) {
      lines.push(`  - Note: ${plan.effort.conditionalVerificationNote}`);
    }
    lines.push(`- **Total Elapsed Timeline:** ${plan.effort.totalElapsedDaysLabel}`);
    lines.push(`- **Critical Path Duration:** ${plan.criticalPathHours} developer hours across ${plan.criticalPathTaskIds.length} sequential tasks.`);
    lines.push('');
    lines.push('### Responsibility Matrix');
    lines.push(`- Agent-Prepared Tasks: ${plan.responsibilityMatrix.agentPreparedCount}`);
    lines.push(`- Human-Required Actions: ${plan.responsibilityMatrix.humanRequiredCount}`);
    lines.push(`- Completed Tasks: ${plan.responsibilityMatrix.completedCount}`);
    lines.push(`- Blocked Tasks: ${plan.responsibilityMatrix.blockedCount}`);
    lines.push('');
    lines.push('## 2. Integration Tasks & Dependencies');
    plan.tasks.forEach((t, i) => {
      lines.push(`### Task ${i + 1}: ${t.title} [${t.status.toUpperCase()}]`);
      lines.push(`- **ID:** \`${t.taskId || t.id}\` | **Priority:** ${t.priority.toUpperCase()} | **Owner:** ${t.responsibleParty?.toUpperCase()}`);
      lines.push(`- **Category:** ${t.functionalCategory || t.category}`);
      lines.push(`- **Provenance:** \`${t.provenance || 'PROJECT_ASSUMPTION'}\``);
      lines.push(`- **Estimated Effort:** ${t.estimatedHours || 2} hours ${t.isCriticalPath ? '**(CRITICAL PATH)**' : ''}`);
      lines.push(`- **Description:** ${t.description}`);
      lines.push(`- **Dependencies:** ${t.dependencies?.length ? t.dependencies.join(', ') : 'None (Ready)'}`);
      lines.push(`- **Completion Criteria:** ${t.completionCriteria || 'N/A'}`);
      if (t.supportingClaimIds?.length) {
        lines.push(`- **Supporting Evidence Claims:** ${t.supportingClaimIds.join(', ')}`);
      }
      if (t.blockerInfo?.isBlocked) {
        lines.push(`- **BLOCKER:** ${t.blockerInfo.blockedReason}`);
      }
      lines.push('');
    });

    lines.push('## 3. Risk Register');
    plan.risks.forEach((r) => {
      lines.push(`### [${r.impact.toUpperCase()} IMPACT / ${r.likelihood.toUpperCase()} LIKELIHOOD] ${r.risk}`);
      lines.push(`- **Cause:** ${r.cause}`);
      lines.push(`- **Evidence:** ${r.evidence}`);
      lines.push(`- **Mitigation:** ${r.mitigation}`);
      lines.push(`- **Owner:** ${r.owner} | **Status:** ${r.status}`);
      lines.push('');
    });

    if (plan.guide) {
      lines.push('## 4. Structured Implementation Guide');
      plan.guide.sections.forEach((sec) => {
        lines.push(`### ${sec.title}`);
        lines.push(sec.contentMarkdown);
        if (sec.technicalInstructions.length > 0) {
          lines.push('');
          lines.push('**Technical Instructions:**');
          sec.technicalInstructions.forEach((ins) => {
            lines.push(`- [${ins.step}] ${ins.instruction} [Provenance: ${ins.provenance}]`);
            if (ins.evidenceText) {
              lines.push(`  > Evidence Excerpt: "${ins.evidenceText}"`);
            }
          });
        }
        if (sec.codeSnippet) {
          lines.push('');
          lines.push('```' + sec.codeSnippet.language);
          lines.push(sec.codeSnippet.code);
          lines.push('```');
        }
        lines.push('');
      });
    }

    return lines.join('\n');
  }
}

export const plannerStore = new PersistentPlanStore();
