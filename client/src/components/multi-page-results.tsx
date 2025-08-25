import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertCircle, ShoppingCart, Calendar, CreditCard, Package, Globe, ExternalLink, FileText } from "lucide-react";
import IndividualPageAnalysis from "@/components/individual-page-analysis";

interface MultiPageResultsProps {
  data: any; // MultiPageScanResult from the backend
  evidence?: any[];
  scanId?: string;
  onPageViewChange?: (isViewingPage: boolean) => void;
}

export function MultiPageResults({ data, evidence, scanId, onPageViewChange }: MultiPageResultsProps) {
  const [selectedPage, setSelectedPage] = useState<any>(null);
  
  // Notify parent when page view changes
  React.useEffect(() => {
    onPageViewChange?.(!!selectedPage);
  }, [selectedPage, onPageViewChange]);
  
  if (!data || !data.pageResults) {
    return <div>No multi-page data available</div>;
  }
  
  // If a page is selected, show its detailed analysis
  if (selectedPage) {
    return (
      <IndividualPageAnalysis 
        pageData={selectedPage} 
        onBack={() => setSelectedPage(null)}
        evidence={evidence}
        scanId={scanId}
      />
    );
  }

  const getPageIcon = (pageType: string) => {
    switch (pageType) {
      case "cart": return <ShoppingCart className="h-4 w-4" />;
      case "checkout": return <CreditCard className="h-4 w-4" />;
      case "booking": return <Calendar className="h-4 w-4" />;
      case "product": return <Package className="h-4 w-4" />;
      default: return null;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      {/* Multi-Page Analysis Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            <CardTitle className="text-base sm:text-lg text-blue-900">Multi-Page Analysis Results</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-blue-800">
            Analyzed {data.pagesAnalyzed} pages across your website, including homepage, product pages, and checkout/booking functionality.
            The scores below represent weighted averages across all analyzed pages.
          </p>
        </CardContent>
      </Card>
      
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle>Multi-Page Analysis Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Pages Analyzed</p>
              <p className="text-2xl font-bold">{data.pagesAnalyzed}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Overall Score</p>
              <p className={`text-2xl font-bold ${getScoreColor(data.aggregateScores?.overall || 0)}`}>
                {data.aggregateScores?.overall || 0}%
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Critical Issues</p>
              <p className="text-2xl font-bold text-red-600">
                {data.siteWideSummary?.criticalIssues || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Issues</p>
              <p className="text-2xl font-bold">
                {data.siteWideSummary?.totalIssues || 0}
              </p>
            </div>
          </div>

          {/* Aggregate Scores */}
          <div className="mt-6 space-y-3">
            <h4 className="font-semibold">Site-Wide Scores</h4>
            {data.aggregateScores && Object.entries(data.aggregateScores)
              .filter(([key]) => key !== "overall")
              .map(([pillar, score]) => (
                <div key={pillar} className="flex items-center justify-between">
                  <span className="capitalize">{pillar.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <div className="flex items-center gap-2">
                    <Progress value={score as number} className="w-24 h-2" />
                    <span className={`font-medium ${getScoreColor(score as number)}`}>
                      {score}%
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* E-commerce/Booking Analysis */}
      {data.ecommerceSummary && (
        <Card>
          <CardHeader>
            <CardTitle>E-commerce & Booking Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                {data.ecommerceSummary.hasEcommerce && (
                  <Badge variant="default" className="flex items-center gap-1">
                    <ShoppingCart className="h-3 w-3" />
                    E-commerce Detected
                  </Badge>
                )}
                {data.ecommerceSummary.hasBooking && (
                  <Badge variant="default" className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Booking System Detected
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Functionality Score</p>
                  <p className={`text-xl font-bold ${getScoreColor(data.ecommerceSummary.functionalityScore)}`}>
                    {data.ecommerceSummary.functionalityScore}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Security Score</p>
                  <p className={`text-xl font-bold ${getScoreColor(data.ecommerceSummary.securityScore)}`}>
                    {data.ecommerceSummary.securityScore}%
                  </p>
                </div>
              </div>

              {data.ecommerceSummary.criticalIssues?.length > 0 && (
                <div>
                  <h5 className="font-medium text-red-600 mb-2">Critical Issues</h5>
                  <ul className="space-y-1">
                    {data.ecommerceSummary.criticalIssues.map((issue: string, index: number) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.ecommerceSummary.recommendations?.length > 0 && (
                <div>
                  <h5 className="font-medium mb-2">Recommendations</h5>
                  <ul className="space-y-1">
                    {data.ecommerceSummary.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Access to Individual Pages */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Access to Page Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {data.pageResults.map((page: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-3 flex-1">
                  {getPageIcon(page.pageType)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">{page.pageType}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className={`font-bold ${getScoreColor(page.overallScore || 0)}`}>
                        {page.overallScore || 0}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {page.url.replace(/^https?:\/\/(www\.)?/, '').substring(0, 60)}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedPage(page)}
                  data-testid={`quick-access-page-${index}`}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  View Analysis
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Individual Page Results */}
      <Card>
        <CardHeader>
          <CardTitle>Page-by-Page Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="0">
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(data.pageResults.length, 4)}, 1fr)` }}>
              {data.pageResults.slice(0, 4).map((page: any, index: number) => (
                <TabsTrigger key={index} value={index.toString()}>
                  <div className="flex items-center gap-1">
                    {getPageIcon(page.pageType)}
                    <span className="capitalize">{page.pageType}</span>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>
            
            {data.pageResults.map((page: any, index: number) => (
              <TabsContent key={index} value={index.toString()} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">{page.url}</p>
                    <Button
                      size="sm"
                      onClick={() => setSelectedPage(page)}
                      data-testid={`view-page-details-${index}`}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      View Detailed Analysis
                    </Button>
                  </div>
                  
                  {/* Page Screenshot */}
                  {page.screenshot?.filePath && (
                    <div className="mb-4 rounded-lg overflow-hidden border">
                      <img 
                        src={page.screenshot.filePath}
                        alt={`${page.pageType} screenshot`}
                        className="w-full max-h-64 object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                  
                  {/* Page Scores */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                    <div className="p-3 border rounded-lg">
                      <p className="text-xs text-muted-foreground">Accessibility</p>
                      <p className={`text-lg font-bold ${getScoreColor(page.accessibility?.score || 0)}`}>
                        {page.accessibility?.score || 0}%
                      </p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <p className="text-xs text-muted-foreground">Performance</p>
                      <p className={`text-lg font-bold ${getScoreColor(page.performance?.score || 0)}`}>
                        {page.performance?.score || 0}%
                      </p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <p className="text-xs text-muted-foreground">Security</p>
                      <p className={`text-lg font-bold ${getScoreColor(page.security?.score || 0)}`}>
                        {page.security?.score || 0}%
                      </p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <p className="text-xs text-muted-foreground">SEO</p>
                      <p className={`text-lg font-bold ${getScoreColor(page.agentReadiness?.score || 0)}`}>
                        {page.agentReadiness?.score || 0}%
                      </p>
                    </div>
                  </div>

                  {/* E-commerce Analysis for this page */}
                  {page.ecommerceAnalysis && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h5 className="font-medium mb-2">E-commerce Features</h5>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {page.ecommerceAnalysis.hasShoppingCart && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Shopping Cart
                          </div>
                        )}
                        {page.ecommerceAnalysis.hasCheckoutFlow && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Checkout Flow
                          </div>
                        )}
                        {page.ecommerceAnalysis.hasBookingSystem && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Booking System
                          </div>
                        )}
                        {page.ecommerceAnalysis.securePayment && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Secure Payment
                          </div>
                        )}
                      </div>
                      
                      {page.ecommerceAnalysis.issues?.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-red-600">Issues:</p>
                          <ul className="text-xs space-y-1 mt-1">
                            {page.ecommerceAnalysis.issues.map((issue: string, i: number) => (
                              <li key={i}>• {issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Site-Wide Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Site-Wide Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.siteWideSummary?.commonProblems?.length > 0 && (
            <div>
              <h5 className="font-medium mb-2">Common Problems</h5>
              <ul className="space-y-1">
                {data.siteWideSummary.commonProblems.map((problem: string, index: number) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                    {problem}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.siteWideSummary?.strengths?.length > 0 && (
            <div>
              <h5 className="font-medium mb-2">Strengths</h5>
              <ul className="space-y-1">
                {data.siteWideSummary.strengths.map((strength: string, index: number) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}