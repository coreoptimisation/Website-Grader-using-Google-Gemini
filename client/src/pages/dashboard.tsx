import { useState, useEffect } from "react";
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

  // Navigate to report page when scan is complete
  useEffect(() => {
    if (isCompleted && activeScanId) {
      navigate(`/scan/${activeScanId}`);
    }
  }, [isCompleted, activeScanId, navigate]);

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

      </div>
    </Layout>
  );
}