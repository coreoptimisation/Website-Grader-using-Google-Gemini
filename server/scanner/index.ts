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

export async function runCompleteScan(url: string, scanId?: string, multiPage: boolean = false): Promise<ScanEvidence | MultiPageScanResult> {
  if (multiPage && scanId) {
    // Run multi-page scan if requested
    return await runMultiPageScan(url, scanId);
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

  try {
    // Run all scans in parallel, including screenshot capture
    console.log('Running accessibility audit...');
    const accessibilityPromise = runAccessibilityAudit(url).catch(err => {
      console.error('Accessibility audit failed:', err);
      throw err;
    });
    
    console.log('Running performance audit...');
    const performancePromise = runPerformanceAudit(url).catch(err => {
      console.error('Performance audit failed:', err);
      throw err;
    });
    
    console.log('Running security audit...');
    const securityPromise = runSecurityAudit(url).catch(err => {
      console.error('Security audit failed:', err);
      throw err;
    });
    
    console.log('Running agent readiness audit...');
    const agentReadinessPromise = runAgentReadinessAudit(url).catch(err => {
      console.error('Agent readiness audit failed:', err);
      throw err;
    });
    
    console.log('Capturing screenshot...');
    const screenshotPromise = scanId ? captureScreenshot(url, scanId).catch(err => {
      console.error('Screenshot capture failed:', err);
      throw err;
    }) : Promise.resolve(undefined);

    const [accessibility, performance, security, agentReadiness, screenshot] = await Promise.all([
      accessibilityPromise,
      performancePromise,
      securityPromise,
      agentReadinessPromise,
      screenshotPromise
    ]);

    console.log('All scans completed successfully');

    return {
      url,
      accessibility,
      performance,
      security,
      agentReadiness,
      screenshot,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Scan failed with error:', error);
    throw error;
  }
}

export * from "./accessibility";
export * from "./performance";
export * from "./security";
export * from "./agent-readiness";
export * from "./screenshot";
export * from "./multi-page";
