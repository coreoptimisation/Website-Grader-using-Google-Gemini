import { runAccessibilityAudit, AccessibilityResult } from "./accessibility";
import { runPerformanceAudit, PerformanceResult } from "./performance";
import { runSecurityAudit, SecurityResult } from "./security";
import { runAgentReadinessAudit, AgentReadinessResult } from "./agent-readiness";
import { captureScreenshot, ScreenshotResult } from "./screenshot";
import { runMultiPageScan, MultiPageScanResult } from "./multi-page";

export interface ScanEvidence {
  url: string;
  accessibility: AccessibilityResult;
  performance: PerformanceResult;
  security: SecurityResult;
  agentReadiness: AgentReadinessResult;
  screenshot?: ScreenshotResult;
  timestamp: Date;
}

export async function runCompleteScan(url: string, scanId?: string, multiPage: boolean = false, selectedUrls?: string[]): Promise<ScanEvidence | MultiPageScanResult> {
  if (multiPage && scanId) {
    // Run multi-page scan if requested
    return await runMultiPageScan(url, scanId, selectedUrls);
  }
  
  // Otherwise run single page scan
  return runSinglePageScan(url, scanId);
}

export async function runSinglePageScan(url: string, scanId?: string): Promise<ScanEvidence> {
  // Validate URL
  try {
    new URL(url);
  } catch (error) {
    throw new Error("Invalid URL provided");
  }

  console.log(`Starting complete scan for: ${url}`);

  // Run all scans in parallel, including screenshot capture
  const [accessibility, performance, security, agentReadiness, screenshot] = await Promise.all([
    runAccessibilityAudit(url),
    runPerformanceAudit(url),
    runSecurityAudit(url),
    runAgentReadinessAudit(url),
    scanId ? captureScreenshot(url, scanId) : Promise.resolve(undefined)
  ]);

  return {
    url,
    accessibility,
    performance,
    security,
    agentReadiness,
    screenshot,
    timestamp: new Date()
  };
}

export * from "./accessibility";
export * from "./performance";
export * from "./security";
export * from "./agent-readiness";
export * from "./screenshot";
export * from "./multi-page";
