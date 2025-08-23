import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "");

// Using Gemini Pro Vision for image analysis
const visionModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: {
      type: "object" as any,
      properties: {
        designQuality: { type: "string" },
        colorContrast: { type: "string" },
        layoutIssues: { 
          type: "array",
          items: { type: "string" }
        },
        visualAccessibility: {
          type: "array",
          items: { type: "string" }
        },
        brandingConsistency: { type: "string" },
        mobileResponsiveness: { type: "string" },
        userExperience: { type: "string" },
        trustIndicators: {
          type: "array",
          items: { type: "string" }
        },
        suggestions: {
          type: "array",
          items: { type: "string" }
        }
      },
      required: ["designQuality", "colorContrast", "layoutIssues", "visualAccessibility", "brandingConsistency", "mobileResponsiveness", "userExperience", "trustIndicators", "suggestions"]
    }
  }
});

export interface VisualAnalysisResult {
  designQuality: string;
  colorContrast: string;
  layoutIssues: string[];
  visualAccessibility: string[];
  brandingConsistency: string;
  mobileResponsiveness: string;
  userExperience: string;
  trustIndicators: string[];
  suggestions: string[];
}

export async function analyzeScreenshot(screenshotPath: string, url: string): Promise<VisualAnalysisResult> {
  try {
    // Read the screenshot file
    const fullPath = screenshotPath.startsWith('/') 
      ? `public${screenshotPath}`
      : `public/screenshots/${screenshotPath}`;
    
    if (!fs.existsSync(fullPath)) {
      console.error(`Screenshot not found at: ${fullPath}`);
      return getDefaultVisualAnalysis();
    }
    
    const imageBytes = fs.readFileSync(fullPath);
    const base64Image = imageBytes.toString('base64');
    
    const prompt = `Analyze this website screenshot for an Irish SME/public service website (${url}).

Provide a comprehensive visual analysis covering:

1. **Design Quality**: Overall professional appearance, modern vs outdated design elements
2. **Color Contrast**: Visual accessibility of text and background combinations
3. **Layout Issues**: Any broken layouts, misaligned elements, or spacing problems
4. **Visual Accessibility**: Issues that affect users with visual impairments
5. **Branding Consistency**: Logo placement, color scheme consistency, professional appearance
6. **Mobile Responsiveness**: How well the design adapts to viewport (if visible)
7. **User Experience**: Visual hierarchy, clarity of navigation, call-to-action visibility
8. **Trust Indicators**: Visible security badges, contact info, professional imagery
9. **Suggestions**: Specific visual improvements that would enhance the site

Focus on practical, actionable insights for Irish business owners. Be specific about visual problems you can see.`;

    const result = await visionModel.generateContent({
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/png",
              data: base64Image
            }
          }
        ]
      }]
    });
    
    const responseText = result.response.text();
    if (!responseText) {
      console.error("Empty response from Gemini vision model");
      return getDefaultVisualAnalysis();
    }
    
    try {
      return JSON.parse(responseText) as VisualAnalysisResult;
    } catch (parseError) {
      console.error("Failed to parse visual analysis response:", parseError);
      
      // Try to extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]) as VisualAnalysisResult;
        } catch {
          return getDefaultVisualAnalysis();
        }
      }
      
      return getDefaultVisualAnalysis();
    }
  } catch (error) {
    console.error("Visual analysis failed:", error);
    return getDefaultVisualAnalysis();
  }
}

function getDefaultVisualAnalysis(): VisualAnalysisResult {
  return {
    designQuality: "Unable to analyze visual design - screenshot analysis unavailable",
    colorContrast: "Visual contrast analysis pending",
    layoutIssues: [],
    visualAccessibility: [],
    brandingConsistency: "Branding analysis unavailable",
    mobileResponsiveness: "Responsive design analysis unavailable", 
    userExperience: "Visual UX analysis unavailable",
    trustIndicators: [],
    suggestions: ["Screenshot analysis was not available for this scan"]
  };
}