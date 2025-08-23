import { Card } from "@/components/ui/card";
import { Eye, AlertCircle, CheckCircle, Info, Lightbulb, Palette, Layout, Shield } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface VisualInsightsProps {
  insights?: {
    designQuality: string;
    colorContrast: string;
    layoutIssues: string[];
    visualAccessibility: string[];
    brandingConsistency: string;
    mobileResponsiveness: string;
    userExperience: string;
    trustIndicators: string[];
    suggestions: string[];
  };
}

export default function VisualInsights({ insights }: VisualInsightsProps) {
  if (!insights) {
    return null;
  }

  return (
    <Card className="p-6" data-testid="visual-insights">
      <div className="flex items-center gap-2 mb-6">
        <Eye className="w-5 h-5 text-purple-600" />
        <h2 className="text-xl font-semibold text-slate-900">Visual Analysis Insights</h2>
      </div>

      <div className="space-y-4">
        {/* Design Quality */}
        <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
          <div className="flex items-start gap-3">
            <Palette className="w-5 h-5 text-purple-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 mb-1">Design Quality</h3>
              <p className="text-sm text-slate-700">{insights.designQuality}</p>
            </div>
          </div>
        </div>

        {/* Accordion for detailed insights */}
        <Accordion type="single" collapsible className="w-full">
          {/* Color Contrast & Accessibility */}
          <AccordionItem value="accessibility">
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600" />
                <span>Visual Accessibility & Color Contrast</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-2">
                <div>
                  <h4 className="font-medium text-slate-800 mb-1">Color Contrast</h4>
                  <p className="text-sm text-slate-600">{insights.colorContrast}</p>
                </div>
                {insights.visualAccessibility.length > 0 && (
                  <div>
                    <h4 className="font-medium text-slate-800 mb-2">Visual Accessibility Issues</h4>
                    <ul className="space-y-1">
                      {insights.visualAccessibility.map((issue, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          <span className="text-slate-600">{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Layout & Responsiveness */}
          <AccordionItem value="layout">
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-2">
                <Layout className="w-4 h-4 text-green-600" />
                <span>Layout & Mobile Responsiveness</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-2">
                <div>
                  <h4 className="font-medium text-slate-800 mb-1">Mobile Responsiveness</h4>
                  <p className="text-sm text-slate-600">{insights.mobileResponsiveness}</p>
                </div>
                {insights.layoutIssues.length > 0 && (
                  <div>
                    <h4 className="font-medium text-slate-800 mb-2">Layout Issues</h4>
                    <ul className="space-y-1">
                      {insights.layoutIssues.map((issue, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                          <span className="text-slate-600">{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Trust & Branding */}
          <AccordionItem value="trust">
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                <span>Trust Indicators & Branding</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-2">
                <div>
                  <h4 className="font-medium text-slate-800 mb-1">Branding Consistency</h4>
                  <p className="text-sm text-slate-600">{insights.brandingConsistency}</p>
                </div>
                {insights.trustIndicators.length > 0 && (
                  <div>
                    <h4 className="font-medium text-slate-800 mb-2">Trust Indicators Found</h4>
                    <ul className="space-y-1">
                      {insights.trustIndicators.map((indicator, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-slate-600">{indicator}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* User Experience */}
          <AccordionItem value="ux">
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-teal-600" />
                <span>User Experience Analysis</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-2">
                <p className="text-sm text-slate-600">{insights.userExperience}</p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Suggestions */}
        {insights.suggestions.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 mb-2">Visual Improvement Suggestions</h3>
                <ul className="space-y-2">
                  {insights.suggestions.map((suggestion, index) => (
                    <li key={index} className="text-sm text-slate-700 pl-4 relative">
                      <span className="absolute left-0 top-1.5 w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}