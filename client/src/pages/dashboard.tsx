import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import ScanForm from "@/components/scan-form";
import ScanProgress from "@/components/scan-progress";
import { Card } from "@/components/ui/card";
import Layout from "@/components/layout";

export default function Dashboard() {
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [, navigate] = useLocation();

  const { data: recentScans } = useQuery({
    queryKey: ['/api/scans'],
    enabled: true
  });

  const { data: activeScanData } = useQuery({
    queryKey: ['/api/scans', activeScanId],
    enabled: !!activeScanId,
    refetchInterval: (data: any) => {
      const status = data?.scan?.status;
      return (status === 'scanning' || status === 'pending') ? 2000 : false;
    },
    refetchOnWindowFocus: true,
    staleTime: 1000
  });

  const handleScanStarted = (scanId: string) => {
    setActiveScanId(scanId);
  };

  const isScanning = activeScanData?.scan?.status === 'scanning' || activeScanData?.scan?.status === 'pending';
  const isCompleted = activeScanData?.scan?.status === 'completed';

  // If scan is complete, navigate to the report page
  if (isCompleted && activeScanId) {
    navigate(`/scan/${activeScanId}`);
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6">
        {/* URL Input Section */}
        <ScanForm onScanStarted={handleScanStarted} />

        {/* Current Scan Progress */}
        {activeScanId && isScanning && (
          <ScanProgress 
            scanId={activeScanId} 
            url={activeScanData?.scan?.url} 
            status={activeScanData?.scan?.status}
          />
        )}

        {/* Recent Scans */}
        {!activeScanId && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Scans</h3>
            {recentScans && (recentScans as any).length > 0 ? (
              <div className="space-y-3">
                {(recentScans as any).slice(0, 5).map((scan: any) => (
                  <div 
                    key={scan.id} 
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer gap-2"
                    onClick={() => navigate(`/scan/${scan.id}`)}
                    data-testid={`scan-item-${scan.id}`}
                  >
                    <div>
                      <p className="font-medium text-slate-900">{scan.url}</p>
                      <p className="text-sm text-slate-500">
                        {new Date(scan.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 justify-between sm:justify-end">
                      {scan.overallScore !== null && (
                        <div className="text-right">
                          <div className="text-lg sm:text-xl font-bold text-slate-900">{scan.overallScore}</div>
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
      </div>
    </Layout>
  );
}