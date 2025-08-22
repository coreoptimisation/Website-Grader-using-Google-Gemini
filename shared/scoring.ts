export interface PillarScores {
  accessibility: number;
  trust: number;
  uxPerf: number;
  agentReadiness: number;
}

export interface TopFix {
  title: string;
  description: string;
  impact: "High" | "Medium" | "Low";
  effort: "Low" | "Medium" | "High";
  pillar: string;
  priority: number;
}

// Weights as per tech spec
export const PILLAR_WEIGHTS = {
  accessibility: 0.40,   // 40%
  trust: 0.20,          // 20%
  uxPerf: 0.25,         // 25%
  agentReadiness: 0.15  // 15%
};

export function calculateOverallScore(pillarScores: PillarScores): number {
  const weighted = 
    pillarScores.accessibility * PILLAR_WEIGHTS.accessibility +
    pillarScores.trust * PILLAR_WEIGHTS.trust +
    pillarScores.uxPerf * PILLAR_WEIGHTS.uxPerf +
    pillarScores.agentReadiness * PILLAR_WEIGHTS.agentReadiness;
  
  return Math.round(weighted);
}

export function getGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 85) return "A";
  if (score >= 80) return "A-";
  if (score >= 75) return "B+";
  if (score >= 70) return "B";
  if (score >= 65) return "B-";
  if (score >= 60) return "C+";
  if (score >= 55) return "C";
  if (score >= 50) return "C-";
  if (score >= 45) return "D+";
  if (score >= 40) return "D";
  return "F";
}

export function getGradeExplanation(grade: string, score: number): string {
  const gradeDescriptions: { [key: string]: string } = {
    "A+": "Exceptional! Your website meets the highest standards across all pillars.",
    "A": "Excellent! Your website performs very well with only minor improvements needed.",
    "A-": "Very Good! Your website is well-optimized with a few areas for enhancement.",
    "B+": "Good! Your website performs well but has room for improvement.",
    "B": "Above Average. Your website meets many standards but needs attention in key areas.",
    "B-": "Satisfactory. Your website has a solid foundation with several improvement opportunities.",
    "C+": "Fair. Your website meets basic requirements but needs significant improvements.",
    "C": "Average. Your website has notable issues that should be addressed.",
    "C-": "Below Average. Your website needs considerable work across multiple areas.",
    "D+": "Poor. Your website has serious issues affecting user experience and compliance.",
    "D": "Very Poor. Your website requires major improvements to meet basic standards.",
    "F": "Critical. Your website has severe issues requiring immediate attention."
  };
  
  return gradeDescriptions[grade] || `Score: ${score}/100 - Improvements needed across multiple areas.`;
}

// Calculate top fixes based on impact, effort, and reach
export function calculateTopFixes(
  accessibilityIssues: any[],
  performanceOpportunities: any[],
  securityIssues: any[],
  agentIssues: any[]
): TopFix[] {
  const allFixes: TopFix[] = [];
  
  // Process accessibility issues
  accessibilityIssues.forEach(issue => {
    const impactMap: { [key: string]: "High" | "Medium" | "Low" } = {
      'critical': 'High',
      'serious': 'High',
      'moderate': 'Medium',
      'minor': 'Low'
    };
    
    allFixes.push({
      title: issue.description || issue.help,
      description: `Fix ${issue.nodes?.length || 1} instance(s) of: ${issue.helpUrl}`,
      impact: impactMap[issue.impact] || 'Medium',
      effort: issue.nodes?.length > 10 ? 'High' : issue.nodes?.length > 3 ? 'Medium' : 'Low',
      pillar: 'Accessibility',
      priority: calculatePriority(impactMap[issue.impact] || 'Medium', 'Medium', issue.nodes?.length || 1)
    });
  });
  
  // Process performance opportunities
  performanceOpportunities.forEach(opp => {
    const impact = opp.numericValue > 3000 ? 'High' : opp.numericValue > 1000 ? 'Medium' : 'Low';
    allFixes.push({
      title: opp.title,
      description: opp.description || opp.displayValue,
      impact,
      effort: 'Medium', // Default effort for performance fixes
      pillar: 'Performance',
      priority: calculatePriority(impact, 'Medium', 100) // Assume site-wide reach
    });
  });
  
  // Process security issues
  securityIssues.forEach(issue => {
    allFixes.push({
      title: issue.title,
      description: issue.description,
      impact: issue.severity === 'high' ? 'High' : issue.severity === 'medium' ? 'Medium' : 'Low',
      effort: 'Low', // Security headers are usually easy to add
      pillar: 'Trust & Security',
      priority: calculatePriority(issue.severity === 'high' ? 'High' : 'Medium', 'Low', 100)
    });
  });
  
  // Process agent readiness issues
  agentIssues.forEach(issue => {
    allFixes.push({
      title: issue.title,
      description: issue.description,
      impact: issue.impact || 'Medium',
      effort: issue.effort || 'Medium',
      pillar: 'Agent Readiness',
      priority: calculatePriority(issue.impact || 'Medium', issue.effort || 'Medium', 50)
    });
  });
  
  // Sort by priority and return top 5
  return allFixes
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5);
}

function calculatePriority(
  impact: "High" | "Medium" | "Low",
  effort: "High" | "Medium" | "Low",
  reach: number
): number {
  const impactScore = { High: 3, Medium: 2, Low: 1 }[impact];
  const effortScore = { Low: 3, Medium: 2, High: 1 }[effort]; // Inverse for effort
  const reachScore = Math.min(reach / 10, 10); // Normalize reach to 0-10
  
  // Priority = Impact × (1/Effort) × Reach
  return impactScore * effortScore * reachScore;
}