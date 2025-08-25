import { chromium } from "playwright";
import * as xml2js from "xml2js";

export interface AgentReadinessResult {
  score: number;
  robots: {
    found: boolean;
    valid: boolean;
    content?: string;
    sitemaps: string[];
  };
  sitemaps: {
    found: boolean;
    valid: boolean;
    count: number;
    urls: string[];
  };
  structuredData: {
    jsonLd: any[];
    microdata: any[];
    total: number;
    types: string[];
    issues: string[];
  };
  canonical: {
    present: boolean;
    valid: boolean;
    url?: string;
  };
  hreflang: {
    present: boolean;
    valid: boolean;
    languages: string[];
  };
  meta: {
    title: boolean;
    description: boolean;
    ogTags: number;
    twitterTags: number;
  };
}

export async function runAgentReadinessAudit(url: string): Promise<AgentReadinessResult> {
  const browser = await chromium.launch({ 
    headless: true,
    executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium'
  });
  const baseUrl = new URL(url).origin;
  
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    
    // Check robots.txt
    const robotsResult = await checkRobotsTxt(baseUrl);
    
    // Check sitemaps
    const sitemapsResult = await checkSitemaps(baseUrl, robotsResult.robots.sitemaps);
    
    // Extract structured data
    const structuredDataResult = await extractStructuredData(page);
    
    // Check canonical and hreflang
    const canonicalResult = await checkCanonical(page);
    const hreflangResult = await checkHreflang(page);
    
    // Check meta tags
    const metaResult = await checkMetaTags(page);
    
    // Calculate overall score
    let score = 0;
    score += robotsResult.robots.found ? 15 : 0;
    score += robotsResult.robots.valid ? 10 : 0;
    score += sitemapsResult.sitemaps.found ? 15 : 0;
    score += Math.min(structuredDataResult.structuredData.total * 5, 20);
    score += canonicalResult.canonical.present ? 10 : 0;
    score += hreflangResult.hreflang.present ? 5 : 0;
    score += metaResult.meta.title ? 10 : 0;
    score += metaResult.meta.description ? 10 : 0;
    score += Math.min(metaResult.meta.ogTags * 2, 10);
    
    score = Math.min(100, score);
    
    return {
      score,
      ...robotsResult,
      ...sitemapsResult,
      ...structuredDataResult,
      ...canonicalResult,
      ...hreflangResult,
      ...metaResult
    };
    
  } finally {
    await browser.close();
  }
}

async function checkRobotsTxt(baseUrl: string) {
  try {
    const robotsUrl = `${baseUrl}/robots.txt`;
    const response = await fetch(robotsUrl);
    
    if (!response.ok) {
      return {
        robots: {
          found: false,
          valid: false,
          sitemaps: []
        }
      };
    }
    
    const content = await response.text();
    const sitemaps = content.match(/Sitemap:\s*(.*)/gi)?.map(line => 
      line.replace(/Sitemap:\s*/i, '').trim()
    ) || [];
    
    return {
      robots: {
        found: true,
        valid: true,
        content,
        sitemaps
      }
    };
  } catch (error) {
    return {
      robots: {
        found: false,
        valid: false,
        sitemaps: []
      }
    };
  }
}

async function checkSitemaps(baseUrl: string, robotsSitemaps: string[]) {
  const sitemapUrls = [...robotsSitemaps, `${baseUrl}/sitemap.xml`];
  let foundSitemaps = 0;
  const urls: string[] = [];
  const parser = new xml2js.Parser();
  
  for (const sitemapUrl of sitemapUrls) {
    try {
      const response = await fetch(sitemapUrl);
      if (response.ok) {
        foundSitemaps++;
        const content = await response.text();
        try {
          const result = await parser.parseStringPromise(content);
          // Handle both sitemap index and urlset formats
          if (result.sitemapindex?.sitemap) {
            // This is a sitemap index, fetch child sitemaps
            for (const sitemap of result.sitemapindex.sitemap) {
              if (sitemap.loc?.[0]) {
                const childResponse = await fetch(sitemap.loc[0]);
                if (childResponse.ok) {
                  const childContent = await childResponse.text();
                  const childResult = await parser.parseStringPromise(childContent);
                  if (childResult.urlset?.url) {
                    urls.push(...childResult.urlset.url.map((u: any) => u.loc?.[0]).filter(Boolean));
                  }
                }
              }
            }
          } else if (result.urlset?.url) {
            // This is a regular urlset sitemap
            urls.push(...result.urlset.url.map((u: any) => u.loc?.[0]).filter(Boolean));
          }
        } catch (parseError) {
          // Fallback to regex if XML parsing fails
          const urlMatches = content.match(/<loc>(.*?)<\/loc>/g);
          if (urlMatches) {
            urls.push(...urlMatches.map(match => match.replace(/<\/?loc>/g, '')));
          }
        }
      }
    } catch (error) {
      // Ignore sitemap fetch errors
    }
  }
  
  return {
    sitemaps: {
      found: foundSitemaps > 0,
      valid: foundSitemaps > 0,
      count: foundSitemaps,
      urls: Array.from(new Set(urls))
    }
  };
}

async function extractStructuredData(page: any) {
  const structuredData = await page.evaluate(() => {
    const jsonLdElements = document.querySelectorAll('script[type="application/ld+json"]');
    const jsonLd: any[] = [];
    
    jsonLdElements.forEach(element => {
      try {
        const data = JSON.parse(element.textContent || '');
        jsonLd.push(data);
      } catch (e) {
        // Invalid JSON-LD
      }
    });
    
    // Basic microdata extraction
    const microdataElements = document.querySelectorAll('[itemscope]');
    const microdata = Array.from(microdataElements).map(element => ({
      type: element.getAttribute('itemtype'),
      properties: {}
    }));
    
    return { jsonLd, microdata };
  });
  
  const types = structuredData.jsonLd.map((item: any) => item['@type']).filter(Boolean).flat();
  const issues: string[] = [];
  
  // Check for essential schema types
  const hasOrganization = types.some((t: string) => t === 'Organization' || t === 'LocalBusiness');
  const hasWebSite = types.some((t: string) => t === 'WebSite');
  const hasWebPage = types.some((t: string) => t?.includes('Page'));
  
  if (!hasOrganization) {
    issues.push('Missing Organization or LocalBusiness schema');
  }
  if (!hasWebSite) {
    issues.push('Missing WebSite schema');
  }
  if (!hasWebPage) {
    issues.push('Missing WebPage schema');
  }
  
  // Validate JSON-LD structure
  structuredData.jsonLd.forEach((item: any) => {
    if (!item['@context']) {
      issues.push('JSON-LD missing @context');
    }
    if (!item['@type']) {
      issues.push('JSON-LD missing @type');
    }
  });
  
  return {
    structuredData: {
      jsonLd: structuredData.jsonLd,
      microdata: structuredData.microdata,
      total: structuredData.jsonLd.length + structuredData.microdata.length,
      types,
      issues
    }
  };
}

async function checkCanonical(page: any) {
  const canonical = await page.evaluate(() => {
    const canonicalElement = document.querySelector('link[rel="canonical"]');
    return {
      present: !!canonicalElement,
      valid: !!canonicalElement && !!canonicalElement.getAttribute('href'),
      url: canonicalElement?.getAttribute('href') || undefined
    };
  });
  
  return { canonical };
}

async function checkHreflang(page: any) {
  const hreflang = await page.evaluate(() => {
    const hreflangElements = document.querySelectorAll('link[rel="alternate"][hreflang]');
    const languages = Array.from(hreflangElements).map(element => 
      element.getAttribute('hreflang')
    ).filter(Boolean);
    
    return {
      present: hreflangElements.length > 0,
      valid: hreflangElements.length > 0,
      languages
    };
  });
  
  return { hreflang };
}

async function checkMetaTags(page: any) {
  const meta = await page.evaluate(() => {
    const title = !!document.querySelector('title')?.textContent?.trim();
    const description = !!document.querySelector('meta[name="description"]')?.getAttribute('content')?.trim();
    
    const ogTags = document.querySelectorAll('meta[property^="og:"]').length;
    const twitterTags = document.querySelectorAll('meta[name^="twitter:"]').length;
    
    return {
      title,
      description,
      ogTags,
      twitterTags
    };
  });
  
  return { meta };
}
