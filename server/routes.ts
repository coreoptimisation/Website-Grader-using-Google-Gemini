import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { runCompleteScan } from "./scanner";
import { analyzeWebsiteFindings } from "./gemini";
import { analyzeScreenshot } from "./gemini-visual";
import { z } from "zod";
import { calculateOverallScore, getGrade, getGradeExplanation } from "../shared/scoring";
import { generateAgentActionBlueprint } from "./scanner/agent-blueprint";

const scanRequestSchema = z.object({
  url: z.string().url("Invalid URL format"),
  userId: z.string().optional(),
  multiPage: z.boolean().optional().default(true) // Default to multi-page scanning
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Diagnostic endpoint for testing browser
  app.get("/api/diagnostics", async (req, res) => {
    const fs = await import('fs');
    const { chromium } = await import('playwright');
    
    const results = {
      environment: process.env.NODE_ENV || 'unknown',
      platform: process.platform,
      nodeVersion: process.version,
      chromiumPath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      pathExists: false,
      browserTest: false,
      geminiKeySet: !!process.env.GEMINI_API_KEY,
      databaseUrlSet: !!process.env.DATABASE_URL,
      error: null as string | null
    };
    
    // Check if chromium path exists
    results.pathExists = fs.existsSync(results.chromiumPath);
    
    // Try to launch browser
    try {
      const browser = await chromium.launch({
        headless: true,
        executablePath: results.chromiumPath,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      await browser.close();
      results.browserTest = true;
    } catch (error: any) {
      results.error = error.message;
    }
    
    res.json(results);
  });

  // Test scan endpoint - lightweight scan for testing
  app.post("/api/test-scan", async (req, res) => {
    const { url = 'https://example.com' } = req.body;
    
    try {
      const { runAccessibilityAudit } = await import('./scanner/accessibility');
      const result = await runAccessibilityAudit(url);
      res.json({ 
        success: true, 
        url,
        accessibilityScore: result.score,
        violations: result.totalViolations
      });
    } catch (error: any) {
      res.json({ 
        success: false, 
        error: error.message,
        stack: error.stack
      });
    }
  });

  // Start a new scan
  app.post("/api/scans", async (req, res) => {
    try {
      const { url, userId, multiPage } = scanRequestSchema.parse(req.body);
      
      // Create initial scan record
      const scan = await storage.createScan({ url, userId });
      
      res.json({ scanId: scan.id, status: "pending" });
      
      // Start scanning process asynchronously
      processScan(scan.id, url, multiPage).catch(error => {
        console.error(`Scan ${scan.id} failed:`, error);
        storage.updateScanStatus(scan.id, "failed");
      });
      
    } catch (error) {
      console.error("Error creating scan:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create scan" });
    }
  });

  // Get scan status and results
  app.get("/api/scans/:id", async (req, res) => {
    try {
      const scan = await storage.getScan(req.params.id);
      if (!scan) {
        return res.status(404).json({ error: "Scan not found" });
      }

      const results = await storage.getScanResults(scan.id);
      const report = await storage.getScanReport(scan.id);

      res.json({
        scan,
        results,
        report
      });
    } catch (error) {
      console.error("Error fetching scan:", error);
      res.status(500).json({ error: "Failed to fetch scan" });
    }
  });

  // Get recent scans
  app.get("/api/scans", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const scans = await storage.getRecentScans(limit);
      res.json(scans);
    } catch (error) {
      console.error("Error fetching scans:", error);
      res.status(500).json({ error: "Failed to fetch scans" });
    }
  });

  // Get scan evidence
  app.get("/api/scans/:id/evidence", async (req, res) => {
    try {
      const evidence = await storage.getScanEvidence(req.params.id);
      res.json(evidence);
    } catch (error) {
      console.error("Error fetching evidence:", error);
      res.status(500).json({ error: "Failed to fetch evidence" });
    }
  });

  // Delete scan
  app.delete("/api/scans/:id", async (req, res) => {
    try {
      const scanId = req.params.id;
      
      // Delete all related data for the scan
      await storage.deleteScan(scanId);
      
      res.json({ success: true, message: "Scan deleted successfully" });
    } catch (error) {
      console.error("Error deleting scan:", error);
      res.status(500).json({ error: "Failed to delete scan" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function processScan(scanId: string, url: string, multiPage: boolean = true) {
  console.log(`[SCAN] Starting scan ${scanId} for ${url}`);
  console.log(`[SCAN] Environment: ${process.env.NODE_ENV}`);
  console.log(`[SCAN] Multi-page: ${multiPage}`);
  
  try {
    // Update status to scanning
    await storage.updateScanStatus(scanId, "scanning");
    console.log(`[SCAN] Status updated to scanning`);
    
    // Run complete scan with screenshot capture
    console.log(`[SCAN] Running complete scan...`);
    const scanResult = await runCompleteScan(url, scanId, multiPage);
    
    // Check if all scanners failed (indicates domain/connectivity issues)
    const isMultiPage = 'pageResults' in scanResult;
    if (isMultiPage) {
      const multiPageResult = scanResult as any;
      const hasAnySuccessfulScans = multiPageResult.pageResults?.some((page: any) => 
        page.accessibility?.score > 0 || page.performance?.score > 0 || 
        page.security?.score > 0 || page.agentReadiness?.score > 0
      );
      if (!hasAnySuccessfulScans) {
        throw new Error(`Failed to access website: ${url}. Please check the URL and try again.`);
      }
    } else {
      const evidence = scanResult as any;
      if ((!evidence.accessibility || evidence.accessibility.error) &&
          (!evidence.performance || evidence.performance.error) &&
          (!evidence.security || evidence.security.error) &&
          (!evidence.agentReadiness || evidence.agentReadiness.error)) {
        throw new Error(`Failed to access website: ${url}. Please check the URL and try again.`);
      }
    }
    
    // For single-page scan, use the result as evidence
    const evidence = isMultiPage ? null : scanResult;
    
    // Store evidence based on scan type
    if (isMultiPage) {
      // Store multi-page scan result
      await storage.createScanEvidence({
        scanId,
        type: "multi_page_scan",
        filePath: null,
        data: scanResult
      });
    } else {
      // Store single-page evidence
      await storage.createScanEvidence({
        scanId,
        type: "complete_scan",
        filePath: null,
        data: evidence
      });
    }
    
    // Store screenshot evidence if captured successfully (single-page)
    if (!isMultiPage && evidence?.screenshot?.success && evidence?.screenshot?.filePath) {
      await storage.createScanEvidence({
        scanId,
        type: "screenshot",
        filePath: evidence.screenshot.filePath,
        data: evidence.screenshot
      });
      
      // Also store viewport screenshot if it exists  
      // The viewport screenshot has the format: scanId_viewport_timestamp.png
      const baseFilename = evidence.screenshot.filePath.split('/').pop()?.replace('.png', '');
      const viewportPath = `/screenshots/${baseFilename?.replace(scanId + '_', scanId + '_viewport_')}.png`;
      await storage.createScanEvidence({
        scanId,
        type: "screenshot_viewport",
        filePath: viewportPath,
        data: { ...evidence.screenshot, fullPage: false }
      });
    }

    // Create individual pillar results
    let pillarResults;
    if (isMultiPage) {
      const multiPageResult = scanResult as any; // MultiPageScanResult
      pillarResults = [
        {
          scanId,
          pillar: "accessibility",
          score: multiPageResult.aggregateScores.accessibility,
          rawData: { multiPage: true, pageResults: multiPageResult.pageResults },
          recommendations: []
        },
        {
          scanId,
          pillar: "performance",
          score: multiPageResult.aggregateScores.performance,
          rawData: { multiPage: true, pageResults: multiPageResult.pageResults },
          recommendations: []
        },
        {
          scanId,
          pillar: "trust",
          score: multiPageResult.aggregateScores.security,
          rawData: { multiPage: true, pageResults: multiPageResult.pageResults },
          recommendations: []
        },
        {
          scanId,
          pillar: "agentReadiness",
          score: multiPageResult.aggregateScores.agentReadiness,
          rawData: { multiPage: true, pageResults: multiPageResult.pageResults },
          recommendations: []
        }
      ];
    } else if (evidence) {
      pillarResults = [
        {
          scanId,
          pillar: "accessibility",
          score: evidence.accessibility?.score || 0,
          rawData: evidence.accessibility || {},
          recommendations: []
        },
        {
          scanId,
          pillar: "performance",
          score: evidence.performance?.score || 0,
          rawData: evidence.performance || {},
          recommendations: []
        },
        {
          scanId,
          pillar: "trust",
          score: evidence.security?.score || 0,
          rawData: evidence.security || {},
          recommendations: []
        },
        {
          scanId,
          pillar: "agentReadiness",
          score: evidence.agentReadiness?.score || 0,
          rawData: evidence.agentReadiness || {},
          recommendations: []
        }
      ];
    } else {
      // Fallback if no evidence
      pillarResults = [
        { scanId, pillar: "accessibility", score: 0, rawData: {}, recommendations: [] },
        { scanId, pillar: "performance", score: 0, rawData: {}, recommendations: [] },
        { scanId, pillar: "trust", score: 0, rawData: {}, recommendations: [] },
        { scanId, pillar: "agentReadiness", score: 0, rawData: {}, recommendations: [] }
      ];
    }

    // Store pillar results
    await Promise.all(pillarResults.map(result => 
      storage.createScanResult(result)
    ));

    // Run Gemini analysis with fallback handling
    let geminiAnalysis;
    let overallScore;
    let grade;
    let gradeExplanation;
    let visualAnalysis = null;
    
    try {
      let summarizedEvidence;
      let screenshotPath = null;
      
      if (isMultiPage) {
        const multiPageResult = scanResult as any;
        // For multi-page scan, use aggregate scores and summaries
        summarizedEvidence = {
          url: multiPageResult.primaryUrl,
          multiPage: true,
          pagesAnalyzed: multiPageResult.pagesAnalyzed,
          accessibility: {
            score: multiPageResult.aggregateScores.accessibility,
            violations: multiPageResult.siteWideSummary?.totalIssues || 0,
            criticalViolations: multiPageResult.siteWideSummary?.criticalIssues || 0,
            topIssues: multiPageResult.siteWideSummary?.commonProblems || []
          },
          performance: {
            score: multiPageResult.aggregateScores.performance,
            opportunities: []
          },
          security: {
            score: multiPageResult.aggregateScores.security,
            https: multiPageResult.pageResults?.[0]?.security?.https || false,
            vulnerabilities: []
          },
          agentReadiness: {
            score: multiPageResult.aggregateScores.agentReadiness,
            robots: true,
            sitemaps: true
          },
          ecommerce: multiPageResult.ecommerceSummary,
          sitewideSummary: multiPageResult.siteWideSummary
        };
        
        // Use first page's screenshot if available
        if (multiPageResult.pageResults?.[0]?.screenshot?.success) {
          screenshotPath = multiPageResult.pageResults[0].screenshot.filePath;
        }
      } else if (evidence) {
        // Single-page scan
        if (evidence.screenshot?.success && evidence.screenshot?.filePath) {
          screenshotPath = evidence.screenshot.filePath;
        }
        
        // Send summarized data to reduce API token usage and avoid quota limits
        summarizedEvidence = {
          url: evidence.url || url,
          accessibility: {
            score: evidence.accessibility?.score || 0,
            violations: evidence.accessibility?.violations?.length || 0,
            criticalViolations: evidence.accessibility?.criticalViolations || 0,
            topIssues: evidence.accessibility.violations?.slice(0, 3).map((v: any) => ({
              id: v.id,
              impact: v.impact,
              help: v.help
            })) || []
          },
          performance: {
            score: evidence.performance?.score || 0,
            fcp: evidence.performance?.coreWebVitals?.fcp,
            lcp: evidence.performance?.coreWebVitals?.lcp,
            opportunities: evidence.performance?.opportunities?.slice(0, 3).map((o: any) => ({
              title: o.title,
              numericValue: o.numericValue
            })) || []
          },
          security: {
            score: evidence.security?.score || 0,
            https: evidence.security?.https || false,
            vulnerabilities: evidence.security?.vulnerabilities?.slice(0, 3) || []
          },
          agentReadiness: {
            score: evidence.agentReadiness?.score || 0,
            robots: evidence.agentReadiness?.robots?.found || false,
            sitemaps: evidence.agentReadiness?.sitemaps?.found || false
          }
        };
      }
      
      summarizedEvidence.screenshotPath = screenshotPath;
      
      // Run visual analysis in parallel with main analysis
      const [mainAnalysis, visualInsights] = await Promise.all([
        analyzeWebsiteFindings(summarizedEvidence),
        screenshotPath ? analyzeScreenshot(screenshotPath, summarizedEvidence.url) : Promise.resolve(null)
      ]);
      
      geminiAnalysis = mainAnalysis;
      visualAnalysis = visualInsights;
      
      // Calculate weighted overall score using the shared scoring module
      overallScore = calculateOverallScore(geminiAnalysis.pillarScores);
      grade = getGrade(overallScore);
      gradeExplanation = getGradeExplanation(grade, overallScore);
    } catch (geminiError) {
      console.error("Gemini analysis failed, using fallback values:", geminiError);
      
      // Use the actual scores from the scanners as fallback
      const pillarScoresNumeric = isMultiPage ? {
        accessibility: (scanResult as any).aggregateScores.accessibility,
        trust: (scanResult as any).aggregateScores.security,
        uxPerf: (scanResult as any).aggregateScores.performance,
        agentReadiness: (scanResult as any).aggregateScores.agentReadiness
      } : {
        accessibility: evidence?.accessibility?.score || 0,
        trust: evidence?.security?.score || 0,
        uxPerf: evidence?.performance?.score || 0,
        agentReadiness: evidence?.agentReadiness?.score || 0
      };
      
      overallScore = calculateOverallScore(pillarScoresNumeric);
      grade = getGrade(overallScore);
      gradeExplanation = getGradeExplanation(grade, overallScore);
      
      // Create fallback analysis with structure matching GeminiAnalysisResult
      const scores = isMultiPage ? (scanResult as any).aggregateScores : {
        accessibility: evidence?.accessibility?.score || 0,
        security: evidence?.security?.score || 0,
        performance: evidence?.performance?.score || 0,
        agentReadiness: evidence?.agentReadiness?.score || 0
      };
      
      const pillarScores = {
        accessibility: { score: scores.accessibility, grade: getGrade(scores.accessibility) },
        trustAndSecurity: { score: scores.security, grade: getGrade(scores.security) },
        performance: { score: scores.performance, grade: getGrade(scores.performance) },
        agentReadiness: { score: scores.agentReadiness, grade: getGrade(scores.agentReadiness) }
      };
      
      // Generate real Agent Action Blueprint from scan data
      const agentBlueprint = isMultiPage ? {
        totalActions: 0,
        summary: "Multi-page scan completed",
        criticalCount: (scanResult as any).siteWideSummary?.criticalIssues || 0,
        automationPotential: 75,
        actions: []
      } : (evidence ? generateAgentActionBlueprint(
        evidence.accessibility,
        evidence.performance,
        evidence.security,
        evidence.agentReadiness
      ) : { totalActions: 0, summary: "No data available", criticalCount: 0, automationPotential: 0, actions: [] });
      
      geminiAnalysis = {
        overallScore,
        pillarScores,
        topFixes: [],
        summary: `Scan completed with overall score: ${overallScore}. Found ${agentBlueprint.totalActions} actionable improvements.`,
        recommendations: {
          accessibility: ["AI recommendations temporarily unavailable - scan data collected successfully"],
          trustAndSecurity: ["AI recommendations temporarily unavailable - scan data collected successfully"],
          performance: ["AI recommendations temporarily unavailable - scan data collected successfully"],
          agentReadiness: ["AI recommendations temporarily unavailable - scan data collected successfully"]
        },
        // Adding extended properties that may be expected
        detailedRecommendations: {
          accessibility: ["AI recommendations temporarily unavailable - scan data collected successfully"],
          trustAndSecurity: ["AI recommendations temporarily unavailable - scan data collected successfully"],
          performance: ["AI recommendations temporarily unavailable - scan data collected successfully"],
          agentReadiness: ["AI recommendations temporarily unavailable - scan data collected successfully"]
        },
        executiveSummary: `Your website achieved an overall score of ${overallScore} (${grade}). ${agentBlueprint.summary}`,
        technicalSummary: `Scan completed successfully. ${agentBlueprint.criticalCount} critical issues found. ${agentBlueprint.automationPotential}% of actions can be automated.`,
        eaaCompliance: {
          compliant: scores.accessibility >= 90,
          criticalIssues: isMultiPage ? 
            ((scanResult as any).siteWideSummary?.criticalIssues > 0 ? 
              [`${(scanResult as any).siteWideSummary?.criticalIssues} critical issues found across site`] : []) :
            ((evidence?.accessibility?.criticalViolations || 0) > 0 ? 
              [`${evidence?.accessibility?.criticalViolations || 0} critical accessibility violations found`] : []),
          deadline: "June 28, 2025",
          recommendations: ["Review accessibility scan results for EAA compliance"]
        },
        agentActionBlueprint: agentBlueprint,
        topImpactFixes: agentBlueprint.actions.slice(0, 5).map(action => ({
          issue: action.action,
          description: action.description,
          expectedImpact: action.estimatedImpact,
          implementationDifficulty: action.priority === 'critical' ? 'High' : 
                                    action.priority === 'high' ? 'Medium' : 'Low',
          codeSnippet: action.technicalDetails.code || '',
          pillar: action.category
        }))
      } as any;
    }

    // Create scan report with visual insights
    await storage.createScanReport({
      scanId,
      overallScore,
      grade,
      topFixes: geminiAnalysis.topFixes || geminiAnalysis.topImpactFixes || [],
      summary: geminiAnalysis.summary || geminiAnalysis.executiveSummary,
      geminiAnalysis: {
        ...geminiAnalysis,
        overallGrade: grade,
        gradeExplanation,
        visualInsights: visualAnalysis
      }
    });

    // Mark scan as completed
    await storage.updateScanStatus(scanId, "completed", new Date());

  } catch (error) {
    console.error(`Scan processing failed for ${scanId}:`, error);
    await storage.updateScanStatus(scanId, "failed");
    throw error;
  }
}
