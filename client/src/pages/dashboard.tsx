import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Search, Plus, History, FileText, Settings, SearchCode, Trash2 } from "lucide-react";
import ScanForm from "@/components/scan-form";
import ScanProgress from "@/components/scan-progress";
import PillarScores from "@/components/pillar-scores";
import OverallScore from "@/components/overall-score";
import Recommendations from "@/components/recommendations";
import AccessibilityDetails from "@/components/accessibility-details";
import AgentReadinessDetails from "@/components/agent-readiness-details";
import PerformanceDetails from "@/components/performance-details";
import TrustSecurityDetails from "@/components/trust-security-details";
import ScreenshotViewer from "@/components/screenshot-viewer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { ScanData } from "@/lib/types";

export default function Dashboard() {
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'history'>('dashboard');
  const { toast } = useToast();

  const { data: recentScans } = useQuery({
    queryKey: ['/api/scans'],
    enabled: true
  });

  const { data: activeScanData, isLoading: scanLoading } = useQuery({
    queryKey: ['/api/scans', activeScanId],
    enabled: !!activeScanId,
    refetchInterval: (data: any) => {
      // Keep polling while scanning or pending
      const status = data?.scan?.status;
      return (status === 'scanning' || status === 'pending') ? 2000 : false;
    },
    // Ensure we get the final state
    refetchOnWindowFocus: true,
    staleTime: 1000
  });
  
  const isScanning = (activeScanData as any)?.scan?.status === 'scanning';
  const isCompleted = (activeScanData as any)?.scan?.status === 'completed';
  
  const { data: scanEvidence } = useQuery({
    queryKey: ['/api/scans', activeScanId, 'evidence'],
    enabled: !!activeScanId && isCompleted,
  });

  const handleScanStarted = (scanId: string) => {
    setActiveScanId(scanId);
    // Invalidate scans list to show the new scan
    queryClient.invalidateQueries({ queryKey: ['/api/scans'] });
  };

  const deleteScanMutation = useMutation({
    mutationFn: async (scanId: string) => {
      return apiRequest('DELETE', `/api/scans/${scanId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scans'] });
      toast({
        title: "Scan deleted",
        description: "The scan has been successfully deleted."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete the scan. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleDeleteScan = (scanId: string) => {
    if (confirm('Are you sure you want to delete this scan?')) {
      deleteScanMutation.mutate(scanId);
    }
  };

  // When scan completes, invalidate queries to update the UI
  useEffect(() => {
    if (isCompleted && activeScanId) {
      queryClient.invalidateQueries({ queryKey: ['/api/scans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/scans', activeScanId] });
    }
  }, [isCompleted, activeScanId]);

  return (
    <div className="min-h-screen flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white shadow-sm border-r border-slate-200 flex flex-col" data-testid="sidebar">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <SearchCode className="text-white h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Website Grader</h1>
              <p className="text-xs text-slate-500">AI-Powered Analysis</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => {
                  setCurrentView('dashboard');
                  setActiveScanId(null);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg ${
                  currentView === 'dashboard' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
                data-testid="nav-dashboard"
              >
                <Search className="w-5 h-5" />
                <span>Dashboard</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => setCurrentView('dashboard')}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100"
                data-testid="nav-new-scan"
              >
                <Plus className="w-5 h-5" />
                <span>New Scan</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => setCurrentView('history')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg ${
                  currentView === 'history' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
                data-testid="nav-history"
              >
                <History className="w-5 h-5" />
                <span>Scan History</span>
              </button>
            </li>
            <li>
              <a 
                href="#" 
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100"
                data-testid="nav-reports"
              >
                <FileText className="w-5 h-5" />
                <span>Reports</span>
              </a>
            </li>
            <li>
              <a 
                href="#" 
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100"
                data-testid="nav-settings"
              >
                <Settings className="w-5 h-5" />
                <span>Settings</span>
              </a>
            </li>
          </ul>
        </nav>
        
        <div className="p-4 border-t border-slate-200">
          <div className="text-xs text-slate-500">
            <p>EAA Compliant</p>
            <p>Ireland-focused analysis</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Website Analysis Dashboard</h2>
              <p className="text-sm text-slate-600">Comprehensive site grading across 4 key pillars</p>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors"
                data-testid="button-new-scan"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Scan
              </button>
              <div className="w-8 h-8 bg-slate-300 rounded-full" data-testid="user-avatar"></div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto h-full">
          {/* Scan History View */}
          {currentView === 'history' && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">All Scan History</h3>
              {recentScans && (recentScans as any).length > 0 ? (
                <div className="space-y-3">
                  {(recentScans as any).map((scan: any) => (
                    <div 
                      key={scan.id} 
                      className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50"
                      data-testid={`history-scan-${scan.id}`}
                    >
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => {
                          setActiveScanId(scan.id);
                          setCurrentView('dashboard');
                        }}
                      >
                        <p className="font-medium text-slate-900">{scan.url}</p>
                        <p className="text-sm text-slate-500">
                          {new Date(scan.createdAt).toLocaleDateString()} at {new Date(scan.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {scan.overallScore !== null && (
                          <div className="text-right">
                            <div className="text-2xl font-bold text-slate-900">{scan.overallScore}</div>
                            <div className={`text-xs font-medium ${
                              scan.grade === 'A' ? 'text-green-600' :
                              scan.grade === 'B' ? 'text-blue-600' :
                              scan.grade === 'C' ? 'text-yellow-600' :
                              scan.grade === 'D' ? 'text-orange-600' :
                              'text-red-600'
                            }`}>Grade {scan.grade}</div>
                          </div>
                        )}
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          scan.status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : scan.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {scan.status}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteScan(scan.id);
                          }}
                          data-testid={`delete-scan-${scan.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500">No scan history available.</p>
              )}
            </Card>
          )}

          {/* Dashboard View */}
          {currentView === 'dashboard' && (
            <>
              {/* URL Input Section */}
              <ScanForm onScanStarted={handleScanStarted} />

              {/* Current Scan Progress */}
              {activeScanId && (isScanning || scanLoading) && (
                <ScanProgress 
                  scanId={activeScanId} 
                  url={(activeScanData as any)?.scan?.url} 
                  status={(activeScanData as any)?.scan?.status}
                />
              )}

              {/* Results Dashboard */}
              {isCompleted && activeScanData && (
                <>
                  <PillarScores results={(activeScanData as any).results} />
                  <OverallScore report={(activeScanData as any).report} results={(activeScanData as any).results} />
                  {activeScanId && <ScreenshotViewer scanId={activeScanId} evidence={scanEvidence as any} />}
                  <AccessibilityDetails 
                    rawData={(activeScanData as any).results?.find((r: any) => r.pillar === 'accessibility')?.rawData}
                  />
                  <TrustSecurityDetails
                    rawData={(activeScanData as any).results?.find((r: any) => r.pillar === 'trust')?.rawData}
                  />
                  <PerformanceDetails
                    rawData={(activeScanData as any).results?.find((r: any) => r.pillar === 'performance')?.rawData}
                  />
                  <AgentReadinessDetails
                    rawData={(activeScanData as any).results?.find((r: any) => r.pillar === 'agentReadiness')?.rawData}
                  />
                  <Recommendations report={(activeScanData as any).report} />
                </>
              )}

              {/* Recent Scans */}
              {!activeScanId && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Scans</h3>
                  {recentScans && (recentScans as any).length > 0 ? (
                    <div className="space-y-3">
                      {(recentScans as any).map((scan: any) => (
                        <div 
                          key={scan.id} 
                          className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                          onClick={() => setActiveScanId(scan.id)}
                          data-testid={`scan-item-${scan.id}`}
                        >
                          <div>
                            <p className="font-medium text-slate-900">{scan.url}</p>
                            <p className="text-sm text-slate-500">
                              {new Date(scan.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            {scan.overallScore !== null && (
                              <div className="text-right">
                                <div className="text-xl font-bold text-slate-900">{scan.overallScore}</div>
                                <div className={`text-xs font-medium ${
                                  scan.grade === 'A' ? 'text-green-600' :
                                  scan.grade === 'B' ? 'text-blue-600' :
                                  scan.grade === 'C' ? 'text-yellow-600' :
                                  scan.grade === 'D' ? 'text-orange-600' :
                                  'text-red-600'
                                }`}>Grade {scan.grade}</div>
                              </div>
                            )}
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              scan.status === 'completed' 
                                ? 'bg-green-100 text-green-800' 
                                : scan.status === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {scan.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500">No recent scans. Start your first scan above.</p>
                  )}
                </Card>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
