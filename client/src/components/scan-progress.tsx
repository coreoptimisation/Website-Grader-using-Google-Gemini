import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Check, Clock, Loader2 } from "lucide-react";

interface ScanProgressProps {
  scanId: string;
  url?: string;
  status?: string;
}

const SCAN_STEPS = [
  { id: 'accessibility', label: 'Accessibility', icon: Check },
  { id: 'performance', label: 'Performance', icon: Loader2 },
  { id: 'security', label: 'Security', icon: Clock },
  { id: 'agentReady', label: 'Agent Ready', icon: Clock }
];

export default function ScanProgress({ scanId, url, status }: ScanProgressProps) {
  // Mock progress calculation - in real app this would come from scan status
  const progress = status === 'scanning' ? 45 : 0;

  return (
    <Card className="p-6 mb-6" data-testid="scan-progress">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">
          Current Scan: <span className="text-primary" data-testid="scan-url">{url || 'Unknown'}</span>
        </h3>
        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium" data-testid="scan-status">
          <Loader2 className="w-4 h-4 mr-1 animate-spin inline" />
          Scanning...
        </span>
      </div>
      
      <div className="space-y-4">
        {/* Progress Steps */}
        <div className="grid grid-cols-4 gap-4">
          {SCAN_STEPS.map((step, index) => {
            const isCompleted = index < 1; // Mock: first step completed
            const isCurrent = index === 1;  // Mock: second step in progress
            const isPending = index > 1;    // Mock: remaining steps pending
            
            return (
              <div key={step.id} className="flex items-center space-x-3" data-testid={`step-${step.id}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isCompleted 
                    ? 'bg-success text-white' 
                    : isCurrent
                    ? 'bg-primary text-white'
                    : 'bg-slate-300 text-slate-600'
                }`}>
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )}
                </div>
                <span className={`text-sm font-medium ${
                  isPending ? 'text-slate-500' : 'text-slate-700'
                }`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
        
        {/* Overall Progress Bar */}
        <div className="space-y-2">
          <Progress value={progress} className="w-full" data-testid="progress-bar" />
          <p className="text-sm text-slate-600">Running Lighthouse and axe-core analysis...</p>
        </div>
      </div>
    </Card>
  );
}
