import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { computeScores } from "@/lib/scoring";
import { TestBlueprintSchema } from "@/lib/schemas/blueprint";
import { rateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limit";

/**
 * Finish a quiz attempt.
 * 
 * NEW FLOW (archetype-first):
 * - Receives answers in request body (NOT stored in DB)
 * - Computes deterministic trait scores
 * - Assigns user to nearest profile (archetype)
 * - Stores only scoresJson + profileId
 * - NO LLM call - reports are pre-made per profile
 */
export async function POST(req: NextRequest) {
  // Rate limiting
  const rateLimitError = rateLimit(req, "attempts-finish", RATE_LIMIT_CONFIGS.quiz);
  if (rateLimitError) return rateLimitError;
  
  try {
    const { attemptId, answers } = await req.json();
    
    if (!attemptId) {
      return NextResponse.json({ error: "attemptId is required" }, { status: 400 });
    }
    
    if (!answers || typeof answers !== "object") {
      return NextResponse.json({ error: "answers object is required" }, { status: 400 });
    }
    
    // Find the attempt with its test and version
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        test: true,
        testVersion: {
          include: {
            profiles: true,
          },
        },
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }
    
    if (attempt.status === "finished") {
      return NextResponse.json({ error: "Attempt already finished" }, { status: 400 });
    }

    // Parse and validate blueprint
    const blueprint = TestBlueprintSchema.parse(JSON.parse(attempt.test.blueprintJson));

    // Compute scores and assign profile (deterministic, no LLM)
    const { scores, resultLabel, profileId } = computeScores(blueprint, answers);

    // Find the Profile record in DB if we have a profileId and test version
    let dbProfileId: string | null = null;
    if (profileId && attempt.testVersion) {
      const dbProfile = await prisma.profile.findFirst({
        where: {
          testVersionId: attempt.testVersion.id,
          slug: profileId,
        },
      });
      dbProfileId = dbProfile?.id || null;
    }

    // Update attempt with scores and profile (NO answers stored)
    const updatedAttempt = await prisma.attempt.update({
      where: { id: attemptId },
      data: {
        scoresJson: JSON.stringify(scores),
        resultLabel,
        profileId: dbProfileId,
        status: "finished",
        finishedAt: new Date(),
      },
      include: {
        profile: true,
      },
    });

    return NextResponse.json({
      success: true,
      scores,
      resultLabel,
      profileId: profileId || null,
      profileName: updatedAttempt.profile?.name || resultLabel,
    });
  } catch (error: any) {
    console.error("Finish attempt failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
