export interface ScanData {
  id: string;
  url: string;
  status: 'pending' | 'scanning' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface PillarScore {
  pillar: string;
  score: number;
  details: any;
}

export interface TopFix {
  title: string;
  description: string;
  impact: 'High' | 'Medium' | 'Low';
  effort: 'Low' | 'Medium' | 'High';
  pillar: string;
  priority: number;
}

export interface ScanReport {
  id: string;
  scanId: string;
  overallScore: number;
  grade: string;
  topFixes: TopFix[];
  summary: string;
  geminiAnalysis: any;
  createdAt: string;
}

export interface ScanResult {
  id: string;
  scanId: string;
  pillar: string;
  score: number;
  rawData: any;
  recommendations: any[];
  createdAt: string;
}

export interface CompleteScan {
  scan: ScanData;
  results: ScanResult[];
  report: ScanReport;
}
