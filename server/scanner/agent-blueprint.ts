import { AccessibilityResult } from "./accessibility";
import { PerformanceResult } from "./performance";
import { SecurityResult } from "./security";
import { AgentReadinessResult } from "./agent-readiness";

export interface AgentAction {
  id: string;
  action: string;
  description: string;
  category: string;
  priority: "critical" | "high" | "medium" | "low";
  technicalDetails: {
    selector?: string;
    code?: string;
    file?: string;
    line?: number;
  };
  estimatedImpact: string;
  automatable: boolean;
}

export interface AgentActionBlueprint {
  actions: AgentAction[];
  priority: string[];
  summary: string;
  totalActions: number;
  criticalCount: number;
  automationPotential: number; // Percentage of actions that can be automated
}

export function generateAgentActionBlueprint(
  accessibility: AccessibilityResult,
  performance: PerformanceResult,
  security: SecurityResult,
  agentReadiness: AgentReadinessResult
): AgentActionBlueprint {
  const actions: AgentAction[] = [];
  let actionId = 1;

  // Generate accessibility actions
  if (accessibility.violations && accessibility.violations.length > 0) {
    accessibility.violations.forEach(violation => {
      const priority = 
        violation.impact === 'critical' ? 'critical' :
        violation.impact === 'serious' ? 'high' :
        violation.impact === 'moderate' ? 'medium' : 'low';

      violation.nodes?.forEach((node: any) => {
        actions.push({
          id: `ACC-${actionId++}`,
          action: `Fix ${violation.id}`,
          description: violation.help || violation.description,
          category: 'accessibility',
          priority,
          technicalDetails: {
            selector: node.target?.[0],
            code: node.html
          },
          estimatedImpact: `Improves accessibility score by ${Math.round(10 / violation.nodes.length)}%`,
          automatable: true
        });
      });
    });
  }

  // Generate performance actions
  if (performance.opportunities && performance.opportunities.length > 0) {
    performance.opportunities.forEach(opp => {
      const impact = opp.numericValue || 0;
      const priority = 
        impact > 3000 ? 'high' :
        impact > 1000 ? 'medium' : 'low';

      actions.push({
        id: `PERF-${actionId++}`,
        action: opp.title,
        description: opp.description,
        category: 'performance',
        priority,
        technicalDetails: {
          code: opp.displayValue
        },
        estimatedImpact: `Saves ${opp.displayValue || 'unknown amount of'} loading time`,
        automatable: opp.id.includes('images') || opp.id.includes('css') || opp.id.includes('js')
      });
    });
  }

  // Generate security actions
  if (security.vulnerabilities && security.vulnerabilities.length > 0) {
    security.vulnerabilities.forEach(vuln => {
      const priority = 
        vuln.includes('expired') || vuln.includes('HTTPS') ? 'critical' :
        vuln.includes('Content Security Policy') ? 'high' :
        vuln.includes('Strict Transport') ? 'high' : 'medium';

      actions.push({
        id: `SEC-${actionId++}`,
        action: `Fix: ${vuln}`,
        description: getSecurityActionDescription(vuln),
        category: 'security',
        priority,
        technicalDetails: {
          code: getSecurityCodeSnippet(vuln)
        },
        estimatedImpact: `Improves security posture and user trust`,
        automatable: vuln.includes('header') || vuln.includes('Header')
      });
    });
  }

  // Generate agent readiness actions
  if (!agentReadiness.robots?.found) {
    actions.push({
      id: `AGENT-${actionId++}`,
      action: 'Create robots.txt file',
      description: 'Add a robots.txt file to control search engine crawling',
      category: 'agentReadiness',
      priority: 'high',
      technicalDetails: {
        file: '/robots.txt',
        code: `User-agent: *\nAllow: /\nSitemap: ${agentReadiness.sitemaps?.urls?.[0] || '/sitemap.xml'}`
      },
      estimatedImpact: 'Improves search engine discoverability',
      automatable: true
    });
  }

  if (!agentReadiness.sitemaps?.found) {
    actions.push({
      id: `AGENT-${actionId++}`,
      action: 'Create XML sitemap',
      description: 'Generate an XML sitemap for better search engine indexing',
      category: 'agentReadiness',
      priority: 'high',
      technicalDetails: {
        file: '/sitemap.xml',
        code: '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">...</urlset>'
      },
      estimatedImpact: 'Significantly improves search engine indexing',
      automatable: true
    });
  }

  if (!agentReadiness.structuredData?.total || agentReadiness.structuredData.total === 0) {
    actions.push({
      id: `AGENT-${actionId++}`,
      action: 'Add structured data (JSON-LD)',
      description: 'Implement schema.org structured data for rich snippets',
      category: 'agentReadiness',
      priority: 'medium',
      technicalDetails: {
        code: `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Your Site Name",
  "url": "https://yoursite.com"
}
</script>`
      },
      estimatedImpact: 'Enables rich snippets in search results',
      automatable: true
    });
  }

  // Sort actions by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Calculate automation potential
  const automatableCount = actions.filter(a => a.automatable).length;
  const automationPotential = actions.length > 0 
    ? Math.round((automatableCount / actions.length) * 100)
    : 0;

  // Generate priority list (top 5 critical/high priority items)
  const priorityList = actions
    .filter(a => a.priority === 'critical' || a.priority === 'high')
    .slice(0, 5)
    .map(a => `${a.id}: ${a.action}`);

  return {
    actions,
    priority: priorityList,
    summary: generateSummary(actions),
    totalActions: actions.length,
    criticalCount: actions.filter(a => a.priority === 'critical').length,
    automationPotential
  };
}

function getSecurityActionDescription(vulnerability: string): string {
  const descriptions: { [key: string]: string } = {
    'No HTTPS encryption': 'Implement SSL/TLS certificate and redirect all HTTP traffic to HTTPS',
    'Missing Content Security Policy': 'Add Content-Security-Policy header to prevent XSS attacks',
    'Missing HTTP Strict Transport Security': 'Add Strict-Transport-Security header to enforce HTTPS',
    'Missing X-Content-Type-Options header': 'Add X-Content-Type-Options: nosniff header to prevent MIME sniffing',
    'SSL certificate has expired': 'Renew SSL certificate immediately to restore secure connections',
    'SSL certificate is self-signed': 'Replace with certificate from trusted Certificate Authority'
  };
  
  for (const [key, desc] of Object.entries(descriptions)) {
    if (vulnerability.includes(key)) {
      return desc;
    }
  }
  
  return vulnerability;
}

function getSecurityCodeSnippet(vulnerability: string): string {
  if (vulnerability.includes('Content Security Policy')) {
    return `Content-Security-Policy: default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';`;
  }
  
  if (vulnerability.includes('Strict Transport Security')) {
    return `Strict-Transport-Security: max-age=31536000; includeSubDomains`;
  }
  
  if (vulnerability.includes('X-Content-Type-Options')) {
    return `X-Content-Type-Options: nosniff`;
  }
  
  return '';
}

function generateSummary(actions: AgentAction[]): string {
  const byCategory = {
    accessibility: actions.filter(a => a.category === 'accessibility').length,
    performance: actions.filter(a => a.category === 'performance').length,
    security: actions.filter(a => a.category === 'security').length,
    agentReadiness: actions.filter(a => a.category === 'agentReadiness').length
  };
  
  const critical = actions.filter(a => a.priority === 'critical').length;
  const automatable = actions.filter(a => a.automatable).length;
  
  let summary = `Found ${actions.length} actionable improvements: `;
  
  const parts = [];
  if (byCategory.accessibility > 0) parts.push(`${byCategory.accessibility} accessibility`);
  if (byCategory.performance > 0) parts.push(`${byCategory.performance} performance`);
  if (byCategory.security > 0) parts.push(`${byCategory.security} security`);
  if (byCategory.agentReadiness > 0) parts.push(`${byCategory.agentReadiness} SEO/agent`);
  
  summary += parts.join(', ');
  
  if (critical > 0) {
    summary += `. ${critical} critical issues require immediate attention.`;
  }
  
  if (automatable > 0) {
    summary += ` ${automatable} can be automated.`;
  }
  
  return summary;
}