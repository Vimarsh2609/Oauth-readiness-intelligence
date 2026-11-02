/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns/promises';
import { RetrievedSourceDoc } from '../../shared/types.ts';

export interface DocRetrievalResult {
  success: boolean;
  combinedText: string;
  sources: RetrievedSourceDoc[];
  primaryTitle: string;
  error?: string;
}

/**
 * Checks if an IPv4 address is in a private, loopback, link-local, or reserved range.
 */
export function isPrivateOrBlockedIPv4(ip: string): boolean {
  const parts = ip.split('.').map(p => parseInt(p, 10));
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed IPv4 is treated as unsafe
  }

  const [a, b, c, d] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;

  // 10.0.0.0/8 (Private network RFC 1918)
  if (a === 10) return true;

  // 100.64.0.0/10 (Shared address space RFC 6598)
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 169.254.0.0/16 (Link-local)
  if (a === 169 && b === 254) return true;

  // 172.16.0.0/12 (Private network RFC 1918)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (a === 192 && b === 0 && c === 0) return true;

  // 192.0.2.0/24 (Documentation TEST-NET-1)
  if (a === 192 && b === 0 && c === 2) return true;

  // 192.88.99.0/24 (6to4 Relay Anycast)
  if (a === 192 && b === 88 && c === 99) return true;

  // 192.168.0.0/16 (Private network RFC 1918)
  if (a === 192 && b === 168) return true;

  // 198.18.0.0/15 (Benchmarking)
  if (a === 198 && (b === 18 || b === 19)) return true;

  // 198.51.100.0/24 (Documentation TEST-NET-2)
  if (a === 198 && b === 51 && c === 100) return true;

  // 203.0.113.0/24 (Documentation TEST-NET-3)
  if (a === 203 && b === 0 && c === 113) return true;

  // 224.0.0.0/4 (Multicast)
  if (a >= 224 && a <= 239) return true;

  // 240.0.0.0/4 (Reserved / Future Use)
  if (a >= 240) return true;

  // 255.255.255.255 (Broadcast)
  if (a === 255 && b === 255 && c === 255 && d === 255) return true;

  return false;
}

/**
 * Checks if an IPv6 address is in a loopback, unique local, link-local, or mapped IPv4 range.
 */
export function isPrivateOrBlockedIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase().trim().replace(/^\[|\]$/g, '');

  // ::1 / Loopback
  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;

  // :: / Unspecified
  if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true;

  // IPv4-mapped IPv6 address (::ffff:x.x.x.x or ::ffff:hhhh:hhhh)
  if (normalized.startsWith('::ffff:') || normalized.startsWith('0:0:0:0:0:ffff:')) {
    const v4Part = normalized.replace(/^.*:ffff:/, '');
    if (v4Part.includes('.')) {
      return isPrivateOrBlockedIPv4(v4Part);
    }
    // Hex IPv4-mapped (e.g. 7f00:1 or 7f00:0001 or a9fe:a9fe)
    const hexParts = v4Part.split(':');
    if (hexParts.length === 2) {
      const high = parseInt(hexParts[0], 16);
      const low = parseInt(hexParts[1], 16);
      if (!isNaN(high) && !isNaN(low)) {
        const b1 = (high >> 8) & 0xff;
        const b2 = high & 0xff;
        const b3 = (low >> 8) & 0xff;
        const b4 = low & 0xff;
        return isPrivateOrBlockedIPv4(`${b1}.${b2}.${b3}.${b4}`);
      }
    }
    return true; // Malformed IPv4-mapped is treated as unsafe
  }

  // 64:ff9b::/96 (NAT64 translated)
  if (normalized.startsWith('64:ff9b::')) {
    const rest = normalized.replace('64:ff9b::', '');
    if (rest.includes('.')) return isPrivateOrBlockedIPv4(rest);
    return true;
  }

  // 2001:db8::/32 (Documentation)
  if (normalized.startsWith('2001:db8:') || normalized.startsWith('2001:0db8:')) return true;

  // 2001:20::/28 (ORCHIDv2)
  if (normalized.startsWith('2001:2') || normalized.startsWith('2001:002')) return true;

  // 100::/64 (Discard-only)
  if (normalized.startsWith('100::') || normalized.startsWith('0100::')) return true;

  // fc00::/7 (Unique Local Address)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

  // fe80::/10 (Link-Local Address)
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) {
    return true;
  }

  // fec0::/10 (Site-Local Address deprecated)
  if (normalized.startsWith('fec') || normalized.startsWith('fed') || normalized.startsWith('fee') || normalized.startsWith('fef')) {
    return true;
  }

  // ff00::/8 (Multicast)
  if (normalized.startsWith('ff')) return true;

  return false;
}

/**
 * Validates that an IP address (IPv4 or IPv6) is a globally routable public address.
 */
export function isIpBlockedOrPrivate(ip: string): boolean {
  const cleaned = ip.trim().replace(/^\[|\]$/g, '');
  if (cleaned.includes(':')) {
    return isPrivateOrBlockedIPv6(cleaned);
  }
  return isPrivateOrBlockedIPv4(cleaned);
}

/**
 * SSRF Safety Validator: checks scheme, hostname, and resolves DNS to verify no private/loopback IPs.
 */
export async function validateTargetUrl(rawUrl: string): Promise<{
  safe: boolean;
  error?: string;
  url?: URL;
  resolvedIp?: string;
}> {
  let parsedUrl: URL;
  try {
    const trimmed = rawUrl.trim();
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
      parsedUrl = new URL(trimmed);
    } else {
      parsedUrl = new URL(`https://${trimmed}`);
    }
  } catch {
    return { safe: false, error: 'Malformed URL: unable to parse as a valid web address.' };
  }

  // Scheme restriction: only http: and https:
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return {
      safe: false,
      error: `Blocked protocol '${parsedUrl.protocol}'. Only 'http:' and 'https:' are permitted for documentation retrieval.`
    };
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // Direct hostname blocklist
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname === '0.0.0.0' ||
    hostname === '127.0.0.1' ||
    hostname === '::1'
  ) {
    return {
      safe: false,
      error: `Access to localhost or local network host '${hostname}' is prohibited.`
    };
  }

  // Check if hostname is already a raw IP
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    if (isPrivateOrBlockedIPv4(hostname)) {
      return {
        safe: false,
        error: `Access to private or non-routable IP address '${hostname}' is prohibited.`
      };
    }
  }

  // Resolve DNS to verify all destination IPs
  try {
    const lookups = await dns.lookup(hostname, { all: true });
    if (!lookups || lookups.length === 0) {
      return { safe: false, error: `Could not resolve hostname '${hostname}'.` };
    }

    for (const record of lookups) {
      if (isIpBlockedOrPrivate(record.address)) {
        return {
          safe: false,
          error: `Resolved IP address '${record.address}' for '${hostname}' belongs to a private, loopback, or non-global network range.`
        };
      }
    }

    return {
      safe: true,
      url: parsedUrl,
      resolvedIp: lookups[0].address
    };
  } catch (err) {
    return {
      safe: false,
      error: `DNS resolution failed for '${hostname}': ${err instanceof Error ? err.message : String(err)}`
    };
  }
}

export interface ExtractedHtmlContent {
  title: string;
  cleanText: string;
  candidateLinks: string[];
}

/**
 * Safely extracts readable documentation text from HTML without executing scripts or CSS.
 */
export function extractTextFromHtml(html: string, baseUrl: string): ExtractedHtmlContent {
  // Extract <title>
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : 'Developer Documentation';

  // Extract candidate links before stripping tags
  const candidateLinks: string[] = [];
  const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  try {
    const base = new URL(baseUrl);
    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1].trim();
      const linkText = match[2].toLowerCase();

      // Look for OAuth, scope, auth, token, or permission keywords in link
      const authKeywords = /(oauth|auth|token|scope|permission|authorize|grant|credential|api-key|security)/i;
      if (authKeywords.test(href) || authKeywords.test(linkText)) {
        try {
          const resolved = new URL(href, baseUrl);
          // Only same origin and HTTP(S)
          if (resolved.origin === base.origin && (resolved.protocol === 'http:' || resolved.protocol === 'https:')) {
            // Avoid fragment-only or anchor duplicates
            resolved.hash = '';
            const normalizedLink = resolved.toString();
            if (normalizedLink !== baseUrl && !candidateLinks.includes(normalizedLink)) {
              candidateLinks.push(normalizedLink);
            }
          }
        } catch {
          // Ignore invalid child URLs
        }
      }
    }
  } catch {
    // Ignore base URL parsing error
  }

  // Strip head, script, style, noscript, svg, nav, footer tags
  let text = html
    .replace(/<head\b[\s\S]*?<\/head>/gi, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer\b[\s\S]*?<\/footer>/gi, ' ');

  // Format headers for readability
  text = text.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, '\n\n## $2\n');
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1');
  text = text.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '\n```\n$1\n```\n');
  text = text.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');

  // Strip all other HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&bull;/g, '•')
    .replace(/&hellip;/g, '...')
    .replace(/&nbsp;/g, ' ');

  // Normalize whitespace & filter out JSON artifacts or CSS variables
  const cleanText = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => {
      if (line.length === 0) return false;
      // Filter out raw JSON metadata strings, escaped unicode, and CSS var rules
      if (line.startsWith('{"') || line.startsWith('[{"') || line.includes('\\u003c') || line.startsWith('--')) {
        return false;
      }
      return true;
    })
    .join('\n');

  return {
    title,
    cleanText,
    candidateLinks: candidateLinks.slice(0, 3)
  };
}

/**
 * Safely performs an HTTP/HTTPS GET request with IP-pinned DNS lookup to defeat DNS rebinding.
 */
function requestWithPinnedIp(
  url: URL,
  pinnedIp: string,
  timeoutMs: number,
  maxBytes: number
): Promise<{
  statusCode: number;
  statusMessage?: string;
  headers: http.IncomingHttpHeaders;
  body: string;
  byteCount: number;
}> {
  return new Promise((resolve, reject) => {
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const req = client.request(
      url,
      {
        method: 'GET',
        headers: {
          'Host': url.host,
          'User-Agent': 'OAuth-Readiness-Intelligence-Bot/1.0 (+https://oauth-readiness.internal)',
          'Accept': 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1',
          'Connection': 'close'
        },
        lookup: (_hostname: string, opts: any, cb: any) => {
          const callback = typeof opts === 'function' ? opts : cb;
          const isAll = typeof opts === 'object' && opts?.all;
          const family = pinnedIp.includes(':') ? 6 : 4;
          if (isAll) {
            callback(null, [{ address: pinnedIp, family }]);
          } else {
            callback(null, pinnedIp, family);
          }
        },
        servername: url.hostname,
        rejectUnauthorized: true,
        timeout: timeoutMs
      },
      (res) => {
        let totalBytes = 0;
        const chunks: Buffer[] = [];

        res.on('data', (chunk: Buffer) => {
          totalBytes += chunk.length;
          if (totalBytes > maxBytes) {
            req.destroy(new Error(`Payload size exceeded ${maxBytes / 1024 / 1024} MB safety threshold.`));
            return;
          }
          chunks.push(chunk);
        });

        res.on('end', () => {
          const fullBuffer = Buffer.concat(chunks);
          const body = fullBuffer.toString('utf-8');
          resolve({
            statusCode: res.statusCode || 200,
            statusMessage: res.statusMessage,
            headers: res.headers,
            body,
            byteCount: totalBytes
          });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error(`Request timed out after ${timeoutMs / 1000}s while fetching documentation.`));
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

/**
 * Fetches a single documentation page safely with SSRF protections, redirect limits, and timeouts.
 */
export async function fetchDocPage(
  targetUrl: string,
  maxRedirects = 3
): Promise<{
  success: boolean;
  content?: string;
  contentType?: string;
  byteCount?: number;
  finalUrl?: string;
  error?: string;
}> {
  let currentUrl = targetUrl;
  let redirectsCount = 0;

  const MAX_BYTES = 1024 * 1024; // 1MB limit
  const TIMEOUT_MS = 5000; // 5s timeout

  while (redirectsCount <= maxRedirects) {
    // Step 1: Validate URL safety and resolve DNS for current URL
    const safety = await validateTargetUrl(currentUrl);
    if (!safety.safe || !safety.url || !safety.resolvedIp) {
      return { success: false, error: safety.error || 'URL failed security validation.' };
    }

    try {
      const response = await requestWithPinnedIp(safety.url, safety.resolvedIp, TIMEOUT_MS, MAX_BYTES);

      // Handle Redirects
      if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
        const locationHeader = response.headers['location'];
        if (!locationHeader) {
          return { success: false, error: `Redirect status ${response.statusCode} returned without Location header.` };
        }

        redirectsCount++;
        if (redirectsCount > maxRedirects) {
          return { success: false, error: `Exceeded maximum redirect limit of ${maxRedirects}.` };
        }

        // Resolve relative redirects safely
        try {
          const locStr = Array.isArray(locationHeader) ? locationHeader[0] : locationHeader;
          const nextUrl = new URL(locStr, safety.url);
          currentUrl = nextUrl.toString();
          continue;
        } catch {
          return { success: false, error: `Invalid redirect location '${locationHeader}'.` };
        }
      }

      if (response.statusCode < 200 || response.statusCode >= 300) {
        return {
          success: false,
          error: `HTTP ${response.statusCode} ${response.statusMessage || ''} when fetching documentation.`
        };
      }

      // Check Content-Type
      const rawContentType = (response.headers['content-type'] as string) || '';
      const contentType = rawContentType.toLowerCase().split(';')[0].trim();
      const validTypes = ['text/html', 'text/plain', 'application/xhtml+xml', 'application/xml', ''];

      if (contentType && !validTypes.includes(contentType)) {
        return {
          success: false,
          error: `Unsupported content type '${contentType}'. Only HTML and plain text documentation pages are supported.`
        };
      }

      return {
        success: true,
        content: response.body,
        contentType: contentType || 'text/html',
        byteCount: response.byteCount,
        finalUrl: safety.url.toString()
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Network error retrieving documentation: ${err instanceof Error ? err.message : String(err)}`
      };
    }
  }

  return { success: false, error: `Exceeded maximum redirect limit of ${maxRedirects}.` };
}

/**
 * High-level documentation retrieval service.
 * Fetches the primary documentation page, safely extracts text, and optionally fetches up to 2 same-domain child pages.
 */
export async function retrieveDocumentationSources(primaryUrl: string): Promise<DocRetrievalResult> {
  const sources: RetrievedSourceDoc[] = [];

  // Fetch primary page
  const primaryFetch = await fetchDocPage(primaryUrl);
  if (!primaryFetch.success || !primaryFetch.content) {
    sources.push({
      url: primaryUrl,
      title: 'Documentation Endpoint',
      byteCount: 0,
      fetchedAt: new Date().toISOString(),
      status: 'failed',
      error: primaryFetch.error || 'Failed to retrieve page'
    });

    return {
      success: false,
      combinedText: '',
      sources,
      primaryTitle: 'Unavailable Documentation',
      error: primaryFetch.error || 'Could not retrieve documentation page.'
    };
  }

  const primaryExtracted = extractTextFromHtml(primaryFetch.content, primaryFetch.finalUrl || primaryUrl);

  sources.push({
    url: primaryFetch.finalUrl || primaryUrl,
    title: primaryExtracted.title || 'Official Documentation Page',
    byteCount: primaryFetch.byteCount || 0,
    fetchedAt: new Date().toISOString(),
    status: 'retrieved',
    contentType: primaryFetch.contentType
  });

  let combinedText = `### Primary Documentation: ${primaryExtracted.title}\nSource: ${primaryFetch.finalUrl || primaryUrl}\n\n${primaryExtracted.cleanText}\n\n`;

  // Fetch up to 2 relevant sub-pages on the same origin if found
  for (const subLink of primaryExtracted.candidateLinks.slice(0, 2)) {
    try {
      const subFetch = await fetchDocPage(subLink);
      if (subFetch.success && subFetch.content) {
        const subExtracted = extractTextFromHtml(subFetch.content, subFetch.finalUrl || subLink);
        sources.push({
          url: subFetch.finalUrl || subLink,
          title: subExtracted.title || 'Referenced Documentation Section',
          byteCount: subFetch.byteCount || 0,
          fetchedAt: new Date().toISOString(),
          status: 'retrieved',
          contentType: subFetch.contentType
        });

        combinedText += `\n---\n### Referenced Documentation Section: ${subExtracted.title}\nSource: ${subFetch.finalUrl || subLink}\n\n${subExtracted.cleanText}\n\n`;
      }
    } catch {
      // Non-fatal if a secondary sub-link fails
    }
  }

  return {
    success: true,
    combinedText,
    sources,
    primaryTitle: primaryExtracted.title
  };
}
