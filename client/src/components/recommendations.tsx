import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Accessibility, Gauge, Shield, Download, FileText } from "lucide-react";
import type { ScanReport } from "@/lib/types";

interface RecommendationsProps {
  report: ScanReport;
}

const PILLAR_ICONS = {
  accessibility: Accessibility,
  performance: Gauge,
  trust: Shield,
  agentReadiness: Shield
};

const PILLAR_COLORS = {
  accessibility: "text-blue-600",
  performance: "text-purple-600", 
  trust: "text-green-600",
  agentReadiness: "text-indigo-600"
};

function getSeverityColor(severity: string): string {
  switch (severity.toLowerCase()) {
    case 'critical':
    case 'high':
      return 'bg-red-500';
    case 'medium':
    case 'moderate':
      return 'bg-yellow-500';
    case 'low':
    case 'minor':
      return 'bg-blue-500';
    default:
      return 'bg-slate-500';
  }
}

export default function Recommendations({ report }: RecommendationsProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedRecommendations, setExpandedRecommendations] = useState<Set<number>>(new Set());

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const toggleRecommendation = (index: number) => {
    const newExpanded = new Set(expandedRecommendations);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRecommendations(newExpanded);
  };

  // Group recommendations by pillar
  const recommendationsByPillar = (report.geminiAnalysis?.recommendations || []).reduce((acc: any, rec: any, index: number) => {
    if (!acc[rec.pillar]) {
      acc[rec.pillar] = [];
    }
    acc[rec.pillar].push({ ...rec, originalIndex: index });
    return acc;
  }, {});

  return (
    <Card className="p-6" data-testid="detailed-recommendations">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900">Detailed Recommendations</h3>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" data-testid="button-export-pdf">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button size="sm" data-testid="button-view-full-report">
            <FileText className="w-4 h-4 mr-2" />
            View Full Report
          </Button>
        </div>
      </div>
      
      <div className="space-y-6">
        {Object.entries(recommendationsByPillar).map(([pillar, recommendations]) => {
          const recs = recommendations as any[];
          const Icon = PILLAR_ICONS[pillar as keyof typeof PILLAR_ICONS] || Shield;
          const color = PILLAR_COLORS[pillar as keyof typeof PILLAR_COLORS] || "text-slate-600";
          const isExpanded = expandedSections.has(pillar);
          const issueCount = recs.length;

          return (
            <div key={pillar} className="border border-slate-200 rounded-lg">
              <button
                className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-slate-50"
                onClick={() => toggleSection(pillar)}
                data-testid={`section-${pillar}`}
              >
                <div className="flex items-center space-x-2">
                  <Icon className={`w-5 h-5 ${color}`} />
                  <h4 className="font-semibold text-slate-900 capitalize">
                    {pillar === 'agentReadiness' ? 'Agent Readiness' : pillar} Improvements
                  </h4>
                  <Badge variant="secondary">{issueCount} issues</Badge>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                )}
              </button>
              
              {isExpanded && (
                <div className="border-t border-slate-200">
                  <div className="p-4 space-y-3">
                    {recs.map((rec, index) => {
                      const isRecExpanded = expandedRecommendations.has(rec.originalIndex);
                      
                      return (
                        <div key={index} className="border border-slate-200 rounded-lg">
                          <button
                            className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-slate-50"
                            onClick={() => toggleRecommendation(rec.originalIndex)}
                            data-testid={`recommendation-${rec.originalIndex}`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-2 h-2 rounded-full ${getSeverityColor(rec.severity)}`}></div>
                              <span className="font-medium text-slate-900">{rec.title}</span>
                              {rec.wcagLevel && (
                                <Badge variant="outline" className="text-xs">
                                  {rec.wcagLevel}
                                </Badge>
                              )}
                              {rec.eaaCompliance && (
                                <Badge variant="outline" className="text-xs">
                                  EAA
                                </Badge>
                              )}
                            </div>
                            {isRecExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                          
                          {isRecExpanded && (
                            <div className="px-4 pb-4 border-t border-slate-200">
                              <p className="text-sm text-slate-600 mb-3">{rec.description}</p>
                              <p className="text-sm text-slate-600 mb-3 font-medium">{rec.rationale}</p>
                              
                              {rec.exampleHtml && (
                                <div className="bg-slate-50 rounded-lg p-3 mb-3">
                                  <h5 className="text-sm font-medium text-slate-900 mb-2">HTML Fix:</h5>
                                  <pre className="text-xs text-slate-700 font-mono whitespace-pre-wrap">
                                    <code>{rec.exampleHtml}</code>
                                  </pre>
                                </div>
                              )}
                              
                              {rec.exampleCss && (
                                <div className="bg-slate-900 rounded-lg p-3 mb-3">
                                  <h5 className="text-sm font-medium text-white mb-2">CSS Fix:</h5>
                                  <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                                    <code>{rec.exampleCss}</code>
                                  </pre>
                                </div>
                              )}
                              
                              {rec.cspSnippet && (
                                <div className="bg-slate-900 rounded-lg p-3 mb-3">
                                  <h5 className="text-sm font-medium text-white mb-2">CSP Header:</h5>
                                  <pre className="text-xs text-blue-400 font-mono whitespace-pre-wrap">
                                    <code>{rec.cspSnippet}</code>
                                  </pre>
                                </div>
                              )}
                              
                              {rec.exampleJsonLd && (
                                <div className="bg-slate-50 rounded-lg p-3 mb-3">
                                  <h5 className="text-sm font-medium text-slate-900 mb-2">JSON-LD Schema:</h5>
                                  <pre className="text-xs text-slate-700 font-mono whitespace-pre-wrap">
                                    <code>{rec.exampleJsonLd}</code>
                                  </pre>
                                </div>
                              )}
                              
                              <div className="flex items-center space-x-4 text-xs text-slate-500">
                                <span>Severity: {rec.severity}</span>
                                {rec.wcagLevel && <span>WCAG: {rec.wcagLevel}</span>}
                                {rec.eaaCompliance && <span>EAA: {rec.eaaCompliance}</span>}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
