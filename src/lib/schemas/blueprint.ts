import { z } from "zod";

export const ScaleIdSchema = z.enum(["C", "E", "A", "N", "O"]);
export type ScaleId = z.infer<typeof ScaleIdSchema>;

export const QuestionTypeSchema = z.enum(["likert", "slider", "scenario", "ab"]);
export type QuestionType = z.infer<typeof QuestionTypeSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Profile/Archetype Definitions
// ─────────────────────────────────────────────────────────────────────────────

// Prototype vector: trait scores (0-100) that define this archetype's "center"
export const PrototypeVectorSchema = z.object({
  C: z.number().min(0).max(100),
  E: z.number().min(0).max(100),
  A: z.number().min(0).max(100),
  N: z.number().min(0).max(100),
  O: z.number().min(0).max(100),
});
export type PrototypeVector = z.infer<typeof PrototypeVectorSchema>;

// Profile definition (archetype) for nearest-neighbor assignment
export const ProfileDefinitionSchema = z.object({
  id: z.string(), // slug, e.g. "the-architect"
  name: z.string(), // Display name, e.g. "The Architect"
  oneLineHook: z.string(), // Tagline shown on results page
  teaserBullets: z.array(z.string()), // 3-4 teaser points for paywall
  shareTitle: z.string().optional(), // Custom share title (defaults to name)
  prototype: PrototypeVectorSchema, // The "center" of this archetype in trait space
});
export type ProfileDefinition = z.infer<typeof ProfileDefinitionSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Question Schemas
// ─────────────────────────────────────────────────────────────────────────────

// Base question schema with optional image support
const BaseQuestionSchema = z.object({
  id: z.string(),
  type: QuestionTypeSchema,
  scaleId: ScaleIdSchema,
  text: z.string(),
  // Optional image fields - imagePrompt is for DALL-E, imageUrl is the generated result
  imagePrompt: z.string().optional(),
  imageUrl: z.string().optional(),
});

export const LikertQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal("likert"),
  reverse: z.boolean().optional(),
});

export const SliderQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal("slider"),
  leftLabel: z.string(),
  rightLabel: z.string(),
});

export const ScenarioOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  score: z.union([z.literal(-2), z.literal(-1), z.literal(0), z.literal(1), z.literal(2)]),
});

export const ScenarioQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal("scenario"),
  options: z.array(ScenarioOptionSchema),
});

export const ABQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal("ab"),
  optionA: z.string(),
  optionB: z.string(),
  scoreA: z.number(),
  scoreB: z.number(),
});

export const QuestionSchema = z.discriminatedUnion("type", [
  LikertQuestionSchema,
  SliderQuestionSchema,
  ScenarioQuestionSchema,
  ABQuestionSchema,
]);

export type Question = z.infer<typeof QuestionSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Test Blueprint Schema
// ─────────────────────────────────────────────────────────────────────────────

export const TestBlueprintSchema = z.object({
  version: z.literal("1.0"),
  title: z.string(),
  intro: z.object({
    headline: z.string(),
    subhead: z.string(),
    disclaimer: z.string(),
  }),
  scales: z.array(
    z.object({
      id: ScaleIdSchema,
      name: z.string(),
      lowLabel: z.string(),
      highLabel: z.string(),
    })
  ),
  questions: z.array(QuestionSchema),
  scoring: z.object({
    likertMap: z.record(z.string(), z.number()),
    sliderRange: z.object({
      min: z.number(),
      max: z.number(),
    }),
  }),
  // Archetype profiles (10-20 per quiz) - users are assigned to nearest prototype
  profiles: z.array(ProfileDefinitionSchema).optional(),
  // Result labeling configuration
  resultLabeling: z.object({
    method: z.enum(["top2", "nearest-prototype"]), // "nearest-prototype" uses profiles array
    labelsByScaleHigh: z.record(ScaleIdSchema, z.string()),
    labelsByScaleLow: z.record(ScaleIdSchema, z.string()),
  }),
  paywall: z.object({
    priceLabel: z.string(),
    bullets: z.array(z.string()),
  }),
  reportTemplate: z.object({
    sections: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        instruction: z.string(),
      })
    ),
  }),
  // Optional: whether images were enabled for this quiz
  imagesEnabled: z.boolean().optional(),
});

export type TestBlueprint = z.infer<typeof TestBlueprintSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Assign user scores to nearest profile (Euclidean distance)
// ─────────────────────────────────────────────────────────────────────────────

export function assignToNearestProfile(
  scores: Record<string, number>,
  profiles: ProfileDefinition[]
): ProfileDefinition | null {
  if (!profiles || profiles.length === 0) return null;

  let nearest: ProfileDefinition | null = null;
  let minDistance = Infinity;

  for (const profile of profiles) {
    const proto = profile.prototype;
    // Euclidean distance across the 5 traits
    const distance = Math.sqrt(
      Math.pow((scores.C ?? 50) - proto.C, 2) +
      Math.pow((scores.E ?? 50) - proto.E, 2) +
      Math.pow((scores.A ?? 50) - proto.A, 2) +
      Math.pow((scores.N ?? 50) - proto.N, 2) +
      Math.pow((scores.O ?? 50) - proto.O, 2)
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearest = profile;
    }
  }

  return nearest;
}
