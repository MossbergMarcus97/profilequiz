import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAdminAuth, checkRateLimit } from "@/lib/admin-auth";
import { TestBlueprintSchema } from "@/lib/schemas/blueprint";

export async function GET(req: NextRequest) {
  // Check admin authentication
  const authError = verifyAdminAuth();
  if (authError) return authError;
  
  // Rate limiting (use a generic identifier for GET requests)
  const rateLimitError = checkRateLimit("admin-tests-list");
  if (rateLimitError) return rateLimitError;
  
  try {
    const tests = await prisma.test.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { attempts: true },
        },
        versions: {
          orderBy: { version: "desc" },
          take: 1,
          include: {
            _count: {
              select: { profiles: true },
            },
          },
        },
      },
    });
    
    return NextResponse.json({ tests });
  } catch (error: any) {
    console.error("Failed to list tests:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Check admin authentication
  const authError = verifyAdminAuth();
  if (authError) return authError;
  
  // Rate limiting
  const rateLimitError = checkRateLimit("admin-tests-create");
  if (rateLimitError) return rateLimitError;
  
  try {
    const body = await req.json();
    const { title, description, blueprintJson, slug } = body;
    
    // Validate blueprint JSON
    const blueprint = JSON.parse(blueprintJson);
    TestBlueprintSchema.parse(blueprint);

    // Create test with initial version and profiles
    const test = await prisma.test.create({
      data: {
        title,
        description,
        blueprintJson,
        slug: slug || title.toLowerCase().replace(/ /g, "-").replace(/[^\w-]/g, ""),
      },
    });

    // Create initial test version
    const testVersion = await prisma.testVersion.create({
      data: {
        testId: test.id,
        version: 1,
        blueprintJson,
      },
    });

    // Create profiles from blueprint if they exist
    if (blueprint.profiles && Array.isArray(blueprint.profiles)) {
      for (let i = 0; i < blueprint.profiles.length; i++) {
        const profileDef = blueprint.profiles[i];
        await prisma.profile.create({
          data: {
            testVersionId: testVersion.id,
            slug: profileDef.id,
            name: profileDef.name,
            oneLineHook: profileDef.oneLineHook,
            teaserBullets: profileDef.teaserBullets,
            shareTitle: profileDef.shareTitle || null,
            prototypeJson: JSON.stringify(profileDef.prototype),
            sortOrder: i,
          },
        });
      }
    }

    return NextResponse.json({ test, testVersion });
  } catch (error: any) {
    console.error("Test creation failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

