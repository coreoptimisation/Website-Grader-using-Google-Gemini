import lighthouse from "lighthouse";
import { fetchCrUXData, CrUXResult } from "./crux";
import { launchPuppeteerBrowser } from "./browser-launcher";

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
  cruxData?: CrUXResult;
  fieldData?: {
    available: boolean;
    metrics?: any;
    overallCategory?: string;
  };
}

export async function runPerformanceAudit(url: string): Promise<PerformanceResult> {
  const browser = await launchPuppeteerBrowser();
  
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
    const opportunities = (performanceCategory?.auditRefs || [])
      .filter((ref: any) => ref.group === 'load-opportunities' && lhr.audits[ref.id]?.score < 1)
      .map((ref: any) => ({
        id: ref.id,
        title: lhr.audits[ref.id]?.title,
        description: lhr.audits[ref.id]?.description,
        score: lhr.audits[ref.id]?.score,
        numericValue: lhr.audits[ref.id]?.numericValue,
        displayValue: lhr.audits[ref.id]?.displayValue
      })) || [];
    
    const diagnostics = (performanceCategory?.auditRefs || [])
      .filter((ref: any) => ref.group === 'diagnostics' && lhr.audits[ref.id]?.score < 1)
      .map((ref: any) => ({
        id: ref.id,
        title: lhr.audits[ref.id]?.title,
        description: lhr.audits[ref.id]?.description,
        score: lhr.audits[ref.id]?.score,
        numericValue: lhr.audits[ref.id]?.numericValue,
        displayValue: lhr.audits[ref.id]?.displayValue
      })) || [];
    
    // Fetch CrUX real-user field data
    const cruxData = await fetchCrUXData(url);
    
    // Combine lab and field data for comprehensive scoring
    let finalScore = lighthouseScore;
    
    // If we have CrUX field data, adjust the score based on real-user experience
    if (cruxData.available && cruxData.overallCategory) {
      // Weight: 60% lab data (Lighthouse), 40% field data (CrUX)
      const fieldScore = cruxData.overallCategory === 'GOOD' ? 90 : 
                         cruxData.overallCategory === 'NEEDS_IMPROVEMENT' ? 70 : 50;
      finalScore = Math.round(lighthouseScore * 0.6 + fieldScore * 0.4);
    }
    
    return {
      score: finalScore,
      lighthouseScore,
      coreWebVitals,
      opportunities,
      diagnostics,
      metrics: lhr.audits,
      cruxData,
      fieldData: cruxData.available ? {
        available: true,
        metrics: cruxData.metrics,
        overallCategory: cruxData.overallCategory
      } : {
        available: false
      }
    };
    
  } catch (error) {
    await browser.close();
    throw error;
  }
}
