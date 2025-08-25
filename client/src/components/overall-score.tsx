import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ScanReport, ScanResult } from "@/lib/types";

interface OverallScoreProps {
  report: ScanReport;
  results: ScanResult[];
}

function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A': return 'text-success';
    case 'B': return 'text-warning';
    case 'C': return 'text-warning';
    case 'D': return 'text-danger';
    case 'F': return 'text-danger';
    default: return 'text-slate-600';
  }
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-success';
  if (score >= 60) return 'text-warning';
  return 'text-danger';
}

function getImpactColor(impact: string): string {
  switch (impact) {
    case 'High': return 'border-red-200 bg-red-50';
    case 'Medium': return 'border-yellow-200 bg-yellow-50';
    case 'Low': return 'border-blue-200 bg-blue-50';
    default: return 'border-slate-200 bg-slate-50';
  }
}

function getPriorityColor(priority: number): string {
  // All numbered badges should have consistent styling since they just indicate order
  return 'bg-slate-600 text-white';
}

export default function OverallScore({ report, results }: OverallScoreProps) {
  // Calculate weighted scores breakdown
  const accessibilityResult = results.find(r => r.pillar === 'accessibility');
  const trustResult = results.find(r => r.pillar === 'trust');
  const performanceResult = results.find(r => r.pillar === 'performance');
  const agentResult = results.find(r => r.pillar === 'agentReadiness');

  const weights = {
    accessibility: 0.40,
    trust: 0.20,
    performance: 0.25,
    agentReadiness: 0.15
  };

  const weightedScores = {
    accessibility: (accessibilityResult?.score || 0) * weights.accessibility,
    trust: (trustResult?.score || 0) * weights.trust,
    performance: (performanceResult?.score || 0) * weights.performance,
    agentReadiness: (agentResult?.score || 0) * weights.agentReadiness
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6" data-testid="overall-score">
      {/* Overall Score */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Overall Grade</h3>
        <div className="text-center">
          <div className={`text-5xl font-bold mb-4 ${getScoreColor(report.overallScore)}`} data-testid="overall-score-value">
            {report.overallScore}
          </div>
          <div className={`text-lg font-medium mb-2 ${getGradeColor(report.grade)}`} data-testid="overall-grade">
            Grade {report.grade}
          </div>
          <p className="text-sm text-slate-600">{report.summary}</p>
        </div>
        <div className="mt-6 pt-4 border-t border-slate-200">
          <div className="text-xs text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>Weighted calculation:</span>
            </div>
            <div className="flex justify-between pl-2">
              <span>Accessibility (40%):</span>
              <span>{weightedScores.accessibility.toFixed(1)}</span>
            </div>
            <div className="flex justify-between pl-2">
              <span>Trust (20%):</span>
              <span>{weightedScores.trust.toFixed(1)}</span>
            </div>
            <div className="flex justify-between pl-2">
              <span>Performance (25%):</span>
              <span>{weightedScores.performance.toFixed(1)}</span>
            </div>
            <div className="flex justify-between pl-2">
              <span>Agent Ready (15%):</span>
              <span>{weightedScores.agentReadiness.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Top 5 Impact Fixes */}
      <div className="lg:col-span-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Top 5 Impact Fixes</h3>
          <div className="space-y-3">
            {report.topFixes?.slice(0, 5).map((fix, index) => (
              <div 
                key={index} 
                className={`flex items-start space-x-3 p-3 border rounded-lg ${getImpactColor(fix.impact)}`}
                data-testid={`fix-${index + 1}`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${getPriorityColor(fix.priority)}`}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-slate-900">{fix.title}</h4>
                  <p className="text-sm text-slate-600">{fix.description}</p>
                  <div className="flex space-x-4 mt-2 text-xs text-slate-500">
                    <span>Impact: {fix.impact}</span>
                    <span>Effort: {fix.effort}</span>
                    <span>Pillar: {fix.pillar}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
