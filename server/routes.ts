import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { runCompleteScan } from "./scanner";
import { analyzeWebsiteFindings } from "./gemini";
import { z } from "zod";
import { calculateOverallScore, getGrade, getGradeExplanation } from "../shared/scoring";

const scanRequestSchema = z.object({
  url: z.string().url("Invalid URL format"),
  userId: z.string().optional()
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Start a new scan
  app.post("/api/scans", async (req, res) => {
    try {
      const { url, userId } = scanRequestSchema.parse(req.body);
      
      // Create initial scan record
      const scan = await storage.createScan({ url, userId });
      
      res.json({ scanId: scan.id, status: "pending" });
      
      // Start scanning process asynchronously
      processScan(scan.id, url).catch(error => {
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

  const httpServer = createServer(app);
  return httpServer;
}

async function processScan(scanId: string, url: string) {
  try {
    // Update status to scanning
    await storage.updateScanStatus(scanId, "scanning");
    
    // Run complete scan with screenshot capture
    const evidence = await runCompleteScan(url, scanId);
    
    // Store evidence
    await storage.createScanEvidence({
      scanId,
      type: "complete_scan",
      filePath: null,
      data: evidence
    });

    // Create individual pillar results
    const pillarResults = [
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

    // Store pillar results
    await Promise.all(pillarResults.map(result => 
      storage.createScanResult(result)
    ));

    // Run Gemini analysis with fallback handling
    let geminiAnalysis;
    let overallScore;
    let grade;
    let gradeExplanation;
    
    try {
      geminiAnalysis = await analyzeWebsiteFindings({
        url: evidence.url,
        accessibility: evidence.accessibility,
        performance: evidence.performance,
        security: evidence.security,
        agentReadiness: evidence.agentReadiness
      });
      
      // Calculate weighted overall score using the shared scoring module
      overallScore = calculateOverallScore(geminiAnalysis.pillarScores);
      grade = getGrade(overallScore);
      gradeExplanation = getGradeExplanation(grade, overallScore);
    } catch (geminiError) {
      console.error("Gemini analysis failed, using fallback values:", geminiError);
      
      // Use the actual scores from the scanners as fallback
      const pillarScoresNumeric = {
        accessibility: evidence.accessibility.score,
        trust: evidence.security.score,
        uxPerf: evidence.performance.score,
        agentReadiness: evidence.agentReadiness.score
      };
      
      overallScore = calculateOverallScore(pillarScoresNumeric);
      grade = getGrade(overallScore);
      gradeExplanation = getGradeExplanation(grade, overallScore);
      
      // Create fallback analysis with structure matching GeminiAnalysisResult
      const pillarScores = {
        accessibility: { score: evidence.accessibility.score, grade: getGrade(evidence.accessibility.score) },
        trustAndSecurity: { score: evidence.security.score, grade: getGrade(evidence.security.score) },
        performance: { score: evidence.performance.score, grade: getGrade(evidence.performance.score) },
        agentReadiness: { score: evidence.agentReadiness.score, grade: getGrade(evidence.agentReadiness.score) }
      };
      
      geminiAnalysis = {
        overallScore,
        pillarScores,
        topFixes: [],
        summary: `Scan completed with overall score: ${overallScore}. AI recommendations temporarily unavailable.`,
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
        executiveSummary: `Your website achieved an overall score of ${overallScore} (${grade}). AI-powered recommendations are temporarily unavailable due to service load, but all scan data has been collected successfully.`,
        technicalSummary: "Scan completed successfully. AI analysis service temporarily unavailable.",
        eaaCompliance: {
          compliant: evidence.accessibility.score >= 90,
          criticalIssues: [],
          deadline: "June 28, 2025",
          recommendations: ["Review accessibility scan results for EAA compliance"]
        },
        agentActionBlueprint: {
          actions: [],
          priority: []
        },
        topImpactFixes: [
          {
            issue: "AI Analysis Temporarily Unavailable",
            description: "The AI analysis service is temporarily unavailable. Your scan data has been collected successfully.",
            expectedImpact: "Medium",
            implementationDifficulty: "Low",
            codeSnippet: "",
            pillar: "general"
          }
        ]
      } as any;
    }

    // Create scan report
    await storage.createScanReport({
      scanId,
      overallScore,
      grade,
      topFixes: geminiAnalysis.topFixes || geminiAnalysis.topImpactFixes || [],
      summary: geminiAnalysis.summary || geminiAnalysis.executiveSummary,
      geminiAnalysis: {
        ...geminiAnalysis,
        overallGrade: grade,
        gradeExplanation
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
