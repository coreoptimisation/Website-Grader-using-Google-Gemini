import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

export interface AccessibilityResult {
  score: number;
  violations: any[];
  passes: any[];
  incomplete: any[];
  wcagLevel: string;
  totalViolations: number;
  criticalViolations: number;
  moderateViolations: number;
  minorViolations: number;
}

export async function runAccessibilityAudit(url: string): Promise<AccessibilityResult> {
  const browser = await chromium.launch({ 
    headless: true,
    executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium'
  });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    
    // Run axe-core accessibility audit
    const results = await new AxeBuilder({ page }).analyze();
    
    // Calculate severity counts
    let criticalViolations = 0;
    let moderateViolations = 0;
    let minorViolations = 0;
    
    results.violations.forEach(violation => {
      switch (violation.impact) {
        case 'critical':
          criticalViolations += violation.nodes.length;
          break;
        case 'serious':
          moderateViolations += violation.nodes.length;
          break;
        case 'moderate':
        case 'minor':
          minorViolations += violation.nodes.length;
          break;
      }
    });
    
    const totalViolations = criticalViolations + moderateViolations + minorViolations;
    
    // Calculate score based on violations and passes
    // Start with 100 and deduct points based on severity
    let score = 100;
    score -= (criticalViolations * 10); // Critical violations: -10 points each
    score -= (moderateViolations * 5);  // Moderate violations: -5 points each  
    score -= (minorViolations * 2);     // Minor violations: -2 points each
    
    // Minimum score is 0
    score = Math.max(0, score);
    
    // Determine WCAG compliance level
    let wcagLevel = "AAA";
    if (criticalViolations > 0 || moderateViolations > 5) {
      wcagLevel = "Partial";
    } else if (moderateViolations > 0 || minorViolations > 10) {
      wcagLevel = "AA";
    }
    
    return {
      score,
      violations: results.violations,
      passes: results.passes,
      incomplete: results.incomplete,
      wcagLevel,
      totalViolations,
      criticalViolations,
      moderateViolations,
      minorViolations
    };
    
  } finally {
    await browser.close();
  }
}
