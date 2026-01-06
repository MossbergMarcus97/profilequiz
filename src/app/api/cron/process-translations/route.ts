import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { translateBlueprint, TranslatedBlueprint } from "@/lib/gemini";
import { Locale } from "@/i18n/config";

// Cron jobs can run longer - set to max allowed
export const maxDuration = 60;

/**
 * Cron endpoint to process pending translation jobs.
 * Called every minute by Vercel Cron.
 * Processes ONE job per invocation to stay under timeout limits.
 */
export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  // Allow if: correct secret OR no secret configured (dev mode)
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find the oldest pending job
    const job = await prisma.translationJob.findFirst({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
      include: {
        test: {
          select: {
            id: true,
            blueprintJson: true,
            translationsJson: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({
        success: true,
        message: "No pending jobs",
        processed: 0,
      });
    }

    // Mark as processing
    await prisma.translationJob.update({
      where: { id: job.id },
      data: { status: "processing", updatedAt: new Date() },
    });

    try {
      console.log(`Processing translation job ${job.id}: ${job.locale}`);

      // Parse blueprint
      const blueprint = JSON.parse(job.test.blueprintJson);

      // Translate using Gemini
      const translated = await translateBlueprint(
        blueprint,
        job.locale as Locale,
        { tone: "professional yet approachable" }
      );

      // Get existing translations
      const existingTranslations: Record<string, TranslatedBlueprint> = 
        job.test.translationsJson
          ? JSON.parse(job.test.translationsJson)
          : {};

      // Add new translation
      existingTranslations[job.locale] = translated;

      // Save to test
      await prisma.test.update({
        where: { id: job.testId },
        data: {
          translationsJson: JSON.stringify(existingTranslations),
          updatedAt: new Date(),
        },
      });

      // Mark job as done
      await prisma.translationJob.update({
        where: { id: job.id },
        data: { status: "done", updatedAt: new Date() },
      });

      console.log(`Successfully translated to ${job.locale}`);

      return NextResponse.json({
        success: true,
        message: `Translated to ${job.locale}`,
        processed: 1,
        jobId: job.id,
        locale: job.locale,
      });
    } catch (translationError: any) {
      console.error(`Translation failed for job ${job.id}:`, translationError);

      // Mark job as error
      await prisma.translationJob.update({
        where: { id: job.id },
        data: {
          status: "error",
          error: translationError.message || "Translation failed",
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: false,
        message: `Translation failed: ${translationError.message}`,
        processed: 0,
        jobId: job.id,
        locale: job.locale,
      });
    }
  } catch (error: any) {
    console.error("Cron processing error:", error);
    return NextResponse.json(
      { error: error.message || "Cron processing failed" },
      { status: 500 }
    );
  }
}

