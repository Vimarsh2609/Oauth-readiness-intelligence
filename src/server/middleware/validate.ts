/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import { deriveAppNameFromUrl, findKnownDocumentationUrl } from '../../utils/readiness.ts';

export interface ValidationErrorDetail {
  field: string;
  message: string;
}

export class AppError extends Error {
  public statusCode: number;
  public details?: ValidationErrorDetail[];

  constructor(message: string, statusCode = 500, details?: ValidationErrorDetail[]) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function validateInvestigationIntake(req: Request, _res: Response, next: NextFunction): void {
  let { appName, docUrl, authMethod } = req.body;
  const errors: ValidationErrorDetail[] = [];

  const hasName = Boolean(appName && typeof appName === 'string' && appName.trim().length > 0);
  const hasUrl = Boolean(docUrl && typeof docUrl === 'string' && docUrl.trim().length > 0);

  // Reject if neither appName nor docUrl is provided
  if (!hasName && !hasUrl) {
    errors.push({
      field: 'appName',
      message: 'Either an application name or an official documentation URL must be provided.'
    });
  }

  // Validate appName length if provided
  if (hasName && typeof appName === 'string' && appName.trim().length > 100) {
    errors.push({ field: 'appName', message: 'Application name must be under 100 characters.' });
  }

  // Case B & C: Website URL provided
  if (hasUrl) {
    let normalizedUrl = docUrl.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    try {
      const parsed = new URL(normalizedUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        errors.push({ field: 'docUrl', message: 'URL protocol must be HTTP or HTTPS.' });
      } else if (!parsed.hostname.includes('.')) {
        errors.push({ field: 'docUrl', message: 'Documentation host domain must be valid.' });
      } else {
        req.body.docUrl = parsed.toString();
        // Case B: URL only provided -> derive provisional app name
        if (!hasName) {
          const derivedName = deriveAppNameFromUrl(parsed.toString());
          req.body.appName = derivedName;
          req.body.isDerivedName = true;
          req.body.urlProvenance = 'inferred_from_url';
        } else {
          // Case C: Both provided
          req.body.appName = appName.trim();
          req.body.urlProvenance = 'user_supplied';
        }
      }
    } catch {
      errors.push({ field: 'docUrl', message: 'Please provide a valid URL format.' });
    }
  } else if (hasName) {
    // Case A: App Name only provided -> check verified provider registry
    const trimmedName = appName.trim();
    const known = findKnownDocumentationUrl(trimmedName);
    if (known) {
      req.body.appName = known.officialName;
      req.body.docUrl = known.docUrl;
      req.body.urlProvenance = 'verified_registry';
      if (!authMethod && known.authMethod) {
        req.body.authMethod = known.authMethod;
      }
    } else {
      errors.push({
        field: 'docUrl',
        message: `Official documentation URL for unfamiliar app '${trimmedName}' could not be confidently identified in the verified registry. Please provide the official developer documentation URL to proceed with live investigation.`
      });
    }
  }

  const validMethods = [
    'OAuth 2.0 PKCE',
    'OAuth 2.0 Web (Confidential)',
    'OAuth 2.0 + Scopes',
    'OAuth 2.0 + Instance Admin',
    'API Key / Token'
  ];

  if (authMethod && !validMethods.includes(authMethod)) {
    errors.push({
      field: 'authMethod',
      message: `Auth method must be one of: ${validMethods.join(', ')}`
    });
  }

  const { investigationPurpose } = req.body;
  if (investigationPurpose && !['oauth', 'api_auth', 'both'].includes(investigationPurpose)) {
    errors.push({
      field: 'investigationPurpose',
      message: "Investigation purpose must be 'oauth', 'api_auth', or 'both'."
    });
  }

  if (errors.length > 0) {
    throw new AppError('Validation failed for investigation intake', 400, errors);
  }

  next();
}
