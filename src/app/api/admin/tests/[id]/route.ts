import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAdminAuth, checkRateLimit } from "@/lib/admin-auth";
import { TestBlueprintSchema } from "@/lib/schemas/blueprint";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check admin authentication
  const authError = verifyAdminAuth();
  if (authError) return authError;
  
  // Rate limiting
  const rateLimitError = checkRateLimit(`admin-test-get-${params.id}`);
  if (rateLimitError) return rateLimitError;
  
  try {
    const test = await prisma.test.findUnique({
      where: { id: params.id },
      include: {
        versions: {
          orderBy: { version: "desc" },
          include: {
            profiles: {
              orderBy: { sortOrder: "asc" },
            },
            _count: {
              select: { attempts: true },
            },
          },
        },
        _count: {
          select: { attempts: true },
        },
      },
    });
    
    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }
    
    return NextResponse.json({ test });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check admin authentication
  const authError = verifyAdminAuth();
  if (authError) return authError;
  
  // Rate limiting
  const rateLimitError = checkRateLimit(`admin-test-update-${params.id}`);
  if (rateLimitError) return rateLimitError;
  
  try {
    const body = await req.json();
    const { title, description, blueprintJson, createNewVersion } = body;
    
    // Validate blueprint if provided
    if (blueprintJson) {
      const blueprint = JSON.parse(blueprintJson);
      TestBlueprintSchema.parse(blueprint);
    }

    // Update the test
    const test = await prisma.test.update({
      where: { id: params.id },
      data: { 
        title, 
        description, 
        blueprintJson,
      },
    });

    // Optionally create a new version (preserves old attempts' profiles)
    if (createNewVersion && blueprintJson) {
      const blueprint = JSON.parse(blueprintJson);
      
      // Get current max version
      const latestVersion = await prisma.testVersion.findFirst({
        where: { testId: params.id },
        orderBy: { version: "desc" },
      });
      
      const newVersionNumber = (latestVersion?.version || 0) + 1;
      
      const newVersion = await prisma.testVersion.create({
        data: {
          testId: params.id,
          version: newVersionNumber,
          blueprintJson,
        },
      });
      
      // Create profiles for new version
      if (blueprint.profiles && Array.isArray(blueprint.profiles)) {
        for (let i = 0; i < blueprint.profiles.length; i++) {
          const profileDef = blueprint.profiles[i];
          await prisma.profile.create({
            data: {
              testVersionId: newVersion.id,
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
      
      return NextResponse.json({ test, newVersion });
    }

    return NextResponse.json({ test });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check admin authentication
  const authError = verifyAdminAuth();
  if (authError) return authError;
  
  // Rate limiting
  const rateLimitError = checkRateLimit(`admin-test-delete-${params.id}`);
  if (rateLimitError) return rateLimitError;
  
  try {
    // Delete test (cascades to versions, profiles, attempts)
    await prisma.test.delete({
      where: { id: params.id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

