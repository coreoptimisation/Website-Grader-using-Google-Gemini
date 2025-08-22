import { Card } from "@/components/ui/card";
import { CheckCircle, XCircle, AlertCircle, Gauge, Zap, Download, Timer } from "lucide-react";

interface PerformanceDetailsProps {
  rawData?: any;
}

export default function PerformanceDetails({ rawData }: PerformanceDetailsProps) {
  if (!rawData) return null;
  
  const { lighthouseMetrics = {}, cruxMetrics = {} } = rawData;
  
  const getMetricStatus = (value: number, thresholds: { good: number, poor: number }) => {
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.poor) return 'warning';
    return 'bad';
  };
  
  const formatMetric = (value: number, unit: string = 's') => {
    if (unit === 's' && value > 1000) {
      return `${(value / 1000).toFixed(1)}s`;
    }
    return `${value}${unit === 's' ? 'ms' : unit}`;
  };
  
  const renderMetric = (label: string, value: any, unit: string, status: 'good' | 'warning' | 'bad', description?: string) => {
    const statusConfig = {
      good: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
      warning: { icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
      bad: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' }
    };
    
    const config = statusConfig[status];
    const Icon = config.icon;
    
    return (
      <div className={`p-3 rounded-lg ${config.bg} border border-slate-200`}>
        <div className="flex items-start gap-2">
          <Icon className={`w-4 h-4 mt-0.5 ${config.color}`} />
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900">{label}</p>
            <p className={`text-lg font-bold ${config.color}`}>
              {value !== null && value !== undefined ? formatMetric(value, unit) : 'N/A'}
            </p>
            {description && (
              <p className="text-xs text-slate-600 mt-1">{description}</p>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <Card className="p-6" data-testid="performance-details">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Performance Analysis</h3>
      
      <div className="space-y-4">
        {/* Core Web Vitals */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-purple-600" />
            <h4 className="font-medium text-slate-800">Core Web Vitals</h4>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {renderMetric(
              'LCP (Largest Contentful Paint)',
              lighthouseMetrics.largestContentfulPaint || lighthouseMetrics.lcp,
              's',
              getMetricStatus(lighthouseMetrics.largestContentfulPaint || lighthouseMetrics.lcp || 0, { good: 2500, poor: 4000 }),
              'Main content loading speed'
            )}
            {renderMetric(
              'FID (First Input Delay)',
              lighthouseMetrics.maxPotentialFID || lighthouseMetrics.fid,
              's',
              getMetricStatus(lighthouseMetrics.maxPotentialFID || lighthouseMetrics.fid || 0, { good: 100, poor: 300 }),
              'Interactivity responsiveness'
            )}
            {renderMetric(
              'CLS (Cumulative Layout Shift)',
              lighthouseMetrics.cumulativeLayoutShift || lighthouseMetrics.cls,
              '',
              getMetricStatus(lighthouseMetrics.cumulativeLayoutShift || lighthouseMetrics.cls || 0, { good: 0.1, poor: 0.25 }),
              'Visual stability'
            )}
          </div>
        </div>
        
        {/* Loading Performance */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Timer className="w-4 h-4 text-blue-600" />
            <h4 className="font-medium text-slate-800">Loading Performance</h4>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {renderMetric(
              'First Contentful Paint',
              lighthouseMetrics.firstContentfulPaint || lighthouseMetrics.fcp,
              's',
              getMetricStatus(lighthouseMetrics.firstContentfulPaint || lighthouseMetrics.fcp || 0, { good: 1800, poor: 3000 }),
              'First visual response'
            )}
            {renderMetric(
              'Speed Index',
              lighthouseMetrics.speedIndex,
              's',
              getMetricStatus(lighthouseMetrics.speedIndex || 0, { good: 3400, poor: 5800 }),
              'How quickly content loads'
            )}
            {renderMetric(
              'Time to Interactive',
              lighthouseMetrics.interactive || lighthouseMetrics.tti,
              's',
              getMetricStatus(lighthouseMetrics.interactive || lighthouseMetrics.tti || 0, { good: 3800, poor: 7300 }),
              'When page becomes usable'
            )}
          </div>
        </div>
        
        {/* Resource Optimization */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Download className="w-4 h-4 text-green-600" />
            <h4 className="font-medium text-slate-800">Resource Optimization</h4>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {renderMetric(
              'Total Blocking Time',
              lighthouseMetrics.totalBlockingTime || lighthouseMetrics.tbt,
              's',
              getMetricStatus(lighthouseMetrics.totalBlockingTime || lighthouseMetrics.tbt || 0, { good: 200, poor: 600 }),
              'Main thread blocking'
            )}
            {renderMetric(
              'Performance Score',
              lighthouseMetrics.score ? lighthouseMetrics.score * 100 : rawData.score,
              '/100',
              getMetricStatus(100 - (lighthouseMetrics.score ? lighthouseMetrics.score * 100 : rawData.score || 0), { good: 10, poor: 50 }),
              'Overall performance rating'
            )}
            {renderMetric(
              'Server Response Time',
              lighthouseMetrics.serverResponseTime,
              's',
              getMetricStatus(lighthouseMetrics.serverResponseTime || 0, { good: 600, poor: 1800 }),
              'Initial server response'
            )}
          </div>
        </div>
        
        {/* Real User Metrics (if available) */}
        {cruxMetrics && Object.keys(cruxMetrics).length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Gauge className="w-4 h-4 text-indigo-600" />
              <h4 className="font-medium text-slate-800">Real User Metrics (Field Data)</h4>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {cruxMetrics.first_contentful_paint && renderMetric(
                'Real FCP (P75)',
                cruxMetrics.first_contentful_paint.percentiles?.p75,
                's',
                getMetricStatus(cruxMetrics.first_contentful_paint.percentiles?.p75 || 0, { good: 1800, poor: 3000 }),
                'Field data from real users'
              )}
              {cruxMetrics.largest_contentful_paint && renderMetric(
                'Real LCP (P75)',
                cruxMetrics.largest_contentful_paint.percentiles?.p75,
                's',
                getMetricStatus(cruxMetrics.largest_contentful_paint.percentiles?.p75 || 0, { good: 2500, poor: 4000 }),
                'Field data from real users'
              )}
              {cruxMetrics.cumulative_layout_shift && renderMetric(
                'Real CLS (P75)',
                cruxMetrics.cumulative_layout_shift.percentiles?.p75,
                '',
                getMetricStatus(cruxMetrics.cumulative_layout_shift.percentiles?.p75 || 0, { good: 0.1, poor: 0.25 }),
                'Field data from real users'
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-4 p-3 bg-slate-50 rounded-lg">
        <p className="text-xs text-slate-600">
          Performance metrics measured using Lighthouse and Chrome User Experience Report. Lower values are better for most metrics.
        </p>
      </div>
    </Card>
  );
}