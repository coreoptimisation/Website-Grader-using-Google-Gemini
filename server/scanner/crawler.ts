import { chromium, Browser, Page } from "playwright";
import robotsParser from "robots-parser";
import * as xml2js from "xml2js";

export interface CrawlResult {
  urls: string[];
  sitemap?: string[];
  ecommercePages: {
    cart?: string;
    checkout?: string;
    products?: string[];
    booking?: string;
    payment?: string;
    account?: string;
  };
  discoveredPages: {
    url: string;
    type: "homepage" | "product" | "cart" | "checkout" | "booking" | "contact" | "about" | "other";
    priority: number;
  }[];
}

export class WebCrawler {
  private browser: Browser | null = null;
  private visited = new Set<string>();
  private maxPages = 4; // Focus on 4 critical pages: homepage, shop, booking, detail
  private domain: string = "";
  
  async crawl(startUrl: string): Promise<CrawlResult> {
    try {
      const url = new URL(startUrl);
      this.domain = url.origin;
      
      // Launch browser
      this.browser = await chromium.launch({ 
        headless: true,
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium'
      });
      
      const result: CrawlResult = {
        urls: [],
        ecommercePages: {},
        discoveredPages: []
      };
      
      // Check robots.txt
      const robotsAllowed = await this.checkRobotsTxt(url.origin);
      if (!robotsAllowed) {
        console.log("Crawling disallowed by robots.txt");
      }
      
      // Try to get sitemap
      const sitemapUrls = await this.parseSitemap(url.origin);
      if (sitemapUrls.length > 0) {
        result.sitemap = sitemapUrls;
        result.urls = this.prioritizeUrls(sitemapUrls).slice(0, this.maxPages);
      }
      
      // Crawl the start page and discover links
      const page = await this.browser.newPage();
      await page.goto(startUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      
      // Discover all links on the page
      const links = await this.discoverLinks(page, startUrl);
      
      // Analyze and categorize pages
      result.discoveredPages = this.categorizePages(links);
      
      // Identify ecommerce/booking pages
      result.ecommercePages = this.identifyEcommercePages(result.discoveredPages);
      
      // If no sitemap, use discovered links
      if (result.urls.length === 0) {
        result.urls = result.discoveredPages.map(p => p.url);
      }
      
      // Always include the homepage
      if (!result.urls.includes(startUrl)) {
        result.urls.unshift(startUrl);
      }
      
      await page.close();
      
      return result;
      
    } catch (error) {
      console.error("Crawling error:", error);
      return {
        urls: [startUrl],
        ecommercePages: {},
        discoveredPages: [{ url: startUrl, type: "homepage", priority: 10 }]
      };
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
  
  private async checkRobotsTxt(origin: string): Promise<boolean> {
    try {
      const response = await fetch(`${origin}/robots.txt`);
      if (!response.ok) return true; // If no robots.txt, assume allowed
      
      const robotsTxt = await response.text();
      const robots = robotsParser(`${origin}/robots.txt`, robotsTxt);
      
      // Check if our user agent is allowed
      return robots.isAllowed(`${origin}/`, "Replit-Website-Grader") !== false;
    } catch {
      return true; // On error, assume allowed
    }
  }
  
  private async parseSitemap(origin: string): Promise<string[]> {
    const urls: string[] = [];
    
    try {
      // Try common sitemap locations
      const sitemapUrls = [
        `${origin}/sitemap.xml`,
        `${origin}/sitemap_index.xml`,
        `${origin}/sitemap.xml.gz`
      ];
      
      for (const sitemapUrl of sitemapUrls) {
        try {
          const response = await fetch(sitemapUrl);
          if (!response.ok) continue;
          
          const xml = await response.text();
          const parser = new xml2js.Parser();
          const result = await parser.parseStringPromise(xml);
          
          // Parse sitemap or sitemap index
          if (result.urlset && result.urlset.url) {
            for (const url of result.urlset.url) {
              if (url.loc && url.loc[0]) {
                urls.push(url.loc[0]);
              }
            }
          } else if (result.sitemapindex && result.sitemapindex.sitemap) {
            // Handle sitemap index
            for (const sitemap of result.sitemapindex.sitemap) {
              if (sitemap.loc && sitemap.loc[0]) {
                // Recursively parse child sitemaps (limited)
                const childUrls = await this.parseSitemap(sitemap.loc[0]);
                urls.push(...childUrls.slice(0, 20)); // Limit child sitemap URLs
              }
            }
          }
          
          if (urls.length > 0) break;
        } catch (error) {
          console.log(`Failed to parse sitemap at ${sitemapUrl}`);
        }
      }
    } catch (error) {
      console.error("Sitemap parsing error:", error);
    }
    
    return urls;
  }
  
  private async discoverLinks(page: Page, baseUrl: string): Promise<string[]> {
    try {
      const links = await page.evaluate(() => {
        const anchors = document.querySelectorAll('a[href]');
        return Array.from(anchors)
          .map(a => (a as HTMLAnchorElement).href)
          .filter(href => href && !href.startsWith('#') && !href.startsWith('javascript:'));
      });
      
      // Include same domain + potential external booking/ecommerce domains
      const url = new URL(baseUrl);
      return links.filter(link => {
        try {
          const linkUrl = new URL(link);
          // Always allow same domain
          if (linkUrl.origin === url.origin) return true;
          
          // Allow external domains ONLY for booking/commerce platforms (not social media)
          const hostname = linkUrl.hostname.toLowerCase();
          
          // Exclude social media and irrelevant domains
          const excludePatterns = ['facebook.com', 'twitter.com', 'instagram.com', 'youtube.com', 'linkedin.com', 'tiktok.com'];
          if (excludePatterns.some(pattern => hostname.includes(pattern))) {
            return false;
          }
          
          // Only allow external domains that are clearly booking/ecommerce platforms
          const commercePatterns = [
            'book', 'reservation', 'reserve', 'ticket', 'appointment', 'booking',
            'shop', 'store', 'cart', 'checkout', 'buy', 'order', 'secure', 'payment'
          ];
          
          return commercePatterns.some(pattern => hostname.includes(pattern));
        } catch {
          return false;
        }
      });
    } catch (error) {
      console.error("Link discovery error:", error);
      return [];
    }
  }
  
  private categorizePages(urls: string[]): CrawlResult['discoveredPages'] {
    const pages = urls.map(url => {
      const lower = url.toLowerCase();
      const path = lower.split('/').filter(Boolean);
      
      // 1. Homepage - highest priority
      const cleanDomain = this.domain.replace('https://', '').replace('http://', '').replace('www.', '');
      const cleanUrl = url.replace('https://', '').replace('http://', '').replace('www.', '');
      
      if (cleanUrl === cleanDomain || cleanUrl === cleanDomain + '/' || 
          (url.endsWith('/') && path.length <= 1 && url.includes(cleanDomain))) {
        return { url, type: "homepage" as const, priority: 10 };
      }
      
      // 2a. Ecommerce Pages - shopping, purchasing, products
      if (lower.includes('/shop') || lower.includes('/store') || lower.includes('/buy') ||
          lower.includes('/products') || lower.includes('/catalog') || lower.includes('/merchandise') ||
          lower.includes('/gifts') || lower.includes('/retail')) {
        return { url, type: "product" as const, priority: 9 };
      }
      
      // 2b. Booking/Reservation Pages - any appointment or reservation system
      if (lower.includes('/book') || lower.includes('/reservation') || lower.includes('/reserve') ||
          lower.includes('/appointment') || lower.includes('/booking') || lower.includes('/schedule') ||
          lower.includes('/tickets') || lower.includes('/register') || lower.includes('/enroll') ||
          // External domain patterns for booking systems
          this.isExternalBookingDomain(url)) {
        return { url, type: "booking" as const, priority: 9 };
      }
      
      // 2c. Ecommerce Checkout - shopping cart/payment systems
      if (lower.includes('/checkout') || lower.includes('/payment') || lower.includes('/pay') ||
          lower.includes('/cart') || lower.includes('/basket') || lower.includes('/bag')) {
        return { url, type: "checkout" as const, priority: 8 };
      }
      
      // 3. Main Offerings Page - business service/product catalog pages
      if (lower.includes('/services') || lower.includes('/offerings') || lower.includes('/packages') ||
          lower.includes('/menu') || lower.includes('/treatments') || lower.includes('/classes') ||
          lower.includes('/programs') || lower.includes('/courses') || lower.includes('/plans') ||
          lower.includes('/categories') || lower.includes('/collection') || lower.includes('/gallery') ||
          // Industry-specific patterns
          lower.includes('/rooms') || lower.includes('/suites') || lower.includes('/accommodations') ||
          lower.includes('/tours') || lower.includes('/experiences') || lower.includes('/activities') ||
          lower.includes('/events') || lower.includes('/venues') || lower.includes('/facilities')) {
        return { url, type: "product" as const, priority: 7 };
      }
      
      // 4. Specific Detail Page - individual product/service pages
      // Look for URLs that seem to be specific items (longer paths, IDs, specific names)
      if ((path.length >= 3 && !lower.includes('/category') && !lower.includes('/search')) ||
          lower.includes('/room/') || lower.includes('/tour/') || lower.includes('/ticket/') ||
          lower.includes('/suite/') || lower.includes('/package/') || lower.includes('/experience/') ||
          /\/[a-z]+-[a-z]+-/.test(lower) || // hyphenated names like "deluxe-queen-room"
          /\/\d+/.test(lower)) { // URLs with numbers like product IDs
        return { url, type: "product" as const, priority: 7 };
      }
      
      // Lower priority pages
      if (lower.includes('/contact') || lower.includes('/support')) {
        return { url, type: "contact" as const, priority: 3 };
      }
      if (lower.includes('/about')) {
        return { url, type: "about" as const, priority: 3 };
      }
      
      return { url, type: "other" as const, priority: 1 };
    });
    
    // Filter and prioritize to get exactly 4 critical pages (homepage, shop, booking, detail)
    const prioritized = this.selectCriticalPages(pages);
    return prioritized;
  }
  
  private identifyEcommercePages(pages: CrawlResult['discoveredPages']): CrawlResult['ecommercePages'] {
    const ecommerce: CrawlResult['ecommercePages'] = {};
    
    for (const page of pages) {
      switch (page.type) {
        case "cart":
          if (!ecommerce.cart) ecommerce.cart = page.url;
          break;
        case "checkout":
          if (!ecommerce.checkout) ecommerce.checkout = page.url;
          break;
        case "booking":
          if (!ecommerce.booking) ecommerce.booking = page.url;
          break;
        case "product":
          if (!ecommerce.products) ecommerce.products = [];
          if (ecommerce.products.length < 3) {
            ecommerce.products.push(page.url);
          }
          break;
      }
      
      // Also check for account/payment pages
      const lower = page.url.toLowerCase();
      if ((lower.includes('/account') || lower.includes('/login')) && !ecommerce.account) {
        ecommerce.account = page.url;
      }
      if (lower.includes('/payment') && !ecommerce.payment) {
        ecommerce.payment = page.url;
      }
    }
    
    return ecommerce;
  }
  
  private selectCriticalPages(pages: CrawlResult['discoveredPages']): CrawlResult['discoveredPages'] {
    const result: CrawlResult['discoveredPages'] = [];
    
    // 1. Homepage - always essential (non-negotiable)
    const homepage = pages.find(p => p.type === "homepage");
    if (homepage) result.push(homepage);
    
    // 2. Main Offerings/Shop Page - essential for product discovery
    const shopPages = pages.filter(p => p.type === "product" && p.priority === 9);
    if (shopPages.length > 0) result.push(shopPages[0]);
    
    // 3. Booking/Checkout Page - essential for conversion (exclude social media)
    const validBookingPages = pages.filter(p => {
      if (p.type !== "booking") return false;
      // Exclude social media domains
      const url = p.url.toLowerCase();
      return !url.includes('facebook.com') && !url.includes('twitter.com') && 
             !url.includes('instagram.com') && !url.includes('youtube.com');
    }).sort((a, b) => b.priority - a.priority);
    if (validBookingPages.length > 0) result.push(validBookingPages[0]);
    
    // 4. High-Value Content/Trust-Building Page - supports purchase decision
    const trustBuildingPages = pages.filter(p => {
      if (result.some(r => r.url === p.url)) return false;
      const url = p.url.toLowerCase();
      return url.includes('/about') || url.includes('/contact') || url.includes('/location') ||
             url.includes('/faq') || url.includes('/policy') || url.includes('/getting-here') ||
             url.includes('/parking') || url.includes('/directions');
    }).sort((a, b) => b.priority - a.priority);
    
    if (trustBuildingPages.length > 0 && result.length < 4) {
      result.push(trustBuildingPages[0]);
    }
    
    // 5. Fill remaining slots with highest priority remaining pages (exclude social media)
    while (result.length < 4) {
      const remainingPages = pages.filter(p => {
        if (result.some(r => r.url === p.url)) return false;
        const url = p.url.toLowerCase();
        return !url.includes('facebook.com') && !url.includes('twitter.com') && 
               !url.includes('instagram.com') && !url.includes('youtube.com');
      }).sort((a, b) => b.priority - a.priority);
      
      if (remainingPages.length > 0) {
        result.push(remainingPages[0]);
      } else {
        break;
      }
    }
    
    return result.slice(0, 4); // Exactly 4 pages
  }
  
  private isExternalBookingDomain(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      const mainDomain = this.domain.replace('https://', '').replace('http://', '');
      
      // Skip if same domain
      if (hostname.includes(mainDomain)) return false;
      
      // Check for booking/reservation patterns in external domains
      const bookingPatterns = ['book', 'reservation', 'reserve', 'ticket', 'appointment', 'schedule'];
      return bookingPatterns.some(pattern => hostname.includes(pattern));
    } catch {
      return false;
    }
  }
}