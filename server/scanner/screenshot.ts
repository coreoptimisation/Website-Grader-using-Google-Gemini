import { launchPlaywrightBrowser } from "./browser-launcher";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export interface ScreenshotResult {
  success: boolean;
  filePath?: string;
  error?: string;
  fullPage: boolean;
  viewport: {
    width: number;
    height: number;
  };
}

export async function captureScreenshot(url: string, scanId: string): Promise<ScreenshotResult> {
  const browser = await launchPlaywrightBrowser();
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();
    
    // Navigate to the page
    await page.goto(url, { 
      waitUntil: "domcontentloaded", 
      timeout: 30000 
    });
    
    // Wait a bit for any animations to complete
    await page.waitForTimeout(2000);
    
    // Create screenshots directory if it doesn't exist
    const screenshotsDir = join(process.cwd(), 'public', 'screenshots');
    if (!existsSync(screenshotsDir)) {
      await mkdir(screenshotsDir, { recursive: true });
    }
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${scanId}_${timestamp}.png`;
    const filePath = join(screenshotsDir, filename);
    
    // Capture full page screenshot
    const screenshot = await page.screenshot({
      fullPage: true,
      type: 'png'
    });
    
    // Save the screenshot
    await writeFile(filePath, screenshot);
    
    // Also capture above-the-fold screenshot
    const viewportFilename = `${scanId}_viewport_${timestamp}.png`;
    const viewportFilePath = join(screenshotsDir, viewportFilename);
    const viewportScreenshot = await page.screenshot({
      fullPage: false,
      type: 'png'
    });
    await writeFile(viewportFilePath, viewportScreenshot);
    
    return {
      success: true,
      filePath: `/screenshots/${filename}`,
      fullPage: true,
      viewport: {
        width: 1920,
        height: 1080
      }
    };
    
  } catch (error) {
    console.error("Screenshot capture failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      fullPage: false,
      viewport: {
        width: 1920,
        height: 1080
      }
    };
  } finally {
    await browser.close();
  }
}

export async function captureElementScreenshot(
  url: string, 
  selector: string, 
  scanId: string
): Promise<ScreenshotResult> {
  const browser = await launchPlaywrightBrowser();
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();
    
    await page.goto(url, { 
      waitUntil: "networkidle", 
      timeout: 30000 
    });
    
    // Wait for the element to be visible
    await page.waitForSelector(selector, { timeout: 5000 });
    
    const screenshotsDir = join(process.cwd(), 'public', 'screenshots');
    if (!existsSync(screenshotsDir)) {
      await mkdir(screenshotsDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${scanId}_element_${timestamp}.png`;
    const filePath = join(screenshotsDir, filename);
    
    const element = await page.$(selector);
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }
    
    const screenshot = await element.screenshot({
      type: 'png'
    });
    
    await writeFile(filePath, screenshot);
    
    return {
      success: true,
      filePath: `/screenshots/${filename}`,
      fullPage: false,
      viewport: {
        width: 1920,
        height: 1080
      }
    };
    
  } catch (error) {
    console.error("Element screenshot capture failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      fullPage: false,
      viewport: {
        width: 1920,
        height: 1080
      }
    };
  } finally {
    await browser.close();
  }
}