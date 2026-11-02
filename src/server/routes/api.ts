/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { ProviderService } from '../services/providerService.ts';
import { InvestigationService } from '../services/investigationService.ts';
import {
  plannerStore,
  generatePlanFromInvestigation,
  generateImplementationGuide
} from '../services/plannerService.ts';
import { validateInvestigationIntake, AppError } from '../middleware/validate.ts';
import { HealthResponse } from '../../shared/types.ts';

export const apiRouter = Router();

const startTime = Date.now();

let modelReachable = false;
let modelCheckedAt = 0;

export async function checkModelReachability(): Promise<boolean> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim().length <= 10) {
    modelReachable = false;
    return false;
  }
  // Cache check for 60 seconds to avoid latency overhead on repeated calls
  if (Date.now() - modelCheckedAt < 60000) {
    return modelReachable;
  }
  modelCheckedAt = Date.now();
  const abortController = new AbortController();
  const timer = setTimeout(() => {
    abortController.abort();
  }, 1500);
  timer.unref?.();

  try {
    const ai = new GoogleGenAI({});
    await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'ping',
      config: {
        maxOutputTokens: 1,
        abortSignal: abortController.signal
      }
    });
    clearTimeout(timer);
    modelReachable = true;
    return true;
  } catch {
    clearTimeout(timer);
    abortController.abort();
    modelReachable = false;
    return false;
  }
}

/**
 * Health check endpoint: GET /api/health
 * Cleanly distinguishes:
 * - Model configured (API key exists)
 * - Model reachable (live connectivity check succeeded)
 * - Model unavailable (configured but live call fails/times out)
 * - Deterministic extraction available (always true, ₹0 cost)
 * Never reports model_connected based solely on API key presence.
 */
apiRouter.get('/health', async (_req: Request, res: Response) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const apiKey = process.env.GEMINI_API_KEY;
  const isConfigured = Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim().length > 10);
  const isReachable = isConfigured ? await checkModelReachability() : false;

  let modelStatus: 'not_configured' | 'configured' | 'reachable' | 'unavailable' = 'not_configured';
  if (isConfigured) {
    modelStatus = isReachable ? 'reachable' : 'unavailable';
  }

  let engineStatus: 'deterministic_only' | 'model_configured' | 'model_reachable' | 'model_unavailable' = 'deterministic_only';
  if (isReachable) {
    engineStatus = 'model_reachable';
  } else if (isConfigured) {
    engineStatus = 'model_unavailable';
  }

  const health: HealthResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    service: 'oauth-readiness-intelligence',
    version: '0.2.0-beta',
    engineStatus,
    modelConfigured: isConfigured,
    modelReachable: isReachable,
    modelStatus,
    modelExtractionAvailable: isReachable,
    deterministicExtractionAvailable: true,
    billingRequired: false,
    environment: process.env.NODE_ENV || 'development',
    port: 3000
  };
  res.json(health);
});

/**
 * Providers endpoints
 */
apiRouter.get('/providers', (_req: Request, res: Response) => {
  const providers = ProviderService.getAllProviders();
  res.json({
    success: true,
    count: providers.length,
    disclaimer: 'Demonstration records only. Not yet independently verified.',
    data: providers
  });
});

apiRouter.get('/providers/:slug', (req: Request, res: Response) => {
  const provider = ProviderService.getProviderBySlug(req.params.slug);
  if (!provider) {
    throw new AppError(`Provider '${req.params.slug}' not found`, 404);
  }
  res.json({ success: true, data: provider });
});

/**
 * Readiness dimensions endpoint
 */
apiRouter.get('/dimensions', (_req: Request, res: Response) => {
  const dimensions = ProviderService.getReadinessDimensions();
  res.json({
    success: true,
    count: dimensions.length,
    note: 'Six foundational dimensions of OAuth and API integration readiness.',
    data: dimensions
  });
});

/**
 * Tasks endpoint
 */
apiRouter.get('/tasks', (_req: Request, res: Response) => {
  const tasks = ProviderService.getAllTasks();
  res.json({
    success: true,
    count: tasks.length,
    data: tasks
  });
});

/**
 * Guides endpoints
 */
apiRouter.get('/guides', (_req: Request, res: Response) => {
  const guides = ProviderService.getAllGuides();
  res.json({
    success: true,
    count: guides.length,
    disclaimer: 'Demonstration content only.',
    data: guides
  });
});

apiRouter.get('/guides/:slug', (req: Request, res: Response) => {
  const guide = ProviderService.getGuideBySlug(req.params.slug);
  if (!guide) {
    throw new AppError(`Integration guide '${req.params.slug}' not found`, 404);
  }
  res.json({ success: true, data: guide });
});

/**
 * Investigations endpoints: Live Investigation Engine
 */
apiRouter.get('/investigations', async (_req: Request, res: Response) => {
  const investigations = InvestigationService.listInvestigations();
  const apiKey = process.env.GEMINI_API_KEY;
  const isConfigured = Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim().length > 10);
  const isReachable = isConfigured ? await checkModelReachability() : false;

  res.json({
    success: true,
    count: investigations.length,
    engineStatus: isReachable ? 'model_reachable' : isConfigured ? 'model_unavailable' : 'deterministic_only',
    modelConfigured: isConfigured,
    modelReachable: isReachable,
    deterministicExtractionAvailable: true,
    billingRequired: false,
    data: investigations
  });
});

apiRouter.get('/investigations/:id', async (req: Request, res: Response) => {
  const investigation = InvestigationService.getInvestigationById(req.params.id);
  if (!investigation) {
    throw new AppError(`Investigation record '${req.params.id}' not found`, 404);
  }
  const apiKey = process.env.GEMINI_API_KEY;
  const isConfigured = Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim().length > 10);
  const isReachable = isConfigured ? await checkModelReachability() : false;

  res.json({
    success: true,
    engineStatus: isReachable ? 'model_reachable' : isConfigured ? 'model_unavailable' : 'deterministic_only',
    modelConfigured: isConfigured,
    modelReachable: isReachable,
    deterministicExtractionAvailable: true,
    billingRequired: false,
    data: investigation
  });
});

apiRouter.post('/investigations', validateInvestigationIntake, async (req: Request, res: Response, next) => {
  try {
    const {
      appName,
      docUrl,
      authMethod,
      environmentType,
      investigationPurpose,
      description,
      urlProvenance,
      isDerivedName
    } = req.body;
    
    const record = await InvestigationService.runLiveInvestigation({
      appName,
      docUrl,
      authMethod,
      environmentType,
      investigationPurpose,
      description,
      urlProvenance,
      isDerivedName
    });

    res.status(201).json({
      success: true,
      message: record.status === 'failed'
        ? 'Investigation completed with errors.'
        : 'Live investigation completed successfully.',
      data: record
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Integration Readiness Planner Endpoints (Step 4)
 */

// List all generated integration plans
apiRouter.get('/plans', (_req: Request, res: Response) => {
  const plans = plannerStore.listPlans();
  res.json({
    success: true,
    count: plans.length,
    data: plans
  });
});

// Retrieve a single integration plan by ID
apiRouter.get('/plans/:id', (req: Request, res: Response) => {
  const plan = plannerStore.getPlanById(req.params.id);
  if (!plan) {
    throw new AppError(`Integration plan '${req.params.id}' not found`, 404);
  }
  res.json({
    success: true,
    data: plan
  });
});

// Generate an integration plan from an investigation
apiRouter.post('/plans/generate', (req: Request, res: Response) => {
  const { investigationId } = req.body;
  if (!investigationId) {
    throw new AppError('investigationId is required to generate an integration plan', 400);
  }

  const investigation = InvestigationService.getInvestigationById(investigationId);
  if (!investigation) {
    throw new AppError(`Investigation record '${investigationId}' not found`, 404);
  }

  const plan = generatePlanFromInvestigation(investigation);
  plannerStore.savePlan(plan);

  res.status(201).json({
    success: true,
    message: `Integration plan generated successfully for ${plan.appName}.`,
    data: plan
  });
});

// Update task status, blocker reason, or notes
apiRouter.patch('/plans/:id/tasks/:taskId', (req: Request, res: Response) => {
  const { id, taskId } = req.params;
  const { status, notes } = req.body;

  if (!status) {
    throw new AppError('status is required for task update', 400);
  }

  const updatedPlan = plannerStore.updateTaskStatus(id, taskId, status, notes);
  if (!updatedPlan) {
    throw new AppError(`Plan '${id}' or task '${taskId}' not found`, 404);
  }

  res.json({
    success: true,
    message: `Task '${taskId}' updated to status '${status}'.`,
    data: updatedPlan
  });
});

// Regenerate implementation guide from updated investigation claims
apiRouter.post('/plans/:id/regenerate-guide', (req: Request, res: Response) => {
  const plan = plannerStore.getPlanById(req.params.id);
  if (!plan) {
    throw new AppError(`Plan '${req.params.id}' not found`, 404);
  }

  const investigation = InvestigationService.getInvestigationById(plan.investigationId);
  if (!investigation) {
    throw new AppError(`Investigation record '${plan.investigationId}' not found`, 404);
  }

  const guide = generateImplementationGuide(investigation, plan.tasks);
  plan.guide = guide;
  plannerStore.savePlan(plan);

  res.json({
    success: true,
    message: 'Implementation guide regenerated with latest claim-level evidence.',
    data: plan
  });
});

// Export plan as Markdown or JSON
apiRouter.get('/plans/:id/export', (req: Request, res: Response) => {
  const plan = plannerStore.getPlanById(req.params.id);
  if (!plan) {
    throw new AppError(`Plan '${req.params.id}' not found`, 404);
  }

  const format = (req.query.format as string) || 'markdown';
  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${plan.appName.toLowerCase()}_integration_plan.json"`);
    res.send(JSON.stringify(plan, null, 2));
  } else {
    const md = plannerStore.exportPlanMarkdown(plan);
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${plan.appName.toLowerCase()}_integration_plan.md"`);
    res.send(md);
  }
});
