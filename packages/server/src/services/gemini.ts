import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';
import type { GeminiTriageResult, CivicIssueCategory, CivicIssueUrgency } from '@civicresolve/shared';

let genAI: GoogleGenerativeAI | null = null;

export function initGemini() {
  if (env.GEMINI_API_KEY && !env.GEMINI_API_KEY.includes('placeholder')) {
    try {
      genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
      console.log('Google Gemini Generative AI client initialized.');
    } catch (err) {
      console.warn('Failed to initialize Google Gemini client:', err);
    }
  } else {
    console.log('GEMINI_API_KEY is not set. Rule-based triage fallback active.');
  }
}

export function isGeminiReady(): boolean {
  return genAI !== null;
}

export async function triageIssueWithGemini(input: {
  title: string;
  description: string;
  category: CivicIssueCategory;
  location: { address: string; neighborhood?: string };
}): Promise<GeminiTriageResult> {
  if (!genAI) {
    // Deterministic fallback triage when Gemini API key is pending configuration
    const isCritical = input.title.toLowerCase().includes('emergency') ||
      input.description.toLowerCase().includes('danger') ||
      input.description.toLowerCase().includes('burst');

    const calculatedUrgency: CivicIssueUrgency = isCritical ? 'high' : 'medium';

    return {
      detectedCategory: input.category,
      assignedDepartment: getDepartmentForCategory(input.category),
      urgency: calculatedUrgency,
      summary: `Citizen reported: ${input.title} at ${input.location.address}.`,
      reasoning: 'Automated triage based on report category and keywords (Gemini API key pending).',
      suggestedActionItems: [
        `Dispatch field inspection crew to ${input.location.address}`,
        `Verify reported hazard level for ${input.category}`,
        'Provide initial status update to reporter'
      ],
      confidenceScore: 0.85
    };
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    const prompt = `You are CivicResolve's municipal triage intelligence agent.
Analyze the following citizen-reported municipal issue and output a structured JSON evaluation.

Report Details:
- Title: ${input.title}
- Description: ${input.description}
- User Category: ${input.category}
- Location: ${input.location.address} (Neighborhood: ${input.location.neighborhood || 'Not specified'})

Categories allowed: pothole, sanitation, street_lighting, water_supply, public_safety, traffic_signals, parks_recreation, other.
Urgencies allowed: low, medium, high, critical.

Return ONLY a valid JSON object matching this structure:
{
  "detectedCategory": "one of the allowed categories",
  "assignedDepartment": "e.g. Department of Public Works, Water Authority, Transportation Bureau",
  "urgency": "one of the allowed urgencies",
  "summary": "Concise 1-2 sentence municipal summary",
  "reasoning": "Reason for urgency level and department assignment",
  "suggestedActionItems": ["Step 1", "Step 2", "Step 3"],
  "confidenceScore": 0.95
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);

    return {
      detectedCategory: parsed.detectedCategory || input.category,
      assignedDepartment: parsed.assignedDepartment || getDepartmentForCategory(input.category),
      urgency: parsed.urgency || 'medium',
      summary: parsed.summary || input.title,
      reasoning: parsed.reasoning || 'Categorized via Google Gemini analysis.',
      suggestedActionItems: Array.isArray(parsed.suggestedActionItems) ? parsed.suggestedActionItems : ['Inspect site'],
      confidenceScore: typeof parsed.confidenceScore === 'number' ? parsed.confidenceScore : 0.9
    };
  } catch (error) {
    console.error('Gemini triage execution error:', error);
    return {
      detectedCategory: input.category,
      assignedDepartment: getDepartmentForCategory(input.category),
      urgency: 'medium',
      summary: input.title,
      reasoning: 'Fallback classification applied due to temporary AI service timeout.',
      suggestedActionItems: ['Manual verification by dispatch officer required'],
      confidenceScore: 0.7
    };
  }
}

function getDepartmentForCategory(category: CivicIssueCategory): string {
  switch (category) {
    case 'pothole':
    case 'traffic_signals':
      return 'Department of Transportation & Infrastructure';
    case 'sanitation':
      return 'Department of Waste Management & Sanitation';
    case 'street_lighting':
      return 'Bureau of Street Lighting & Electrical Services';
    case 'water_supply':
      return 'Municipal Water & Sewer Authority';
    case 'public_safety':
      return 'Public Safety & Emergency Management Division';
    case 'parks_recreation':
      return 'Parks & City Beautification Department';
    default:
      return 'General Municipal Services';
  }
}
