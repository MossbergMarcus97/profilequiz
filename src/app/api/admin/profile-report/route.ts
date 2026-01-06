import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";

/**
 * Get a profile report by profile ID.
 */
export async function GET(req: NextRequest) {
  // Check admin authentication
  const authError = verifyAdminAuth();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const profileId = searchParams.get("profileId");
  const locale = searchParams.get("locale") || "en";

  if (!profileId) {
    return NextResponse.json({ error: "profileId is required" }, { status: 400 });
  }

  try {
    // Try to find report for requested locale
    let report = await prisma.profileReport.findFirst({
      where: {
        profileId,
        locale,
        variant: 0,
      },
      include: {
        profile: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    // Fall back to English if locale not found
    if (!report && locale !== "en") {
      report = await prisma.profileReport.findFirst({
        where: {
          profileId,
          locale: "en",
          variant: 0,
        },
        include: {
          profile: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
      });
    }

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: report.id,
      profileId: report.profileId,
      profileName: report.profile.name,
      profileSlug: report.profile.slug,
      locale: report.locale,
      variant: report.variant,
      contentHtml: report.contentHtml,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

