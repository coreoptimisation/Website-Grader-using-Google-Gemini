import { runAccessibilityAudit } from "./accessibility";
import { runPerformanceAudit } from "./performance";
import { runSecurityAudit } from "./security";
import { runAgentReadinessAudit } from "./agent-readiness";
import { captureScreenshot } from "./screenshot";
import { WebCrawler } from "./crawler";
import { PILLAR_WEIGHTS } from "../../shared/scoring";

interface BookingSystemDetails {
  provider?: string;
  platform?: string;
  thirdParties: string[];
  features: string[];
}

export interface PageScanResult {
  url: string;
  pageType: string;
  accessibility: any;
  performance: any;
  security: any;
  agentReadiness: any;
  screenshot?: any;
  overallScore?: number;
  ecommerceAnalysis?: {
    hasShoppingCart: boolean;
    hasCheckoutFlow: boolean;
    hasPaymentOptions: boolean;
    hasProductCatalog: boolean;
    hasBookingSystem: boolean;
    securePayment: boolean;
    bookingSystemDetails?: BookingSystemDetails;
    trustSignals: string[];
    issues: string[];
  };
}

export interface MultiPageScanResult {
  primaryUrl: string;
  pagesAnalyzed: number;
  pageResults: PageScanResult[];
  aggregateScores: {
    accessibility: number;
    performance: number;
    security: number;
    agentReadiness: number;
    overall: number;
  };
  ecommerceSummary?: {
    hasEcommerce: boolean;
    hasBooking: boolean;
    functionalityScore: number;
    securityScore: number;
    criticalIssues: string[];
    recommendations: string[];
  };
  siteWideSummary: {
    totalIssues: number;
    criticalIssues: number;
    commonProblems: string[];
    strengths: string[];
  };
}

export async function runMultiPageScan(
  startUrl: string, 
  scanId: string
): Promise<MultiPageScanResult> {
  console.log(`Starting multi-page scan for: ${startUrl}`);
  
  // Step 1: Crawl the website to discover pages
  const crawler = new WebCrawler();
  const crawlResult = await crawler.crawl(startUrl);
  
  console.log(`Discovered ${crawlResult.urls.length} critical pages to analyze:`);
  crawlResult.discoveredPages.forEach((page, index) => {
    console.log(`  ${index + 1}. ${page.type.toUpperCase()}: ${page.url}`);
  });
  console.log(`Found ecommerce pages:`, crawlResult.ecommercePages);
  
  // Step 2: Scan each critical page (exactly 4 pages max)
  const pageResults: PageScanResult[] = [];
  const maxPagesToScan = Math.min(crawlResult.urls.length, 4); // Scan exactly 4 critical pages
  
  for (let i = 0; i < maxPagesToScan; i++) {
    const url = crawlResult.urls[i];
    const pageInfo = crawlResult.discoveredPages.find(p => p.url === url);
    const pageType = pageInfo?.type || "other";
    
    console.log(`Scanning page ${i + 1}/${maxPagesToScan}: ${url} (${pageType})`);
    
    try {
      // Run all scans in parallel for this page
      const [accessibility, performance, security, agentReadiness, screenshot] = await Promise.all([
        runAccessibilityAudit(url),
        runPerformanceAudit(url),
        runSecurityAudit(url),
        runAgentReadinessAudit(url),
        captureScreenshot(url, `${scanId}_page${i}`)
      ]);
      
      // Special analysis for ecommerce/booking pages
      let ecommerceAnalysis;
      if (["cart", "checkout", "booking", "product"].includes(pageType)) {
        ecommerceAnalysis = await analyzeEcommercePage(url, pageType, security);
      }
      
      // Calculate overall score for this page
      const overallScore = Math.round(
        (accessibility.score || 0) * 0.3 +
        (performance.score || 0) * 0.25 +
        (security.score || 0) * 0.25 +
        (agentReadiness.score || 0) * 0.2
      );
      
      pageResults.push({
        url,
        pageType,
        accessibility,
        performance,
        security,
        agentReadiness,
        screenshot,
        ecommerceAnalysis,
        overallScore
      });
    } catch (error) {
      console.error(`Failed to scan ${url}:`, error);
      // Add error result for this page
      pageResults.push({
        url,
        pageType,
        accessibility: { score: 0, error: true },
        performance: { score: 0, error: true },
        security: { score: 0, error: true },
        agentReadiness: { score: 0, error: true },
        overallScore: 0
      });
    }
  }
  
  // Step 3: Calculate aggregate scores
  const aggregateScores = calculateAggregateScores(pageResults);
  
  // Step 4: Generate ecommerce summary if applicable
  const ecommerceSummary = generateEcommerceSummary(pageResults, crawlResult.ecommercePages);
  
  // Step 5: Generate site-wide summary
  const siteWideSummary = generateSiteWideSummary(pageResults);
  
  return {
    primaryUrl: startUrl,
    pagesAnalyzed: pageResults.length,
    pageResults,
    aggregateScores,
    ecommerceSummary,
    siteWideSummary
  };
}

async function detectBookingSystem(url: string): Promise<BookingSystemDetails> {
  const details: BookingSystemDetails = {
    thirdParties: [],
    features: []
  };
  
  let browser;
  let page;
  
  try {
    const { chromium } = await import('playwright');
    browser = await chromium.launch({ 
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium'
    });
    page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Get page content and scripts
    const content = await page.content();
    const scripts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('script')).map(s => s.src || s.innerHTML);
    });
    
    const allContent = content + scripts.join(' ');
    
    // Detect booking system providers
    const bookingProviders = [
      { pattern: /bookassist/i, name: 'BookAssist' },
      { pattern: /booking\.com/i, name: 'Booking.com' },
      { pattern: /expedia/i, name: 'Expedia' },
      { pattern: /cloudbeds/i, name: 'Cloudbeds' },
      { pattern: /opera/i, name: 'Opera PMS' },
      { pattern: /amadeus/i, name: 'Amadeus' },
      { pattern: /sabre/i, name: 'Sabre' },
      { pattern: /hotelogix/i, name: 'Hotelogix' },
      { pattern: /littlehotelier/i, name: 'Little Hotelier' },
      { pattern: /rezdy/i, name: 'Rezdy' },
      { pattern: /checkfront/i, name: 'Checkfront' },
      { pattern: /fareharbor/i, name: 'FareHarbor' },
      { pattern: /opentable/i, name: 'OpenTable' },
      { pattern: /resy/i, name: 'Resy' },
      { pattern: /yelp.*reservations/i, name: 'Yelp Reservations' },
      { pattern: /bookingengine/i, name: 'Generic Booking Engine' },
      { pattern: /rezgo/i, name: 'Rezgo' },
      { pattern: /trekksoft/i, name: 'TrekkSoft' },
      { pattern: /guestline/i, name: 'Guestline' },
      { pattern: /siteminder/i, name: 'SiteMinder' }
    ];
    
    for (const provider of bookingProviders) {
      if (provider.pattern.test(allContent)) {
        details.provider = provider.name;
        break;
      }
    }
    
    // Detect third-party integrations
    const thirdPartyServices = [
      { pattern: /google.*analytics/i, name: 'Google Analytics' },
      { pattern: /google.*tag.*manager/i, name: 'Google Tag Manager' },
      { pattern: /facebook.*pixel/i, name: 'Facebook Pixel' },
      { pattern: /stripe/i, name: 'Stripe Payments' },
      { pattern: /paypal/i, name: 'PayPal' },
      { pattern: /square/i, name: 'Square Payments' },
      { pattern: /adyen/i, name: 'Adyen' },
      { pattern: /braintree/i, name: 'Braintree' },
      { pattern: /mailchimp/i, name: 'Mailchimp' },
      { pattern: /hubspot/i, name: 'HubSpot' },
      { pattern: /tripadvisor/i, name: 'TripAdvisor' },
      { pattern: /trustpilot/i, name: 'Trustpilot' },
      { pattern: /hotjar/i, name: 'Hotjar' },
      { pattern: /intercom/i, name: 'Intercom' },
      { pattern: /zendesk/i, name: 'Zendesk' },
      { pattern: /calendly/i, name: 'Calendly' },
      { pattern: /twilio/i, name: 'Twilio' }
    ];
    
    for (const service of thirdPartyServices) {
      if (service.pattern.test(allContent)) {
        details.thirdParties.push(service.name);
      }
    }
    
    // Detect booking features
    const features = [
      { pattern: /calendar|date.*picker/i, feature: 'Date Selection' },
      { pattern: /availability|available/i, feature: 'Real-time Availability' },
      { pattern: /guest.*count|occupancy/i, feature: 'Guest Management' },
      { pattern: /room.*type|accommodation/i, feature: 'Room Selection' },
      { pattern: /price|rate|cost/i, feature: 'Dynamic Pricing' },
      { pattern: /payment|checkout/i, feature: 'Online Payment' },
      { pattern: /confirmation|booking.*reference/i, feature: 'Booking Confirmation' },
      { pattern: /cancel|modification/i, feature: 'Cancellation Policy' },
      { pattern: /special.*request|preferences/i, feature: 'Special Requests' },
      { pattern: /loyalty|rewards/i, feature: 'Loyalty Program' }
    ];
    
    for (const item of features) {
      if (item.pattern.test(allContent)) {
        details.features.push(item.feature);
      }
    }
    
    // Check for custom-built systems
    if (!details.provider && details.features.length > 3) {
      details.platform = 'Custom Built';
    }
    
  } catch (error) {
    console.error('Error detecting booking system:', error);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
  }
  
  return details;
}

async function analyzeEcommercePage(
  url: string, 
  pageType: string,
  securityData: any
): Promise<PageScanResult['ecommerceAnalysis']> {
  // Analyze ecommerce-specific features
  const analysis: PageScanResult['ecommerceAnalysis'] = {
    hasShoppingCart: false,
    hasCheckoutFlow: false,
    hasPaymentOptions: false,
    hasProductCatalog: false,
    hasBookingSystem: false,
    securePayment: false,
    trustSignals: [],
    issues: []
  };
  
  // Check based on page type
  if (pageType === "cart") {
    analysis.hasShoppingCart = true;
  }
  if (pageType === "checkout") {
    analysis.hasCheckoutFlow = true;
    analysis.securePayment = securityData.https === true;
    if (!analysis.securePayment) {
      analysis.issues.push("Checkout page is not using HTTPS - critical security issue!");
    }
  }
  if (pageType === "booking") {
    analysis.hasBookingSystem = true;
    // Detect booking system details (non-blocking)
    try {
      analysis.bookingSystemDetails = await detectBookingSystem(url);
    } catch (error) {
      console.error('Failed to detect booking system details:', error);
      // Continue without booking system details
    }
  }
  if (pageType === "product") {
    analysis.hasProductCatalog = true;
  }
  
  // Check for trust signals
  if (securityData.https) {
    analysis.trustSignals.push("HTTPS enabled");
  }
  if (securityData.headers?.["strict-transport-security"]) {
    analysis.trustSignals.push("HSTS enabled");
  }
  if (securityData.headers?.["content-security-policy"]) {
    analysis.trustSignals.push("CSP configured");
  }
  
  // Check for common ecommerce issues
  if (pageType === "checkout" || pageType === "cart") {
    if (!securityData.https) {
      analysis.issues.push("Payment/checkout pages must use HTTPS");
    }
    if (!securityData.headers?.["x-frame-options"]) {
      analysis.issues.push("Missing clickjacking protection on payment page");
    }
  }
  
  return analysis;
}

function calculateAggregateScores(pageResults: PageScanResult[]) {
  const validResults = pageResults.filter(r => !r.accessibility.error);
  
  if (validResults.length === 0) {
    return {
      accessibility: 0,
      performance: 0,
      security: 0,
      agentReadiness: 0,
      overall: 0
    };
  }
  
  // Weight homepage and critical pages more heavily
  let totalWeight = 0;
  let weightedScores = {
    accessibility: 0,
    performance: 0,
    security: 0,
    agentReadiness: 0
  };
  
  for (const result of validResults) {
    // Assign weights based on page importance
    let weight = 1;
    if (result.pageType === "homepage") weight = 2;
    else if (result.pageType === "checkout" || result.pageType === "cart") weight = 1.8;
    else if (result.pageType === "booking") weight = 1.7;
    else if (result.pageType === "product") weight = 1.5;
    else if (result.pageType === "contact") weight = 1.3;
    
    totalWeight += weight;
    weightedScores.accessibility += result.accessibility.score * weight;
    weightedScores.performance += result.performance.score * weight;
    weightedScores.security += result.security.score * weight;
    weightedScores.agentReadiness += result.agentReadiness.score * weight;
  }
  
  // Calculate weighted averages
  const scores = {
    accessibility: Math.round(weightedScores.accessibility / totalWeight),
    performance: Math.round(weightedScores.performance / totalWeight),
    security: Math.round(weightedScores.security / totalWeight),
    agentReadiness: Math.round(weightedScores.agentReadiness / totalWeight),
    overall: 0
  };
  
  // Calculate overall score with official pillar weights from shared/scoring.ts
  // Using the same weights as the main scoring system to ensure consistency
  scores.overall = Math.round(
    scores.accessibility * PILLAR_WEIGHTS.accessibility +     // 40%
    scores.security * PILLAR_WEIGHTS.trust +                  // 20%
    scores.performance * PILLAR_WEIGHTS.uxPerf +              // 25%
    scores.agentReadiness * PILLAR_WEIGHTS.agentReadiness     // 15%
  );
  
  return scores;
}

function generateEcommerceSummary(
  pageResults: PageScanResult[],
  ecommercePages: any
): MultiPageScanResult['ecommerceSummary'] {
  const hasEcommerce = !!(ecommercePages.cart || ecommercePages.checkout || ecommercePages.products?.length);
  const hasBooking = !!ecommercePages.booking;
  
  if (!hasEcommerce && !hasBooking) {
    return undefined;
  }
  
  const summary: MultiPageScanResult['ecommerceSummary'] = {
    hasEcommerce,
    hasBooking,
    functionalityScore: 0,
    securityScore: 0,
    criticalIssues: [],
    recommendations: []
  };
  
  // Analyze ecommerce pages
  const ecommerceResults = pageResults.filter(r => 
    r.ecommerceAnalysis && ["cart", "checkout", "booking", "product"].includes(r.pageType)
  );
  
  if (ecommerceResults.length > 0) {
    // Calculate functionality score
    let functionalityPoints = 0;
    if (ecommerceResults.some(r => r.ecommerceAnalysis?.hasShoppingCart)) functionalityPoints += 25;
    if (ecommerceResults.some(r => r.ecommerceAnalysis?.hasCheckoutFlow)) functionalityPoints += 25;
    if (ecommerceResults.some(r => r.ecommerceAnalysis?.hasProductCatalog)) functionalityPoints += 25;
    if (ecommerceResults.some(r => r.ecommerceAnalysis?.hasBookingSystem)) functionalityPoints += 25;
    summary.functionalityScore = functionalityPoints;
    
    // Calculate security score for ecommerce pages
    const securityScores = ecommerceResults.map(r => r.security.score);
    summary.securityScore = Math.round(
      securityScores.reduce((a, b) => a + b, 0) / securityScores.length
    );
    
    // Collect critical issues
    for (const result of ecommerceResults) {
      if (result.ecommerceAnalysis?.issues) {
        summary.criticalIssues.push(...result.ecommerceAnalysis.issues);
      }
      
      // Check for critical security issues on payment pages
      if (result.pageType === "checkout" && !result.security.https) {
        summary.criticalIssues.push("CRITICAL: Checkout page not using HTTPS!");
      }
      
      // Check accessibility on checkout
      if (result.pageType === "checkout" && result.accessibility.score < 70) {
        summary.criticalIssues.push("Checkout page has accessibility issues that may prevent users from completing purchases");
      }
    }
    
    // Generate recommendations
    if (!ecommercePages.cart && hasEcommerce) {
      summary.recommendations.push("Add a dedicated shopping cart page for better user experience");
    }
    if (summary.securityScore < 80) {
      summary.recommendations.push("Improve security on ecommerce pages - implement HTTPS, CSP, and other security headers");
    }
    if (!ecommerceResults.some(r => r.ecommerceAnalysis?.trustSignals?.length > 2)) {
      summary.recommendations.push("Add more trust signals (security badges, SSL certificates, customer reviews)");
    }
  }
  
  return summary;
}

function generateSiteWideSummary(pageResults: PageScanResult[]): MultiPageScanResult['siteWideSummary'] {
  const summary: MultiPageScanResult['siteWideSummary'] = {
    totalIssues: 0,
    criticalIssues: 0,
    commonProblems: [],
    strengths: []
  };
  
  // Count issues across all pages
  const problemCounts: Record<string, number> = {};
  
  for (const result of pageResults) {
    // Count accessibility violations
    if (result.accessibility.violations) {
      summary.totalIssues += result.accessibility.violations.length;
      summary.criticalIssues += result.accessibility.criticalViolations || 0;
      
      // Track common problems
      for (const violation of result.accessibility.violations) {
        problemCounts[violation.id] = (problemCounts[violation.id] || 0) + 1;
      }
    }
    
    // Check for HTTPS issues
    if (!result.security.https) {
      problemCounts['no-https'] = (problemCounts['no-https'] || 0) + 1;
    }
  }
  
  // Find common problems (appearing on 50%+ of pages)
  const halfPages = pageResults.length / 2;
  for (const [problem, count] of Object.entries(problemCounts)) {
    if (count >= halfPages) {
      if (problem === 'no-https') {
        summary.commonProblems.push("Multiple pages not using HTTPS");
      } else {
        summary.commonProblems.push(`Accessibility issue "${problem}" found on ${count} pages`);
      }
    }
  }
  
  // Identify strengths
  const avgScores = calculateAggregateScores(pageResults);
  if (avgScores.accessibility >= 90) {
    summary.strengths.push("Excellent accessibility across the site");
  }
  if (avgScores.performance >= 90) {
    summary.strengths.push("Outstanding performance on all tested pages");
  }
  if (avgScores.security >= 90) {
    summary.strengths.push("Strong security implementation");
  }
  if (avgScores.agentReadiness >= 85) {
    summary.strengths.push("Well-optimized for search engines and AI agents");
  }
  
  return summary;
}