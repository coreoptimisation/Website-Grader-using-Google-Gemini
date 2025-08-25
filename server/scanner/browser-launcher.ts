import { chromium, Browser } from 'playwright';
import puppeteer from 'puppeteer';
import { existsSync } from 'fs';

/**
 * Centralized browser launcher for all scanner modules
 * This ensures consistent browser management across dev and prod
 */
export async function launchPlaywrightBrowser(): Promise<Browser> {
  // Optional: prefer a remote browser when provided
  if (process.env.BROWSER_WS_ENDPOINT) {
    return chromium.connectOverCDP(process.env.BROWSER_WS_ENDPOINT);
  }

  // Check for Nix-installed Chromium (Replit environment)
  const nixChromiumPath = '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium';
  if (existsSync(nixChromiumPath)) {
    return chromium.launch({
      headless: true,
      executablePath: nixChromiumPath,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
  }

  // Fallback: Let Playwright manage the browser
  return chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
}

/**
 * Launch Puppeteer browser (for Lighthouse)
 */
export async function launchPuppeteerBrowser() {
  // Check for Nix-installed Chromium (Replit environment)
  const nixChromiumPath = '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium';
  if (existsSync(nixChromiumPath)) {
    return puppeteer.launch({
      headless: true,
      executablePath: nixChromiumPath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
  }
  
  // Fallback: Let Puppeteer find its own browser
  return puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
}

/**
 * Health check to verify browser availability
 */
export async function checkBrowserHealth(): Promise<boolean> {
  try {
    const browser = await launchPlaywrightBrowser();
    await browser.close();
    return true;
  } catch (error) {
    console.error('Browser health check failed:', error);
    return false;
  }
}