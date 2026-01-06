import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { Locale, locales } from "@/i18n/config";

/**
 * POST: Queue new translation jobs
 * Creates jobs for each locale that will be processed by the cron
 */
export async function POST(req: NextRequest) {
  const authError = verifyAdminAuth();
  if (authError) return authError;

  try {
    const body = await req.json();
    const { testId, targetLocales } = body as {
      testId: string;
      targetLocales: Locale[];
    };

    if (!testId) {
      return NextResponse.json({ error: "testId is required" }, { status: 400 });
    }

    if (!targetLocales || targetLocales.length === 0) {
      return NextResponse.json(
        { error: "At least one targetLocale is required" },
        { status: 400 }
      );
    }

    // Validate locales
    const invalidLocales = targetLocales.filter((l) => !locales.includes(l));
    if (invalidLocales.length > 0) {
      return NextResponse.json(
        { error: `Invalid locales: ${invalidLocales.join(", ")}` },
        { status: 400 }
      );
    }

    // Filter out English (source language)
    const localesToQueue = targetLocales.filter((l) => l !== "en");
    if (localesToQueue.length === 0) {
      return NextResponse.json(
        { error: "Cannot translate to English (source language)" },
        { status: 400 }
      );
    }

    // Verify test exists
    const test = await prisma.test.findUnique({
      where: { id: testId },
      select: { id: true },
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    // Create or update jobs for each locale (upsert to handle retries)
    const jobs = await Promise.all(
      localesToQueue.map((locale) =>
        prisma.translationJob.upsert({
          where: {
            testId_locale: { testId, locale },
          },
          create: {
            testId,
            locale,
            status: "pending",
          },
          update: {
            status: "pending",
            error: null,
            updatedAt: new Date(),
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: `Queued ${jobs.length} translation job(s)`,
      jobs: jobs.map((j) => ({ id: j.id, locale: j.locale, status: j.status })),
    });
  } catch (error: any) {
    console.error("Error queueing translation jobs:", error);
    return NextResponse.json(
      { error: error.message || "Failed to queue jobs" },
      { status: 500 }
    );
  }
}

/**
 * GET: Check status of translation jobs for a test
 */
export async function GET(req: NextRequest) {
  const authError = verifyAdminAuth();
  if (authError) return authError;

  const testId = req.nextUrl.searchParams.get("testId");

  if (!testId) {
    return NextResponse.json({ error: "testId is required" }, { status: 400 });
  }

  try {
    const jobs = await prisma.translationJob.findMany({
      where: { testId },
      orderBy: { createdAt: "desc" },
    });

    // Also get current translation status from test
    const test = await prisma.test.findUnique({
      where: { id: testId },
      select: { translationsJson: true },
    });

    const existingTranslations = test?.translationsJson
      ? Object.keys(JSON.parse(test.translationsJson))
      : [];

    return NextResponse.json({
      jobs: jobs.map((j) => ({
        id: j.id,
        locale: j.locale,
        status: j.status,
        error: j.error,
        createdAt: j.createdAt,
        updatedAt: j.updatedAt,
      })),
      existingTranslations,
      pendingCount: jobs.filter((j) => j.status === "pending").length,
      processingCount: jobs.filter((j) => j.status === "processing").length,
      doneCount: jobs.filter((j) => j.status === "done").length,
      errorCount: jobs.filter((j) => j.status === "error").length,
    });
  } catch (error: any) {
    console.error("Error fetching job status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch job status" },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Cancel/remove a translation job
 */
export async function DELETE(req: NextRequest) {
  const authError = verifyAdminAuth();
  if (authError) return authError;

  try {
    const body = await req.json();
    const { testId, locale } = body as { testId: string; locale: string };

    if (!testId || !locale) {
      return NextResponse.json(
        { error: "testId and locale are required" },
        { status: 400 }
      );
    }

    await prisma.translationJob.deleteMany({
      where: { testId, locale },
    });

    return NextResponse.json({
      success: true,
      message: `Cancelled job for ${locale}`,
    });
  } catch (error: any) {
    console.error("Error cancelling job:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel job" },
      { status: 500 }
    );
  }
}

