import { chromium } from "playwright";
import { analyzeSSLCertificate, evaluateSSLSecurity } from "./ssl";

export interface SecurityResult {
  score: number;
  headers: {
    present: string[];
    missing: string[];
    details: { [key: string]: any };
  };
  policies: {
    privacyPolicy: boolean;
    termsOfService: boolean;
    contactPage: boolean;
  };
  https: boolean;
  certificates: any;
  vulnerabilities: string[];
}

const SECURITY_HEADERS = [
  'content-security-policy',
  'strict-transport-security',
  'x-content-type-options',
  'x-frame-options',
  'x-xss-protection',
  'referrer-policy',
  'permissions-policy',
  'expect-ct'
];

const POLICY_PATTERNS = {
  privacy: ['/privacy', '/privacy-policy', '/datenschutz'],
  terms: ['/terms', '/terms-of-service', '/legal'],
  contact: ['/contact', '/contact-us', '/about/contact']
};

export async function runSecurityAudit(url: string): Promise<SecurityResult> {
  const browser = await chromium.launch({ 
    headless: true,
    executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium'
  });
  
  try {
    const page = await browser.newPage();
    
    // Navigate and capture response headers
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    
    if (!response) {
      throw new Error("Failed to load page");
    }
    
    const headers = response.headers();
    const isHttps = url.startsWith('https://');
    
    // Check security headers
    const presentHeaders: string[] = [];
    const missingHeaders: string[] = [];
    const headerDetails: { [key: string]: any } = {};
    
    SECURITY_HEADERS.forEach(header => {
      const value = headers[header];
      if (value) {
        presentHeaders.push(header);
        headerDetails[header] = value;
      } else {
        missingHeaders.push(header);
      }
    });
    
    // Check for policy pages
    const policies = {
      privacyPolicy: false,
      termsOfService: false,
      contactPage: false
    };
    
    try {
      const pageContent = await page.content();
      const links = await page.$$eval('a[href]', links => 
        links.map(link => link.getAttribute('href')).filter(href => href)
      );
      
      // Check for privacy policy
      policies.privacyPolicy = POLICY_PATTERNS.privacy.some(pattern => 
        links.some(link => link?.toLowerCase().includes(pattern))
      );
      
      // Check for terms of service
      policies.termsOfService = POLICY_PATTERNS.terms.some(pattern => 
        links.some(link => link?.toLowerCase().includes(pattern))
      );
      
      // Check for contact page
      policies.contactPage = POLICY_PATTERNS.contact.some(pattern => 
        links.some(link => link?.toLowerCase().includes(pattern))
      );
      
    } catch (error) {
      console.log('Error checking policy pages:', error);
    }
    
    // Calculate security score
    let score = 0;
    score += presentHeaders.length * 10; // 10 points per security header
    score += isHttps ? 20 : 0; // 20 points for HTTPS
    score += policies.privacyPolicy ? 10 : 0; // 10 points for privacy policy
    score += policies.termsOfService ? 5 : 0; // 5 points for terms
    score += policies.contactPage ? 5 : 0; // 5 points for contact page
    
    score = Math.min(100, score); // Cap at 100
    
    // Analyze SSL certificate
    const sslCertificate = await analyzeSSLCertificate(url);
    const sslEvaluation = evaluateSSLSecurity(sslCertificate);
    
    // Check for common vulnerabilities (basic)
    const vulnerabilities: string[] = [];
    
    if (!isHttps) {
      vulnerabilities.push("No HTTPS encryption");
    }
    
    if (!headers['content-security-policy']) {
      vulnerabilities.push("Missing Content Security Policy");
    }
    
    if (!headers['strict-transport-security']) {
      vulnerabilities.push("Missing HTTP Strict Transport Security");
    }
    
    if (!headers['x-content-type-options']) {
      vulnerabilities.push("Missing X-Content-Type-Options header");
    }
    
    // Add SSL-related vulnerabilities
    if (sslEvaluation.issues.length > 0) {
      vulnerabilities.push(...sslEvaluation.issues);
    }
    
    // Adjust score based on SSL evaluation
    const baseScore = score;
    const sslWeight = 0.3; // SSL represents 30% of security score
    const finalScore = Math.round(baseScore * (1 - sslWeight) + sslEvaluation.score * sslWeight);
    
    return {
      score: finalScore,
      headers: {
        present: presentHeaders,
        missing: missingHeaders,
        details: headerDetails
      },
      policies,
      https: isHttps,
      certificates: sslCertificate,
      vulnerabilities
    };
    
  } finally {
    await browser.close();
  }
}
