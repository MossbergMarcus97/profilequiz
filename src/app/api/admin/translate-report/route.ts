import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { translateReport } from "@/lib/gemini";
import { Locale, locales } from "@/i18n/config";

export const maxDuration = 180; // Allow up to 3 minutes for report translation

export async function POST(req: NextRequest) {
  // Verify admin auth
  const authError = verifyAdminAuth();
  if (authError) return authError;

  try {
    const body = await req.json();
    const { profileReportId, profileId, targetLocales } = body as {
      profileReportId?: string;
      profileId?: string;
      targetLocales: Locale[];
    };

    if (!profileReportId && !profileId) {
      return NextResponse.json(
        { error: "Either profileReportId or profileId is required" },
        { status: 400 }
      );
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
    const localesToTranslate = targetLocales.filter((l) => l !== "en");
    if (localesToTranslate.length === 0) {
      return NextResponse.json(
        { error: "Cannot translate to English (source language)" },
        { status: 400 }
      );
    }

    // Fetch the source report (English version)
    let sourceReport;
    if (profileReportId) {
      sourceReport = await prisma.profileReport.findUnique({
        where: { id: profileReportId },
        include: {
          profile: {
            include: {
              testVersion: {
                include: { test: true },
              },
            },
          },
        },
      });
    } else {
      // Get the English primary report for this profile
      sourceReport = await prisma.profileReport.findFirst({
        where: {
          profileId: profileId!,
          variant: 0,
          locale: "en",
        },
        include: {
          profile: {
            include: {
              testVersion: {
                include: { test: true },
              },
            },
          },
        },
      });
    }

    if (!sourceReport) {
      return NextResponse.json(
        { error: "Source report not found" },
        { status: 404 }
      );
    }

    if (sourceReport.locale !== "en") {
      return NextResponse.json(
        { error: "Source report must be in English" },
        { status: 400 }
      );
    }

    const profile = sourceReport.profile;
    const testTitle = profile.testVersion.test.title;

    // Translate to each target locale
    const results: { locale: Locale; success: boolean; reportId?: string; error?: string }[] = [];

    for (const locale of localesToTranslate) {
      try {
        console.log(`Translating report for ${profile.name} to ${locale}...`);

        const translatedHtml = await translateReport(
          sourceReport.contentHtml,
          locale,
          {
            profileName: profile.name,
            testTitle,
          }
        );

        // Upsert the translated report
        const existingReport = await prisma.profileReport.findUnique({
          where: {
            profileId_variant_locale: {
              profileId: profile.id,
              variant: sourceReport.variant,
              locale,
            },
          },
        });

        let savedReport;
        if (existingReport) {
          savedReport = await prisma.profileReport.update({
            where: { id: existingReport.id },
            data: {
              contentHtml: translatedHtml,
              updatedAt: new Date(),
            },
          });
        } else {
          savedReport = await prisma.profileReport.create({
            data: {
              profileId: profile.id,
              variant: sourceReport.variant,
              locale,
              contentHtml: translatedHtml,
            },
          });
        }

        results.push({ locale, success: true, reportId: savedReport.id });
      } catch (error: any) {
        console.error(`Translation to ${locale} failed:`, error);
        results.push({ locale, success: false, error: error.message });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Translated report to ${successCount} locale(s)${failedCount > 0 ? `, ${failedCount} failed` : ""}`,
      results,
      profileId: profile.id,
      profileName: profile.name,
    });
  } catch (error: any) {
    console.error("Report translation error:", error);
    return NextResponse.json(
      { error: error.message || "Translation failed" },
      { status: 500 }
    );
  }
}

// GET endpoint to check report translation status for a profile
export async function GET(req: NextRequest) {
  const authError = verifyAdminAuth();
  if (authError) return authError;

  const profileId = req.nextUrl.searchParams.get("profileId");
  const testVersionId = req.nextUrl.searchParams.get("testVersionId");

  if (!profileId && !testVersionId) {
    return NextResponse.json(
      { error: "profileId or testVersionId is required" },
      { status: 400 }
    );
  }

  try {
    if (profileId) {
      // Get translation status for a single profile
      const reports = await prisma.profileReport.findMany({
        where: { profileId, variant: 0 },
        select: { locale: true, id: true, updatedAt: true },
      });

      const profile = await prisma.profile.findUnique({
        where: { id: profileId },
        select: { id: true, name: true },
      });

      if (!profile) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }

      const translationStatus: Record<Locale, { translated: boolean; reportId?: string; updatedAt?: Date }> = {} as any;
      for (const locale of locales) {
        const report = reports.find((r) => r.locale === locale);
        translationStatus[locale] = {
          translated: !!report,
          reportId: report?.id,
          updatedAt: report?.updatedAt,
        };
      }

      return NextResponse.json({
        profileId: profile.id,
        profileName: profile.name,
        translationStatus,
        translatedLocales: reports.map((r) => r.locale),
      });
    } else {
      // Get translation status for all profiles in a test version
      const profiles = await prisma.profile.findMany({
        where: { testVersionId: testVersionId! },
        include: {
          reports: {
            where: { variant: 0 },
            select: { locale: true, id: true },
          },
        },
        orderBy: { sortOrder: "asc" },
      });

      const summary = profiles.map((profile) => {
        const translatedLocales = profile.reports.map((r) => r.locale);
        return {
          profileId: profile.id,
          profileName: profile.name,
          translatedLocales,
          missingLocales: locales.filter(
            (l) => l !== "en" && !translatedLocales.includes(l)
          ),
          hasEnglish: translatedLocales.includes("en"),
        };
      });

      return NextResponse.json({
        testVersionId,
        profiles: summary,
        totalProfiles: profiles.length,
        fullyTranslated: summary.filter((s) => s.missingLocales.length === 0).length,
      });
    }
  } catch (error: any) {
    console.error("Error fetching report translation status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch translation status" },
      { status: 500 }
    );
  }
}

// Batch translate all reports for a test version
export async function PUT(req: NextRequest) {
  const authError = verifyAdminAuth();
  if (authError) return authError;

  try {
    const body = await req.json();
    const { testVersionId, targetLocales } = body as {
      testVersionId: string;
      targetLocales: Locale[];
    };

    if (!testVersionId) {
      return NextResponse.json(
        { error: "testVersionId is required" },
        { status: 400 }
      );
    }

    if (!targetLocales || targetLocales.length === 0) {
      return NextResponse.json(
        { error: "At least one targetLocale is required" },
        { status: 400 }
      );
    }

    const localesToTranslate = targetLocales.filter((l) => l !== "en");
    if (localesToTranslate.length === 0) {
      return NextResponse.json(
        { error: "Cannot translate to English (source language)" },
        { status: 400 }
      );
    }

    // Get all profiles with their English reports
    const profiles = await prisma.profile.findMany({
      where: { testVersionId },
      include: {
        reports: {
          where: { variant: 0, locale: "en" },
        },
        testVersion: {
          include: { test: true },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    const testTitle = profiles[0]?.testVersion?.test?.title || "Quiz";

    const allResults: {
      profileId: string;
      profileName: string;
      results: { locale: Locale; success: boolean; error?: string }[];
    }[] = [];

    for (const profile of profiles) {
      const sourceReport = profile.reports[0];
      if (!sourceReport) {
        allResults.push({
          profileId: profile.id,
          profileName: profile.name,
          results: localesToTranslate.map((l) => ({
            locale: l,
            success: false,
            error: "No English source report",
          })),
        });
        continue;
      }

      const profileResults: { locale: Locale; success: boolean; error?: string }[] = [];

      for (const locale of localesToTranslate) {
        try {
          console.log(`Translating ${profile.name} to ${locale}...`);

          const translatedHtml = await translateReport(
            sourceReport.contentHtml,
            locale,
            { profileName: profile.name, testTitle }
          );

          await prisma.profileReport.upsert({
            where: {
              profileId_variant_locale: {
                profileId: profile.id,
                variant: 0,
                locale,
              },
            },
            create: {
              profileId: profile.id,
              variant: 0,
              locale,
              contentHtml: translatedHtml,
            },
            update: {
              contentHtml: translatedHtml,
              updatedAt: new Date(),
            },
          });

          profileResults.push({ locale, success: true });
        } catch (error: any) {
          console.error(`Translation of ${profile.name} to ${locale} failed:`, error);
          profileResults.push({ locale, success: false, error: error.message });
        }
      }

      allResults.push({
        profileId: profile.id,
        profileName: profile.name,
        results: profileResults,
      });
    }

    const totalSuccess = allResults.reduce(
      (sum, r) => sum + r.results.filter((l) => l.success).length,
      0
    );
    const totalFailed = allResults.reduce(
      (sum, r) => sum + r.results.filter((l) => !l.success).length,
      0
    );

    return NextResponse.json({
      success: true,
      message: `Translated ${totalSuccess} reports${totalFailed > 0 ? `, ${totalFailed} failed` : ""}`,
      profiles: allResults,
      summary: {
        totalProfiles: profiles.length,
        totalTranslations: totalSuccess,
        totalFailed,
      },
    });
  } catch (error: any) {
    console.error("Batch translation error:", error);
    return NextResponse.json(
      { error: error.message || "Batch translation failed" },
      { status: 500 }
    );
  }
}

