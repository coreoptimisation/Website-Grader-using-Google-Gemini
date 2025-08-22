import { runAccessibilityAudit, AccessibilityResult } from "./accessibility";
import { runPerformanceAudit, PerformanceResult } from "./performance";
import { runSecurityAudit, SecurityResult } from "./security";
import { runAgentReadinessAudit, AgentReadinessResult } from "./agent-readiness";

export interface ScanEvidence {
  url: string;
  accessibility: AccessibilityResult;
  performance: PerformanceResult;
  security: SecurityResult;
  agentReadiness: AgentReadinessResult;
  timestamp: Date;
}

export async function runCompleteScan(url: string): Promise<ScanEvidence> {
  // Validate URL
  try {
    new URL(url);
  } catch (error) {
    throw new Error("Invalid URL provided");
  }

  console.log(`Starting complete scan for: ${url}`);

  const [accessibility, performance, security, agentReadiness] = await Promise.all([
    runAccessibilityAudit(url),
    runPerformanceAudit(url),
    runSecurityAudit(url),
    runAgentReadinessAudit(url)
  ]);

  return {
    url,
    accessibility,
    performance,
    security,
    agentReadiness,
    timestamp: new Date()
  };
}

export * from "./accessibility";
export * from "./performance";
export * from "./security";
export * from "./agent-readiness";
