import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, Loader2, Globe, ShoppingCart, Calendar, Package, Home, AlertCircle, Shield, Gauge, Bot } from "lucide-react";

interface ScanProgressProps {
  scanId: string;
  url?: string;
  status?: string;
}

// Define the stages of a multi-page scan
const SCAN_STAGES = [
  { id: 'crawling', label: 'Discovering Pages', description: 'Finding homepage, shop, booking, and content pages' },
  { id: 'page1', label: 'Homepage Analysis', description: 'Analyzing accessibility, performance, security, and SEO' },
  { id: 'page2', label: 'Shop/Products Page', description: 'Evaluating e-commerce functionality and user experience' },
  { id: 'page3', label: 'Booking/Checkout', description: 'Testing transaction flows and security' },
  { id: 'page4', label: 'Trust/Content Page', description: 'Reviewing policies and trust signals' },
  { id: 'ai_analysis', label: 'AI Analysis', description: 'Generating insights and recommendations' },
  { id: 'finalizing', label: 'Finalizing Report', description: 'Compiling results and calculating scores' }
];

const PILLAR_ICONS = {
  accessibility: { icon: AlertCircle, color: 'text-blue-600' },
  performance: { icon: Gauge, color: 'text-purple-600' },
  security: { icon: Shield, color: 'text-green-600' },
  seo: { icon: Bot, color: 'text-indigo-600' }
};

export default function ScanProgress({ scanId, url, status }: ScanProgressProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [currentSubTask, setCurrentSubTask] = useState('Initializing scan...');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(360); // 6 minutes default
  const [startTime] = useState(Date.now());
  
  // Simulate progress through stages (in production, this would come from backend)
  useEffect(() => {
    if (status !== 'scanning') return;
    
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedTime(elapsed);
      
      // Estimate progress based on elapsed time (6 minutes total)
      const progress = Math.min((elapsed / 360) * 100, 100);
      const stageIndex = Math.floor((progress / 100) * SCAN_STAGES.length);
      setCurrentStage(Math.min(stageIndex, SCAN_STAGES.length - 1));
      
      // Update estimated time remaining
      const remaining = Math.max(360 - elapsed, 0);
      setEstimatedTimeRemaining(remaining);
      
      // Set current sub-task based on stage
      const subTasks = [
        'Connecting to website...',
        'Analyzing page structure...',
        'Running accessibility checks...',
        'Measuring performance metrics...',
        'Validating security headers...',
        'Checking SEO compliance...',
        'Processing results...'
      ];
      setCurrentSubTask(subTasks[stageIndex % subTasks.length]);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [status]);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const overallProgress = Math.min((currentStage / SCAN_STAGES.length) * 100, 100);
  
  if (status !== 'scanning') return null;

  return (
    <Card className="p-6 mb-6 animate-pulse-subtle" data-testid="scan-progress">
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
          Analyzing 4 Pages
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
          <p className="text-lg font-semibold text-blue-600">{formatTime(estimatedTimeRemaining)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">Overall Progress</p>
          <p className="text-lg font-semibold">{Math.round(overallProgress)}%</p>
        </div>
      </div>
      
      {/* Main Progress Bar */}
      <div className="mb-6">
        <Progress value={overallProgress} className="h-3" data-testid="progress-bar" />
      </div>
      
      {/* Current Stage Display */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">
                {SCAN_STAGES[currentStage]?.label || 'Initializing...'}
              </p>
              <p className="text-sm text-slate-600">
                {SCAN_STAGES[currentStage]?.description}
              </p>
            </div>
          </div>
          <span className="text-sm text-slate-500">
            Stage {currentStage + 1} of {SCAN_STAGES.length}
          </span>
        </div>
        <p className="text-sm text-blue-700 mt-2 animate-pulse">
          {currentSubTask}
        </p>
      </div>
      
      {/* Stage Timeline */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-700">Analysis Pipeline</h4>
        <div className="space-y-2">
          {SCAN_STAGES.map((stage, index) => {
            const isCompleted = index < currentStage;
            const isCurrent = index === currentStage;
            const isPending = index > currentStage;
            
            return (
              <div 
                key={stage.id} 
                className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                  isCurrent ? 'bg-blue-50 border border-blue-200' : ''
                }`}
                data-testid={`stage-${stage.id}`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isCompleted 
                    ? 'bg-green-500 text-white' 
                    : isCurrent
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-200 text-slate-400'
                }`}>
                  {isCompleted ? (
                    <Check className="w-3 h-3" />
                  ) : isCurrent ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <span className="text-xs">{index + 1}</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    isPending ? 'text-slate-400' : 'text-slate-700'
                  }`}>
                    {stage.label}
                  </p>
                  {isCurrent && (
                    <div className="flex gap-4 mt-1">
                      {Object.entries(PILLAR_ICONS).map(([pillar, config]) => (
                        <div key={pillar} className="flex items-center gap-1">
                          <config.icon className={`w-3 h-3 ${config.color}`} />
                          <span className="text-xs text-slate-500 capitalize">{pillar}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {isCompleted && (
                  <span className="text-xs text-green-600 font-medium">Complete</span>
                )}
                {isCurrent && (
                  <span className="text-xs text-blue-600 font-medium animate-pulse">In Progress</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Info Footer */}
      <div className="mt-6 pt-4 border-t border-slate-200">
        <p className="text-xs text-slate-500 text-center">
          Analyzing 4 critical pages across accessibility, performance, security, and SEO pillars.
          This comprehensive analysis typically takes 5-7 minutes to complete.
        </p>
      </div>
    </Card>
  );
}