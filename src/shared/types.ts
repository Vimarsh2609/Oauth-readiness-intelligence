/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type NavigationPage = 
  | 'overview'
  | 'discovery'
  | 'investigations'
  | 'readiness'
  | 'planner'
  | 'guides'
  | 'reports'
  | 'settings';

export type AuthMethod = 
  | 'OAuth 2.0 PKCE'
  | 'OAuth 2.0 Web (Confidential)'
  | 'OAuth 2.0 + Scopes'
  | 'OAuth 2.0 + Instance Admin'
  | 'API Key / Token';

export type ProviderCategory = 
  | 'Developer Tools'
  | 'Productivity & Knowledge'
  | 'Communication & Mail'
  | 'Enterprise ITSM'
  | 'CRM & Sales'
  | 'Identity & Directory';

export type EvidenceStatus = 
  | 'Verified Docs (Sample)'
  | 'Pending Verification'
  | 'In Review'
  | 'Community Sourced';

/**
 * Claim-level evidence model status
 */
export type ClaimEvidenceStatus = 
  | 'official_verified'
  | 'independently_corroborated'
  | 'estimated'
  | 'hypothesis'
  | 'unknown';

export type ClaimConfidence = 'high' | 'medium' | 'low' | 'unverified';

/**
 * Claim-Level Evidence Model interface
 */
export interface ProviderClaim {
  claimId: string;
  providerId: string;
  claimText: string;
  sourceUrl?: string;
  sourceTitle?: string;
  checkedAt?: string;
  applicability: string;
  evidenceStatus: ClaimEvidenceStatus;
  confidence: ClaimConfidence;
  supportingExcerpt?: string;
  notes?: string;
  limitations?: string;
}

export interface ScopeDefinition {
  name: string;
  tier: 'Non-Sensitive' | 'Sensitive' | 'Restricted' | 'Instance-Configured' | 'Standard';
  description: string;
  auditRequirement: string;
  evidenceStatus: ClaimEvidenceStatus;
  sourceUrl?: string;
}

export interface ProviderOAuthConfig {
  clientRegistration?: string;
  redirectUris?: string;
  supportedGrantTypes?: string[];
  pkceRequirement?: 'Required' | 'Supported / Recommended' | 'Not Supported' | 'Instance-dependent' | 'Unknown';
  clientSecretsHandling?: string;
}

export interface ProviderGovernanceRequirements {
  appSubmissionProcess?: string;
  externalReviewTimelines?: string;
  adminDependencies?: string[];
  securityAssessments?: string;
}

export interface ProviderResourceAccessModel {
  workspaceVsResource?: string;
  sharingModel?: string;
  granularity?: string;
}

export interface ProviderTokenLifecycleDetails {
  accessTokenLifespan?: string;
  refreshTokenModel?: string;
  tokenRotation?: string;
  revocationBehavior?: string;
}

export interface ProviderRecord {
  id: string;
  name: string;
  slug: string;
  category: ProviderCategory;
  authMethod: AuthMethod;
  evidenceStatus: EvidenceStatus;
  lastVerifiedDate: string;
  summary: string;
  documentationUrl: string;
  sampleRecord: true;
  waitingTimeRating: string;
  costTier: string;
  complexity: 'Low' | 'Moderate' | 'High' | 'Extreme' | 'Insufficient evidence';
  dependencyRisk: 'Low' | 'Medium' | 'High' | 'Critical' | 'Insufficient evidence';
  requiredApprovals: string[];
  keyScopes: string[];
  scopeDefinitions?: ScopeDefinition[];
  tokenLifespan: string;
  tokenRefreshModel: string;
  rateLimitsSummary: string;
  knownUnknowns: string[];
  claims: ProviderClaim[];
  oauthConfig?: ProviderOAuthConfig;
  governanceRequirements?: ProviderGovernanceRequirements;
  resourceAccessModel?: ProviderResourceAccessModel;
  tokenLifecycleDetails?: ProviderTokenLifecycleDetails;
}

export type AuthFilterOption = 'all' | 'OAuth 2.0' | 'OAuth 2.0 PKCE' | 'API token' | 'Instance-configured';
export type ComplexityFilterOption = 'all' | 'Low' | 'Moderate' | 'High' | 'Extreme';
export type EvidenceFilterOption = 
  | 'all'
  | 'Officially verified'
  | 'Independently corroborated'
  | 'Estimated'
  | 'Hypothesis'
  | 'Unknown'
  | 'Sample record';
export type DependencyRiskFilterOption = 'all' | 'Low' | 'Medium' | 'High' | 'Critical';

export interface ProviderFilterCriteria {
  query?: string;
  authMethod?: AuthFilterOption;
  complexity?: ComplexityFilterOption;
  evidenceStatus?: EvidenceFilterOption;
  dependencyRisk?: DependencyRiskFilterOption;
  category?: ProviderCategory | 'all';
}

export type ComparisonContrastStatus = 
  | 'differs' 
  | 'match' 
  | 'undocumented_both' 
  | 'undocumented_partial';

export interface ComparisonDimensionItem {
  dimensionKey: string;
  title: string;
  providerAValue: string;
  providerBValue: string;
  isDifferent: boolean;
  contrastStatus?: ComparisonContrastStatus;
  notes?: string;
}

export interface SectionEvidenceAudit {
  sectionId: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  sectionName: string;
  status: 'claim_evidenced' | 'sample_baseline' | 'insufficient_evidence';
  supportingClaimIds: string[];
  notes: string;
}

export interface ProviderEvidenceSummary {
  providerId: string;
  providerName: string;
  totalClaims: number;
  officialVerifiedClaims: number;
  corroboratedClaims: number;
  estimatedClaims: number;
  hypothesisClaims: number;
  unknownClaims: number;
  overallReadinessStatus: 'Partial Baseline (Sample Record)';
  isComprehensivelyVerified: false;
  sectionAudits: SectionEvidenceAudit[];
  insufficientSections: string[];
  evidencedSections: string[];
}

export interface ProviderComparisonReport {
  providerA: ProviderRecord;
  providerB: ProviderRecord;
  dimensions: ComparisonDimensionItem[];
  differenceCount: number;
}


export type DimensionKey = 
  | 'technical_effort'
  | 'waiting_time'
  | 'direct_cost'
  | 'internal_dependencies'
  | 'dependency_risk'
  | 'evidence_confidence';

export interface ReadinessDimension {
  key: DimensionKey;
  name: string;
  tagline: string;
  description: string;
  metricUnits: string;
  rubricCriteria: string[];
  commonPitfalls: string[];
}

export type TaskCategory = 
  | 'agent_prepared'
  | 'human_required'
  | 'blocked_unverified';

export type PlannerFunctionalCategory =
  | 'application_registration'
  | 'oauth_configuration'
  | 'redirect_uri_setup'
  | 'scope_configuration'
  | 'administrator_approval'
  | 'external_provider_verification'
  | 'resource_access_configuration'
  | 'token_lifecycle_implementation'
  | 'backend_integration'
  | 'security_validation'
  | 'functional_testing'
  | 'production_readiness';

export type ResponsibleParty = 'agent_prepared' | 'human_required';

export type TaskStatus = 
  | 'todo'
  | 'pending'
  | 'in_progress'
  | 'blocked'
  | 'completed'
  | 'ready_for_review';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export type TaskProvenance =
  | 'PROVIDER_DOCUMENTED'
  | 'GENERIC_ENGINEERING_RECOMMENDATION'
  | 'PROJECT_ASSUMPTION'
  | 'UNVERIFIED_DEPENDENCY';

export type InstructionProvenance =
  | 'OFFICIALLY_DOCUMENTED'
  | 'INDEPENDENTLY_CORROBORATED'
  | 'GENERIC_ENGINEERING_RECOMMENDATION'
  | 'PROJECT_ASSUMPTION'
  | 'UNKNOWN';

export type PlanStorageType = 'local_file_json' | 'in_memory_fallback';

export interface PlanStorageInfo {
  storageType: PlanStorageType;
  filePath?: string;
  survivesServerRestart: boolean;
  survivesBrowserRefresh: boolean;
  persistenceNote: string;
}

export type TaskEvidenceStatus =
  | ClaimEvidenceStatus
  | 'sample_record'
  | 'recommended_practice'
  | 'insufficient_evidence';

export interface BlockerInfo {
  isBlocked: boolean;
  blockedReason?: string;
  blockedAt?: string;
}

export interface PlannerTask {
  // Core identifier fields
  id: string;
  taskId?: string; // Step 4 alias for id
  title: string;
  taskTitle?: string; // Step 4 alias for title
  description: string;
  
  // Categorization and ownership
  category: TaskCategory;
  functionalCategory?: PlannerFunctionalCategory;
  responsibleParty?: ResponsibleParty;
  provenance?: TaskProvenance;
  humanOwnerRole?: string;
  automationCapabilityNote?: string;
  
  // Execution status & priority
  status: TaskStatus;
  priority: TaskPriority;
  
  // Context & inputs
  providerName: string;
  requiredInputs?: string[];
  dependencies?: string[]; // IDs of preceding tasks
  supportingClaimIds?: string[];
  evidenceStatus?: TaskEvidenceStatus;
  completionCriteria?: string;
  blockerInfo?: BlockerInfo;
  blockerReason?: string;
  
  // Timeline, effort & critical path metrics
  estimatedHours?: number; // Hands-on engineering effort
  externalWaitDays?: number | string; // e.g. 5 or "Unknown waiting period"
  isCriticalPath?: boolean;
  earliestStartHour?: number;
  earliestFinishHour?: number;
  latestStartHour?: number;
  latestFinishHour?: number;
  slack?: number;
}

export interface EffortEstimation {
  handsOnDevHoursMin: number;
  handsOnDevHoursMax: number;
  handsOnDevHoursLabel: string;
  assumedProductiveHoursPerDay: number;
  externalWaitDaysMin?: number;
  externalWaitDaysMax?: number;
  externalWaitDaysLabel: string;
  isExternalWaitDocumented: boolean;
  conditionalVerificationNote?: string;
  totalElapsedDaysMin: number;
  totalElapsedDaysMax: number;
  totalElapsedDaysLabel: string;
  isEstimateGuaranteed: false;
  disclaimer?: string;
  assumptions: string[];
  documentedFacts: string[];
}

export interface RiskRegisterItem {
  riskId: string;
  risk: string;
  cause: string;
  impact: 'critical' | 'high' | 'medium' | 'low';
  likelihood: 'high' | 'medium' | 'low';
  evidence: string;
  supportingClaimId?: string;
  mitigation: string;
  owner: 'Engineering' | 'Security / Compliance' | 'Workspace Administrator' | 'Product';
  status: 'open' | 'mitigated' | 'accepted';
}

export interface TechnicalInstruction {
  step: string;
  instruction: string;
  supportingClaimId?: string;
  evidenceText?: string;
  isRecommendation: boolean; // false = documented provider requirement; true = generic best practice
  provenance: InstructionProvenance;
}

export interface GuideSectionDetail {
  sectionNumber: number;
  id: string;
  title: string;
  summary: string;
  contentMarkdown: string;
  technicalInstructions: TechnicalInstruction[];
  codeSnippet?: {
    language: string;
    code: string;
    caption?: string;
  };
  warnings?: string[];
}

export interface StructuredImplementationGuide {
  id: string;
  planId: string;
  appName: string;
  generatedAt: string;
  sections: GuideSectionDetail[];
}

export interface IntegrationPlan {
  id: string;
  investigationId: string;
  appName: string;
  docUrl: string;
  authMethod: AuthMethod;
  createdAt: string;
  updatedAt: string;
  storageInfo?: PlanStorageInfo;
  tasks: PlannerTask[];
  criticalPathTaskIds: string[];
  criticalPathHours: number;
  effort: EffortEstimation;
  responsibilityMatrix: {
    agentPreparedCount: number;
    humanRequiredCount: number;
    blockedCount: number;
    completedCount: number;
    totalTasks: number;
  };
  risks: RiskRegisterItem[];
  guide?: StructuredImplementationGuide;
}

export interface DetectedScopeItem {
  name: string;
  tier: 'Non-Sensitive' | 'Sensitive' | 'Restricted' | 'Custom Instance' | 'Standard';
  verificationLabel: 'Sample / Unverified' | 'Corroborated';
}

export type InvestigationPurpose = 'oauth' | 'api_auth' | 'both';

export type InvestigationLifecycleStatus = 
  | 'queued'
  | 'fetching_sources'
  | 'extracting'
  | 'validating_evidence'
  | 'completed'
  | 'completed_with_gaps'
  | 'failed'
  | 'requires_manual_review'
  | 'staged_not_connected';

export interface RetrievedSourceDoc {
  url: string;
  title: string;
  byteCount: number;
  fetchedAt: string;
  status: 'retrieved' | 'fallback_sample' | 'failed';
  error?: string;
  contentType?: string;
}

export interface InvestigationSectionFindings {
  sectionA_Overview: {
    appName: string;
    category: ProviderCategory;
    authMethod: AuthMethod;
    summary: string;
    targetEnvironment: string;
    investigationPurpose: InvestigationPurpose;
    complexity: 'Low' | 'Moderate' | 'High' | 'Extreme' | 'Insufficient evidence';
    dependencyRisk: 'Low' | 'Medium' | 'High' | 'Critical' | 'Insufficient evidence';
  };
  sectionB_OAuthConfig: ProviderOAuthConfig;
  sectionC_Scopes: ScopeDefinition[];
  sectionD_Governance: ProviderGovernanceRequirements;
  sectionE_ResourceAccess: ProviderResourceAccessModel;
  sectionF_TokenLifecycle: ProviderTokenLifecycleDetails;
  sectionG_EvidenceAndUnknowns: {
    claims: ProviderClaim[];
    knownUnknowns: string[];
    missingEvidenceNotes: string[];
  };
}

export interface InvestigationEvidenceSummary {
  totalClaims: number;
  officialVerified: number;
  corroborated: number;
  estimated: number;
  hypothesis: number;
  unknown: number;
  missingEvidenceFields: string[];
  documentationCoveragePercent: number;
}

export interface InvestigationDraft {
  id: string;
  appName: string;
  docUrl: string;
  authMethod: AuthMethod;
  environmentType: 'Production' | 'Staging / Sandbox' | 'Internal Tool';
  submittedAt: string;
  completedAt?: string;
  status: InvestigationLifecycleStatus;
  investigationPurpose?: InvestigationPurpose;
  description?: string;
  progressPercent?: number;
  progressMessage?: string;
  retrievedSources?: RetrievedSourceDoc[];
  findings?: InvestigationSectionFindings;
  evidenceSummary?: InvestigationEvidenceSummary;
  extractionEngine?: 'gemini-3.8-flash' | 'deterministic-pipeline';
  errorMessage?: string;
  urlProvenance?: 'verified_registry' | 'user_supplied' | 'inferred_from_url';
  isDerivedName?: boolean;
  // Legacy fields kept for 100% backward compatibility
  detectedScopes: DetectedScopeItem[];
  identifiedApprovalGates: string[];
  unknownQuestions: string[];
  summaryNote: string;
  reviewTimelineNote: string;
}

export interface IntegrationGuide {
  id: string;
  slug: string;
  title: string;
  providerName: string;
  lastUpdated: string;
  evidenceStatus: EvidenceStatus;
  readTime: string;
  summary: string;
  isDemonstration: true;
  sections: {
    title: string;
    content: string;
    codeSnippet?: string;
    warning?: string;
  }[];
}

export type EngineStatus =
  | 'deterministic_only'
  | 'model_configured'
  | 'model_reachable'
  | 'model_unavailable'
  | 'offline';

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptimeSeconds: number;
  service: string;
  version: string;
  engineStatus: EngineStatus;
  modelConfigured: boolean;
  modelReachable: boolean;
  modelStatus: 'not_configured' | 'configured' | 'reachable' | 'unavailable';
  modelExtractionAvailable: boolean;
  deterministicExtractionAvailable: boolean;
  billingRequired: false;
  environment: string;
  port: number;
}
