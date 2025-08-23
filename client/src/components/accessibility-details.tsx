import { Card } from "@/components/ui/card";
import { CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface AccessibilityDetailsProps {
  rawData?: any;
}

interface Check {
  id: string;
  description: string;
  help?: string;
  helpUrl?: string;
  impact?: string;
  nodes?: any[];
  tags?: string[];
}

export default function AccessibilityDetails({ rawData }: AccessibilityDetailsProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['violations']);
  
  if (!rawData) return null;
  
  const { violations = [], passes = [], incomplete = [], isAggregated = false, totalPagesAnalyzed = 1 } = rawData;
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };
  
  const renderCheck = (check: Check, type: 'violation' | 'pass' | 'incomplete') => {
    const issueCount = check.nodes?.length || 0;
    const impactColor = {
      critical: 'text-red-600 bg-red-50',
      serious: 'text-orange-600 bg-orange-50', 
      moderate: 'text-yellow-600 bg-yellow-50',
      minor: 'text-blue-600 bg-blue-50'
    };
    
    return (
      <div key={check.id} className="py-3 px-4 hover:bg-slate-50 border-b border-slate-100 last:border-0">
        <div className="flex items-start gap-3">
          <div className="mt-1">
            {type === 'pass' && <CheckCircle className="w-4 h-4 text-green-600" />}
            {type === 'violation' && <XCircle className="w-4 h-4 text-red-600" />}
            {type === 'incomplete' && <AlertCircle className="w-4 h-4 text-yellow-600" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900">{check.description}</p>
            {check.help && (
              <p className="text-xs text-slate-600 mt-1">{check.help}</p>
            )}
            <div className="flex items-center gap-3 mt-2">
              {type === 'violation' && issueCount > 0 && (
                <span className="text-xs text-red-600 font-medium">
                  {issueCount} {issueCount === 1 ? 'issue' : 'issues'}
                </span>
              )}
              {check.impact && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${impactColor[check.impact as keyof typeof impactColor] || 'text-slate-600 bg-slate-100'}`}>
                  {check.impact}
                </span>
              )}
              {check.tags && check.tags.length > 0 && (
                <div className="flex gap-1">
                  {check.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  const sections = [
    { 
      id: 'violations', 
      title: 'Violations', 
      items: violations,
      type: 'violation' as const,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    { 
      id: 'passes', 
      title: 'Passed Checks', 
      items: passes,
      type: 'pass' as const,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    { 
      id: 'incomplete', 
      title: 'Needs Review', 
      items: incomplete,
      type: 'incomplete' as const,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    }
  ];
  
  return (
    <Card className="p-6" data-testid="accessibility-details">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Detailed Accessibility Checks</h3>
        {isAggregated && (
          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
            Aggregated from {totalPagesAnalyzed} pages
          </span>
        )}
      </div>
      
      <div className="space-y-4">
        {sections.map(section => (
          <div key={section.id} className={`border rounded-lg ${section.borderColor}`}>
            <button
              onClick={() => toggleSection(section.id)}
              className={`w-full px-4 py-3 flex items-center justify-between ${section.bgColor} hover:opacity-90 transition-opacity`}
              data-testid={`section-${section.id}`}
            >
              <div className="flex items-center gap-2">
                <span className={`font-medium ${section.color}`}>
                  {section.title}
                </span>
                <span className={`text-sm ${section.color}`}>
                  ({section.items.length})
                </span>
              </div>
              {expandedSections.includes(section.id) ? 
                <ChevronDown className={`w-4 h-4 ${section.color}`} /> : 
                <ChevronRight className={`w-4 h-4 ${section.color}`} />
              }
            </button>
            
            {expandedSections.includes(section.id) && section.items.length > 0 && (
              <div className="bg-white">
                {section.items.map((check: Check) => renderCheck(check, section.type))}
              </div>
            )}
            
            {expandedSections.includes(section.id) && section.items.length === 0 && (
              <div className="bg-white p-4 text-center text-sm text-slate-500">
                No {section.title.toLowerCase()} found
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-4 p-3 bg-slate-50 rounded-lg">
        <p className="text-xs text-slate-600">
          Powered by axe-core • WCAG 2.1 Level AA conformance testing
        </p>
      </div>
    </Card>
  );
}