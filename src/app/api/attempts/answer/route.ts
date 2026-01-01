import { NextRequest, NextResponse } from "next/server";

/**
 * DEPRECATED: This endpoint is no longer used.
 * 
 * The new flow does NOT store individual answers:
 * - Answers are kept in client-side React state during the quiz
 * - On quiz completion, all answers are sent to /api/attempts/finish in one request
 * - Only the computed scores and assigned profileId are stored in the database
 * 
 * This change improves:
 * - Privacy: user answers are not persisted
 * - Performance: fewer database writes during quiz
 * - Cost: no per-answer server calls
 */
export async function POST(req: NextRequest) {
  return NextResponse.json(
    { 
      error: "This endpoint is deprecated. Answers are now sent to /api/attempts/finish on quiz completion.",
      deprecated: true,
    },
    { status: 410 } // 410 Gone
  );
}

