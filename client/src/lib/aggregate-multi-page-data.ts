// Utility to aggregate multi-page scan data for detailed analysis components

export function aggregateMultiPageData(rawData: any) {
  if (!rawData || !rawData.multiPage || !rawData.pageResults) {
    return rawData;
  }

  const pageResults = rawData.pageResults;
  
  // Aggregate accessibility data
  const aggregateAccessibility = () => {
    const allViolations: any[] = [];
    const allPasses: any[] = [];
    const allIncomplete: any[] = [];
    const violationMap = new Map();
    const passMap = new Map();
    const incompleteMap = new Map();
    
    pageResults.forEach((page: any) => {
      if (page.accessibility) {
        // Aggregate violations
        if (page.accessibility.violations) {
          page.accessibility.violations.forEach((v: any) => {
            if (violationMap.has(v.id)) {
              const existing = violationMap.get(v.id);
              existing.nodes = [...(existing.nodes || []), ...(v.nodes || [])];
              existing.pageCount = (existing.pageCount || 1) + 1;
            } else {
              violationMap.set(v.id, { ...v, pageCount: 1 });
            }
          });
        }
        
        // Aggregate passes
        if (page.accessibility.passes) {
          page.accessibility.passes.forEach((p: any) => {
            if (!passMap.has(p.id)) {
              passMap.set(p.id, p);
            }
          });
        }
        
        // Aggregate incomplete
        if (page.accessibility.incomplete) {
          page.accessibility.incomplete.forEach((i: any) => {
            if (incompleteMap.has(i.id)) {
              const existing = incompleteMap.get(i.id);
              existing.nodes = [...(existing.nodes || []), ...(i.nodes || [])];
            } else {
              incompleteMap.set(i.id, i);
            }
          });
        }
      }
    });
    
    // Convert maps back to arrays and add page count info
    violationMap.forEach((v, id) => {
      allViolations.push({
        ...v,
        description: v.description + (v.pageCount > 1 ? ` (Found on ${v.pageCount} pages)` : '')
      });
    });
    
    passMap.forEach(p => allPasses.push(p));
    incompleteMap.forEach(i => allIncomplete.push(i));
    
    // Calculate aggregate score
    const scores = pageResults
      .filter((p: any) => p.accessibility?.score !== undefined)
      .map((p: any) => p.accessibility.score);
    const avgScore = scores.length > 0 
      ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
      : 0;
    
    return {
      score: avgScore,
      violations: allViolations,
      passes: allPasses,
      incomplete: allIncomplete,
      totalPages: pageResults.length,
      criticalViolations: allViolations.filter((v: any) => v.impact === 'critical').length
    };
  };
  
  // Aggregate performance data
  const aggregatePerformance = () => {
    const metrics: any = {
      coreWebVitals: {},
      metrics: {},
      opportunities: []
    };
    
    // Calculate average for numeric metrics
    const lcpValues: number[] = [];
    const fcpValues: number[] = [];
    const clsValues: number[] = [];
    const fidValues: number[] = [];
    const ttfbValues: number[] = [];
    
    pageResults.forEach((page: any) => {
      if (page.performance) {
        if (page.performance.coreWebVitals) {
          const cwv = page.performance.coreWebVitals;
          if (cwv.lcp !== undefined) lcpValues.push(cwv.lcp);
          if (cwv.fcp !== undefined) fcpValues.push(cwv.fcp);
          if (cwv.cls !== undefined) clsValues.push(cwv.cls);
          if (cwv.fid !== undefined) fidValues.push(cwv.fid);
          if (cwv.ttfb !== undefined) ttfbValues.push(cwv.ttfb);
        }
        
        // Collect opportunities
        if (page.performance.opportunities) {
          metrics.opportunities.push(...page.performance.opportunities);
        }
      }
    });
    
    // Calculate averages
    metrics.coreWebVitals = {
      lcp: lcpValues.length > 0 ? Math.round(lcpValues.reduce((a, b) => a + b, 0) / lcpValues.length) : null,
      fcp: fcpValues.length > 0 ? Math.round(fcpValues.reduce((a, b) => a + b, 0) / fcpValues.length) : null,
      cls: clsValues.length > 0 ? parseFloat((clsValues.reduce((a, b) => a + b, 0) / clsValues.length).toFixed(3)) : null,
      fid: fidValues.length > 0 ? Math.round(fidValues.reduce((a, b) => a + b, 0) / fidValues.length) : null,
      ttfb: ttfbValues.length > 0 ? Math.round(ttfbValues.reduce((a, b) => a + b, 0) / ttfbValues.length) : null
    };
    
    // Calculate average score
    const scores = pageResults
      .filter((p: any) => p.performance?.score !== undefined)
      .map((p: any) => p.performance.score);
    metrics.score = scores.length > 0 
      ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
      : 0;
    
    // Deduplicate opportunities
    const opportunityMap = new Map();
    metrics.opportunities.forEach((opp: any) => {
      if (!opportunityMap.has(opp.title)) {
        opportunityMap.set(opp.title, opp);
      }
    });
    metrics.opportunities = Array.from(opportunityMap.values());
    
    return metrics;
  };
  
  // Aggregate security data
  const aggregateSecurity = () => {
    const security: any = {
      headers: { present: [], missing: [] },
      ssl: {},
      privacy: {},
      vulnerabilities: []
    };
    
    // Check which headers are present across all pages
    const headerPresence = new Map<string, number>();
    const allHeaders = [
      'strict-transport-security',
      'content-security-policy',
      'x-content-type-options',
      'x-frame-options',
      'referrer-policy',
      'permissions-policy'
    ];
    
    pageResults.forEach((page: any) => {
      if (page.security?.headers) {
        Object.keys(page.security.headers).forEach(header => {
          const count = headerPresence.get(header) || 0;
          headerPresence.set(header, count + 1);
        });
      }
      
      // Collect vulnerabilities
      if (page.security?.vulnerabilities) {
        security.vulnerabilities.push(...page.security.vulnerabilities);
      }
    });
    
    // Headers present on all pages
    allHeaders.forEach(header => {
      const count = headerPresence.get(header) || 0;
      if (count === pageResults.length) {
        security.headers.present.push(header);
      } else {
        security.headers.missing.push(header);
      }
    });
    
    // Check HTTPS on all pages
    const httpsCount = pageResults.filter((p: any) => p.security?.https === true).length;
    security.https = httpsCount === pageResults.length;
    
    // Calculate average score
    const scores = pageResults
      .filter((p: any) => p.security?.score !== undefined)
      .map((p: any) => p.security.score);
    security.score = scores.length > 0 
      ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
      : 0;
    
    return security;
  };
  
  // Aggregate agent readiness data
  const aggregateAgentReadiness = () => {
    const agentData: any = {
      seo: { hasMetaTags: 0, hasSitemap: false, hasRobots: false },
      structuredData: { present: 0 },
      crawlability: { accessible: 0 }
    };
    
    pageResults.forEach((page: any) => {
      if (page.agentReadiness) {
        const ar = page.agentReadiness;
        
        // Count pages with meta tags
        if (ar.seo?.title || ar.seo?.description) {
          agentData.seo.hasMetaTags++;
        }
        
        // Check for sitemaps and robots
        if (ar.sitemaps?.found) agentData.seo.hasSitemap = true;
        if (ar.robots?.found) agentData.seo.hasRobots = true;
        
        // Count structured data
        if (ar.structuredData?.length > 0) {
          agentData.structuredData.present++;
        }
        
        // Count accessible pages
        if (ar.crawlability?.accessible) {
          agentData.crawlability.accessible++;
        }
      }
    });
    
    // Calculate average score
    const scores = pageResults
      .filter((p: any) => p.agentReadiness?.score !== undefined)
      .map((p: any) => p.agentReadiness.score);
    agentData.score = scores.length > 0 
      ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
      : 0;
    
    return agentData;
  };
  
  // Return aggregated data in format expected by detailed components
  return {
    accessibility: aggregateAccessibility(),
    performance: aggregatePerformance(),
    security: aggregateSecurity(),
    agentReadiness: aggregateAgentReadiness(),
    isAggregated: true,
    totalPagesAnalyzed: pageResults.length
  };
}