/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DEMO_PROVIDERS,
  READINESS_DIMENSIONS,
  DEMO_TASKS,
  DEMO_GUIDES
} from '../data/mockData.ts';
import {
  ProviderRecord,
  ReadinessDimension,
  PlannerTask,
  IntegrationGuide
} from '../../shared/types.ts';

export class ProviderService {
  public static getAllProviders(): ProviderRecord[] {
    return DEMO_PROVIDERS;
  }

  public static getProviderBySlug(slug: string): ProviderRecord | undefined {
    return DEMO_PROVIDERS.find((p) => p.slug === slug || p.id === slug);
  }

  public static getReadinessDimensions(): ReadinessDimension[] {
    return READINESS_DIMENSIONS;
  }

  public static getAllTasks(): PlannerTask[] {
    return DEMO_TASKS;
  }

  public static getAllGuides(): IntegrationGuide[] {
    return DEMO_GUIDES;
  }

  public static getGuideBySlug(slug: string): IntegrationGuide | undefined {
    return DEMO_GUIDES.find((g) => g.slug === slug || g.id === slug);
  }
}
