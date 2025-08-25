import { Browser, chromium, Page } from 'playwright';
import puppeteer from 'puppeteer';
import { existsSync } from 'fs';

/**
 * Browser pool to reuse browser instances and prevent resource exhaustion
 * This is critical for multi-page scans which would otherwise launch 20+ browsers
 */
class BrowserPool {
  private playwrightBrowser: Browser | null = null;
  private puppeteerBrowser: any = null;
  private activePages = 0;
  private maxPages = 10; // Limit concurrent pages
  
  /**
   * Get or create a shared Playwright browser instance
   */
  async getPlaywrightBrowser(): Promise<Browser> {
    if (!this.playwrightBrowser || !this.playwrightBrowser.isConnected()) {
      console.log('Launching shared Playwright browser...');
      
      // Optional: prefer a remote browser when provided
      if (process.env.BROWSER_WS_ENDPOINT) {
        this.playwrightBrowser = await chromium.connectOverCDP(process.env.BROWSER_WS_ENDPOINT);
      } else {
        // Check for Nix-installed Chromium (Replit environment)
        const nixChromiumPath = '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium';
        const executablePath = existsSync(nixChromiumPath) ? nixChromiumPath : undefined;
        
        this.playwrightBrowser = await chromium.launch({
          headless: true,
          executablePath,
          args: [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=IsolateOrigins',
            '--disable-site-isolation-trials'
          ]
        });
      }
    }
    
    return this.playwrightBrowser;
  }
  
  /**
   * Get or create a shared Puppeteer browser instance (for Lighthouse)
   */
  async getPuppeteerBrowser(): Promise<any> {
    if (!this.puppeteerBrowser || !this.puppeteerBrowser.isConnected()) {
      console.log('Launching shared Puppeteer browser...');
      
      // Check for Nix-installed Chromium (Replit environment)
      const nixChromiumPath = '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium';
      const executablePath = existsSync(nixChromiumPath) ? nixChromiumPath : undefined;
      
      this.puppeteerBrowser = await puppeteer.launch({
        headless: true,
        executablePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });
    }
    
    return this.puppeteerBrowser;
  }
  
  /**
   * Get a new page from the shared browser with concurrency control
   */
  async getPage(): Promise<Page> {
    // Wait if too many pages are open
    while (this.activePages >= this.maxPages) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.activePages++;
    const browser = await this.getPlaywrightBrowser();
    const page = await browser.newPage();
    
    // Track when page is closed
    page.on('close', () => {
      this.activePages--;
    });
    
    return page;
  }
  
  /**
   * Close all browser instances
   */
  async closeAll(): Promise<void> {
    if (this.playwrightBrowser) {
      await this.playwrightBrowser.close().catch(console.error);
      this.playwrightBrowser = null;
    }
    
    if (this.puppeteerBrowser) {
      await this.puppeteerBrowser.close().catch(console.error);
      this.puppeteerBrowser = null;
    }
    
    this.activePages = 0;
  }
  
  /**
   * Health check to verify browser availability
   */
  async checkHealth(): Promise<boolean> {
    try {
      const browser = await this.getPlaywrightBrowser();
      const page = await browser.newPage();
      await page.close();
      return true;
    } catch (error) {
      console.error('Browser health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const browserPool = new BrowserPool();

// Clean up on process exit
process.on('SIGINT', async () => {
  await browserPool.closeAll();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await browserPool.closeAll();
  process.exit(0);
});