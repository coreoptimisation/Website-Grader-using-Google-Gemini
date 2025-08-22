import lighthouse from "lighthouse";
import puppeteer from "puppeteer";

export interface PerformanceResult {
  score: number;
  lighthouseScore: number;
  coreWebVitals: {
    lcp: number;
    fid: number;
    cls: number;
    fcp: number;
    ttfb: number;
  };
  opportunities: any[];
  diagnostics: any[];
  metrics: any;
  cruxData?: any;
}

export async function runPerformanceAudit(url: string): Promise<PerformanceResult> {
  const browser = await puppeteer.launch({ 
    headless: true,
    executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  
  try {
    const result = await lighthouse(url, {
      port: (new URL(browser.wsEndpoint())).port as any,
      output: "json",
      onlyCategories: ["performance"],
      formFactor: "desktop",
      screenEmulation: {
        mobile: false,
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
        disabled: false
      },
      throttling: {
        rttMs: 40,
        throughputKbps: 10240,
        cpuSlowdownMultiplier: 1,
        requestLatencyMs: 0,
        downloadThroughputKbps: 0,
        uploadThroughputKbps: 0
      }
    });
    
    await browser.close();
    
    if (!result?.lhr) {
      throw new Error("Lighthouse failed to generate report");
    }
    
    const lhr = result.lhr;
    const performanceCategory = lhr.categories.performance;
    const lighthouseScore = Math.round((performanceCategory?.score || 0) * 100);
    
    // Extract Core Web Vitals
    const coreWebVitals = {
      lcp: lhr.audits['largest-contentful-paint']?.numericValue || 0,
      fid: lhr.audits['max-potential-fid']?.numericValue || 0,
      cls: lhr.audits['cumulative-layout-shift']?.numericValue || 0,
      fcp: lhr.audits['first-contentful-paint']?.numericValue || 0,
      ttfb: lhr.audits['server-response-time']?.numericValue || 0
    };
    
    // Get opportunities and diagnostics
    const opportunities = performanceCategory?.auditRefs
      ?.filter((ref: any) => ref.group === 'load-opportunities' && lhr.audits[ref.id].score < 1)
      .map((ref: any) => ({
        id: ref.id,
        title: lhr.audits[ref.id].title,
        description: lhr.audits[ref.id].description,
        score: lhr.audits[ref.id].score,
        numericValue: lhr.audits[ref.id].numericValue,
        displayValue: lhr.audits[ref.id].displayValue
      })) || [];
    
    const diagnostics = performanceCategory?.auditRefs
      ?.filter((ref: any) => ref.group === 'diagnostics' && lhr.audits[ref.id].score < 1)
      .map((ref: any) => ({
        id: ref.id,
        title: lhr.audits[ref.id].title,
        description: lhr.audits[ref.id].description,
        score: lhr.audits[ref.id].score,
        numericValue: lhr.audits[ref.id].numericValue,
        displayValue: lhr.audits[ref.id].displayValue
      })) || [];
    
    // Try to fetch CrUX data (would require CrUX API key)
    let cruxData = null;
    try {
      if (process.env.CRUX_API_KEY) {
        const cruxResponse = await fetch(`https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${process.env.CRUX_API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            origin: new URL(url).origin,
            formFactor: 'DESKTOP'
          })
        });
        
        if (cruxResponse.ok) {
          cruxData = await cruxResponse.json();
        }
      }
    } catch (error) {
      console.log('CrUX data not available:', error);
    }
    
    return {
      score: lighthouseScore,
      lighthouseScore,
      coreWebVitals,
      opportunities,
      diagnostics,
      metrics: lhr.audits,
      cruxData
    };
    
  } catch (error) {
    await browser.close();
    throw error;
  }
}
