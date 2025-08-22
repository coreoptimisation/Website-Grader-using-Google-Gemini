export interface CrUXMetrics {
  largestContentfulPaint?: {
    percentile: number;
    category: string;
  };
  firstInputDelay?: {
    percentile: number;
    category: string;
  };
  cumulativeLayoutShift?: {
    percentile: number;
    category: string;
  };
  interactionToNextPaint?: {
    percentile: number;
    category: string;
  };
  firstContentfulPaint?: {
    percentile: number;
    category: string;
  };
  timeToFirstByte?: {
    percentile: number;
    category: string;
  };
}

export interface CrUXResult {
  available: boolean;
  metrics?: CrUXMetrics;
  formFactor?: string;
  overallCategory?: string;
  error?: string;
}

// CrUX API endpoint
const CRUX_API_URL = 'https://chromeuxreport.googleapis.com/v1/records:queryRecord';

export async function fetchCrUXData(url: string): Promise<CrUXResult> {
  try {
    // Get API key from environment
    const apiKey = process.env.GOOGLE_API_KEY || process.env.CRUX_API_KEY || '';
    
    if (!apiKey) {
      return {
        available: false,
        error: 'CrUX API key not configured'
      };
    }

    // Prepare the request
    const requestBody = {
      url: url,
      formFactor: 'DESKTOP', // Can be DESKTOP, PHONE, or TABLET
      metrics: [
        'largest_contentful_paint',
        'first_input_delay', 
        'cumulative_layout_shift',
        'interaction_to_next_paint',
        'first_contentful_paint',
        'experimental_time_to_first_byte'
      ]
    };

    const response = await fetch(`${CRUX_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      // If no data available for this URL (404), that's expected for many sites
      if (response.status === 404) {
        return {
          available: false,
          error: 'No CrUX data available for this URL'
        };
      }
      
      const errorText = await response.text();
      console.error('CrUX API error:', errorText);
      return {
        available: false,
        error: `CrUX API error: ${response.status}`
      };
    }

    const data = await response.json();
    
    // Parse the response data
    const metrics: CrUXMetrics = {};
    
    if (data.record?.metrics) {
      const m = data.record.metrics;
      
      if (m.largest_contentful_paint) {
        metrics.largestContentfulPaint = {
          percentile: m.largest_contentful_paint.percentiles?.p75 || 0,
          category: getCategoryFromHistogram(m.largest_contentful_paint.histogram)
        };
      }
      
      if (m.first_input_delay) {
        metrics.firstInputDelay = {
          percentile: m.first_input_delay.percentiles?.p75 || 0,
          category: getCategoryFromHistogram(m.first_input_delay.histogram)
        };
      }
      
      if (m.cumulative_layout_shift) {
        metrics.cumulativeLayoutShift = {
          percentile: m.cumulative_layout_shift.percentiles?.p75 || 0,
          category: getCategoryFromHistogram(m.cumulative_layout_shift.histogram)
        };
      }
      
      if (m.interaction_to_next_paint) {
        metrics.interactionToNextPaint = {
          percentile: m.interaction_to_next_paint.percentiles?.p75 || 0,
          category: getCategoryFromHistogram(m.interaction_to_next_paint.histogram)
        };
      }
      
      if (m.first_contentful_paint) {
        metrics.firstContentfulPaint = {
          percentile: m.first_contentful_paint.percentiles?.p75 || 0,
          category: getCategoryFromHistogram(m.first_contentful_paint.histogram)
        };
      }
      
      if (m.experimental_time_to_first_byte) {
        metrics.timeToFirstByte = {
          percentile: m.experimental_time_to_first_byte.percentiles?.p75 || 0,
          category: getCategoryFromHistogram(m.experimental_time_to_first_byte.histogram)
        };
      }
    }

    // Determine overall category based on Core Web Vitals
    const overallCategory = determineOverallCategory(metrics);

    return {
      available: true,
      metrics,
      formFactor: 'DESKTOP',
      overallCategory
    };

  } catch (error) {
    console.error('Failed to fetch CrUX data:', error);
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function getCategoryFromHistogram(histogram: any[]): string {
  if (!histogram || histogram.length === 0) return 'UNKNOWN';
  
  // Find the bucket with the highest density
  let maxDensity = 0;
  let category = 'UNKNOWN';
  
  for (const bucket of histogram) {
    if (bucket.density > maxDensity) {
      maxDensity = bucket.density;
      // Buckets are usually labeled as GOOD, NEEDS_IMPROVEMENT, or POOR
      if (bucket.start === 0) {
        category = 'GOOD';
      } else if (bucket.start < 2500) { // Example threshold
        category = 'NEEDS_IMPROVEMENT';
      } else {
        category = 'POOR';
      }
    }
  }
  
  return category;
}

function determineOverallCategory(metrics: CrUXMetrics): string {
  // Core Web Vitals: LCP, FID/INP, CLS
  const categories = [];
  
  if (metrics.largestContentfulPaint?.category) {
    categories.push(metrics.largestContentfulPaint.category);
  }
  
  // Use INP if available, otherwise FID
  if (metrics.interactionToNextPaint?.category) {
    categories.push(metrics.interactionToNextPaint.category);
  } else if (metrics.firstInputDelay?.category) {
    categories.push(metrics.firstInputDelay.category);
  }
  
  if (metrics.cumulativeLayoutShift?.category) {
    categories.push(metrics.cumulativeLayoutShift.category);
  }
  
  // If any metric is POOR, overall is POOR
  if (categories.includes('POOR')) {
    return 'POOR';
  }
  
  // If any metric needs improvement, overall needs improvement
  if (categories.includes('NEEDS_IMPROVEMENT')) {
    return 'NEEDS_IMPROVEMENT';
  }
  
  // If all metrics are good or unknown
  return categories.length > 0 ? 'GOOD' : 'UNKNOWN';
}