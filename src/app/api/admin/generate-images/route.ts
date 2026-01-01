import { NextRequest, NextResponse } from "next/server";
import { generateImagesForBlueprint } from "@/lib/llm";
import { verifyAdminAuth, checkRateLimit } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  // Check admin authentication
  const authError = verifyAdminAuth();
  if (authError) return authError;
  
  // Rate limiting (very strict for expensive image generation)
  const rateLimitError = checkRateLimit("admin-generate-images");
  if (rateLimitError) return rateLimitError;

  try {
    const { blueprint } = await req.json();
    
    if (!blueprint || !blueprint.questions) {
      return NextResponse.json({ error: "Invalid blueprint" }, { status: 400 });
    }

    // Count questions with image prompts
    const questionsWithPrompts = blueprint.questions.filter((q: any) => q.imagePrompt && !q.imageUrl);
    
    if (questionsWithPrompts.length === 0) {
      return NextResponse.json({ 
        blueprint,
        message: "No images to generate",
        generated: 0
      });
    }

    // Generate images
    const updatedBlueprint = await generateImagesForBlueprint(blueprint);
    
    const generatedCount = updatedBlueprint.questions.filter((q: any) => q.imageUrl).length;

    return NextResponse.json({ 
      blueprint: updatedBlueprint,
      message: `Generated ${generatedCount} images`,
      generated: generatedCount
    });
  } catch (error: any) {
    console.error("Image generation failed:", error);
    return NextResponse.json({ 
      error: error.message || "Image generation failed"
    }, { status: 500 });
  }
}

