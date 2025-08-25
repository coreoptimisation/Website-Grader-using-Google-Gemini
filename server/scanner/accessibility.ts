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
  console.log(`[ACCESSIBILITY] Starting audit for ${url}`);
  console.log(`[ACCESSIBILITY] Environment: ${process.env.NODE_ENV || 'unknown'}`);
  console.log(`[ACCESSIBILITY] Platform: ${process.platform}`);
  
  let browser;
  try {
    console.log(`[ACCESSIBILITY] Attempting to launch browser...`);
    
    const launchOptions: any = { 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    };
    
    // Use hardcoded path in development, let Playwright handle it in production
    if (process.env.NODE_ENV !== 'production') {
      // Development environment with Nix
      launchOptions.executablePath = '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium';
      console.log(`[ACCESSIBILITY] Using development Chromium path`);
    } else {
      // Production - let Playwright use its bundled browser
      console.log(`[ACCESSIBILITY] Using Playwright bundled browser for production`);
      // Don't set executablePath - Playwright will use its own
    }
    
    browser = await chromium.launch(launchOptions);
    console.log(`[ACCESSIBILITY] Browser launched successfully`);
  } catch (launchError) {
    console.error('[ACCESSIBILITY] Browser launch failed:', launchError);
    // Return fallback scores
    return {
      score: 0,
      violations: [],
      passes: [],
      incomplete: [],
      wcagLevel: "Failed",
      totalViolations: 0,
      criticalViolations: 0,
      moderateViolations: 0,
      minorViolations: 0
    };
  }
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    
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
    
    // Calculate score based on both violations and passes
    // Use a ratio-based approach for fairer scoring
    const totalChecks = results.passes.length + results.violations.length + results.incomplete.length;
    const passedChecks = results.passes.length;
    
    // Base score on pass rate (0-100)
    let score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100;
    
    // Apply penalties for violations based on severity
    // But cap the total penalty at 50% of the score
    let penalty = 0;
    penalty += (criticalViolations * 5);  // Critical violations: -5 points each
    penalty += (moderateViolations * 3);  // Moderate violations: -3 points each  
    penalty += (minorViolations * 1);     // Minor violations: -1 point each
    
    // Apply penalty but ensure minimum score of 10 if there are any passes
    score = Math.max(score - penalty, passedChecks > 0 ? 10 : 0);
    
    // Ensure score is between 0 and 100
    score = Math.min(100, Math.max(0, score));
    
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
