import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAdminAuth, checkRateLimit } from "@/lib/admin-auth";
import { generateProfileReport } from "@/lib/llm";
import { TestBlueprintSchema } from "@/lib/schemas/blueprint";

/**
 * Generate pre-made reports for all profiles in a test version.
 * Generates high-quality premium reports.
 * 
 * This is an expensive operation - typically done once per test version.
 */
export async function POST(req: NextRequest) {
  // Check admin authentication
  const authError = verifyAdminAuth();
  if (authError) return authError;
  
  // Rate limiting (strict for expensive operations)
  const rateLimitError = checkRateLimit("admin-generate-reports");
  if (rateLimitError) return rateLimitError;
  
  try {
    const { testVersionId, profileIds } = await req.json();
    
    if (!testVersionId) {
      return NextResponse.json({ error: "testVersionId is required" }, { status: 400 });
    }
    
    // Get the test version with profiles
    const testVersion = await prisma.testVersion.findUnique({
      where: { id: testVersionId },
      include: {
        test: true,
        profiles: {
          orderBy: { sortOrder: "asc" },
          include: {
            reports: true,
          },
        },
      },
    });
    
    if (!testVersion) {
      return NextResponse.json({ error: "Test version not found" }, { status: 404 });
    }
    
    const blueprint = TestBlueprintSchema.parse(JSON.parse(testVersion.blueprintJson));
    
    // Filter profiles to generate (all if profileIds not specified)
    let profilesToGenerate = testVersion.profiles;
    if (profileIds && Array.isArray(profileIds) && profileIds.length > 0) {
      profilesToGenerate = testVersion.profiles.filter(p => profileIds.includes(p.id));
    }
    
    // Skip profiles that already have reports (unless forced)
    const { force } = await req.json().catch(() => ({}));
    if (!force) {
      profilesToGenerate = profilesToGenerate.filter(p => p.reports.length === 0);
    }
    
    if (profilesToGenerate.length === 0) {
      return NextResponse.json({
        message: "All profiles already have reports. Use force=true to regenerate.",
        generated: 0,
        total: testVersion.profiles.length,
      });
    }
    
    const results: Array<{ profileId: string; profileName: string; success: boolean; error?: string }> = [];
    
    // Generate reports one at a time
    for (const profile of profilesToGenerate) {
      try {
        console.log(`Generating report for profile: ${profile.name} (${profile.id})`);
        
        const prototype = JSON.parse(profile.prototypeJson) as {
          C: number;
          E: number;
          A: number;
          N: number;
          O: number;
        };
        
        const reportHtml = await generateProfileReport({
          testTitle: testVersion.test.title,
          profileName: profile.name,
          profileSlug: profile.slug,
          oneLineHook: profile.oneLineHook,
          prototype,
          scales: blueprint.scales,
        });
        
        // Upsert the report (create or update)
        await prisma.profileReport.upsert({
          where: {
            profileId_variant_locale: {
              profileId: profile.id,
              variant: 0, // Primary variant
              locale: "en", // English is the source language
            },
          },
          create: {
            profileId: profile.id,
            variant: 0,
            locale: "en",
            contentHtml: reportHtml,
          },
          update: {
            contentHtml: reportHtml,
            updatedAt: new Date(),
          },
        });
        
        results.push({ profileId: profile.id, profileName: profile.name, success: true });
        console.log(`✅ Report generated for: ${profile.name}`);
        
      } catch (error: any) {
        console.error(`❌ Failed to generate report for ${profile.name}:`, error);
        results.push({
          profileId: profile.id,
          profileName: profile.name,
          success: false,
          error: error.message,
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    
    return NextResponse.json({
      message: `Generated ${successCount} of ${profilesToGenerate.length} reports`,
      generated: successCount,
      total: testVersion.profiles.length,
      results,
    });
    
  } catch (error: any) {
    console.error("Report generation failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Get status of report generation for a test version.
 */
export async function GET(req: NextRequest) {
  // Check admin authentication
  const authError = verifyAdminAuth();
  if (authError) return authError;
  
  const { searchParams } = new URL(req.url);
  const testVersionId = searchParams.get("testVersionId");
  
  if (!testVersionId) {
    return NextResponse.json({ error: "testVersionId is required" }, { status: 400 });
  }
  
  try {
    const testVersion = await prisma.testVersion.findUnique({
      where: { id: testVersionId },
      include: {
        test: true,
        profiles: {
          orderBy: { sortOrder: "asc" },
          include: {
            reports: {
              select: {
                id: true,
                variant: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });
    
    if (!testVersion) {
      return NextResponse.json({ error: "Test version not found" }, { status: 404 });
    }
    
    const profiles = testVersion.profiles.map(p => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      hasReport: p.reports.length > 0,
      reportCreatedAt: p.reports[0]?.createdAt || null,
      reportUpdatedAt: p.reports[0]?.updatedAt || null,
    }));
    
    const withReports = profiles.filter(p => p.hasReport).length;
    
    return NextResponse.json({
      testVersionId,
      testTitle: testVersion.test.title,
      version: testVersion.version,
      totalProfiles: profiles.length,
      profilesWithReports: withReports,
      complete: withReports === profiles.length,
      profiles,
    });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

