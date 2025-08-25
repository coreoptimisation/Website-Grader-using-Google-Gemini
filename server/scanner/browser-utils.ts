import * as fs from 'fs';
import { execSync } from 'child_process';

/**
 * Dynamically finds the Chromium executable path
 * Works in both development and production environments
 */
export function getChromiumPath(): string | undefined {
  console.log('[BROWSER-UTILS] Detecting Chromium path...');
  console.log('[BROWSER-UTILS] Environment:', process.env.NODE_ENV);
  console.log('[BROWSER-UTILS] Platform:', process.platform);
  console.log('[BROWSER-UTILS] Replit Deployment:', process.env.REPL_ID ? 'Yes' : 'No');
  
  // List of potential Chromium paths to check
  const potentialPaths = [
    // Try to get it from PATH first (works when installed via Nix packages)
    (() => {
      try {
        const path = execSync('which chromium', { encoding: 'utf8' }).trim();
        console.log('[BROWSER-UTILS] Found via which command:', path);
        return path;
      } catch {
        console.log('[BROWSER-UTILS] which command failed');
        return null;
      }
    })(),
    
    // Development Nix path (current hardcoded path)
    '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
    
    // Common production paths
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    
    // Alternative Nix store paths (might change between builds)
    ...(() => {
      try {
        // Look for any chromium in /nix/store
        const nixPaths = execSync('ls /nix/store/*/bin/chromium 2>/dev/null | head -5', { 
          encoding: 'utf8',
          shell: '/bin/bash'
        }).trim().split('\n').filter(Boolean);
        console.log('[BROWSER-UTILS] Found Nix store paths:', nixPaths);
        return nixPaths;
      } catch {
        return [];
      }
    })()
  ].filter(Boolean) as string[];
  
  // Find the first path that exists
  for (const path of potentialPaths) {
    if (path && fs.existsSync(path)) {
      console.log('[BROWSER-UTILS] ✓ Found Chromium at:', path);
      return path;
    }
  }
  
  console.error('[BROWSER-UTILS] ✗ No Chromium executable found');
  console.error('[BROWSER-UTILS] Searched paths:', potentialPaths);
  return undefined;
}

/**
 * Get browser launch options with proper configuration
 */
export function getBrowserLaunchOptions(options: any = {}) {
  const chromiumPath = getChromiumPath();
  
  const launchOptions = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=IsolateOrigins',
      '--disable-site-isolation-trials'
    ],
    ...options
  };
  
  // Only set executablePath if we found a valid path
  if (chromiumPath) {
    launchOptions.executablePath = chromiumPath;
  } else {
    console.warn('[BROWSER-UTILS] No Chromium path found, letting Playwright/Puppeteer use default');
  }
  
  return launchOptions;
}