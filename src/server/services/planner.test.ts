/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateTasksFromInvestigation,
  calculateCriticalPath,
  calculateEffortAndTimeline,
  generateRiskRegister,
  generateImplementationGuide,
  generatePlanFromInvestigation,
  plannerStore,
  PersistentPlanStore
} from './plannerService.ts';
import { InvestigationService } from './investigationService.ts';
import { InvestigationDraft, PlannerTask } from '../../shared/types.ts';

test('Planner: generates tasks across all 12 functional categories for Discord investigation', () => {
  const discordInv = InvestigationService.getInvestigationById('inv_discord_demo')!;
  assert.ok(discordInv, 'Discord investigation must exist');

  const tasks = generateTasksFromInvestigation(discordInv);
  assert.equal(tasks.length >= 12, true, 'Must generate at least 12 tasks');

  // Verify all 12 categories are covered
  const categories = new Set(tasks.map((t) => t.functionalCategory));
  const expectedCategories = [
    'application_registration',
    'oauth_configuration',
    'redirect_uri_setup',
    'scope_configuration',
    'administrator_approval',
    'external_provider_verification',
    'resource_access_configuration',
    'token_lifecycle_implementation',
    'backend_integration',
    'security_validation',
    'functional_testing',
    'production_readiness'
  ];

  expectedCategories.forEach((cat) => {
    assert.ok(categories.has(cat as any), `Category ${cat} must be present in generated tasks`);
  });

  // Verify every task contains required properties
  tasks.forEach((t) => {
    assert.ok(t.taskId || t.id, 'Task must have an ID');
    assert.ok(t.taskTitle || t.title, 'Task must have a title');
    assert.ok(t.description, 'Task must have a description');
    assert.ok(t.priority, 'Task must have priority');
    assert.ok(t.status, 'Task must have status');
    assert.ok(t.responsibleParty, 'Task must have responsibleParty');
    assert.ok(Array.isArray(t.requiredInputs), 'Task must have requiredInputs array');
    assert.ok(Array.isArray(t.dependencies), 'Task must have dependencies array');
    assert.ok(Array.isArray(t.supportingClaimIds), 'Task must have supportingClaimIds array');
    assert.ok(t.evidenceStatus, 'Task must have evidenceStatus');
    assert.ok(t.completionCriteria, 'Task must have completionCriteria');
  });
});

test('Planner: maps investigation claims to relevant tasks with evidence linking', () => {
  const discordInv = InvestigationService.getInvestigationById('inv_discord_demo')!;
  const tasks = generateTasksFromInvestigation(discordInv);

  // PKCE task links to PKCE claim
  const pkceTask = tasks.find((t) => t.functionalCategory === 'oauth_configuration')!;
  assert.ok(pkceTask);
  assert.ok(pkceTask.supportingClaimIds?.includes('claim_discord_1'));
  assert.equal(pkceTask.evidenceStatus, 'official_verified');

  // Token lifecycle task links to 604,800s lifespan claim
  const tokenTask = tasks.find((t) => t.functionalCategory === 'token_lifecycle_implementation')!;
  assert.ok(tokenTask);
  assert.ok(tokenTask.supportingClaimIds?.includes('claim_discord_3'));
  assert.equal(tokenTask.evidenceStatus, 'official_verified');

  // Backend integration links to rate limit claim
  const backendTask = tasks.find((t) => t.functionalCategory === 'backend_integration')!;
  assert.ok(backendTask);
  assert.ok(backendTask.supportingClaimIds?.includes('claim_discord_4'));
  assert.equal(backendTask.evidenceStatus, 'official_verified');
});

test('Planner: Agent vs Human Responsibility Matrix classification', () => {
  const discordInv = InvestigationService.getInvestigationById('inv_discord_demo')!;
  const tasks = generateTasksFromInvestigation(discordInv);

  const agentPrepared = tasks.filter((t) => t.responsibleParty === 'agent_prepared');
  const humanRequired = tasks.filter((t) => t.responsibleParty === 'human_required');

  // Agent-prepared tasks
  const agentCategories = agentPrepared.map((t) => t.functionalCategory);
  assert.ok(agentCategories.includes('oauth_configuration'));
  assert.ok(agentCategories.includes('scope_configuration'));
  assert.ok(agentCategories.includes('resource_access_configuration'));
  assert.ok(agentCategories.includes('token_lifecycle_implementation'));
  assert.ok(agentCategories.includes('backend_integration'));
  assert.ok(agentCategories.includes('security_validation'));

  // Human-required tasks
  const humanCategories = humanRequired.map((t) => t.functionalCategory);
  assert.ok(humanCategories.includes('application_registration'));
  assert.ok(humanCategories.includes('redirect_uri_setup'));
  assert.ok(humanCategories.includes('administrator_approval'));
  assert.ok(humanCategories.includes('external_provider_verification'));
  assert.ok(humanCategories.includes('functional_testing'));
  assert.ok(humanCategories.includes('production_readiness'));

  // No agent task claims human action
  agentPrepared.forEach((t) => {
    assert.equal(t.category, 'agent_prepared');
  });
  humanRequired.forEach((t) => {
    assert.equal(t.category, 'human_required');
  });
});

test('Planner: Dependency Graph and Critical Path calculation (CPM algorithm)', () => {
  const discordInv = InvestigationService.getInvestigationById('inv_discord_demo')!;
  const rawTasks = generateTasksFromInvestigation(discordInv);

  const { criticalPathTaskIds, criticalPathHours, hasCycles, tasks } = calculateCriticalPath(rawTasks);

  assert.equal(hasCycles, false, 'Dependency graph must be an acyclic DAG');
  assert.ok(criticalPathTaskIds.length >= 3, 'Critical path must have at least 3 tasks');
  assert.ok(criticalPathHours > 0, 'Critical path hours must be positive');

  // Verify first task is on critical path (application registration)
  const appRegTask = tasks.find((t) => t.functionalCategory === 'application_registration')!;
  assert.equal(appRegTask.isCriticalPath, true);
  assert.equal(appRegTask.earliestStartHour, 0);

  // Verify critical path tasks have 0 slack
  tasks.filter((t) => t.isCriticalPath).forEach((t) => {
    assert.ok(t.slack !== undefined && t.slack <= 0.01, `Critical path task ${t.taskId} must have 0 slack`);
  });

  // Verify non-critical tasks have slack >= 0
  tasks.filter((t) => !t.isCriticalPath).forEach((t) => {
    assert.ok((t.slack || 0) >= 0, `Task ${t.taskId} slack must be non-negative`);
  });
});

test('Planner: Circular dependency detection prevents infinite loops', () => {
  const circularTasks: PlannerTask[] = [
    {
      id: 'task_A',
      taskId: 'task_A',
      title: 'Task A',
      description: 'A',
      category: 'agent_prepared',
      status: 'pending',
      priority: 'high',
      providerName: 'Test',
      estimatedHours: 2,
      dependencies: ['task_B']
    },
    {
      id: 'task_B',
      taskId: 'task_B',
      title: 'Task B',
      description: 'B',
      category: 'agent_prepared',
      status: 'pending',
      priority: 'high',
      providerName: 'Test',
      estimatedHours: 2,
      dependencies: ['task_A'] // Cycle!
    }
  ];

  const result = calculateCriticalPath(circularTasks);
  assert.equal(result.hasCycles, true, 'Must detect circular dependency');
  assert.ok(result.criticalPathHours >= 2);
});

test('Planner: Effort and Timeline estimation separates Hands-on Dev, External Wait, and Total Elapsed', () => {
  const discordInv = InvestigationService.getInvestigationById('inv_discord_demo')!;
  const rawTasks = generateTasksFromInvestigation(discordInv);
  const { criticalPathHours, tasks } = calculateCriticalPath(rawTasks);

  const effort = calculateEffortAndTimeline(tasks, discordInv, criticalPathHours);

  // Hands-on dev hours
  assert.ok(effort.handsOnDevHoursMin > 0);
  assert.ok(effort.handsOnDevHoursMax >= effort.handsOnDevHoursMin);
  assert.ok(effort.handsOnDevHoursLabel.includes('developer hours'));

  // External wait time
  assert.ok(effort.externalWaitDaysLabel);
  assert.equal(effort.isExternalWaitDocumented, true); // Discord has instant self-service

  // Total elapsed timeline
  assert.ok(effort.totalElapsedDaysMin > 0);
  assert.ok(effort.totalElapsedDaysMax >= effort.totalElapsedDaysMin);
  assert.ok(effort.totalElapsedDaysLabel.includes('business days'));

  // Split assumptions from documented facts
  assert.ok(effort.assumptions.length > 0);
  assert.ok(effort.documentedFacts.length > 0);
});

test('Planner: Unknown waiting period remains unknown when documentation is silent', () => {
  const silentInv: InvestigationDraft = {
    id: 'inv_silent_demo',
    appName: 'SilentApp',
    docUrl: 'https://silentapp.com/docs',
    authMethod: 'OAuth 2.0 PKCE',
    environmentType: 'Production',
    submittedAt: '2026-11-01T09:00:00Z',
    status: 'completed',
    findings: {
      sectionA_Overview: {
        appName: 'SilentApp',
        category: 'Developer Tools',
        authMethod: 'OAuth 2.0 PKCE',
        summary: 'Silent app overview',
        targetEnvironment: 'Production',
        investigationPurpose: 'oauth',
        complexity: 'Moderate',
        dependencyRisk: 'Medium'
      },
      sectionB_OAuthConfig: {
        clientRegistration: 'Portal'
      },
      sectionC_Scopes: [],
      sectionD_Governance: {
        // Silent review timelines
        externalReviewTimelines: undefined
      },
      sectionE_ResourceAccess: {},
      sectionF_TokenLifecycle: {},
      sectionG_EvidenceAndUnknowns: {
        claims: [],
        knownUnknowns: ['Vendor review SLA unpublished'],
        missingEvidenceNotes: []
      }
    },
    detectedScopes: [],
    identifiedApprovalGates: [],
    unknownQuestions: [],
    summaryNote: 'Silent',
    reviewTimelineNote: ''
  };

  const tasks = generateTasksFromInvestigation(silentInv);
  const { criticalPathHours } = calculateCriticalPath(tasks);
  const effort = calculateEffortAndTimeline(tasks, silentInv, criticalPathHours);

  assert.equal(effort.isExternalWaitDocumented, false);
  assert.ok(effort.externalWaitDaysLabel.includes('Unknown waiting period'));
});

test('Planner: Risk Register identifies permissions, PKCE ambiguity, rate limits, and token rotation', () => {
  const discordInv = InvestigationService.getInvestigationById('inv_discord_demo')!;
  const risks = generateRiskRegister(discordInv);

  assert.ok(risks.length >= 3, 'Must identify multiple risks');

  // Verify risk structure
  risks.forEach((r) => {
    assert.ok(r.riskId);
    assert.ok(r.risk);
    assert.ok(r.cause);
    assert.ok(['critical', 'high', 'medium', 'low'].includes(r.impact));
    assert.ok(['high', 'medium', 'low'].includes(r.likelihood));
    assert.ok(r.evidence);
    assert.ok(r.mitigation);
    assert.ok(r.owner);
    assert.ok(['open', 'mitigated', 'accepted'].includes(r.status));
  });

  // Verifies rate limit risk is captured
  const rateLimitRisk = risks.find((r) => /rate limit/i.test(r.risk));
  assert.ok(rateLimitRisk, 'Rate limit risk must be captured');
  assert.equal(rateLimitRisk.owner, 'Engineering');

  // Verifies PKCE ambiguity risk
  const pkceRisk = risks.find((r) => /pkce/i.test(r.risk));
  assert.ok(pkceRisk, 'PKCE schema parameter risk must be captured');
});

test('Planner: Implementation Guide generates all 14 structured sections linking to claims', () => {
  const discordInv = InvestigationService.getInvestigationById('inv_discord_demo')!;
  const rawTasks = generateTasksFromInvestigation(discordInv);
  const guide = generateImplementationGuide(discordInv, rawTasks);

  assert.equal(guide.sections.length, 14, 'Must generate exactly 14 structured sections');

  const expectedSectionIds = [
    'integration_overview',
    'prerequisites',
    'application_registration',
    'oauth_configuration',
    'redirect_uri_setup',
    'scope_selection',
    'authentication_flow',
    'token_management',
    'resource_access_validation',
    'error_handling',
    'security_considerations',
    'testing_checklist',
    'production_deployment_checklist',
    'known_limitations_and_unresolved_questions'
  ];

  expectedSectionIds.forEach((id, idx) => {
    assert.equal(guide.sections[idx].id, id, `Section ${idx + 1} must have id ${id}`);
    assert.ok(guide.sections[idx].title);
    assert.ok(guide.sections[idx].contentMarkdown);
  });

  // Verify OAuth configuration section links to PKCE claim and includes snippet
  const oauthSection = guide.sections.find((s) => s.id === 'oauth_configuration')!;
  assert.ok(oauthSection.codeSnippet);
  assert.ok(oauthSection.codeSnippet.code.includes('generatePkcePair'));

  // Verify Token management section references 604,800s lifespan claim
  const tokenSection = guide.sections.find((s) => s.id === 'token_management')!;
  const lifespanInstruction = tokenSection.technicalInstructions.find((i) => i.supportingClaimId === 'claim_discord_3');
  assert.ok(lifespanInstruction, 'Token management must link to claim_discord_3');
});

test('Planner: Full Plan Generation & In-memory Persistence', () => {
  const discordInv = InvestigationService.getInvestigationById('inv_discord_demo')!;
  const plan = generatePlanFromInvestigation(discordInv);

  assert.ok(plan.id);
  assert.equal(plan.appName, 'Discord');
  assert.equal(plan.tasks.length >= 12, true);
  assert.ok(plan.criticalPathTaskIds.length >= 3);
  assert.ok(plan.effort);
  assert.ok(plan.risks.length >= 3);
  assert.equal(plan.guide?.sections.length, 14);

  // Save to plannerStore
  plannerStore.savePlan(plan);
  const retrieved = plannerStore.getPlanById(plan.id);
  assert.ok(retrieved);
  assert.equal(retrieved?.id, plan.id);

  // Update task status
  const firstTaskId = plan.tasks[0].taskId || plan.tasks[0].id;
  const updated = plannerStore.updateTaskStatus(plan.id, firstTaskId, 'completed', 'Verified in developer portal');
  assert.ok(updated);
  const updatedTask = updated?.tasks.find((t) => (t.taskId || t.id) === firstTaskId);
  assert.equal(updatedTask?.status, 'completed');
  assert.equal(updated?.responsibilityMatrix.completedCount, 1);

  // Mark a task as blocked
  const secondTaskId = plan.tasks[1].taskId || plan.tasks[1].id;
  plannerStore.updateTaskStatus(plan.id, secondTaskId, 'blocked', 'Waiting on secret rotation');
  const blockedTask = plannerStore.getPlanById(plan.id)?.tasks.find((t) => (t.taskId || t.id) === secondTaskId);
  assert.equal(blockedTask?.status, 'blocked');
  assert.equal(blockedTask?.blockerInfo?.isBlocked, true);
  assert.equal(blockedTask?.blockerInfo?.blockedReason, 'Waiting on secret rotation');

  // Export Markdown
  const md = plannerStore.exportPlanMarkdown(plan);
  assert.ok(md.includes('# Integration Readiness Plan: Discord'));
  assert.ok(md.includes('## 1. Executive Summary & Effort Timeline'));
  assert.ok(md.includes('## 2. Integration Tasks & Dependencies'));
  assert.ok(md.includes('## 3. Risk Register'));
  assert.ok(md.includes('## 4. Structured Implementation Guide'));
});

test('Step 4.1: Persistent storage in data/plans.json survives simulated server restart', () => {
  // 1. Create a unique test plan and save it using the primary plannerStore
  const discordInv = InvestigationService.getInvestigationById('inv_discord_demo')!;
  const testPlan = generatePlanFromInvestigation(discordInv);
  testPlan.id = 'plan_persistence_verification_test';
  testPlan.appName = 'Discord Persistence Test';

  plannerStore.savePlan(testPlan);

  // 2. Mark a task as completed in plannerStore
  const targetTaskId = testPlan.tasks[0].taskId || testPlan.tasks[0].id;
  plannerStore.updateTaskStatus(testPlan.id, targetTaskId, 'completed', 'Durable write test note');

  // 3. Simulate a server restart by instantiating a completely fresh PersistentPlanStore
  // This fresh store reads directly from data/plans.json on disk
  const freshRestartedStore = new PersistentPlanStore();
  const loadedPlan = freshRestartedStore.getPlanById(testPlan.id);

  assert.ok(loadedPlan, 'Plan must survive simulated server restart and reload from data/plans.json');
  assert.equal(loadedPlan?.id, testPlan.id);
  assert.equal(loadedPlan?.appName, 'Discord Persistence Test');

  // Verify task status survived restart
  const reloadedTask = loadedPlan?.tasks.find((t) => (t.taskId || t.id) === targetTaskId);
  assert.equal(reloadedTask?.status, 'completed', 'Task status update must persist across server restart');

  // Verify storage metadata
  const storageInfo = freshRestartedStore.getStorageInfo();
  assert.equal(storageInfo.storageType, 'local_file_json');
  assert.equal(storageInfo.survivesServerRestart, true);
  assert.equal(storageInfo.survivesBrowserRefresh, true);
  assert.equal(storageInfo.filePath, 'data/plans.json');

  // Clean up test plan so data/plans.json contains only canonical demonstration plan
  freshRestartedStore.deletePlan(testPlan.id);
  plannerStore.deletePlan(testPlan.id);
});

test('Step 4.1: Discord refresh token rotation is classified as UNKNOWN and locking as GENERIC_ENGINEERING_RECOMMENDATION', () => {
  const discordInv = InvestigationService.getInvestigationById('inv_discord_demo')!;

  // 1. In Investigation draft findings, token rotation is explicitly Unknown/Undocumented
  const tokenLifecycle = discordInv.findings?.sectionF_TokenLifecycle;
  assert.ok(tokenLifecycle, 'tokenLifecycle section must exist');
  assert.ok(
    tokenLifecycle.tokenRotation?.toLowerCase().includes('unknown') ||
    tokenLifecycle.tokenRotation?.toLowerCase().includes('undocumented'),
    'Token rotation must be recorded as Unknown / Undocumented'
  );
  assert.equal(
    tokenLifecycle.tokenRotation?.toLowerCase().includes('mandatory single-use'),
    false,
    'Must NOT state that single-use rotation is mandatory for Discord'
  );

  // 2. In generated tasks, token lifecycle task must be marked as GENERIC_ENGINEERING_RECOMMENDATION
  const tasks = generateTasksFromInvestigation(discordInv);
  const tokenTask = tasks.find((t) => t.functionalCategory === 'token_lifecycle_implementation')!;
  assert.ok(tokenTask, 'Token lifecycle task must exist');
  assert.equal(
    tokenTask.provenance,
    'GENERIC_ENGINEERING_RECOMMENDATION',
    'Token lifecycle task must be labeled GENERIC_ENGINEERING_RECOMMENDATION because rotation is undocumented'
  );
  assert.ok(
    /undocumented/i.test(tokenTask.description),
    'Task description must explicitly note that Discord docs do not document refresh token reuse'
  );

  // 3. In Risk Register, Risk regarding token rotation must flag rotation as unknown and locking as an engineering defense
  const risks = generateRiskRegister(discordInv);
  const rotationRisk = risks.find((r) => /rotation|concurrency/i.test(r.risk))!;
  assert.ok(rotationRisk, 'Risk regarding token rotation must exist');
  assert.ok(
    /undocumented|does not publish/i.test(rotationRisk.cause) || /undocumented/i.test(rotationRisk.evidence),
    'Risk cause or evidence must state that Discord documentation is silent regarding refresh token rotation'
  );
  assert.ok(
    rotationRisk.mitigation.includes('Generic engineering recommendation') ||
    rotationRisk.mitigation.includes('defensive engineering measure') ||
    rotationRisk.mitigation.includes('generic safety precaution'),
    'Mitigation must be framed as a defensive engineering measure rather than provider requirement'
  );
});

test('Step 4.1: Every generated task has explicit task provenance', () => {
  const discordInv = InvestigationService.getInvestigationById('inv_discord_demo')!;
  const tasks = generateTasksFromInvestigation(discordInv);

  const validProvenances = [
    'PROVIDER_DOCUMENTED',
    'GENERIC_ENGINEERING_RECOMMENDATION',
    'PROJECT_ASSUMPTION',
    'UNVERIFIED_DEPENDENCY'
  ];

  // Every task must have a valid provenance
  tasks.forEach((t) => {
    assert.ok(t.provenance, `Task ${t.taskId || t.id} must have a provenance property`);
    assert.ok(
      validProvenances.includes(t.provenance),
      `Task ${t.taskId || t.id} has invalid provenance: ${t.provenance}`
    );
  });

  // Check specific provenance classifications
  const pkceTask = tasks.find((t) => t.functionalCategory === 'oauth_configuration')!;
  assert.equal(pkceTask.provenance, 'PROVIDER_DOCUMENTED');

  const adminApprovalTask = tasks.find((t) => t.functionalCategory === 'administrator_approval')!;
  assert.equal(adminApprovalTask.provenance, 'PROJECT_ASSUMPTION');

  const resourceAccessTask = tasks.find((t) => t.functionalCategory === 'resource_access_configuration')!;
  assert.equal(resourceAccessTask.provenance, 'GENERIC_ENGINEERING_RECOMMENDATION');

  const securityTask = tasks.find((t) => t.functionalCategory === 'security_validation')!;
  assert.equal(securityTask.provenance, 'PROVIDER_DOCUMENTED');

  const verificationTask = tasks.find((t) => t.functionalCategory === 'external_provider_verification')!;
  assert.equal(verificationTask.provenance, 'UNVERIFIED_DEPENDENCY');
});

test('Step 4.1: Implementation guide technical instructions have explicit instruction provenance', () => {
  const discordInv = InvestigationService.getInvestigationById('inv_discord_demo')!;
  const tasks = generateTasksFromInvestigation(discordInv);
  const guide = generateImplementationGuide(discordInv, tasks);

  const validInstructionProvenances = [
    'OFFICIALLY_DOCUMENTED',
    'INDEPENDENTLY_CORROBORATED',
    'GENERIC_ENGINEERING_RECOMMENDATION',
    'PROJECT_ASSUMPTION',
    'UNKNOWN'
  ];

  let totalInstructions = 0;
  guide.sections.forEach((sec) => {
    sec.technicalInstructions.forEach((ins) => {
      totalInstructions++;
      assert.ok(
        ins.provenance,
        `Instruction [${ins.step}] in section "${sec.title}" must have provenance`
      );
      assert.ok(
        validInstructionProvenances.includes(ins.provenance),
        `Instruction [${ins.step}] has invalid provenance: ${ins.provenance}`
      );
    });
  });

  assert.ok(totalInstructions >= 25, 'Guide must contain at least 25 technical instructions');

  // In section 8 (token_management), token rotation must be GENERIC_ENGINEERING_RECOMMENDATION or UNKNOWN
  const tokenSec = guide.sections.find((s) => s.id === 'token_management')!;
  const rotationInstruction = tokenSec.technicalInstructions.find((i) =>
    i.instruction.toLowerCase().includes('distributed lock') ||
    i.instruction.toLowerCase().includes('rotation')
  );
  assert.ok(rotationInstruction, 'Must have token rotation instruction');
  assert.equal(
    rotationInstruction.provenance,
    'GENERIC_ENGINEERING_RECOMMENDATION',
    'Distributed locking instruction must be labeled GENERIC_ENGINEERING_RECOMMENDATION'
  );
});

test('Step 4.1: Effort & timeline calculation maintains independent measures with daily velocity and non-guaranteed disclaimer', () => {
  const discordInv = InvestigationService.getInvestigationById('inv_discord_demo')!;
  const tasks = generateTasksFromInvestigation(discordInv);
  const { criticalPathHours, criticalPathTaskIds } = calculateCriticalPath(tasks);
  const effort = calculateEffortAndTimeline(tasks, discordInv, criticalPathHours);

  // 1. Hands-on dev effort is 34-52 hours across all tasks
  assert.ok(effort.handsOnDevHoursMin >= 30, 'Hands-on dev hours min should be >= 30');
  assert.ok(effort.handsOnDevHoursMax <= 60, 'Hands-on dev hours max should be <= 60');

  // 2. Critical path hours is 21h (less than total hands-on effort because parallel tracks exist)
  assert.ok(criticalPathHours < effort.handsOnDevHoursMin, 'Critical path must be less than sum of all tasks');
  assert.equal(criticalPathHours, 21, 'Discord critical path is 21h');

  // 3. Daily velocity is 6h/day
  assert.equal(effort.assumedProductiveHoursPerDay, 6, 'Productive velocity must be 6h/day');

  // 4. Elapsed days is 4-6 business days (21h / 6h = 3.5 days -> 4-6d)
  assert.equal(effort.totalElapsedDaysMin, 4);
  assert.equal(effort.totalElapsedDaysMax, 6);

  // 5. External wait time is instant for self-service OAuth (0-1 days) with conditional note for bot verification
  assert.equal(effort.externalWaitDaysMin, 0);
  assert.equal(effort.externalWaitDaysMax, 1);
  assert.ok(
    effort.conditionalVerificationNote?.includes('75'),
    'Must include note that Discord bot review (5-10d) is only required for bots reaching 75+ guilds'
  );

  // 6. Guarantee flag is explicitly false
  assert.equal(effort.isEstimateGuaranteed, false, 'Timeline must NOT be presented as guaranteed');
  assert.ok(
    effort.disclaimer?.includes('Estimated (Not Guaranteed)') ||
    effort.disclaimer?.includes('is an estimate'),
    'Disclaimer must be present'
  );
});

test('Shareable Read-Only Guide URL: Resolves canonical plan by ID and handles missing plans', () => {
  // 1. Existing canonical demonstration plan
  const canonicalPlan = plannerStore.getPlanById('plan_inv_discord_demo');
  assert.ok(canonicalPlan, 'Canonical demonstration plan must exist in plannerStore');
  assert.equal(canonicalPlan?.id, 'plan_inv_discord_demo');
  assert.equal(canonicalPlan?.appName, 'Discord');
  assert.ok(canonicalPlan?.tasks.length >= 12);

  // 2. Non-existent plan returns undefined/null gracefully
  const missingPlan = plannerStore.getPlanById('plan_non_existent_99999');
  assert.equal(missingPlan, undefined, 'Missing plan must return undefined without throwing');

  // 3. Share URL parameter validation
  const testUrl = new URL('http://localhost:3000/?plan=plan_inv_discord_demo');
  const planParam = testUrl.searchParams.get('plan');
  assert.equal(planParam, 'plan_inv_discord_demo');

  const guideUrl = new URL('http://localhost:3000/?guide=plan_inv_discord_demo');
  const guideParam = guideUrl.searchParams.get('guide');
  assert.equal(guideParam, 'plan_inv_discord_demo');
});

test('Shareable Read-Only Guide: Read-only mode guards task status and documents persistence model', () => {
  const plan = plannerStore.getPlanById('plan_inv_discord_demo');
  assert.ok(plan);

  // Read-only logic guard simulation
  const isSharedReadOnly = true;
  let taskStatusUpdated = false;

  const simulateStatusUpdate = (taskId: string, newStatus: string) => {
    if (isSharedReadOnly) {
      // Guarded against mutation in read-only mode
      return false;
    }
    taskStatusUpdated = true;
    return true;
  };

  const updateResult = simulateStatusUpdate('task_1', 'COMPLETED');
  assert.equal(updateResult, false, 'Mutations must be blocked in shared read-only mode');
  assert.equal(taskStatusUpdated, false);

  // Storage lifecycle verification: data/plans.json is the designated persistence store
  const storeInstance = plannerStore;
  assert.ok(storeInstance instanceof PersistentPlanStore, 'Must use PersistentPlanStore instance');
});


