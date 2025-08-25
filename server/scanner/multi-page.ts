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
  detectionMethod?: 'footer' | 'domain' | 'fingerprint' | 'network' | 'fallback';
  confidence?: 'high' | 'medium' | 'low';
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

// Progress tracking helper
function updateProgress(scanId: string, stage: string, currentPage: number, totalPages: number, message: string, pageUrl?: string) {
  const percentage = Math.round((currentPage / (totalPages + 2)) * 100); // +2 for crawling and finalizing stages
  if ((global as any).scanProgress) {
    (global as any).scanProgress[scanId] = {
      stage,
      currentPage,
      totalPages,
      message,
      percentage,
      pageUrl,
      timestamp: Date.now()
    };
  }
}

export async function runMultiPageScan(
  startUrl: string, 
  scanId: string
): Promise<MultiPageScanResult> {
  console.log(`Starting multi-page scan for: ${startUrl}`);
  
  // Step 1: Crawl the website to discover pages
  updateProgress(scanId, 'crawling', 0, 4, 'Discovering critical pages to analyze...');
  const crawler = new WebCrawler();
  const crawlResult = await crawler.crawl(startUrl);
  
  console.log(`Discovered ${crawlResult.urls.length} critical pages to analyze:`);
  crawlResult.discoveredPages.forEach((page, index) => {
    console.log(`  ${index + 1}. ${page.type.toUpperCase()}: ${page.url}`);
  });
  console.log(`Found ecommerce pages:`, crawlResult.ecommercePages);
  
  // Store discovered pages in progress
  if ((global as any).scanProgress?.[scanId]) {
    (global as any).scanProgress[scanId].discoveredPages = crawlResult.urls.slice(0, 4);
  }
  
  // Step 2: Scan each critical page (exactly 4 pages)
  const pageResults: PageScanResult[] = [];
  const maxPagesToScan = Math.min(crawlResult.urls.length, 4); // Focus on 4 critical pages: homepage, shop, booking, detail
  
  for (let i = 0; i < maxPagesToScan; i++) {
    const url = crawlResult.urls[i];
    const pageInfo = crawlResult.discoveredPages.find(p => p.url === url);
    const pageType = pageInfo?.type || "other";
    
    console.log(`Scanning page ${i + 1}/${maxPagesToScan}: ${url} (${pageType})`);
    
    // Update progress for current page with actual URL
    const pageLabel = pageType === 'homepage' ? 'Homepage' : 
                      url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] + 
                      (url.includes('/') ? '/' + url.split('/').slice(3).join('/').substring(0, 30) : '');
    updateProgress(scanId, 'scanning', i + 1, maxPagesToScan, `Analyzing ${pageLabel}: Running accessibility, performance, security, and SEO checks...`, url);
    
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
        updateProgress(scanId, 'scanning', i + 1, maxPagesToScan, `Analyzing ${pageLabel}: Checking booking systems and e-commerce functionality...`, url);
        ecommerceAnalysis = await analyzeEcommercePage(url, pageType, security, startUrl);
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
  updateProgress(scanId, 'finalizing', maxPagesToScan + 1, maxPagesToScan, 'Finishing analysis and compiling final report...');
  const aggregateScores = calculateAggregateScores(pageResults);
  
  // Step 4: Generate ecommerce summary if applicable
  const ecommerceSummary = generateEcommerceSummary(pageResults, crawlResult.ecommercePages);
  
  // Step 5: Generate site-wide summary
  const siteWideSummary = generateSiteWideSummary(pageResults);
  
  // Clear progress when done
  if ((global as any).scanProgress) {
    delete (global as any).scanProgress[scanId];
  }
  
  return {
    primaryUrl: startUrl,
    pagesAnalyzed: pageResults.length,
    pageResults,
    aggregateScores,
    ecommerceSummary,
    siteWideSummary
  };
}

async function detectBookingSystem(url: string, homepageUrl?: string): Promise<BookingSystemDetails> {
  const details: BookingSystemDetails = {
    thirdParties: [],
    features: [],
    confidence: 'low'
  };
  
  console.log(`Starting waterfall booking system detection for: ${url}`);
  
  // Method 1: URL/Domain Analysis (High Confidence, Low Cost)
  console.log('Method 1: URL/Domain Analysis');
  const domainResult = await analyzeBookingDomain(url, homepageUrl);
  if (domainResult.provider) {
    return { ...details, ...domainResult, detectionMethod: 'domain', confidence: 'high' };
  }
  
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
    
    const content = await page.content();
    
    // Method 2: Footer/Branding Analysis (High Confidence, Low Cost)
    console.log('Method 2: Footer/Branding Analysis');
    const footerResult = await analyzeFooterBranding(page, content);
    if (footerResult.provider) {
      return { ...details, ...footerResult, detectionMethod: 'footer', confidence: 'high' };
    }
    
    // Method 3: Source Code Fingerprinting (Medium/High Confidence, Medium Cost)
    console.log('Method 3: Source Code Fingerprinting');
    const fingerprintResult = await analyzeSourceFingerprints(page, content);
    if (fingerprintResult.provider) {
      return { ...details, ...fingerprintResult, detectionMethod: 'fingerprint', confidence: fingerprintResult.confidence || 'medium' };
    }
    
    // Method 4: Network Request Analysis (Highest Confidence, High Cost)
    console.log('Method 4: Network Request Analysis');
    const networkResult = await analyzeNetworkRequests(page);
    if (networkResult.provider) {
      return { ...details, ...networkResult, detectionMethod: 'network', confidence: 'high' };
    }
    
    // Fallback: Feature-based detection
    console.log('Fallback: Feature-based detection');
    await detectBookingFeatures(page, content, details);
    await detectThirdPartyServices(page, content, details);
    
    if (details.features.length > 3) {
      details.platform = 'Custom Built';
      details.confidence = 'medium';
    }
    
    details.detectionMethod = 'fallback';
    
  } catch (error) {
    console.error('Error in booking system detection:', error);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
  }
  
  console.log(`Detection complete. Result: ${details.provider || details.platform || 'Unknown'} (${details.confidence})`);
  return details;
}

// Method 1: URL/Domain Analysis
async function analyzeBookingDomain(bookingUrl: string, homepageUrl?: string): Promise<Partial<BookingSystemDetails>> {
  try {
    const bookingDomain = new URL(bookingUrl);
    const homepageDomain = homepageUrl ? new URL(homepageUrl) : null;
    
    // Known booking engine domains
    const knownDomains = [
      { pattern: /retailint-tickets\.com/i, name: 'Retail Integration' },
      { pattern: /p3hotels\.com/i, name: 'P3 Hotel Software' },
      { pattern: /bookassist\.com/i, name: 'BookAssist' },
      { pattern: /cloudbeds\.com/i, name: 'Cloudbeds' },
      { pattern: /booking\.com/i, name: 'Booking.com' },
      { pattern: /expedia\.com/i, name: 'Expedia' },
      { pattern: /vivaticket\.com/i, name: 'Vivaticket' },
      { pattern: /opentable\.com/i, name: 'OpenTable' },
      { pattern: /resy\.com/i, name: 'Resy' },
      { pattern: /fareharbor\.com/i, name: 'FareHarbor' },
      { pattern: /checkfront\.com/i, name: 'Checkfront' },
      { pattern: /rezdy\.com/i, name: 'Rezdy' },
      { pattern: /trekksoft\.com/i, name: 'TrekkSoft' },
      { pattern: /guestline\.com/i, name: 'Guestline' },
      { pattern: /siteminder\.com/i, name: 'SiteMinder' }
    ];
    
    // Check if booking page is on a different, recognizable domain
    for (const domain of knownDomains) {
      if (domain.pattern.test(bookingDomain.hostname)) {
        console.log(`Domain match found: ${domain.name} (${bookingDomain.hostname})`);
        return { provider: domain.name };
      }
    }
    
    // Check for subdomain patterns
    if (homepageDomain && bookingDomain.hostname !== homepageDomain.hostname) {
      const subdomainPatterns = [
        { pattern: /^book\.|^booking\.|^reservations?\.|^tickets?\./i, inference: 'Third-party booking system' },
        { pattern: /^shop\.|^store\./i, inference: 'E-commerce platform' }
      ];
      
      for (const pattern of subdomainPatterns) {
        if (pattern.pattern.test(bookingDomain.hostname)) {
          console.log(`Subdomain pattern detected: ${pattern.inference}`);
          return { platform: pattern.inference };
        }
      }
    }
    
  } catch (error) {
    console.error('Domain analysis error:', error);
  }
  
  return {};
}

// Method 2: Footer/Branding Analysis  
async function analyzeFooterBranding(page: any, content: string): Promise<Partial<BookingSystemDetails>> {
  try {
    // Look for footer branding
    const footerBranding = await page.evaluate(() => {
      const footers = document.querySelectorAll('footer, .footer, #footer');
      const brandingPatterns = [
        /booking\s+engine\s+by\s+([^<\n]+)/i,
        /powered\s+by\s+([^<\n]+)/i,
        /hotel\s+software\s+by\s+([^<\n]+)/i,
        /reservations\s+by\s+([^<\n]+)/i
      ];
      
      for (const footer of Array.from(footers)) {
        const footerText = footer.textContent || '';
        const footerHtml = footer.innerHTML || '';
        
        for (const pattern of brandingPatterns) {
          const textMatch = footerText.match(pattern);
          const htmlMatch = footerHtml.match(pattern);
          
          if (textMatch) return textMatch[1].trim();
          if (htmlMatch) return htmlMatch[1].trim();
        }
        
        // Check for specific links
        const links = footer.querySelectorAll('a[href]');
        for (const link of links) {
          const href = link.getAttribute('href') || '';
          const text = link.textContent || '';
          
          if (href.includes('p3hotels.com') && text.toLowerCase().includes('booking engine')) {
            return 'P3 Hotel Software';
          }
          if (href.includes('bookassist.com')) return 'BookAssist';
          if (href.includes('vivaticket.com')) return 'Vivaticket';
        }
      }
      
      return null;
    });
    
    if (footerBranding) {
      console.log(`Footer branding found: ${footerBranding}`);
      return { provider: footerBranding };
    }
    
  } catch (error) {
    console.error('Footer analysis error:', error);
  }
  
  return {};
}

// Method 3: Source Code Fingerprinting
async function analyzeSourceFingerprints(page: any, content: string): Promise<Partial<BookingSystemDetails>> {
  try {
    // A) Branded Code Artifacts
    const brandedArtifacts = [
      { pattern: /p3core\.js|p3\/|\/p3\//i, name: 'P3 Hotel Software', confidence: 'high' as const },
      { pattern: /bookassist|book-assist/i, name: 'BookAssist', confidence: 'high' as const },
      { pattern: /vivaticket|bestUnionBody/i, name: 'Vivaticket', confidence: 'high' as const },
      { pattern: /retailint|retail-integration/i, name: 'Retail Integration', confidence: 'high' as const },
      { pattern: /cloudbeds/i, name: 'Cloudbeds', confidence: 'high' as const },
      { pattern: /trekksoft/i, name: 'TrekkSoft', confidence: 'high' as const }
    ];
    
    for (const artifact of brandedArtifacts) {
      if (artifact.pattern.test(content)) {
        console.log(`Branded artifact found: ${artifact.name}`);
        return { provider: artifact.name, confidence: artifact.confidence };
      }
    }
    
    // B) Technology Stack Fingerprints
    const techStack = await page.evaluate(() => {
      const indicators = {
        aspNet: false,
        angular: false,
        react: false,
        vue: false
      };
      
      // ASP.NET detection
      if (document.querySelector('form#aspnetForm') || 
          document.querySelector('input[name="__VIEWSTATE"]') ||
          document.body && document.body.innerHTML.includes('WebResource.axd')) {
        indicators.aspNet = true;
      }
      
      // Angular detection
      if (document.querySelector('app-root') || (window as any).angular) {
        indicators.angular = true;
      }
      
      // React detection
      if (document.querySelector('#root') && document.querySelector('[data-reactroot]')) {
        indicators.react = true;
      }
      
      // Vue detection
      if (document.querySelector('#app') || (window as any).Vue) {
        indicators.vue = true;
      }
      
      return indicators;
    });
    
    // Infer providers based on tech stack
    if (techStack.aspNet) {
      // ASP.NET often used by enterprise systems like Vivaticket
      if (content.includes('ctl00$')) {
        console.log('ASP.NET Web Forms detected - likely enterprise booking system');
        return { platform: 'Enterprise ASP.NET Booking System', confidence: 'medium' };
      }
    }
    
    if (techStack.angular) {
      // Angular often used by modern providers like Retail Integration
      console.log('Angular framework detected');
      return { platform: 'Modern Angular-based Booking System', confidence: 'medium' };
    }
    
  } catch (error) {
    console.error('Fingerprint analysis error:', error);
  }
  
  return {};
}

// Method 4: Network Request Analysis
async function analyzeNetworkRequests(page: any): Promise<Partial<BookingSystemDetails>> {
  try {
    const apiEndpoints: string[] = [];
    
    // Set up request monitoring
    page.on('request', (request: any) => {
      const url = request.url();
      if (url.includes('api') || url.includes('ajax') || url.includes('booking') || url.includes('availability')) {
        apiEndpoints.push(url);
      }
    });
    
    // Try to trigger some network activity
    await page.evaluate(() => {
      // Try clicking date pickers or other interactive elements
      const dateInputs = document.querySelectorAll('input[type="date"], .datepicker, .calendar');
      if (dateInputs.length > 0) {
        (dateInputs[0] as any).click?.();
      }
    });
    
    // Wait a bit for any async requests
    await page.waitForTimeout(2000);
    
    // Analyze collected endpoints
    for (const endpoint of apiEndpoints) {
      try {
        const domain = new URL(endpoint).hostname;
        
        const apiProviders = [
          { pattern: /api\.bookassist\.com/i, name: 'BookAssist' },
          { pattern: /api\.cloudbeds\.com/i, name: 'Cloudbeds' },
          { pattern: /api\.vivaticket\.com/i, name: 'Vivaticket' },
          { pattern: /api\.p3hotels\.com/i, name: 'P3 Hotel Software' },
          { pattern: /retailint.*api/i, name: 'Retail Integration' }
        ];
        
        for (const provider of apiProviders) {
          if (provider.pattern.test(domain)) {
            console.log(`API endpoint detected: ${provider.name} (${domain})`);
            return { provider: provider.name };
          }
        }
      } catch (e) {
        // Invalid URL, skip
      }
    }
    
  } catch (error) {
    console.error('Network analysis error:', error);
  }
  
  return {};
}

// Helper functions for fallback detection
async function detectBookingFeatures(page: any, content: string, details: BookingSystemDetails) {
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
    if (item.pattern.test(content)) {
      details.features.push(item.feature);
    }
  }
}

async function detectThirdPartyServices(page: any, content: string, details: BookingSystemDetails) {
  const services = [
    { pattern: /google.*analytics/i, name: 'Google Analytics' },
    { pattern: /stripe/i, name: 'Stripe Payments' },
    { pattern: /paypal/i, name: 'PayPal' },
    { pattern: /square/i, name: 'Square Payments' },
    { pattern: /adyen/i, name: 'Adyen' },
    { pattern: /braintree/i, name: 'Braintree' },
    { pattern: /trustpilot/i, name: 'Trustpilot' },
    { pattern: /tripadvisor/i, name: 'TripAdvisor' }
  ];
  
  for (const service of services) {
    if (service.pattern.test(content)) {
      details.thirdParties.push(service.name);
    }
  }
}

async function analyzeEcommercePage(
  url: string, 
  pageType: string,
  securityData: any,
  homepageUrl?: string
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
      analysis.bookingSystemDetails = await detectBookingSystem(url, homepageUrl);
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
    if (!ecommerceResults.some(r => (r.ecommerceAnalysis?.trustSignals?.length || 0) > 2)) {
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