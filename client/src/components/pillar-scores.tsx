import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Accessibility, Shield, Gauge, Bot } from "lucide-react";
import type { ScanResult } from "@/lib/types";

interface PillarScoresProps {
  results: ScanResult[];
}

const PILLAR_CONFIG = {
  accessibility: {
    icon: Accessibility,
    label: "Accessibility",
    color: "text-blue-600",
    weight: "40%"
  },
  trust: {
    icon: Shield,
    label: "Trust",
    color: "text-green-600",
    weight: "20%"
  },
  performance: {
    icon: Gauge,
    label: "Performance",
    color: "text-purple-600",
    weight: "25%"
  },
  agentReadiness: {
    icon: Bot,
    label: "Agent Ready",
    color: "text-indigo-600",
    weight: "15%"
  }
};

function getScoreColor(score: number): string {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-warning";
  return "text-danger";
}

function getProgressColor(score: number): string {
  if (score >= 80) return "bg-success";
  if (score >= 60) return "bg-warning";
  return "bg-danger";
}

function getScoreDescription(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Good compliance";
  if (score >= 60) return "Needs improvement";
  return "Poor performance";
}

export default function PillarScores({ results }: PillarScoresProps) {
  const pillars = Object.entries(PILLAR_CONFIG).map(([key, config]) => {
    const result = results.find(r => r.pillar === key);
    const score = result?.score || 0;
    
    return {
      key,
      config,
      score,
      result
    };
  });

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6" data-testid="pillar-scores">
      {pillars.map(({ key, config, score, result }) => {
        const Icon = config.icon;
        
        return (
          <Card key={key} className="p-4 sm:p-6" data-testid={`pillar-${key}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${config.color}`} />
                <h4 className="text-sm sm:text-base font-semibold text-slate-900">{config.label}</h4>
              </div>
              <span className="text-xs text-slate-500 hidden sm:inline">{config.weight} weight</span>
            </div>
            
            <div className="text-center">
              <div className={`text-2xl sm:text-3xl font-bold mb-2 ${getScoreColor(score)}`} data-testid={`score-${key}`}>
                {score}
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
                <div 
                  className={`h-2 rounded-full ${getProgressColor(score)}`} 
                  style={{ width: `${score}%` }}
                ></div>
              </div>
              <p className="text-xs sm:text-sm text-slate-600">{getScoreDescription(score)}</p>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-200">
              {key === 'accessibility' && result && (
                <>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>axe-core violations:</span>
                    <span data-testid="accessibility-violations">
                      {result.rawData?.totalViolations || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>WCAG AA level:</span>
                    <span className={result.rawData?.wcagLevel === 'AA' ? 'text-success' : 'text-warning'}>
                      {result.rawData?.wcagLevel || 'Partial'}
                    </span>
                  </div>
                </>
              )}
              
              {key === 'trust' && result && (
                <>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Security headers:</span>
                    <span data-testid="security-headers">
                      {result.rawData?.headers?.present?.length || 0}/8
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Privacy policy:</span>
                    <span className={result.rawData?.policies?.privacyPolicy ? 'text-success' : 'text-danger'}>
                      {result.rawData?.policies?.privacyPolicy ? 'Found' : 'Missing'}
                    </span>
                  </div>
                </>
              )}
              
              {key === 'performance' && result && (
                <>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Core Web Vitals:</span>
                    <span className={score >= 75 ? 'text-success' : 'text-danger'}>
                      {score >= 75 ? 'Passed' : 'Failed'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Lighthouse score:</span>
                    <span data-testid="lighthouse-score">
                      {result.rawData?.lighthouseScore || score}
                    </span>
                  </div>
                </>
              )}
              
              {key === 'agentReadiness' && result && (
                <>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Structured data:</span>
                    <span className={result.rawData?.structuredData?.total > 0 ? 'text-success' : 'text-danger'}>
                      {result.rawData?.structuredData?.total > 0 ? 'Rich' : 'None'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Robots.txt:</span>
                    <span className={result.rawData?.robots?.valid ? 'text-success' : 'text-danger'}>
                      {result.rawData?.robots?.valid ? 'Valid' : 'Invalid'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
