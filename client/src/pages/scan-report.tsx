import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import PillarScores from "@/components/pillar-scores";
import OverallScore from "@/components/overall-score";
import Recommendations from "@/components/recommendations";
import AccessibilityDetails from "@/components/accessibility-details";
import AgentReadinessDetails from "@/components/agent-readiness-details";
import PerformanceDetails from "@/components/performance-details";
import TrustSecurityDetails from "@/components/trust-security-details";
import ScreenshotViewer from "@/components/screenshot-viewer";
import VisualInsights from "@/components/visual-insights";
import { MultiPageResults } from "@/components/multi-page-results";
import { aggregateMultiPageData } from "@/lib/aggregate-multi-page-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, ExternalLink } from "lucide-react";
import Layout from "@/components/layout";

export default function ScanReport() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [isViewingIndividualPage, setIsViewingIndividualPage] = useState(false);

  const { data: scanData, isLoading } = useQuery({
    queryKey: ['/api/scans', id],
    enabled: !!id,
  });

  const { data: scanEvidence } = useQuery({
    queryKey: [`/api/scans/${id}/evidence`],
    enabled: !!id && scanData?.scan?.status === 'completed'
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!scanData || !scanData.scan) {
    return (
      <Layout>
        <div className="p-6">
          <p className="text-gray-500">Scan not found</p>
          <Button onClick={() => navigate("/")} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  const isCompleted = scanData.scan.status === 'completed';

  if (!isCompleted) {
    return (
      <Layout>
        <div className="p-6">
          <p className="text-gray-500">This scan is still in progress. Please check back later.</p>
          <Button onClick={() => navigate("/")} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6">
        {/* Back button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Website Header */}
        <div className="text-center space-y-2 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Website Analysis Report</h1>
          <div className="flex items-center justify-center gap-2 text-lg sm:text-xl text-blue-600">
            <Globe className="h-5 w-5" />
            <span className="font-semibold break-all">{scanData.scan.url}</span>
            <button 
              className="p-1 hover:bg-slate-100 rounded transition-colors"
              onClick={() => window.open(scanData.scan.url, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Show Overall Grade and PillarScores first for multi-page scans */}
        {!isViewingIndividualPage && (() => {
          const multiPageData = Array.isArray(scanEvidence) ? scanEvidence?.find((e: any) => e.type === 'multi_page_scan')?.data : null;
          if (multiPageData) {
            return (
              <>
                <OverallScore report={scanData.report} results={scanData.results} />
                <PillarScores results={scanData.results} />
              </>
            );
          }
          return null;
        })()}

        {/* Multi-page scan results */}
        {(() => {
          const multiPageData = Array.isArray(scanEvidence) ? scanEvidence?.find((e: any) => e.type === 'multi_page_scan')?.data : null;
          if (multiPageData) {
            return <MultiPageResults data={multiPageData} evidence={scanEvidence as any} scanId={id} onPageViewChange={setIsViewingIndividualPage} />;
          }
          return null;
        })()}
        
        {/* Detailed analysis components */}
        {!isViewingIndividualPage && (() => {
          const accessibilityRawData = scanData.results?.find((r: any) => r.pillar === 'accessibility')?.rawData;
          const performanceRawData = scanData.results?.find((r: any) => r.pillar === 'performance')?.rawData;
          const trustRawData = scanData.results?.find((r: any) => r.pillar === 'trust')?.rawData;
          const agentRawData = scanData.results?.find((r: any) => r.pillar === 'agentReadiness')?.rawData;
          
          const isMultiPageData = accessibilityRawData?.multiPage === true;
          let aggregatedData: any = {};
          
          if (isMultiPageData) {
            aggregatedData = aggregateMultiPageData(accessibilityRawData);
          }
          
          const multiPageData = Array.isArray(scanEvidence) ? scanEvidence?.find((e: any) => e.type === 'multi_page_scan')?.data : null;
          
          return (
            <>
              {/* Only show these for single-page scans */}
              {!multiPageData && (
                <>
                  <PillarScores results={scanData.results} />
                  <OverallScore report={scanData.report} results={scanData.results} />
                </>
              )}
              {id && <ScreenshotViewer scanId={id} evidence={scanEvidence as any} />}
              <VisualInsights insights={scanData.report?.geminiAnalysis?.visualInsights} />
              
              {/* Detailed Analysis in Tabs */}
              <Tabs defaultValue="accessibility" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="accessibility">Accessibility</TabsTrigger>
                  <TabsTrigger value="trust">Trust & Security</TabsTrigger>
                  <TabsTrigger value="performance">Performance</TabsTrigger>
                  <TabsTrigger value="agent">Agent Readiness</TabsTrigger>
                  <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                </TabsList>
                <TabsContent value="accessibility">
                  <AccessibilityDetails 
                    rawData={isMultiPageData ? aggregatedData.accessibility : accessibilityRawData}
                  />
                </TabsContent>
                <TabsContent value="trust">
                  <TrustSecurityDetails
                    rawData={isMultiPageData ? aggregatedData.security : trustRawData}
                  />
                </TabsContent>
                <TabsContent value="performance">
                  <PerformanceDetails
                    rawData={isMultiPageData ? aggregatedData.performance : performanceRawData}
                  />
                </TabsContent>
                <TabsContent value="agent">
                  <AgentReadinessDetails
                    rawData={isMultiPageData ? aggregatedData.agentReadiness : agentRawData}
                  />
                </TabsContent>
                <TabsContent value="recommendations">
                  <Recommendations report={scanData.report} />
                </TabsContent>
              </Tabs>
            </>
          );
        })()}
      </div>
    </Layout>
  );
}