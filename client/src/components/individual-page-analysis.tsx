import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Globe } from "lucide-react";
import PillarScores from "@/components/pillar-scores";
import AccessibilityDetails from "@/components/accessibility-details";
import TrustSecurityDetails from "@/components/trust-security-details";
import PerformanceDetails from "@/components/performance-details";
import AgentReadinessDetails from "@/components/agent-readiness-details";
import { Badge } from "@/components/ui/badge";

interface IndividualPageAnalysisProps {
  pageData: any;
  onBack: () => void;
  evidence?: any[];
  scanId?: string;
}

export default function IndividualPageAnalysis({ pageData, onBack, evidence, scanId }: IndividualPageAnalysisProps) {
  if (!pageData) return null;
  
  // Calculate overall score from individual pillar scores
  const calculateOverallScore = () => {
    const scores = [
      pageData.accessibility?.score || 0,
      pageData.security?.score || 0,
      pageData.performance?.score || 0,
      pageData.agentReadiness?.score || 0
    ].filter(score => score > 0);
    
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };
  
  const overallScore = pageData.overallScore || calculateOverallScore();

  const getPageTypeLabel = (pageType: string) => {
    switch (pageType) {
      case "cart": return "Shopping Cart";
      case "checkout": return "Checkout";
      case "booking": return "Booking";
      case "product": return "Product Page";
      case "homepage": return "Homepage";
      default: return "Page";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  // Transform page data to match the format expected by pillar scores
  const pillarResults = [
    {
      pillar: "accessibility",
      score: pageData.accessibility?.score || 0,
      rawData: pageData.accessibility
    },
    {
      pillar: "trust",
      score: pageData.security?.score || 0,
      rawData: pageData.security
    },
    {
      pillar: "performance",
      score: pageData.performance?.score || 0,
      rawData: pageData.performance
    },
    {
      pillar: "agentReadiness",
      score: pageData.agentReadiness?.score || 0,
      rawData: pageData.agentReadiness
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={onBack}
                className="hover:bg-white"
                data-testid="back-to-overview"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Overview
              </Button>
              <div>
                <CardTitle className="text-indigo-900 flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Individual Page Analysis
                </CardTitle>
              </div>
            </div>
            <Badge variant="secondary" className="text-sm">
              {getPageTypeLabel(pageData.pageType)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <p className="text-sm text-indigo-800 font-mono break-all">
              {pageData.url}
            </p>
            <a
              href={pageData.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-800"
              data-testid="external-link"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Overall score for this page */}
      <Card>
        <CardHeader>
          <CardTitle>Page Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Overall Score</p>
              <p className={`text-2xl font-bold ${getScoreColor(overallScore)}`}>
                {overallScore}%
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Accessibility</p>
              <p className={`text-xl font-bold ${getScoreColor(pageData.accessibility?.score || 0)}`}>
                {pageData.accessibility?.score || 0}%
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Performance</p>
              <p className={`text-xl font-bold ${getScoreColor(pageData.performance?.score || 0)}`}>
                {pageData.performance?.score || 0}%
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Security</p>
              <p className={`text-xl font-bold ${getScoreColor(pageData.security?.score || 0)}`}>
                {pageData.security?.score || 0}%
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Agent Ready</p>
              <p className={`text-xl font-bold ${getScoreColor(pageData.agentReadiness?.score || 0)}`}>
                {pageData.agentReadiness?.score || 0}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pillar Scores */}
      <PillarScores results={pillarResults} />
      
      {/* Screenshots for this page */}
      {evidence && scanId && (
        <Card>
          <CardHeader>
            <CardTitle>Page Screenshots</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {evidence
                .filter((e: any) => e.type === 'screenshot' && e.data?.url === pageData.url)
                .map((screenshot: any, index: number) => (
                  <div key={index} className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {screenshot.data.device === 'desktop' ? 'Desktop View' : 'Mobile View'}
                    </p>
                    <img 
                      src={`/api/scans/${scanId}/evidence/${screenshot.id}/file`}
                      alt={`${screenshot.data.device} screenshot`}
                      className="w-full rounded-lg border"
                      loading="lazy"
                    />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Analysis Components */}
      <AccessibilityDetails rawData={pageData.accessibility} />
      <TrustSecurityDetails rawData={pageData.security} />
      <PerformanceDetails rawData={pageData.performance} />
      <AgentReadinessDetails rawData={pageData.agentReadiness} />

      {/* E-commerce Analysis if available */}
      {pageData.ecommerceAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle>E-commerce Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(pageData.ecommerceAnalysis).map(([key, value]) => {
                  if (typeof value === 'boolean' && key !== 'bookingSystemDetails') {
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${value ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <span className="text-sm capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
              
              {/* Booking System Details */}
              {pageData.ecommerceAnalysis.bookingSystemDetails && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h5 className="font-medium mb-3 text-blue-900">Booking System Details</h5>
                  
                  {pageData.ecommerceAnalysis.bookingSystemDetails.provider && (
                    <div className="mb-2">
                      <span className="text-sm font-medium text-blue-800">Provider: </span>
                      <span className="text-sm text-blue-700">{pageData.ecommerceAnalysis.bookingSystemDetails.provider}</span>
                    </div>
                  )}
                  
                  {pageData.ecommerceAnalysis.bookingSystemDetails.platform && (
                    <div className="mb-2">
                      <span className="text-sm font-medium text-blue-800">Platform: </span>
                      <span className="text-sm text-blue-700">{pageData.ecommerceAnalysis.bookingSystemDetails.platform}</span>
                    </div>
                  )}
                  
                  {pageData.ecommerceAnalysis.bookingSystemDetails.thirdParties?.length > 0 && (
                    <div className="mb-2">
                      <span className="text-sm font-medium text-blue-800">Third-Party Integrations:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {pageData.ecommerceAnalysis.bookingSystemDetails.thirdParties.map((party: string, idx: number) => (
                          <span key={idx} className="text-xs px-2 py-1 bg-white rounded border border-blue-300">
                            {party}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {pageData.ecommerceAnalysis.bookingSystemDetails.features?.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-blue-800">Features Detected:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {pageData.ecommerceAnalysis.bookingSystemDetails.features.map((feature: string, idx: number) => (
                          <span key={idx} className="text-xs px-2 py-1 bg-green-100 rounded text-green-800">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {pageData.ecommerceAnalysis.issues && pageData.ecommerceAnalysis.issues.length > 0 && (
                <div>
                  <h5 className="font-medium mb-2">Issues</h5>
                  <ul className="space-y-1">
                    {pageData.ecommerceAnalysis.issues.map((issue: string, index: number) => (
                      <li key={index} className="text-sm text-red-600">• {issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}