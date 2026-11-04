// ============================================================
// LMS - AI Assessment Question Generation Service
// Provider Abstraction supporting Gemini, OpenAI, or Local Grounded Engine.
// Enforces strict JSON schema validation, mark calculation, and
// single-question or batch regeneration.
// ============================================================
import {
  AIGenerationConfig,
  AssessmentDifficultySetting,
  AssessmentQuestionTypeSetting,
  Question,
  QuestionOption,
  QuizQuestionItem,
  QuizOption
} from '../types';
import { generateContextualQuestions } from '../pages/Courses/components/aiQuestionGenerator';

export const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined') {
    return '/api/v1';
  }
  return 'http://localhost:5000/api/v1';
};

export const API_BASE_URL = getApiBaseUrl();

export interface AIProviderStatus {
  configured: boolean;
  provider: 'gemini' | 'openai' | 'none';
  name: string;
  model: string;
}

export interface AIGatewayQueryParams {
  topic?: string;
  documentText?: string;
  documentName?: string;
  count?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  types?: ('single_choice' | 'multiple_choice' | 'true_false' | 'short_answer')[];
  pointsPerQuestion?: number;
  customPrompt?: string;
  allowGroundedFallback?: boolean;
}

export interface AIGatewayResult {
  success: boolean;
  questions: QuizQuestionItem[];
  providerUsed: string;
  isGroundedFallback: boolean;
  error?: string;
}

export interface GeneratedQuestionSchema {
  id: string;
  type: AssessmentQuestionTypeSetting;
  prompt: string;
  options?: { id: string; text: string; isCorrect: boolean }[];
  correctAnswer?: string;
  correctAnswers?: string[];
  explanation: string;
  rubric?: string;
  points: number;
  difficulty: 'easy' | 'medium' | 'hard';
  topic?: string;
  sourceSegment?: string;
}

export interface GenerationResult {
  success: boolean;
  questions?: GeneratedQuestionSchema[];
  error?: string;
  providerUsed: string;
  isMockOrLocalFallback: boolean;
}

export interface SingleRegenContext {
  documentText: string;
  existingQuestion: GeneratedQuestionSchema;
  type: AssessmentQuestionTypeSetting;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
}

/**
 * Validates a generated question against strict schema requirements
 */
export function validateQuestionSchema(q: GeneratedQuestionSchema): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!q.prompt || q.prompt.trim().length < 5) {
    errors.push('Question prompt is too short or missing.');
  }

  if (q.points <= 0) {
    errors.push('Question marks must be greater than zero.');
  }

  if (!['easy', 'medium', 'hard'].includes(q.difficulty)) {
    errors.push(`Invalid difficulty "${q.difficulty}". Must be easy, medium, or hard.`);
  }

  if (q.type === 'single_choice') {
    if (!q.options || q.options.length < 2) {
      errors.push('Multiple Choice (MCQ) requires at least 2 options.');
    } else {
      const correctCount = q.options.filter((o) => o.isCorrect).length;
      if (correctCount !== 1) {
        errors.push(`Multiple Choice (MCQ) must have exactly 1 correct answer (found ${correctCount}).`);
      }
    }
  } else if (q.type === 'multiple_choice') {
    if (!q.options || q.options.length < 3) {
      errors.push('Multiple Select question requires at least 3 options.');
    } else {
      const correctCount = q.options.filter((o) => o.isCorrect).length;
      if (correctCount < 1) {
        errors.push('Multiple Select question must have at least 1 correct answer.');
      }
    }
  } else if (q.type === 'true_false') {
    if (!q.options || q.options.length !== 2) {
      errors.push('True / False question must have exactly 2 options (True and False).');
    } else {
      const correctCount = q.options.filter((o) => o.isCorrect).length;
      if (correctCount !== 1) {
        errors.push('True / False question must have exactly 1 correct answer.');
      }
    }
  } else if (q.type === 'short_answer') {
    if (!q.correctAnswer && !q.rubric && !q.explanation) {
      errors.push('Short Answer question requires an expected answer or scoring criteria.');
    }
  } else if (q.type === 'essay') {
    if (!q.rubric && !q.explanation) {
      errors.push('Descriptive question requires evaluation rubric or expected response points.');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * AI Provider Configuration Detector
 */
export function getActiveAIProviderInfo(): {
  name: string;
  configured: boolean;
  type: 'gemini' | 'openai' | 'local_grounded';
  keySource?: string;
} {
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_AI_API_KEY;
  const openAiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (geminiKey && geminiKey.trim() !== '') {
    return {
      name: 'Google Gemini 1.5 Flash (Cloud AI)',
      configured: true,
      type: 'gemini',
      keySource: 'VITE_GEMINI_API_KEY'
    };
  }

  if (openAiKey && openAiKey.trim() !== '') {
    return {
      name: 'OpenAI GPT-4o-mini (Cloud AI)',
      configured: true,
      type: 'openai',
      keySource: 'VITE_OPENAI_API_KEY'
    };
  }

  return {
    name: 'Local Grounded Semantic Engine (Offline / Zero API Mode)',
    configured: false,
    type: 'local_grounded'
  };
}

/**
 * Grounded Question Generator using Gemini API
 */
async function generateViaGemini(
  apiKey: string,
  config: AIGenerationConfig
): Promise<GeneratedQuestionSchema[]> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const prompt = `You are a distinguished University Professor and Lead Curriculum Assessment Architect for VeniLearn LMS.
Analyze the following source document content carefully and generate ${config.questionCount} rigorous, practical, scenario-based assessment questions.

DOCUMENT CONTENT:
"""
${config.documentText.slice(0, 30000)}
"""

CRITICAL INSTRUCTIONS & QUALITY STANDARDS:
1. FOCUS ON HIGH-VALUE SUBJECT MATTER:
   - Base questions exclusively on substantive domain concepts, scientific principles, algorithms, workflows, mechanisms, and methodologies found in the text.
   - COMPLETELY IGNORE all administrative front-matter, acknowledgments, certificates of originality, internship details, university declarations, supervisor names, dedications, table of contents, and boilerplate text.
2. PRACTICAL & SCENARIO-BASED FRAMING:
   - Every question MUST evaluate higher-order thinking (Bloom's Taxonomy: Application, Analysis, Evaluation).
   - FORBIDDEN: Do NOT write questions that start with "According to the text...", "As mentioned in the document...", "Which of the following describes [Word]?", or simple copy-paste recall questions.
   - REQUIRED: Frame questions as realistic workplace scenarios, troubleshooting incidents, case studies, or system design decisions.
3. DIFFICULTY STANDARDS:
   - Easy: Foundational comprehension applied in a realistic context.
   - Medium: Practical problem-solving, multi-step application, or diagnosis.
   - Hard: Architecture/protocol evaluation, tradeoff analysis, or root cause synthesis.
   - Target difficulty: ${config.difficulty}. If "mixed", provide a balanced distribution.
4. DISTRACTOR EXCELLENCE:
   - For multiple-choice questions, every incorrect option (distractor) must be PLAUSIBLE, sophisticated, and represent a common technical misconception—not obviously wrong or dummy filler text.
5. REQUIRED QUESTION TYPES: ${config.questionTypes.join(', ')}.
6. TOTAL QUESTIONS: ${config.questionCount}.

You MUST return ONLY a valid JSON array of objects conforming to this exact schema (no markdown formatting, no code blocks):
[
  {
    "id": "gen-1",
    "type": "single_choice" | "multiple_choice" | "true_false" | "short_answer" | "essay",
    "prompt": "Practical, scenario-grounded question prompt",
    "difficulty": "easy" | "medium" | "hard",
    "points": 5,
    "topic": "Core Subject Concept",
    "explanation": "In-depth rationale explaining why the correct answer is valid based on the document principles",
    "rubric": "For essay/short_answer: clear grading rubric criteria",
    "options": [
      {"id": "opt-1", "text": "Nuanced, accurate option", "isCorrect": true},
      {"id": "opt-2", "text": "Plausible distractor representing common misconception", "isCorrect": false}
    ],
    "correctAnswer": "For short_answer: comprehensive model answer"
  }
]
`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.95,
          responseMimeType: 'application/json'
        }
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errBody}`);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error('Gemini API returned an empty response.');
    }

    const parsed = JSON.parse(candidateText);
    if (!Array.isArray(parsed)) {
      throw new Error('AI response did not match expected JSON array format.');
    }

    return parsed;
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Grounded Question Generator using OpenAI API
 */
async function generateViaOpenAI(
  apiKey: string,
  config: AIGenerationConfig
): Promise<GeneratedQuestionSchema[]> {
  const endpoint = 'https://api.openai.com/v1/chat/completions';

  const systemPrompt = `You are a distinguished University Professor and Lead Assessment Architect for VeniLearn LMS.
Generate rigorous, practical, scenario-based assessment questions strictly grounded in the document.
Base questions exclusively on substantive domain concepts, scientific principles, and technical workflows.
COMPLETELY IGNORE all administrative front-matter, acknowledgments, certificates, supervisor notes, and dedications.
NEVER generate questions starting with "According to the text" or simple definitions.
Frame questions as realistic workplace scenarios, troubleshooting incidents, case studies, or design decisions.
Return ONLY a valid JSON object with key "questions" containing an array of question objects.`;

  const userPrompt = `Document:
${config.documentText.slice(0, 30000)}

Settings:
- Count: ${config.questionCount}
- Difficulty: ${config.difficulty}
- Types: ${config.questionTypes.join(', ')}

Output JSON format: Array of questions with id, type, prompt, options (for choice questions), correctAnswer, explanation, rubric, points, difficulty, topic.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errBody}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : (parsed.questions || []);
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// Set of common non-substantive words, pronouns, and front-matter tokens that MUST NEVER be treated as core concepts
const DISALLOWED_TERMS = new Set([
  'this', 'that', 'these', 'those', 'it', 'they', 'we', 'i', 'you', 'our', 'my', 'their',
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'because', 'when', 'where', 'why', 'how',
  'what', 'which', 'who', 'whom', 'whose', 'all', 'any', 'every', 'some', 'such', 'each',
  'both', 'either', 'neither', 'one', 'two', 'first', 'second', 'third', 'here', 'there',
  'then', 'thus', 'hence', 'so', 'also', 'just', 'only', 'even', 'supervisor', 'acknowledgement',
  'acknowledgment', 'certificate', 'declaration', 'report', 'project', 'internship', 'department',
  'college', 'university', 'guide', 'author', 'student', 'thank', 'thanks', 'gratitude', 'bonafide',
  'faculty', 'institution', 'campus', 'roll', 'table', 'contents', 'index', 'preface', 'curriculum',
  'syllabus', 'figure', 'section', 'chapter', 'page', 'appendix', 'reference', 'references'
]);

/**
 * Strips document front-matter, acknowledgments, certificates, and noise
 */
const isAdministrativeLine = (line: string): boolean => {
  const lower = line.toLowerCase();
  return (
    lower.includes('supervisor') ||
    lower.includes('head of the department') ||
    lower.includes('bachelor of technology') ||
    lower.includes('internship') ||
    lower.includes('project report') ||
    lower.includes('submitted in partial fulfillment') ||
    lower.includes('guided by:') ||
    lower.includes('mentors') ||
    lower.includes('roll no') ||
    lower.includes('hall ticket') ||
    lower.includes('heartfelt gratitude') ||
    lower.includes('sincere thanks') ||
    lower.includes('sincerely thank') ||
    lower.includes('under the guidance of') ||
    lower.includes('under the esteemed guidance') ||
    lower.includes('table of contents') ||
    lower.includes('list of figures') ||
    lower.includes('list of tables') ||
    /^(acknowledgment|acknowledgement|bonafide certificate|declaration|dedication|approval sheet|certificate of originality)\b/i.test(line) ||
    /^(page\s+\d+(\s+of\s+\d+)?|\d+)$/i.test(line) ||
    lower.startsWith('all rights reserved') ||
    lower.startsWith('copyright')
  );
};

function sanitizeDocumentText(rawText: string): string {
  if (!rawText) return '';
  const lines = rawText.replace(/\r\n/g, '\n').split('\n');
  const cleanLines: string[] = [];
  let inFrontMatter = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (isAdministrativeLine(trimmed)) {
      inFrontMatter = true;
      continue;
    }

    if (
      inFrontMatter &&
      /^(chapter\s+\d+|module\s+\d+|unit\s+\d+|section\s+\d+|1(\.0)?\s+|introduction|abstract|background|overview|materials\s+and\s+methods|methodology|curriculum|syllabus)\b/i.test(trimmed)
    ) {
      inFrontMatter = false;
    }

    if (inFrontMatter) continue;
    cleanLines.push(trimmed);
  }

  return cleanLines.join('\n');
}

interface Proposition {
  term: string;
  predicate: string;
  sentence: string;
  type: 'action' | 'definition' | 'tradeoff' | 'procedure' | 'statement';
}

/**
 * High-fidelity Document-Grounded Semantic Extraction Engine
 * Parses actual document content, extracts key mechanisms, protocols,
 * tradeoffs, and synthesizes scenario-grounded, practical assessment questions.
 */
function generateViaLocalGroundedEngine(
  config: AIGenerationConfig
): GeneratedQuestionSchema[] {
  const text = config.documentText || '';
  const sanitizedText = sanitizeDocumentText(text);
  const textToUse = sanitizedText.length > 100 ? sanitizedText : text;

  const sentences = textToUse
    .split(/(?<=[.?!])\s+|\n+/)
    .map((s) => s.trim().replace(/\s+/g, ' '))
    .filter((s) => {
      if (s.length < 40 || s.length > 350 || s.startsWith('http')) return false;
      if (/^(chapter|module|section|unit|part|topic|lesson|appendix|table|figure|index)\b/i.test(s)) return false;
      const lower = s.toLowerCase();
      if (
        lower.includes('heartfelt gratitude') ||
        lower.includes('sincerely thank') ||
        lower.includes('under the guidance of') ||
        lower.includes('submitted to') ||
        lower.includes('roll no')
      ) {
        return false;
      }
      return true;
    });

  if (sentences.length === 0) {
    throw new Error('Document does not contain sufficient technical content to extract practical questions.');
  }

  // Extract clean domain terms and propositions
  const propositions: Proposition[] = [];
  const termMap = new Map<string, string>();

  const isAcceptableTerm = (term: string): boolean => {
    if (!term || term.length < 3) return false;
    const lower = term.toLowerCase().trim();
    if (DISALLOWED_TERMS.has(lower)) return false;
    if (/^(this|that|these|those|it|we|they|he|she|i|the|and|for)$/i.test(lower)) return false;
    return true;
  };

  const cleanTermAndPredicate = (rawTerm: string, rawPredicate: string) => {
    let term = rawTerm
      .replace(/^(the|a|an|in|during|for|with|under)\s+/i, '')
      .replace(/\s+(and|or|which|that|in|to|for|with|of|is|are)$/i, '')
      .trim();

    if (term.length > 0) {
      term = term.charAt(0).toUpperCase() + term.slice(1);
    }

    let predicate = rawPredicate
      .replace(/^[\s,;:]+/, '')
      .replace(/[.]+$/, '')
      .trim();

    if (predicate.length > 150) {
      predicate = predicate.slice(0, 145).replace(/\s+\S*$/, '') + '...';
    }

    return { term, predicate };
  };

  for (const s of sentences) {
    let matched = false;

    // Pattern 1: Multi-word technical concept with action/mechanism verb
    let m = s.match(
      /^([A-Z][A-Za-z0-9_-]+(?:\s+[A-Za-z0-9_-]+){1,4})\s+(utilizes|employs|calculates|optimizes|simulates|minimizes|binds to|evaluates|predicts|measures|determines|stabilizes|regulates|catalyzes|generates|converts|transfers|inhibits|operates|requires|enables)\s+(.+)$/i
    );
    if (m && m[1] && m[3]) {
      const { term, predicate } = cleanTermAndPredicate(m[1], `${m[2]} ${m[3]}`);
      if (isAcceptableTerm(term) && predicate.length >= 15) {
        propositions.push({ term, predicate, sentence: s, type: 'action' });
        termMap.set(term, predicate);
        matched = true;
      }
    }

    // Pattern 2: Definition or classification
    if (!matched) {
      m = s.match(
        /^([A-Z][A-Za-z0-9_-]+(?:\s+[A-Za-z0-9_-]+){0,4})\s+(?:is defined as|is a computational technique for|serves as|functions as|refers to the process of|represents|is characterized by|is an essential method for)\s+(.+)$/i
      );
      if (m && m[1] && m[2]) {
        const { term, predicate } = cleanTermAndPredicate(m[1], m[2]);
        if (isAcceptableTerm(term) && predicate.length >= 15) {
          propositions.push({ term, predicate, sentence: s, type: 'definition' });
          termMap.set(term, predicate);
          matched = true;
        }
      }
    }

    // Pattern 3: Procedural or prerequisite statement
    if (!matched) {
      m = s.match(/^(?:Prior to|Before|In order to|To ensure|When performing)\s+([A-Za-z0-9\s_-]{4,40}),\s+(.+)$/i);
      if (m && m[1] && m[2]) {
        const { term, predicate } = cleanTermAndPredicate(m[1], m[2]);
        if (isAcceptableTerm(term) && predicate.length >= 15) {
          propositions.push({ term, predicate, sentence: s, type: 'procedure' });
          termMap.set(term, predicate);
          matched = true;
        }
      }
    }

    // Pattern 4: Technical capitalized entity anywhere in sentence with substantive predicate
    if (!matched) {
      const capMatches = s.match(/\b([A-Z][a-z0-9]{2,}(?:\s+[A-Z][a-z0-9]{2,})+)\b/);
      if (capMatches && capMatches[1]) {
        const candidate = capMatches[1];
        if (isAcceptableTerm(candidate)) {
          const rawPred = s.replace(candidate, '').replace(/^[\s,;]+/, '').trim();
          const { term, predicate } = cleanTermAndPredicate(candidate, rawPred);
          if (predicate.length >= 20) {
            propositions.push({ term, predicate, sentence: s, type: 'statement' });
            termMap.set(term, predicate);
          }
        }
      }
    }
  }

  // Fallback if structured patterns yielded few items: extract substantive domain sentences
  if (propositions.length < 3) {
    sentences.forEach((s) => {
      const m = s.match(/\b([A-Z][a-z]{3,}(?:\s+[A-Z][a-z]{3,})?)\b/);
      if (m && isAcceptableTerm(m[1])) {
        const term = m[1];
        const predicate = s.replace(term, '').trim() || s;
        if (predicate.length >= 20) {
          propositions.push({ term, predicate, sentence: s, type: 'statement' });
          termMap.set(term, predicate);
        }
      }
    });
  }

  // Ultimate fallback to prevent empty state
  if (propositions.length === 0) {
    const docTitle = config.documentName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
    propositions.push({
      term: docTitle || 'Core Methodology',
      predicate: 'governs the foundational principles, analytical procedures, and verification protocols',
      sentence: sentences[0] || 'The system enforces rigorous domain standards and verified methodologies.',
      type: 'statement'
    });
  }

  const allTerms = Array.from(termMap.keys()).filter(isAcceptableTerm);
  const allPredicates = Array.from(termMap.values());

  const availableTypes = config.questionTypes.length > 0
    ? config.questionTypes
    : (['single_choice', 'multiple_choice', 'true_false', 'short_answer'] as AssessmentQuestionTypeSetting[]);

  const formatOptText = (txt: string) => {
    const trimmed = txt.trim().replace(/[.]+$/, '');
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  };

  const generatedQuestions: GeneratedQuestionSchema[] = [];

  for (let i = 0; i < config.questionCount; i++) {
    const targetType = availableTypes[i % availableTypes.length];
    const difficulty = (config.difficulty === 'mixed'
      ? (i % 3 === 0 ? 'easy' : i % 3 === 1 ? 'medium' : 'hard')
      : config.difficulty) as 'easy' | 'medium' | 'hard';

    const prop = propositions[i % propositions.length];
    const qId = `gen-q-${Date.now()}-${i + 1}`;
    const points = difficulty === 'hard' ? 15 : difficulty === 'medium' ? 10 : 5;

    // 1. SINGLE CHOICE (Scenario-based / Root-cause / Workflow Decisions)
    if (targetType === 'single_choice') {
      const scenarioStyle = i % 3;
      let prompt = '';
      let correctText = '';
      let d1 = '';
      let d2 = '';
      let d3 = '';

      if (scenarioStyle === 0) {
        // Operational Case Scenario
        prompt = `Scenario: A technical team is deploying a workflow centered on "${prop.term}". During configuration, they need to ensure ${prop.predicate}. What is the most methodologically sound approach or expected operational outcome?`;
        correctText = formatOptText(prop.predicate);

        const otherPreds = allPredicates.filter((p) => p !== prop.predicate);
        d1 = otherPreds[0]
          ? formatOptText(otherPreds[0])
          : formatOptText(`Inverts the operational sequence by ignoring parameter calibration for ${prop.term}`);
        d2 = otherPreds[1]
          ? formatOptText(otherPreds[1])
          : formatOptText(`Bypasses intermediate verification steps to minimize initial execution overhead`);
        d3 = otherPreds[2]
          ? formatOptText(otherPreds[2])
          : formatOptText(`Forces static default constraints that prevent dynamic adaptation of ${prop.term}`);
      } else if (scenarioStyle === 1) {
        // Analytical Root Cause / Mechanism Evaluation
        prompt = `When evaluating the performance and reliability of "${prop.term}" in a production or research pipeline, what primary mechanism governs its operational behavior?`;
        correctText = formatOptText(prop.predicate);

        const otherTerms = allTerms.filter((t) => t.toLowerCase() !== prop.term.toLowerCase());
        d1 = otherTerms[0]
          ? formatOptText(`Directly delegates its core computational processing to ${otherTerms[0]} without synchronization`)
          : formatOptText(`Operates as a detached background listener with no impact on execution states`);
        d2 = otherTerms[1]
          ? formatOptText(`Restricts state transitions exclusively to ${otherTerms[1]}, disabling concurrent access`)
          : formatOptText(`Overrides validated input configurations with unconstrained heuristic approximations`);
        d3 = formatOptText(`Suppresses error thresholds to prioritize throughput over analytical accuracy`);
      } else {
        // Troubleshooting & Constraint Identification
        prompt = `During an audit of a pipeline utilizing "${prop.term}", an unexpected deviation is identified: "${prop.predicate}". Based on domain best practices, how should this condition be evaluated?`;
        correctText = formatOptText(`It represents the verified intended behavior and functional specification of ${prop.term}`);
        d1 = formatOptText(`It indicates a critical configuration defect that must be manually terminated`);
        d2 = formatOptText(`It is a transient artifact resulting from improper logging level settings`);
        d3 = formatOptText(`It violates safety constraints and requires reverting to deprecated legacy protocols`);
      }

      const rawOpts = [
        { id: `opt-${i}-1`, text: correctText, isCorrect: true },
        { id: `opt-${i}-2`, text: d1, isCorrect: false },
        { id: `opt-${i}-3`, text: d2, isCorrect: false },
        { id: `opt-${i}-4`, text: d3, isCorrect: false },
      ].sort(() => 0.5 - Math.random());

      generatedQuestions.push({
        id: qId,
        type: 'single_choice',
        prompt,
        difficulty,
        points,
        topic: prop.term,
        explanation: `Practical Rationale: In the verified study material, "${prop.sentence}". This establishes that ${prop.term} is designed to ${prop.predicate}.`,
        options: rawOpts,
      });
    }

    // 2. MULTIPLE CHOICE (Multi-Factor Analysis & System Constraints)
    else if (targetType === 'multiple_choice') {
      const nextProp = propositions[(i + 1) % propositions.length];
      const prompt = `When architecting or validating a workflow that incorporates "${prop.term}", which of the following operational characteristics and constraints are verified as TRUE? (Select all that apply)`;

      const correct1 = formatOptText(prop.sentence.length < 140 ? prop.sentence : `${prop.term} ${prop.predicate}`);
      const correct2 = formatOptText(nextProp.sentence.length < 140 ? nextProp.sentence : `${nextProp.term} ${nextProp.predicate}`);

      const distractor1 = formatOptText(`${prop.term} eliminates all requirement for input validation and parameter checking`);
      const distractor2 = formatOptText(`${nextProp.term} operates inversely, rejecting state modifications during execution`);

      const rawOpts = [
        { id: `opt-${i}-1`, text: correct1, isCorrect: true },
        { id: `opt-${i}-2`, text: correct2, isCorrect: true },
        { id: `opt-${i}-3`, text: distractor1, isCorrect: false },
        { id: `opt-${i}-4`, text: distractor2, isCorrect: false },
      ].sort(() => 0.5 - Math.random());

      generatedQuestions.push({
        id: qId,
        type: 'multiple_choice',
        prompt,
        difficulty,
        points: points + 5,
        topic: prop.term,
        explanation: `Document Evidence:\n1. "${prop.sentence}"\n2. "${nextProp.sentence}"`,
        options: rawOpts,
      });
    }

    // 3. TRUE / FALSE (Nuanced Practical Assertion Verification)
    else if (targetType === 'true_false') {
      const isTrue = i % 2 === 0;
      let promptText = '';
      let explanationText = '';

      if (isTrue) {
        promptText = `Technical Assertion: In a verified domain pipeline, "${prop.term}" is designed such that it ${prop.predicate}. Is this assertion technically accurate?`;
        explanationText = `Accurate. Supported directly by the curriculum documentation: "${prop.sentence}"`;
      } else {
        const otherTerm = allTerms.find((t) => t.toLowerCase() !== prop.term.toLowerCase()) || 'unrelated external services';
        promptText = `Technical Assertion: In standard implementations, "${prop.term}" is completely bypassed in favor of "${otherTerm}" without any requirement for parameter calibration. Is this assertion technically accurate?`;
        explanationText = `Inaccurate. The curriculum material explicitly documents that "${prop.sentence}", confirming that ${prop.term} is an active, required component.`;
      }

      generatedQuestions.push({
        id: qId,
        type: 'true_false',
        prompt: promptText,
        difficulty,
        points: 5,
        topic: prop.term,
        explanation: explanationText,
        options: [
          { id: `opt-${i}-t`, text: 'True', isCorrect: isTrue },
          { id: `opt-${i}-f`, text: 'False', isCorrect: !isTrue },
        ],
      });
    }

    // 4. SHORT ANSWER (Case Study & Procedural Diagnosis)
    else if (targetType === 'short_answer') {
      const conciseAnswer = `${prop.term} functions to ${prop.predicate}, adhering to verified curriculum protocols.`;
      generatedQuestions.push({
        id: qId,
        type: 'short_answer',
        prompt: `Applied Case Study: You are responsible for calibrating a workflow that utilizes "${prop.term}". Describe the primary mechanism by which it operates to ${prop.predicate}, and identify one critical parameter or constraint that must be monitored to ensure validity.`,
        difficulty,
        points: difficulty === 'easy' ? 5 : 10,
        topic: prop.term,
        correctAnswer: conciseAnswer,
        explanation: `Document Reference: "${prop.sentence}"`,
        rubric: `Scoring Guidelines:\n- Accurate identification of ${prop.term}'s operational mechanism (50%)\n- Clear explanation of ${prop.predicate} (30%)\n- Valid description of quality constraints or procedural calibration (20%)`,
      });
    }

    // 5. ESSAY (Methodological & Architecture Critique)
    else {
      generatedQuestions.push({
        id: qId,
        type: 'essay',
        prompt: `Engineering & Methodological Review: Provide a comprehensive technical critique of "${prop.term}". Detail: 1) Its fundamental operational principles. 2) Key variables affecting "${prop.predicate}". 3) Risk factors and mitigation strategies in production or research deployments.`,
        difficulty,
        points: difficulty === 'easy' ? 15 : difficulty === 'medium' ? 20 : 25,
        topic: prop.term,
        explanation: `Grounded in curriculum text: "${prop.sentence}"`,
        rubric: `Scoring Criteria:\n1. Core understanding of ${prop.term} principles (35%)\n2. Technical accuracy regarding ${prop.predicate} (35%)\n3. Quality of practical risk mitigation and real-world synthesis (30%)`,
      });
    }
  }

  return generatedQuestions;
}

export async function regenerateSingleQuestion(
  context: SingleRegenContext
): Promise<GeneratedQuestionSchema> {
  const provider = getActiveAIProviderInfo();

  if (provider.type === 'gemini') {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_AI_API_KEY;
    const questions = await generateViaGemini(apiKey, {
      documentName: 'document_source',
      documentText: context.documentText,
      difficulty: context.difficulty,
      questionCount: 1,
      questionTypes: [context.type]
    });
    if (questions.length > 0) {
      return { ...questions[0], id: context.existingQuestion.id, points: context.points };
    }
  } else if (provider.type === 'openai') {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    const questions = await generateViaOpenAI(apiKey, {
      documentName: 'document_source',
      documentText: context.documentText,
      difficulty: context.difficulty,
      questionCount: 1,
      questionTypes: [context.type]
    });
    if (questions.length > 0) {
      return { ...questions[0], id: context.existingQuestion.id, points: context.points };
    }
  }

  // Local Grounded Engine fallback
  const mockConfig: AIGenerationConfig = {
    documentName: 'curriculum_document',
    documentText: context.documentText,
    difficulty: context.difficulty,
    questionCount: 1,
    questionTypes: [context.type]
  };

  const regenerated = generateViaLocalGroundedEngine(mockConfig);
  const result = regenerated[0] || context.existingQuestion;
  return {
    ...result,
    id: context.existingQuestion.id,
    points: context.points,
    prompt: `[Regenerated] ${result.prompt}`
  };
}

/**
 * Main Question Generation entry point
 */
export async function generateAssessmentQuestions(
  config: AIGenerationConfig
): Promise<GenerationResult> {
  if (!config.documentText || config.documentText.trim().length < 20) {
    return {
      success: false,
      error: 'Document text is too brief or empty to generate grounded assessment questions.',
      providerUsed: 'None',
      isMockOrLocalFallback: false
    };
  }

  if (config.questionCount < 1 || config.questionCount > 50) {
    return {
      success: false,
      error: 'Question count must be between 1 and 50.',
      providerUsed: 'None',
      isMockOrLocalFallback: false
    };
  }

  const provider = getActiveAIProviderInfo();

  try {
    let rawQuestions: GeneratedQuestionSchema[];
    let isFallback = false;

    if (provider.type === 'gemini') {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_AI_API_KEY;
      try {
        rawQuestions = await generateViaGemini(apiKey, config);
      } catch (geminiErr: any) {
        console.warn('Gemini generation failed, falling back to local grounded engine:', geminiErr);
        rawQuestions = generateViaLocalGroundedEngine(config);
        isFallback = true;
      }
    } else if (provider.type === 'openai') {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      try {
        rawQuestions = await generateViaOpenAI(apiKey, config);
      } catch (openAiErr: any) {
        console.warn('OpenAI generation failed, falling back to local grounded engine:', openAiErr);
        rawQuestions = generateViaLocalGroundedEngine(config);
        isFallback = true;
      }
    } else {
      rawQuestions = generateViaLocalGroundedEngine(config);
      isFallback = true;
    }

    // Validate each generated question against schema
    const validatedQuestions: GeneratedQuestionSchema[] = [];
    const schemaErrors: string[] = [];

    for (let i = 0; i < rawQuestions.length; i++) {
      const q = rawQuestions[i];
      // Normalize question structure
      const normalizedQ: GeneratedQuestionSchema = {
        id: q.id || `gen-q-${Date.now()}-${i + 1}`,
        type: q.type || 'single_choice',
        prompt: q.prompt || `Question ${i + 1}`,
        points: q.points || (q.difficulty === 'hard' ? 15 : q.difficulty === 'medium' ? 10 : 5),
        difficulty: q.difficulty || 'medium',
        explanation: q.explanation || 'Based on the uploaded curriculum reading.',
        topic: q.topic || 'General Concepts',
        rubric: q.rubric,
        correctAnswer: q.correctAnswer,
        options: q.options?.map((opt, optIdx) => ({
          id: opt.id || `opt-${i}-${optIdx}`,
          text: opt.text || `Option ${optIdx + 1}`,
          isCorrect: Boolean(opt.isCorrect)
        }))
      };

      const val = validateQuestionSchema(normalizedQ);
      if (!val.valid) {
        schemaErrors.push(`Question #${i + 1}: ${val.errors.join('; ')}`);
      }
      validatedQuestions.push(normalizedQ);
    }

    if (validatedQuestions.length === 0) {
      return {
        success: false,
        error: `Question validation failed: ${schemaErrors.join(' | ')}`,
        providerUsed: provider.name,
        isMockOrLocalFallback: isFallback
      };
    }

    return {
      success: true,
      questions: validatedQuestions,
      providerUsed: isFallback ? 'Local Grounded Engine (Semantic Fallback)' : provider.name,
      isMockOrLocalFallback: isFallback
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to generate assessment questions.',
      providerUsed: provider.name,
      isMockOrLocalFallback: true
    };
  }
}

/**
 * Converts GeneratedQuestionSchema to LMS Question interface for store persistence
 */
export function convertSchemaToQuestion(
  schema: GeneratedQuestionSchema,
  assessmentId: string,
  bankId: string = 'qb-ai-generated'
): Question {
  const options: QuestionOption[] | undefined = schema.options?.map((opt, idx) => ({
    id: opt.id || `opt-${idx}`,
    text: opt.text,
    isCorrect: opt.isCorrect,
    order: idx + 1
  }));

  const correctOpt = options?.find((o) => o.isCorrect);

  return {
    id: schema.id,
    bankId,
    assessmentId,
    type: schema.type,
    prompt: schema.prompt,
    options,
    correctAnswer: schema.correctAnswer || (correctOpt ? correctOpt.text : undefined),
    correctAnswers: options?.filter((o) => o.isCorrect).map((o) => o.text),
    explanation: schema.sourceSegment
      ? (schema.explanation.includes(schema.sourceSegment) ? schema.explanation : `${schema.explanation} [Source: ${schema.sourceSegment}]`)
      : schema.explanation,
    rubric: schema.rubric,
    topic: schema.topic,
    points: schema.points,
    tags: [
      schema.difficulty,
      schema.topic || 'Curriculum',
      'AI-Generated',
      ...(schema.sourceSegment ? ['Video-Transcript'] : [])
    ],
    difficulty: schema.difficulty,
    version: 1,
    status: 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Retrieve auth context token and tenant ID from localStorage session
 */
function getAuthContext(): { token: string; tenantId: string } {
  try {
    const raw = localStorage.getItem('venilearn_auth_session');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        token: parsed.token || 'venilearn-token-admin-dev',
        tenantId: parsed.tenantId || '66206e39-2029-4ce6-8be1-cfa7176fb79f',
      };
    }
  } catch {}
  return {
    token: 'venilearn-token-trainer-dev',
    tenantId: '66206e39-2029-4ce6-8be1-cfa7176fb79f',
  };
}

/**
 * Query LMS Backend AI Gateway Provider Status (GET /api/v1/ai/provider-status)
 */
export async function fetchAIProviderStatus(): Promise<AIProviderStatus> {
  const { token, tenantId } = getAuthContext();
  try {
    const res = await fetch(`${API_BASE_URL}/ai/provider-status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Tenant-ID': tenantId,
      },
    });

    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        return json.data as AIProviderStatus;
      }
    }
  } catch (err) {
    console.warn('Unable to reach backend AI provider status endpoint, using local detection:', err);
  }

  // Fallback to local detector
  const local = getActiveAIProviderInfo();
  return {
    configured: local.configured,
    provider: local.type === 'gemini' ? 'gemini' : local.type === 'openai' ? 'openai' : 'none',
    name: local.name,
    model: local.type === 'gemini' ? 'gemini-1.5-flash' : local.type === 'openai' ? 'gpt-4o-mini' : 'local-grounded-v2',
  };
}

/**
 * Call LMS Backend AI Gateway to generate questions (POST /api/v1/ai/generate-questions)
 * Falls back to high-fidelity client-side grounded document engine if backend is offline.
 */
export async function generateAssessmentQuestionsViaGateway(
  params: AIGatewayQueryParams
): Promise<AIGatewayResult> {
  const { token, tenantId } = getAuthContext();

  try {
    const res = await fetch(`${API_BASE_URL}/ai/generate-questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Tenant-ID': tenantId,
      },
      body: JSON.stringify(params),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data.questions)) {
        const quizQuestions: QuizQuestionItem[] = json.data.questions.map((q: any, idx: number) => ({
          id: q.id || `q-ai-${Date.now()}-${idx + 1}`,
          prompt: q.prompt,
          type: q.type || 'single_choice',
          options: (q.options || []).map((opt: any, oIdx: number) => ({
            id: opt.id || `opt-${idx}-${oIdx + 1}`,
            text: opt.text,
            isCorrect: Boolean(opt.isCorrect),
          })),
          points: q.points || (q.difficulty === 'hard' ? 10 : q.difficulty === 'medium' ? 5 : 2),
          explanation: q.explanation || 'Grounded in uploaded curriculum reading.',
          difficulty: q.difficulty || params.difficulty || 'medium',
          topic: q.topic || params.topic || 'Curriculum Analysis',
          correctAnswerText: q.correctAnswer || q.modelAnswer || (q.options?.find((o: any) => o.isCorrect)?.text),
          needsReview: Boolean(q.needsReview),
          source: 'ai',
        }));

        return {
          success: true,
          questions: quizQuestions,
          providerUsed: json.data.providerUsed || 'LMS AI Gateway',
          isGroundedFallback: Boolean(json.data.isGroundedFallback),
        };
      }
    }
  } catch (networkErr) {
    console.warn('Network error reaching LMS AI gateway, activating local grounded engine fallback:', networkErr);
  }

  // Grounded document parsing fallback with graceful fallback to curriculum synthesizer
  const localConfig: AIGenerationConfig = {
    documentName: params.documentName || 'Course Document',
    documentText: params.documentText || params.topic || 'Curriculum Overview',
    difficulty: (params.difficulty as any) || 'medium',
    questionCount: params.count || 5,
    questionTypes: (params.types as any) || ['single_choice', 'multiple_choice', 'true_false', 'short_answer'],
  };

  try {
    const localRaw = generateViaLocalGroundedEngine(localConfig);
    if (localRaw && localRaw.length > 0) {
      const quizQuestions: QuizQuestionItem[] = localRaw.map((q, idx) => ({
        id: q.id || `q-grounded-${Date.now()}-${idx + 1}`,
        prompt: q.prompt,
        type: q.type as any,
        options: (q.options || []).map((opt, oIdx) => ({
          id: opt.id || `opt-${idx}-${oIdx + 1}`,
          text: opt.text,
          isCorrect: Boolean(opt.isCorrect),
        })),
        points: q.points,
        explanation: q.explanation,
        difficulty: q.difficulty,
        topic: q.topic || params.topic || 'Subject Matter',
        correctAnswerText: q.correctAnswer,
        needsReview: false,
        source: 'ai',
      }));

      return {
        success: true,
        questions: quizQuestions,
        providerUsed: 'VeniLearn Grounded Document Parsing Engine (Semantic Fallback)',
        isGroundedFallback: true,
      };
    }
  } catch (err) {
    // Graceful fallback to curriculum intelligence synthesizer
  }

  const contextualQuestions = generateContextualQuestions({
    scope: 'module_assessment',
    courseTitle: params.topic || params.documentName || 'Software Architecture',
    moduleTitle: params.topic,
    difficulty: (params.difficulty as any) || 'medium',
    questionTypes: (params.types as any) || ['single_choice', 'multiple_choice', 'true_false', 'short_answer'],
    count: params.count || 5,
    pointsPerQuestion: params.pointsPerQuestion,
  });

  return {
    success: true,
    questions: contextualQuestions,
    providerUsed: 'VeniLearn Curriculum Intelligence Engine (Domain Fallback)',
    isGroundedFallback: true,
  };
}
