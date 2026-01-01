import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Rate limiting - strict for attempt creation to prevent bot abuse
  const rateLimitError = rateLimit(req, "attempts-start", RATE_LIMIT_CONFIGS.attemptStart);
  if (rateLimitError) return rateLimitError;
  
  try {
    const { testId } = await req.json();
    
    // Validate test exists
    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        versions: {
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    });
    
    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }
    
    // Get latest version ID (if versioning is set up)
    const latestVersionId = test.versions[0]?.id || null;
    
    const attempt = await prisma.attempt.create({
      data: {
        testId,
        testVersionId: latestVersionId,
        status: "in_progress",
      },
    });
    
    return NextResponse.json({ attemptId: attempt.id });
  } catch (error: any) {
    console.error("Failed to start attempt:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

