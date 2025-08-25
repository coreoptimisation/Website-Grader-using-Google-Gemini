import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { runCompleteScan } from "./scanner";
import { analyzeWebsiteFindings } from "./gemini";
import { analyzeScreenshot } from "./gemini-visual";
import { z } from "zod";
import { calculateOverallScore, getGrade, getGradeExplanation } from "../shared/scoring";
import { generateAgentActionBlueprint } from "./scanner/agent-blueprint";
import { checkBrowserHealth } from "./scanner/browser-launcher";

const scanRequestSchema = z.object({
  url: z.string().url("Invalid URL format"),
  userId: z.string().optional(),
  multiPage: z.boolean().optional().default(true) // Default to multi-page scanning
});

// Initialize global scan progress tracker
if (!(global as any).scanProgress) {
  (global as any).scanProgress = {};
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Health check with browser availability
  app.get("/api/health", async (req, res) => {
    try {
      const browserHealthy = await checkBrowserHealth();
      res.json({ 
        status: browserHealthy ? "ok" : "degraded",
        browser: browserHealthy ? "available" : "unavailable",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({ 
        status: "error", 
        browser: "unavailable",
        message: "Browser health check failed",
        timestamp: new Date().toISOString()
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

  // Get scan status and results with progress
  app.get("/api/scans/:id", async (req, res) => {
    try {
      const scan = await storage.getScan(req.params.id);
      if (!scan) {
        return res.status(404).json({ error: "Scan not found" });
      }

      const results = await storage.getScanResults(scan.id);
      const report = await storage.getScanReport(scan.id);
      
      // Include progress if scan is in progress
      let progress = null;
      if (scan.status === 'scanning' && (global as any).scanProgress?.[scan.id]) {
        progress = (global as any).scanProgress[scan.id];
      }

      res.json({
        scan,
        results,
        report,
        progress
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
  try {
    console.log(`Processing scan ${scanId} for ${url}`);
    // Update status to scanning
    await storage.updateScanStatus(scanId, "scanning");
    
    // Run complete scan with screenshot capture
    console.log('Running complete scan...');
    const scanResult = await runCompleteScan(url, scanId, multiPage);
    console.log('Scan completed, processing results...');
    
    // Check if it's a multi-page scan result
    const isMultiPage = 'pageResults' in scanResult;
    
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
          score: evidence.accessibility.score,
          rawData: evidence.accessibility,
          recommendations: []
        },
        {
          scanId,
          pillar: "performance",
          score: evidence.performance.score,
          rawData: evidence.performance,
          recommendations: []
        },
        {
          scanId,
          pillar: "trust",
          score: evidence.security.score,
          rawData: evidence.security,
          recommendations: []
        },
        {
          scanId,
          pillar: "agentReadiness",
          score: evidence.agentReadiness.score,
          rawData: evidence.agentReadiness,
          recommendations: []
        }
      ];
    } else {
      // Should not happen, but handle gracefully
      throw new Error('No scan results available');
    }

    // Store pillar results
    console.log('Storing pillar results...');
    await Promise.all(pillarResults.map(result => 
      storage.createScanResult(result)
    ));
    console.log('Pillar results stored');

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
          url: evidence.url,
          multiPage: false,
          pagesAnalyzed: 1,
          accessibility: {
            score: evidence.accessibility.score,
            violations: evidence.accessibility.violations?.length || 0,
            criticalViolations: evidence.accessibility.criticalViolations || 0,
            topIssues: evidence.accessibility.violations?.slice(0, 3).map((v: any) => ({
              id: v.id,
              impact: v.impact,
              help: v.help
            })) || []
          },
          performance: {
            score: evidence.performance.score,
            fcp: evidence.performance.coreWebVitals?.fcp,
            lcp: evidence.performance.coreWebVitals?.lcp,
            opportunities: evidence.performance.opportunities?.slice(0, 3).map((o: any) => ({
              title: o.title,
              numericValue: o.numericValue
            })) || []
          },
          security: {
            score: evidence.security.score,
            https: evidence.security.https,
            vulnerabilities: evidence.security.vulnerabilities?.slice(0, 3) || []
          },
          agentReadiness: {
            score: evidence.agentReadiness.score,
            robots: evidence.agentReadiness.robots?.found || false,
            sitemaps: evidence.agentReadiness.sitemaps?.found || false
          }
        };
      } else {
        throw new Error('No evidence available for analysis');
      }
      
      // Add screenshot path to the summarized evidence
      (summarizedEvidence as any).screenshotPath = screenshotPath;
      
      // Prepare evidence for Gemini analysis (remove extra properties)
      const evidenceForAnalysis = {
        url: summarizedEvidence.url,
        accessibility: summarizedEvidence.accessibility,
        performance: summarizedEvidence.performance,
        security: summarizedEvidence.security,
        agentReadiness: summarizedEvidence.agentReadiness,
        screenshotPath: screenshotPath
      };
      
      // Run visual analysis in parallel with main analysis
      const [mainAnalysis, visualInsights] = await Promise.all([
        analyzeWebsiteFindings(evidenceForAnalysis),
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
      } : evidence ? {
        accessibility: evidence.accessibility.score,
        trust: evidence.security.score,
        uxPerf: evidence.performance.score,
        agentReadiness: evidence.agentReadiness.score
      } : {
        accessibility: 0,
        trust: 0,
        uxPerf: 0,
        agentReadiness: 0
      };
      
      overallScore = calculateOverallScore(pillarScoresNumeric);
      grade = getGrade(overallScore);
      gradeExplanation = getGradeExplanation(grade, overallScore);
      
      // Create fallback analysis with structure matching GeminiAnalysisResult
      const scores = isMultiPage ? (scanResult as any).aggregateScores : evidence ? {
        accessibility: evidence.accessibility.score,
        security: evidence.security.score,
        performance: evidence.performance.score,
        agentReadiness: evidence.agentReadiness.score
      } : {
        accessibility: 0,
        security: 0,
        performance: 0,
        agentReadiness: 0
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
      } : evidence ? generateAgentActionBlueprint(
        evidence.accessibility,
        evidence.performance,
        evidence.security,
        evidence.agentReadiness
      ) : {
        totalActions: 0,
        summary: "Unable to generate blueprint",
        criticalCount: 0,
        automationPotential: 0,
        actions: []
      };
      
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
            (evidence?.accessibility?.criticalViolations && evidence.accessibility.criticalViolations > 0 ? 
              [`${evidence.accessibility.criticalViolations} critical accessibility violations found`] : []),
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
    console.log('Creating scan report...');
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
    console.log('Scan report created');

    // Mark scan as completed
    console.log('Updating scan status to completed...');
    await storage.updateScanStatus(scanId, "completed", new Date());
    console.log(`Scan ${scanId} marked as completed successfully`);

  } catch (error) {
    console.error(`Scan processing failed for ${scanId}:`, error);
    await storage.updateScanStatus(scanId, "failed");
    throw error;
  }
}
