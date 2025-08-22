import { Card } from "@/components/ui/card";
import { CheckCircle, XCircle, AlertCircle, Bot, Search, Code, Globe } from "lucide-react";

interface AgentReadinessDetailsProps {
  rawData?: any;
}

export default function AgentReadinessDetails({ rawData }: AgentReadinessDetailsProps) {
  if (!rawData) return null;
  
  const {
    seo = {},
    structuredData = {},
    crawlability = {},
    aiReadiness = {}
  } = rawData;
  
  const renderMetric = (label: string, value: any, status: 'good' | 'warning' | 'bad') => {
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
            {typeof value === 'object' ? (
              <div className="mt-1 text-xs text-slate-600">
                {Object.entries(value).map(([k, v]) => (
                  <div key={k}>{k}: {String(v)}</div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-600 mt-1">{value || 'Not found'}</p>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <Card className="p-6" data-testid="agent-readiness-details">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Agent Readiness Analysis</h3>
      
      <div className="space-y-4">
        {/* SEO Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-blue-600" />
            <h4 className="font-medium text-slate-800">SEO Optimization</h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {renderMetric(
              'Title Tag',
              seo.title || 'Missing',
              seo.title ? 'good' : 'bad'
            )}
            {renderMetric(
              'Meta Description',
              seo.metaDescription ? `${seo.metaDescription.substring(0, 100)}...` : 'Missing',
              seo.metaDescription ? 'good' : 'warning'
            )}
            {renderMetric(
              'Canonical URL',
              seo.canonical || 'Not specified',
              seo.canonical ? 'good' : 'warning'
            )}
            {renderMetric(
              'Open Graph Tags',
              seo.openGraph ? `${Object.keys(seo.openGraph).length} tags found` : 'Missing',
              seo.openGraph ? 'good' : 'warning'
            )}
          </div>
        </div>
        
        {/* Structured Data Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Code className="w-4 h-4 text-purple-600" />
            <h4 className="font-medium text-slate-800">Structured Data</h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {renderMetric(
              'Schema.org Markup',
              structuredData.hasSchema ? 'Present' : 'Not found',
              structuredData.hasSchema ? 'good' : 'warning'
            )}
            {renderMetric(
              'JSON-LD',
              structuredData.jsonLD ? `${structuredData.jsonLD.length} scripts found` : 'Not found',
              structuredData.jsonLD?.length > 0 ? 'good' : 'warning'
            )}
            {renderMetric(
              'Microdata',
              structuredData.microdata ? 'Present' : 'Not found',
              structuredData.microdata ? 'good' : 'warning'
            )}
            {renderMetric(
              'Rich Snippets',
              structuredData.richSnippets ? 'Eligible' : 'Not eligible',
              structuredData.richSnippets ? 'good' : 'warning'
            )}
          </div>
        </div>
        
        {/* Crawlability Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-green-600" />
            <h4 className="font-medium text-slate-800">Crawlability</h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {renderMetric(
              'Robots.txt',
              crawlability.robotsTxt ? 'Found' : 'Missing',
              crawlability.robotsTxt ? 'good' : 'warning'
            )}
            {renderMetric(
              'Sitemap',
              crawlability.sitemap ? 'Found' : 'Not found',
              crawlability.sitemap ? 'good' : 'warning'
            )}
            {renderMetric(
              'Robots Meta',
              crawlability.robotsMeta || 'Default (index, follow)',
              !crawlability.robotsMeta || crawlability.robotsMeta.includes('index') ? 'good' : 'warning'
            )}
            {renderMetric(
              'URL Structure',
              crawlability.cleanUrls ? 'Clean URLs' : 'Complex URLs',
              crawlability.cleanUrls ? 'good' : 'warning'
            )}
          </div>
        </div>
        
        {/* AI Readiness Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Bot className="w-4 h-4 text-indigo-600" />
            <h4 className="font-medium text-slate-800">AI & Automation</h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {renderMetric(
              'Content Structure',
              aiReadiness.semanticHTML ? 'Well-structured' : 'Needs improvement',
              aiReadiness.semanticHTML ? 'good' : 'warning'
            )}
            {renderMetric(
              'API Availability',
              aiReadiness.hasAPI ? 'API detected' : 'No API found',
              aiReadiness.hasAPI ? 'good' : 'warning'
            )}
            {renderMetric(
              'Machine Readable',
              aiReadiness.machineReadable ? 'Optimized' : 'Not optimized',
              aiReadiness.machineReadable ? 'good' : 'bad'
            )}
            {renderMetric(
              'Data Extraction',
              aiReadiness.easyExtraction ? 'Easy' : 'Difficult',
              aiReadiness.easyExtraction ? 'good' : 'warning'
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-4 p-3 bg-slate-50 rounded-lg">
        <p className="text-xs text-slate-600">
          Agent readiness score evaluates how well your site can be understood and processed by AI agents and automation tools.
        </p>
      </div>
    </Card>
  );
}