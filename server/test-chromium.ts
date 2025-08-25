import * as fs from 'fs';
import { chromium } from 'playwright';

async function testChromium() {
  console.log('=== Chromium Diagnostic Test ===');
  console.log('Environment:', process.env.NODE_ENV || 'unknown');
  console.log('Platform:', process.platform);
  console.log('Node version:', process.version);
  
  // Check if chromium path exists
  const chromiumPath = '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium';
  console.log('\nChecking chromium path:', chromiumPath);
  console.log('Path exists:', fs.existsSync(chromiumPath));
  
  if (fs.existsSync(chromiumPath)) {
    const stats = fs.statSync(chromiumPath);
    console.log('Is file:', stats.isFile());
    console.log('Is executable:', !!(stats.mode & parseInt('0111', 8)));
  }
  
  // Try to launch browser
  console.log('\n=== Attempting to launch browser ===');
  
  try {
    console.log('Method 1: With hardcoded path and sandbox flags...');
    const browser1 = await chromium.launch({
      headless: true,
      executablePath: chromiumPath,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('✅ Success with hardcoded path!');
    await browser1.close();
  } catch (error: any) {
    console.error('❌ Failed with hardcoded path:', error.message);
  }
  
  try {
    console.log('\nMethod 2: Without executablePath (Playwright bundled)...');
    const browser2 = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('✅ Success with Playwright bundled browser!');
    await browser2.close();
  } catch (error: any) {
    console.error('❌ Failed with bundled browser:', error.message);
  }
  
  try {
    console.log('\nMethod 3: With minimal args...');
    const browser3 = await chromium.launch({
      headless: true,
      executablePath: chromiumPath
    });
    console.log('✅ Success with minimal args!');
    await browser3.close();
  } catch (error: any) {
    console.error('❌ Failed with minimal args:', error.message);
  }
  
  console.log('\n=== Test complete ===');
}

testChromium().catch(console.error);