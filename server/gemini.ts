import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateAgentActionBlueprint } from "./scanner/agent-blueprint";
import { calculateOverallScore, getGrade, getGradeExplanation, calculateTopFixes, PillarScores } from "../shared/scoring";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "");

// Using gemini-2.0-flash-thinking-exp-1219 - latest model with thinking capabilities
// Alternatives: gemini-2.0-flash-exp, gemini-exp-1206
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-thinking-exp-1219",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: {
      type: "OBJECT" as any,
      properties: {
        summary: { type: "string" },
        topFixes: { 
          type: "array", 
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              impact: { type: "string", enum: ["High", "Medium", "Low"] },
              effort: { type: "string", enum: ["Low", "Medium", "High"] },
              pillar: { type: "string" },
              priority: { type: "number" }
            },
            required: ["title", "description", "impact", "effort", "pillar", "priority"]
          }
        },
        pillarScores: {
          type: "object",
          properties: {
            accessibility: { type: "number" },
            trust: { type: "number" },
            uxPerf: { type: "number" },
            agentReadiness: { type: "number" }
          },
          required: ["accessibility", "trust", "uxPerf", "agentReadiness"]
        },
        recommendations: { 
          type: "array", 
          items: { 
            type: "object",
            properties: {
              pillar: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              rationale: { type: "string" },
              severity: { type: "string" },
              exampleHtml: { type: "string" },
              exampleCss: { type: "string" },
              exampleJsonLd: { type: "string" },
              cspSnippet: { type: "string" },
              wcagLevel: { type: "string" },
              eaaCompliance: { type: "string" }
            },
            required: ["pillar", "title", "description", "rationale", "severity"]
          }
        },
        overallGrade: { type: "string" },
        gradeExplanation: { type: "string" }
      },
      required: ["summary", "topFixes", "pillarScores", "recommendations", "overallGrade", "gradeExplanation"]
    }
  }
});

export interface GeminiAnalysisResult {
  summary: string;
  topFixes: Array<{
    title: string;
    description: string;
    impact: "High" | "Medium" | "Low";
    effort: "Low" | "Medium" | "High";
    pillar: string;
    priority: number;
  }>;
  pillarScores: {
    accessibility: number;
    trust: number;
    uxPerf: number;
    agentReadiness: number;
  };
  recommendations: Array<{
    pillar: string;
    title: string;
    description: string;
    rationale: string;
    severity: string;
    exampleHtml?: string;
    exampleCss?: string;
    exampleJsonLd?: string;
    cspSnippet?: string;
    wcagLevel?: string;
    eaaCompliance?: string;
  }>;
  overallGrade: string;
  gradeExplanation: string;
}

export async function analyzeWebsiteFindings(evidence: {
  url: string;
  accessibility: any;
  performance: any;
  security: any;
  agentReadiness: any;
}): Promise<GeminiAnalysisResult> {
  const prompt = `You are grading an Irish SME/public-service website against Accessibility, Trust & Transparency, UX/Performance and Agent Readiness. 

Website URL: ${evidence.url}

PILLAR WEIGHTS:
- Accessibility: 40% (EAA compliance focus)
- Trust & Transparency: 20% 
- UX/Performance: 25%
- Agent Readiness: 15%

EVIDENCE DATA:
${JSON.stringify(evidence, null, 2)}

Provide a comprehensive analysis with:
1. Scores for each pillar (0-100)
2. Top 5 impact fixes ranked by (impact × ease of implementation)
3. Detailed recommendations with concrete code examples for ALL FOUR PILLARS:
   - At least 2-3 recommendations for "accessibility" pillar
   - At least 2-3 recommendations for "trust" pillar  
   - At least 2-3 recommendations for "uxPerf" pillar (NOT "performance", use "uxPerf")
   - At least 2-3 recommendations for "agentReadiness" pillar (REQUIRED - include SEO, structured data, crawlability improvements)
4. Overall grade (A-F) and weighted score calculation
5. EAA compliance assessment where relevant
6. Plain-English explanations suitable for Irish business owners

IMPORTANT CODE SNIPPET REQUIREMENTS:
- For accessibility issues, provide complete HTML fixes with proper ARIA attributes
- For CSP headers, provide complete Content-Security-Policy header examples
- For JSON-LD, provide complete schema.org structured data examples including Organization, WebSite, and relevant types
- For performance, provide specific CSS/JS optimization examples
- For agentReadiness: provide SEO meta tags, robots.txt examples, sitemap.xml format, OpenGraph tags
- All code snippets must be production-ready and copy-pasteable

Example CSP header:
Content-Security-Policy: default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'

Example JSON-LD for Organization:
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Company Name",
  "url": "${evidence.url}",
  "logo": "${evidence.url}/logo.png",
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+353-1-234-5678",
    "contactType": "customer service"
  }
}

Example agentReadiness recommendation structure:
{
  "pillar": "agentReadiness",
  "title": "Add Meta Description for Better Search Visibility",
  "description": "Your pages are missing meta descriptions, which help search engines and AI agents understand your content.",
  "severity": "High",
  "exampleHtml": "<meta name='description' content='Professional web services in Ireland specializing in website optimization and digital transformation. Contact us for a free consultation.'>"
}

For EAA compliance (European Accessibility Act - deadline June 28, 2025), map WCAG violations to EAA requirements where relevant. Note which violations are critical for EAA compliance.`;

  // Generate Agent Action Blueprint from scan data
  const agentBlueprint = generateAgentActionBlueprint(
    evidence.accessibility,
    evidence.performance,
    evidence.security,
    evidence.agentReadiness
  );

  try {
    const result = await model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] });
    const responseText = result.response.text();
    
    if (!responseText) {
      throw new Error("Empty response from Gemini");
    }

    // Try to parse the JSON response
    try {
      const parsedResult = JSON.parse(responseText) as GeminiAnalysisResult;
      // Add the agent action blueprint to the result
      return {
        ...parsedResult,
        agentActionBlueprint: agentBlueprint
      } as any;
    } catch (parseError) {
      console.error("Failed to parse Gemini response as JSON:", parseError);
      console.error("Response text length:", responseText.length);
      
      // Attempt to extract valid JSON from the response
      // Sometimes Gemini adds extra text before/after the JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsedResult = JSON.parse(jsonMatch[0]) as GeminiAnalysisResult;
          return {
            ...parsedResult,
            agentActionBlueprint: agentBlueprint
          } as any;
        } catch (secondParseError) {
          console.error("Failed to parse extracted JSON:", secondParseError);
        }
      }
      
      // Return a fallback analysis if parsing completely fails
      return {
        overallScore: 50,
        pillarScores: {
          accessibility: { score: 50, grade: "C" },
          trustAndSecurity: { score: 50, grade: "C" },
          performance: { score: 50, grade: "C" },
          agentReadiness: { score: 50, grade: "C" }
        },
        topImpactFixes: [
          {
            issue: "Analysis Error",
            description: "Unable to complete full analysis due to response parsing issues",
            expectedImpact: "Medium",
            implementationDifficulty: "Low",
            codeSnippet: "",
            pillar: "general"
          }
        ],
        detailedRecommendations: {
          accessibility: ["Unable to analyze - please retry scan"],
          trustAndSecurity: ["Unable to analyze - please retry scan"],
          performance: ["Unable to analyze - please retry scan"],
          agentReadiness: ["Unable to analyze - please retry scan"]
        },
        executiveSummary: "The analysis encountered technical issues. Please retry the scan for complete results.",
        technicalSummary: "JSON parsing error in AI response. The scan data was collected successfully but analysis was incomplete.",
        eaaCompliance: {
          compliant: false,
          criticalIssues: [],
          deadline: "June 28, 2025",
          recommendations: ["Retry scan for EAA compliance assessment"]
        },
        agentActionBlueprint: agentBlueprint
      };
    }
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    throw new Error(`Failed to analyze website findings: ${error}`);
  }
}
