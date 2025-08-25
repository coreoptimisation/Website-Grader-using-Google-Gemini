import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout";

export default function History() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const { data: scans } = useQuery({
    queryKey: ['/api/scans'],
  });

  const deleteScanMutation = useMutation({
    mutationFn: async (scanId: string) => {
      return await apiRequest(`/api/scans/${scanId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scans'] });
      toast({
        title: "Scan deleted",
        description: "The scan has been removed from your history.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete the scan. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleDeleteScan = (scanId: string) => {
    if (window.confirm('Are you sure you want to delete this scan?')) {
      deleteScanMutation.mutate(scanId);
    }
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">All Scan History</h3>
          {scans && (scans as any).length > 0 ? (
            <div className="space-y-3">
              {(scans as any).map((scan: any) => (
                <div 
                  key={scan.id} 
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 gap-2"
                  data-testid={`history-scan-${scan.id}`}
                >
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => navigate(`/scan/${scan.id}`)}
                  >
                    <p className="font-medium text-slate-900">{scan.url}</p>
                    <p className="text-sm text-slate-500">
                      {new Date(scan.createdAt).toLocaleDateString()} at {new Date(scan.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 justify-between sm:justify-end">
                    {scan.overallScore !== null && (
                      <div className="text-right">
                        <div className="text-xl sm:text-2xl font-bold text-slate-900">{scan.overallScore}</div>
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
      </div>
    </Layout>
  );
}