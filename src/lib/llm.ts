import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// GPT-4o - OpenAI's latest and most capable model
const MODEL = "gpt-4o";
const REPORT_MODEL = "gpt-4o";

const BLUEPRINT_SYSTEM_PROMPT = `You are an expert psychometrician and personality test designer. Your role is to create scientifically-grounded, engaging personality assessments.

When generating a TestBlueprint, you MUST:
1. Follow the exact JSON schema provided
2. Create meaningful scales with clear psychological constructs
3. Write engaging, clear questions appropriate for the target audience
4. Include a mix of question types (likert, slider, scenario, ab) for variety
5. Ensure questions measure distinct aspects of the target construct
6. Use reverse-scored items for likert questions (about 30% of them) to reduce acquiescence bias
7. Create result labels that feel personalized and insightful
8. Write compelling paywall bullets that highlight unique value

Scale IDs must be exactly: "C", "E", "A", "N", "O" (you can repurpose these for any 5-factor model, they're just identifiers)

Question Types:
- "likert": Standard agree/disagree (set reverse:true for negatively-worded items)
- "slider": Continuous scale with custom endpoints (use for preference/spectrum questions)
- "scenario": Multiple choice with explicit scores (-2 to +2)
- "ab": Binary choice between two options

Output ONLY valid JSON. No markdown, no explanations.`;

const REPORT_SYSTEM_PROMPT = `You are a personality insights writer creating personalized reports. Write in a warm, insightful, encouraging tone.

Guidelines:
- Be specific and actionable, not generic
- Reference their actual scores and tendencies
- Include strengths AND growth areas
- Use "you" language throughout
- Avoid clinical/diagnostic language
- Include practical suggestions
- Format with clean HTML (h2, h3, p, ul/li, blockquote for key insights)
- Make it feel personalized, not templated

Output clean HTML content only (inside a single div), no markdown.`;

export async function generateBlueprint(
  prompt: string,
  options: {
    numQuestions?: number;
    questionTypes?: string[];
    targetAudience?: string;
    tone?: string;
    generateImages?: boolean;
  } = {}
): Promise<any> {
  const { 
    numQuestions = 20, 
    questionTypes = ["likert", "slider", "scenario", "ab"],
    targetAudience = "general adult audience",
    tone = "professional yet approachable",
    generateImages = false,
  } = options;

  const imageInstructions = generateImages 
    ? `\n- IMPORTANT: For EACH question, include an "imagePrompt" field with a detailed prompt to generate a visually compelling illustration that captures the essence of the question. The image should be:
  - Abstract or metaphorical (not literal depictions of people answering questions)
  - Emotionally evocative and relevant to the question's theme
  - Professional, modern illustration style
  - No text or words in the image
  - Example: For a question about leadership, use "A lone figure standing at the helm of a ship navigating through stormy seas toward a bright horizon, dramatic lighting, digital art style"`
    : "";

  const userPrompt = `Create a personality test based on this description:

${prompt}

Requirements:
- Target audience: ${targetAudience}
- Tone: ${tone}
- Number of questions: ${numQuestions}
- Question types to include: ${questionTypes.join(", ")}
- Distribute questions evenly across all 5 scales${imageInstructions}

The JSON schema to follow:
{
  "version": "1.0",
  "title": "string",
  "intro": {
    "headline": "string (compelling hook)",
    "subhead": "string (what they'll discover)",
    "disclaimer": "string (brief educational disclaimer)"
  },
  "scales": [
    {
      "id": "C" | "E" | "A" | "N" | "O",
      "name": "string (trait name)",
      "lowLabel": "string (what low scorers are like)",
      "highLabel": "string (what high scorers are like)"
    }
  ],
  "questions": [
    // Likert type (imagePrompt is optional - include only if images are requested):
    { "id": "q1", "type": "likert", "scaleId": "C", "text": "string", "reverse": false, "imagePrompt": "optional DALL-E prompt" },
    // Slider type:
    { "id": "q2", "type": "slider", "scaleId": "E", "text": "string", "leftLabel": "string", "rightLabel": "string", "imagePrompt": "optional" },
    // Scenario type:
    { "id": "q3", "type": "scenario", "scaleId": "A", "text": "string", "options": [
      { "id": "opt1", "label": "string", "score": -2 | -1 | 0 | 1 | 2 }
    ], "imagePrompt": "optional" },
    // AB type:
    { "id": "q4", "type": "ab", "scaleId": "N", "text": "string", "optionA": "string", "optionB": "string", "scoreA": number, "scoreB": number, "imagePrompt": "optional" }
  ],
  "scoring": {
    "likertMap": { "1": -2, "2": -1, "3": 0, "4": 1, "5": 2 },
    "sliderRange": { "min": -2, "max": 2 }
  },
  "resultLabeling": {
    "method": "top2",
    "labelsByScaleHigh": { "C": "string", "E": "string", "A": "string", "N": "string", "O": "string" },
    "labelsByScaleLow": { "C": "string", "E": "string", "A": "string", "N": "string", "O": "string" }
  },
  "paywall": {
    "priceLabel": "$3",
    "bullets": ["string (benefit 1)", "string (benefit 2)", "string (benefit 3)", "string (benefit 4)"]
  },
  "reportTemplate": {
    "sections": [
      { "id": "overview", "title": "Your Personality Profile", "instruction": "LLM instruction for generating this section" },
      { "id": "strengths", "title": "Your Natural Strengths", "instruction": "..." },
      { "id": "growth", "title": "Growth Opportunities", "instruction": "..." },
      { "id": "relationships", "title": "In Relationships", "instruction": "..." },
      { "id": "career", "title": "Career Insights", "instruction": "..." }
    ]
  }
}`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: BLUEPRINT_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("No content returned from OpenAI");

  return JSON.parse(content);
}

export async function generateHTML(
  testTitle: string,
  scores: Record<string, number>,
  scales: Array<{ id: string; name: string; lowLabel: string; highLabel: string }>,
  reportSections: Array<{ id: string; title: string; instruction: string }>,
  answers: Record<string, any>
): Promise<string> {
  const scaleDescriptions = scales.map(s => {
    const score = scores[s.id] || 50;
    const tendency = score > 60 ? "high" : score < 40 ? "low" : "moderate";
    return `- ${s.name} (${s.id}): ${score}% (${tendency}) - Low: "${s.lowLabel}", High: "${s.highLabel}"`;
  }).join("\n");

  const sectionsPrompt = reportSections.map(s => 
    `## ${s.title}\n${s.instruction}`
  ).join("\n\n");

  const userPrompt = `Generate a personalized personality report for someone who just took "${testTitle}".

Their scores:
${scaleDescriptions}

Write the following sections:
${sectionsPrompt}

Make it personal, insightful, and actionable. Reference their specific score patterns.
Total length: approximately 1500-2000 words across all sections.`;

  const response = await openai.chat.completions.create({
    model: REPORT_MODEL,
    messages: [
      { role: "system", content: REPORT_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

  return response.choices[0].message.content || "";
}

// Legacy function for backwards compatibility
export async function generateJSON<T>(prompt: string): Promise<T> {
  return generateBlueprint(prompt) as Promise<T>;
}

// Generate a comprehensive, premium report (pre-generated after quiz completion)
export async function generateComprehensiveReport(
  testTitle: string,
  scores: Record<string, number>,
  scales: Array<{ id: string; name: string; lowLabel: string; highLabel: string }>,
  reportSections: Array<{ id: string; title: string; instruction: string }>,
  answers: Record<string, any>,
  questions: Array<any>
): Promise<string> {
  // Build detailed score analysis
  const scaleAnalysis = scales.map(s => {
    const score = scores[s.id] || 50;
    const percentile = score;
    let intensity = "moderate";
    if (score >= 80) intensity = "very high";
    else if (score >= 65) intensity = "high";
    else if (score <= 20) intensity = "very low";
    else if (score <= 35) intensity = "low";
    
    return {
      name: s.name,
      id: s.id,
      score,
      percentile,
      intensity,
      lowLabel: s.lowLabel,
      highLabel: s.highLabel,
      tendency: score > 50 ? s.highLabel : s.lowLabel,
    };
  });

  // Find key answer patterns for evidence-based insights
  const keyAnswers = questions.slice(0, 10).map(q => ({
    question: q.text,
    answer: answers[q.id],
    scale: scales.find(s => s.id === q.scaleId)?.name || q.scaleId,
  }));

  // Sort scales by score to identify dominant traits
  const sortedScales = [...scaleAnalysis].sort((a, b) => b.score - a.score);
  const dominantTraits = sortedScales.slice(0, 2);
  const developmentAreas = sortedScales.slice(-2);

  const comprehensivePrompt = `You are an expert personality psychologist writing a premium, comprehensive personality report. This report is worth $3 and should feel substantial, insightful, and professionally written.

Create a detailed 3000-4000 word personality report with the following structure. Use clean, semantic HTML (h2, h3, p, ul, li, blockquote, strong, em). Make it feel personalized and valuable.

## CONTEXT
Test: "${testTitle}"

Scores (0-100 scale):
${scaleAnalysis.map(s => `- ${s.name}: ${s.score}% (${s.intensity}) - ${s.tendency}`).join('\n')}

Dominant traits: ${dominantTraits.map(t => t.name).join(' and ')}
Areas for growth: ${developmentAreas.map(t => t.name).join(' and ')}

Sample answers that shaped this profile:
${keyAnswers.map(a => `- Q: "${a.question}" → Response for ${a.scale}`).join('\n')}

## REQUIRED SECTIONS (write each thoroughly)

### 1. Executive Summary (200 words)
A compelling overview of their unique personality fingerprint. Reference their specific score pattern and what makes them distinct.

### 2. Your Core Identity Profile (400 words)
Deep dive into their dominant traits. What drives them? How do these traits interact? Include specific behavioral examples.

### 3. Detailed Trait Analysis (600 words)
For EACH of the 5 traits:
- Their score and what it means
- How this manifests in daily life
- The gifts this trait brings
- The challenges to watch for
Use subheadings for each trait.

### 4. Your Unique Strengths (300 words)
What they naturally excel at based on their profile. Be specific and actionable. Include how they can leverage these strengths.

### 5. Growth Opportunities (300 words)
Constructive, encouraging guidance on areas for development. Frame positively. Include practical strategies.

### 6. Communication & Relationships (400 words)
How their personality affects:
- Romantic relationships
- Friendships
- Family dynamics
- Conflict resolution style
Include specific tips for each.

### 7. Career & Work Style (400 words)
- Ideal work environments
- Leadership style or collaboration preferences
- Best-fit career paths (list 5-7 specific roles)
- Productivity tips based on their traits

### 8. Stress Response & Self-Care (250 words)
How they typically respond to stress, and personalized self-care recommendations.

### 9. Personal Growth Roadmap (250 words)
3-5 specific, actionable goals for the next 90 days based on their profile.

### 10. Your Personality Mantra (50 words)
A personalized affirmation or guiding principle that captures their essence.

## STYLE GUIDELINES
- Write in second person ("you")
- Be warm, insightful, and encouraging
- Include specific examples and scenarios
- Use bullet points for actionable items
- Add blockquotes for key insights
- Make it feel like a gift, not a generic report
- Reference their actual scores throughout
- NO clinical or diagnostic language

Output clean HTML only. Start with the first h2 section.`;

  const response = await openai.chat.completions.create({
    model: REPORT_MODEL,
    messages: [
      { 
        role: "system", 
        content: "You are writing a premium personality report. Be thorough, insightful, and make every word count. This report should feel like a valuable investment for the reader." 
      },
      { role: "user", content: comprehensivePrompt },
    ],
    max_tokens: 8000,
  });

  const reportContent = response.choices[0].message.content || "";
  
  // Wrap in a styled container
  return `<div class="personality-report">
    <header class="report-header">
      <h1>${testTitle} - Your Personal Profile</h1>
      <p class="report-date">Generated on ${new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}</p>
      <div class="score-summary">
        ${scaleAnalysis.map(s => `
          <div class="score-badge">
            <span class="score-name">${s.name}</span>
            <span class="score-value">${s.score}%</span>
          </div>
        `).join('')}
      </div>
    </header>
    
    <main class="report-content">
      ${reportContent}
    </main>
    
    <footer class="report-footer">
      <p class="disclaimer">This report is for educational and self-reflection purposes only. It is not a clinical assessment or psychological diagnosis. For professional mental health support, please consult a licensed practitioner.</p>
      <p class="copyright">© ${new Date().getFullYear()} ProfileQuiz. All rights reserved.</p>
    </footer>
  </div>`;
}

// Generate a single image using GPT Image 1.5 (replaces deprecated DALL-E 3)
export async function generateImage(prompt: string): Promise<string> {
  const response = await openai.images.generate({
    model: "gpt-image-1.5",
    prompt: prompt,
    n: 1,
    size: "1024x1024",
    quality: "high",
  });

  // GPT Image returns base64 data, we need to handle the URL properly
  if (!response.data || response.data.length === 0) {
    throw new Error("No image data returned from OpenAI");
  }
  
  const imageData = response.data[0];
  
  // If it returns a URL directly, use that
  if (imageData.url) {
    return imageData.url;
  }
  
  // If it returns base64, convert to data URL
  if (imageData.b64_json) {
    return `data:image/png;base64,${imageData.b64_json}`;
  }
  
  throw new Error("No valid image format returned from OpenAI");
}

// Generate images for all questions with imagePrompt
export async function generateImagesForBlueprint(
  blueprint: any,
  onProgress?: (current: number, total: number) => void
): Promise<any> {
  const questionsWithPrompts = blueprint.questions.filter((q: any) => q.imagePrompt);
  const total = questionsWithPrompts.length;
  
  if (total === 0) return blueprint;

  let current = 0;
  
  // Process in batches of 3 to avoid rate limits
  const batchSize = 3;
  for (let i = 0; i < blueprint.questions.length; i += batchSize) {
    const batch = blueprint.questions.slice(i, i + batchSize);
    
    await Promise.all(
      batch.map(async (question: any) => {
        if (question.imagePrompt && !question.imageUrl) {
          try {
            question.imageUrl = await generateImage(question.imagePrompt);
            current++;
            onProgress?.(current, total);
          } catch (error) {
            console.error(`Failed to generate image for ${question.id}:`, error);
          }
        }
      })
    );
    
    // Small delay between batches to respect rate limits
    if (i + batchSize < blueprint.questions.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  blueprint.imagesEnabled = true;
  return blueprint;
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile Report Generation (GPT-5.2 Pro for pre-made archetype reports)
// ─────────────────────────────────────────────────────────────────────────────

// Use GPT-4o for premium report generation
const PRO_MODEL = "gpt-4o";

interface ProfileReportInput {
  testTitle: string;
  profileName: string;
  profileSlug: string;
  oneLineHook: string;
  prototype: { C: number; E: number; A: number; N: number; O: number };
  scales: Array<{ id: string; name: string; lowLabel: string; highLabel: string }>;
}

/**
 * Generate a premium, pre-made report for a personality archetype.
 * Uses GPT-4o for high quality generation.
 * 
 * This is called ONCE per profile, and the result is stored in the database.
 * All users with this profile will see this pre-made report.
 */
export async function generateProfileReport(input: ProfileReportInput): Promise<string> {
  const { testTitle, profileName, profileSlug, oneLineHook, prototype, scales } = input;
  
  // Build trait analysis from prototype
  const traitAnalysis = scales.map(s => {
    const score = prototype[s.id as keyof typeof prototype] || 50;
    let intensity = "moderate";
    if (score >= 80) intensity = "very high";
    else if (score >= 65) intensity = "high";
    else if (score <= 20) intensity = "very low";
    else if (score <= 35) intensity = "low";
    
    return {
      id: s.id,
      name: s.name,
      score,
      intensity,
      tendency: score > 50 ? s.highLabel : s.lowLabel,
      lowLabel: s.lowLabel,
      highLabel: s.highLabel,
    };
  });
  
  // Sort by score to find dominant traits
  const sortedTraits = [...traitAnalysis].sort((a, b) => Math.abs(b.score - 50) - Math.abs(a.score - 50));
  const dominantTraits = sortedTraits.slice(0, 2);
  const developmentAreas = sortedTraits.slice(-2);

  const prompt = `You are an expert personality psychologist writing a premium archetype report for "${profileName}".

This report will be shown to everyone who gets this archetype result, so write it as a TEMPLATE for this personality type, not for a specific individual. Use "you" language but make it applicable to anyone with this profile.

## ARCHETYPE: ${profileName}
"${oneLineHook}"

## TRAIT SIGNATURE (prototype scores 0-100):
${traitAnalysis.map(t => `- ${t.name}: ${t.score}% (${t.intensity}) - ${t.tendency}`).join('\n')}

Dominant traits: ${dominantTraits.map(t => t.name).join(' and ')}
Growth areas: ${developmentAreas.map(t => t.name).join(' and ')}

## REQUIRED SECTIONS (3500-4500 words total, clean semantic HTML)

### 1. The ${profileName} at a Glance (200 words)
Executive summary of this archetype. What makes them special? What's their superpower?

### 2. Understanding Your ${profileName} Identity (400 words)
Deep dive into the core of this archetype. How do the dominant traits combine to create this unique profile? What drives someone with this archetype?

### 3. Your Trait Landscape (600 words)
For EACH of the 5 traits:
- What the ${profileName}'s typical score means
- How this manifests in daily life
- The gift this brings
- The challenge to watch for
Use h3 subheadings for each trait.

### 4. ${profileName} Superpowers (300 words)
Natural strengths of this archetype. Be specific and actionable. How can they leverage these?

### 5. Growth Edge (300 words)
Areas for development, framed positively. Include practical strategies.

### 6. Love, Friendship & Connection (400 words)
How ${profileName} types navigate:
- Romantic relationships
- Friendships
- Family dynamics
- Conflict resolution
Include specific tips for each.

### 7. Career & Work (400 words)
- Ideal work environments for ${profileName}
- Leadership/collaboration style
- Best-fit career paths (list 6-8 specific roles)
- Productivity tips

### 8. When Stress Hits (250 words)
How ${profileName} types typically respond to stress. Personalized self-care recommendations.

### 9. Your 90-Day Growth Map (250 words)
4-5 specific, actionable goals for someone with this archetype.

### 10. Your ${profileName} Mantra (50 words)
An affirmation or guiding principle that captures the essence of this archetype.

## STYLE GUIDELINES
- Second person ("you") throughout
- Warm, insightful, encouraging tone
- Include specific examples and scenarios
- Use bullet points for actionable items
- Add blockquotes for key insights
- Make it feel premium and valuable
- NO clinical/diagnostic language
- Reference the trait scores naturally

Output clean HTML only (h2, h3, p, ul, li, blockquote, strong, em). Start with the first h2 section.`;

  const response = await openai.chat.completions.create({
    model: PRO_MODEL,
    messages: [
      { 
        role: "system", 
        content: `You are writing a premium personality archetype report. This report will be seen by many people who match this archetype, so make it resonate universally while feeling personal. Quality is paramount - this is a paid product.` 
      },
      { role: "user", content: prompt },
    ],
    max_tokens: 12000,
  });

  const reportContent = response.choices[0].message.content || "";
  
  // Wrap in styled container with header
  return `<div class="personality-report">
    <header class="report-header">
      <h1>${profileName}</h1>
      <p class="report-tagline">${oneLineHook}</p>
      <p class="report-date">Premium Archetype Report</p>
      <div class="score-summary">
        ${traitAnalysis.map(t => `
          <div class="score-badge">
            <span class="score-name">${t.name}</span>
            <span class="score-value">${t.score}%</span>
          </div>
        `).join('')}
      </div>
    </header>
    
    <main class="report-content">
      ${reportContent}
    </main>
    
    <footer class="report-footer">
      <p class="disclaimer">This report is for educational and self-reflection purposes only. It is not a clinical assessment or psychological diagnosis. For professional mental health support, please consult a licensed practitioner.</p>
      <p class="copyright">© ${new Date().getFullYear()} ProfileQuiz. All rights reserved.</p>
    </footer>
  </div>`;
}