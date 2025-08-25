import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, Loader2, Globe, AlertCircle } from "lucide-react";

interface ScanProgressProps {
  scanId: string;
  url?: string;
  status?: string;
}

export default function ScanProgress({ scanId, url, status }: ScanProgressProps) {
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Fetch real progress data from backend
  const { data: scanData } = useQuery({
    queryKey: ['/api/scans', scanId],
    enabled: !!scanId && status === 'scanning',
    refetchInterval: 1000, // Update every second
  });
  
  const progress = (scanData as any)?.progress;
  const discoveredPages = progress?.discoveredPages || [];
  
  // Update elapsed time
  useEffect(() => {
    if (status !== 'scanning') return;
    
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedTime(elapsed);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [status, startTime]);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Helper to extract page name from URL
  const getPageName = (pageUrl: string) => {
    if (!pageUrl) return 'Page';
    
    // Remove protocol and www
    const cleanUrl = pageUrl.replace(/^https?:\/\/(www\.)?/, '');
    
    // Extract path
    const parts = cleanUrl.split('/');
    const domain = parts[0];
    const path = parts.slice(1).join('/');
    
    // Return shortened version
    if (!path || path === '') return domain;
    
    // Truncate long paths
    const shortPath = path.length > 30 ? path.substring(0, 30) + '...' : path;
    return `${domain}/${shortPath}`;
  };
  
  // Use real progress or default values
  const currentStage = progress?.stage || 'initializing';
  const currentPage = progress?.currentPage || 0;
  const totalPages = progress?.totalPages || 4;
  const message = progress?.message || 'Starting scan...';
  const percentage = progress?.percentage || 0;
  const currentPageUrl = progress?.pageUrl;
  
  // Estimate remaining time based on progress
  const estimatedTotal = percentage > 0 ? (elapsedTime / percentage) * 100 : 360;
  const estimatedRemaining = Math.max(0, Math.round(estimatedTotal - elapsedTime));
  
  if (status !== 'scanning') return null;

  return (
    <Card className="p-6 mb-6" data-testid="scan-progress">
      {/* Header with URL and status */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900 mb-1">
            Multi-Page Website Analysis in Progress
          </h3>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Globe className="w-4 h-4" />
            <span className="truncate" data-testid="scan-url">{url || 'Unknown'}</span>
          </div>
        </div>
        <Badge variant="default" className="bg-blue-500">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Scanning {totalPages} Pages
        </Badge>
      </div>
      
      {/* Time and Progress */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <p className="text-xs text-slate-500 mb-1">Elapsed Time</p>
          <p className="text-lg font-semibold">{formatTime(elapsedTime)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">Est. Time Remaining</p>
          <p className="text-lg font-semibold text-blue-600">~{formatTime(estimatedRemaining)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">Overall Progress</p>
          <p className="text-lg font-semibold">{percentage}%</p>
        </div>
      </div>
      
      {/* Main Progress Bar */}
      <div className="mb-6">
        <Progress value={percentage} className="h-3" data-testid="progress-bar" />
      </div>
      
      {/* Current Stage Display */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900">
                {currentStage === 'crawling' ? 'Discovering Pages' : 
                 currentStage === 'scanning' && currentPageUrl ? 
                   (currentPageUrl.includes(url?.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] || '') && 
                    currentPageUrl.split('/').length <= 4 ? 'Homepage' : getPageName(currentPageUrl)) :
                 currentStage === 'scanning' ? `Analyzing Page ${currentPage} of ${totalPages}` :
                 currentStage === 'finalizing' ? 'Generating Report' :
                 'Processing...'}
              </p>
              <p className="text-sm text-slate-600">
                {message}
              </p>
            </div>
          </div>
          {currentPage > 0 && currentStage === 'scanning' && (
            <span className="text-sm text-slate-500">
              Page {currentPage}/{totalPages}
            </span>
          )}
        </div>
      </div>
      
      {/* Stage Progress Indicators - Show actual discovered pages */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-700">Analysis Pipeline</h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Crawling Stage */}
          <div className={`p-3 rounded-lg border ${
            currentStage === 'crawling' ? 'border-blue-500 bg-blue-50' :
            currentPage > 0 || currentStage === 'finalizing' ? 'border-green-500 bg-green-50' :
            'border-slate-200 bg-white'
          }`}>
            <div className="flex items-center gap-2">
              {currentStage === 'crawling' ? (
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              ) : currentPage > 0 || currentStage === 'finalizing' ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Clock className="w-4 h-4 text-slate-400" />
              )}
              <span className="text-sm font-medium">Page Discovery</span>
            </div>
          </div>
          
          {/* Page Scanning Stages - Use actual discovered pages or placeholders */}
          {discoveredPages.length > 0 ? (
            // Show actual discovered pages
            discoveredPages.map((pageUrl: string, index: number) => {
              const pageNum = index + 1;
              const isHomepage = pageUrl.includes(url?.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] || '') && 
                               pageUrl.split('/').length <= 4;
              const pageName = isHomepage ? 'Homepage' : getPageName(pageUrl);
              
              return (
                <div key={pageNum} className={`p-3 rounded-lg border ${
                  currentStage === 'scanning' && currentPage === pageNum ? 'border-blue-500 bg-blue-50' :
                  currentPage > pageNum || currentStage === 'finalizing' ? 'border-green-500 bg-green-50' :
                  'border-slate-200 bg-white'
                }`}>
                  <div className="flex items-center gap-2">
                    {currentStage === 'scanning' && currentPage === pageNum ? (
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    ) : currentPage > pageNum || currentStage === 'finalizing' ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-slate-400" />
                    )}
                    <span className="text-sm font-medium truncate" title={pageUrl}>
                      {pageNum}. {pageName}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            // Show placeholder pages during discovery - use actual total pages
            Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <div key={pageNum} className={`p-3 rounded-lg border ${
                currentStage === 'scanning' && currentPage === pageNum ? 'border-blue-500 bg-blue-50' :
                currentPage > pageNum || currentStage === 'finalizing' ? 'border-green-500 bg-green-50' :
                'border-slate-200 bg-white'
              }`}>
                <div className="flex items-center gap-2">
                  {currentStage === 'scanning' && currentPage === pageNum ? (
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                  ) : currentPage > pageNum || currentStage === 'finalizing' ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Clock className="w-4 h-4 text-slate-400" />
                  )}
                  <span className="text-sm font-medium">
                    {pageNum}. {pageNum === 1 ? 'Discovering...' : `Page ${pageNum}`}
                  </span>
                </div>
              </div>
            ))
          )}
          
          {/* Finalizing Stage */}
          <div className={`p-3 rounded-lg border ${
            currentStage === 'finalizing' ? 'border-blue-500 bg-blue-50' :
            'border-slate-200 bg-white'
          }`}>
            <div className="flex items-center gap-2">
              {currentStage === 'finalizing' ? (
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              ) : (
                <Clock className="w-4 h-4 text-slate-400" />
              )}
              <span className="text-sm font-medium">Final Report</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Current Analysis Details */}
      {currentStage === 'scanning' && currentPage > 0 && (
        <div className="mt-4 p-3 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-600 mb-2">Currently analyzing:</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-blue-600" />
              <span className="text-xs">Accessibility</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-purple-600" />
              <span className="text-xs">Performance</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-green-600" />
              <span className="text-xs">Security</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-indigo-600" />
              <span className="text-xs">SEO/Agent</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Info Footer */}
      <div className="mt-6 pt-4 border-t border-slate-200">
        <p className="text-xs text-slate-500 text-center">
          Comprehensive analysis typically takes 5-7 minutes. We're analyzing {totalPages} critical pages
          across accessibility, performance, security, and SEO pillars.
        </p>
      </div>
    </Card>
  );
}