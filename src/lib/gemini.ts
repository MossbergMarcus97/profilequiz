import { GoogleGenerativeAI } from "@google/generative-ai";
import { Locale, localeNames } from "@/i18n/config";

// Initialize Gemini client
const API_KEY = process.env.GOOGLE_AI_API_KEY;
if (!API_KEY) {
  console.error("GOOGLE_AI_API_KEY is not set!");
}
const genAI = new GoogleGenerativeAI(API_KEY || "");

// Gemini 3 Flash - latest model optimized for speed and quality
const MODEL = "gemini-3-flash";

// ─────────────────────────────────────────────────────────────────────────────
// Types for Translation
// ─────────────────────────────────────────────────────────────────────────────

export interface TranslatableBlueprint {
  title: string;
  intro: {
    headline: string;
    subhead: string;
    disclaimer: string;
  };
  scales: Array<{
    id: string;
    name: string;
    lowLabel: string;
    highLabel: string;
  }>;
  questions: Array<{
    id: string;
    type: string;
    text: string;
    // Optional fields depending on question type
    leftLabel?: string;
    rightLabel?: string;
    optionA?: string;
    optionB?: string;
    options?: Array<{ id: string; label: string }>;
  }>;
  profiles?: Array<{
    id: string;
    name: string;
    oneLineHook: string;
    teaserBullets: string[];
    shareTitle?: string;
  }>;
  paywall: {
    priceLabel: string;
    bullets: string[];
  };
  resultLabeling: {
    labelsByScaleHigh: Record<string, string>;
    labelsByScaleLow: Record<string, string>;
  };
}

export interface TranslatedBlueprint {
  title: string;
  intro: {
    headline: string;
    subhead: string;
    disclaimer: string;
  };
  scales: Array<{
    id: string;
    name: string;
    lowLabel: string;
    highLabel: string;
  }>;
  questions: Array<{
    id: string;
    text: string;
    leftLabel?: string;
    rightLabel?: string;
    optionA?: string;
    optionB?: string;
    options?: Array<{ id: string; label: string }>;
  }>;
  profiles?: Array<{
    id: string;
    name: string;
    oneLineHook: string;
    teaserBullets: string[];
    shareTitle?: string;
  }>;
  paywall: {
    bullets: string[];
  };
  resultLabeling: {
    labelsByScaleHigh: Record<string, string>;
    labelsByScaleLow: Record<string, string>;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Translation System Prompts
// ─────────────────────────────────────────────────────────────────────────────

const BLUEPRINT_TRANSLATION_PROMPT = `You are an expert translator specializing in psychology and personality assessments. Your task is to translate quiz content from English to {targetLanguage}.

CRITICAL GUIDELINES:
1. **Cultural Adaptation**: Don't just translate literally - adapt the content to feel native to {targetLanguage} speakers. Use idioms, expressions, and phrasings that feel natural in {targetLanguage}.

2. **Psychological Accuracy**: Preserve psychological terminology accurately. Common terms like "extraversion", "conscientiousness", "neuroticism" have established translations in psychology literature - use them.

3. **Tone Preservation**: The original content has a {tone} tone. Maintain this exact tone in your translation.

4. **Context Awareness**: This is a personality quiz. Questions should feel engaging and introspective, not clinical or robotic.

5. **Gendered Language**: If {targetLanguage} uses gendered language, prefer inclusive/neutral forms where possible, or use the conventional form for addressing a general audience.

6. **Length Consistency**: Keep translations roughly the same length as the original. UI elements (buttons, labels) should be concise.

7. **Do NOT translate**:
   - Price labels (keep "$3" as "$3")
   - Technical IDs or keys
   - Scale IDs (C, E, A, N, O)

OUTPUT FORMAT:
Return ONLY valid JSON matching the exact structure provided. No markdown, no explanations, just the JSON object.`;

const REPORT_TRANSLATION_PROMPT = `You are an expert translator specializing in psychology and personality assessments. Your task is to translate a personality report from English to {targetLanguage}.

CRITICAL GUIDELINES:
1. **Cultural Adaptation**: Adapt the content to feel native to {targetLanguage} speakers. Use idioms, expressions, and cultural references that resonate with the target audience.

2. **HTML Preservation**: Maintain all HTML tags exactly as they are (h2, h3, p, ul, li, blockquote, strong, em, div, span, header, main, footer). Only translate the text content within them.

3. **Psychological Accuracy**: Preserve psychological terminology accurately using established translations from psychology literature.

4. **Warm & Personal Tone**: The report uses "you" language and should feel like a personalized gift. Maintain this intimate, encouraging tone.

5. **Formatting**: Keep line breaks, spacing, and structure identical to the original.

6. **Gendered Language**: Use inclusive/neutral forms where possible in {targetLanguage}.

OUTPUT FORMAT:
Return ONLY the translated HTML content. No markdown wrapper, no explanations, just the HTML string.`;

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract translatable content from a full blueprint
 */
export function extractTranslatableContent(blueprint: any): TranslatableBlueprint {
  return {
    title: blueprint.title,
    intro: {
      headline: blueprint.intro.headline,
      subhead: blueprint.intro.subhead,
      disclaimer: blueprint.intro.disclaimer,
    },
    scales: blueprint.scales.map((s: any) => ({
      id: s.id,
      name: s.name,
      lowLabel: s.lowLabel,
      highLabel: s.highLabel,
    })),
    questions: blueprint.questions.map((q: any) => {
      const base: any = {
        id: q.id,
        type: q.type,
        text: q.text,
      };
      if (q.leftLabel) base.leftLabel = q.leftLabel;
      if (q.rightLabel) base.rightLabel = q.rightLabel;
      if (q.optionA) base.optionA = q.optionA;
      if (q.optionB) base.optionB = q.optionB;
      if (q.options) {
        base.options = q.options.map((o: any) => ({
          id: o.id,
          label: o.label,
        }));
      }
      return base;
    }),
    profiles: blueprint.profiles?.map((p: any) => ({
      id: p.id,
      name: p.name,
      oneLineHook: p.oneLineHook,
      teaserBullets: p.teaserBullets,
      shareTitle: p.shareTitle,
    })),
    paywall: {
      priceLabel: blueprint.paywall.priceLabel,
      bullets: blueprint.paywall.bullets,
    },
    resultLabeling: {
      labelsByScaleHigh: blueprint.resultLabeling.labelsByScaleHigh,
      labelsByScaleLow: blueprint.resultLabeling.labelsByScaleLow,
    },
  };
}

/**
 * Merge translated content back into the original blueprint structure
 */
export function mergeTranslation(
  originalBlueprint: any,
  translation: TranslatedBlueprint | undefined
): any {
  if (!translation) return originalBlueprint;

  const merged = { ...originalBlueprint };

  // Merge top-level fields
  merged.title = translation.title;
  merged.intro = {
    ...merged.intro,
    headline: translation.intro.headline,
    subhead: translation.intro.subhead,
    disclaimer: translation.intro.disclaimer,
  };

  // Merge scales
  merged.scales = originalBlueprint.scales.map((s: any) => {
    const translated = translation.scales.find((ts) => ts.id === s.id);
    if (!translated) return s;
    return {
      ...s,
      name: translated.name,
      lowLabel: translated.lowLabel,
      highLabel: translated.highLabel,
    };
  });

  // Merge questions
  merged.questions = originalBlueprint.questions.map((q: any) => {
    const translated = translation.questions.find((tq) => tq.id === q.id);
    if (!translated) return q;
    const mergedQ = { ...q, text: translated.text };
    if (translated.leftLabel) mergedQ.leftLabel = translated.leftLabel;
    if (translated.rightLabel) mergedQ.rightLabel = translated.rightLabel;
    if (translated.optionA) mergedQ.optionA = translated.optionA;
    if (translated.optionB) mergedQ.optionB = translated.optionB;
    if (translated.options) {
      mergedQ.options = q.options.map((o: any) => {
        const to = translated.options?.find((opt) => opt.id === o.id);
        return to ? { ...o, label: to.label } : o;
      });
    }
    return mergedQ;
  });

  // Merge profiles
  if (translation.profiles && originalBlueprint.profiles) {
    merged.profiles = originalBlueprint.profiles.map((p: any) => {
      const translated = translation.profiles?.find((tp) => tp.id === p.id);
      if (!translated) return p;
      return {
        ...p,
        name: translated.name,
        oneLineHook: translated.oneLineHook,
        teaserBullets: translated.teaserBullets,
        shareTitle: translated.shareTitle || p.shareTitle,
      };
    });
  }

  // Merge paywall (keep priceLabel from original)
  merged.paywall = {
    ...merged.paywall,
    bullets: translation.paywall.bullets,
  };

  // Merge result labeling
  merged.resultLabeling = {
    ...merged.resultLabeling,
    labelsByScaleHigh: translation.resultLabeling.labelsByScaleHigh,
    labelsByScaleLow: translation.resultLabeling.labelsByScaleLow,
  };

  return merged;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Translation Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Translate a quiz blueprint to the target locale using Gemini 3 Flash
 */
export async function translateBlueprint(
  blueprint: any,
  targetLocale: Locale,
  options: { tone?: string } = {}
): Promise<TranslatedBlueprint> {
  const { tone = "professional yet approachable" } = options;
  const targetLanguage = localeNames[targetLocale];

  // Extract only the translatable content
  const translatableContent = extractTranslatableContent(blueprint);

  // Build the prompt
  const systemPrompt = BLUEPRINT_TRANSLATION_PROMPT
    .replace(/{targetLanguage}/g, targetLanguage)
    .replace(/{tone}/g, tone);

  const userPrompt = `Translate this quiz content to ${targetLanguage}:

${JSON.stringify(translatableContent, null, 2)}

Remember:
- Return the same JSON structure with translated values
- Keep all IDs unchanged
- Don't translate the priceLabel
- Make it feel native to ${targetLanguage} speakers`;

  console.log(`[Gemini] Using model: ${MODEL}`);
  console.log(`[Gemini] API Key present: ${!!API_KEY}`);
  
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      temperature: 0.3, // Lower temperature for more consistent translations
      topP: 0.8,
      maxOutputTokens: 32768,
    },
  });

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: systemPrompt + "\n\n" + userPrompt }],
        },
      ],
    });

    const response = result.response;
    const text = response.text();

    console.log(`[Gemini] Response received, length: ${text.length}`);

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[Gemini] No JSON found in response:", text.substring(0, 500));
      throw new Error("No valid JSON found in translation response");
    }

    const translated = JSON.parse(jsonMatch[0]) as TranslatedBlueprint;
    return translated;
  } catch (error: any) {
    console.error("[Gemini] API call failed:", error.message);
    console.error("[Gemini] Full error:", JSON.stringify(error, null, 2));
    throw error;
  }
}

/**
 * Translate a pre-generated HTML report to the target locale using Gemini 3 Flash
 */
export async function translateReport(
  reportHtml: string,
  targetLocale: Locale,
  context: { profileName: string; testTitle: string }
): Promise<string> {
  const targetLanguage = localeNames[targetLocale];

  const systemPrompt = REPORT_TRANSLATION_PROMPT.replace(
    /{targetLanguage}/g,
    targetLanguage
  );

  const userPrompt = `Translate this personality report for "${context.profileName}" from the "${context.testTitle}" quiz to ${targetLanguage}:

${reportHtml}

Remember:
- Preserve all HTML tags exactly
- Make it feel native and warm in ${targetLanguage}
- Return ONLY the translated HTML`;

  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      temperature: 0.3,
      topP: 0.8,
      maxOutputTokens: 65536,
    },
  });

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [{ text: systemPrompt + "\n\n" + userPrompt }],
      },
    ],
  });

  const response = result.response;
  let translatedHtml = response.text();

  // Clean up any markdown wrappers if present
  translatedHtml = translatedHtml
    .replace(/^```html\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim();

  return translatedHtml;
}

/**
 * Translate multiple blueprints or reports in batch
 * Processes in parallel with rate limiting
 */
export async function translateBatch<T>(
  items: T[],
  translateFn: (item: T) => Promise<any>,
  options: { batchSize?: number; delayMs?: number } = {}
): Promise<Array<{ item: T; result: any; error?: string }>> {
  const { batchSize = 3, delayMs = 500 } = options;
  const results: Array<{ item: T; result: any; error?: string }> = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(async (item) => {
        try {
          const result = await translateFn(item);
          return { item, result };
        } catch (error: any) {
          console.error("Translation failed for item:", error);
          return { item, result: null, error: error.message };
        }
      })
    );

    results.push(...batchResults);

    // Rate limiting delay between batches
    if (i + batchSize < items.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Get available locales for translation (excludes English as source)
 */
export function getTranslatableLocales(): Locale[] {
  return ["sv", "no", "da", "fi", "is", "de", "es", "fr"];
}

