import { NextRequest, NextResponse } from "next/server";
import { generateBlueprint } from "@/lib/llm";
import { TestBlueprintSchema } from "@/lib/schemas/blueprint";
import { verifyAdminAuth, checkRateLimit } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  // Check admin authentication
  const authError = verifyAdminAuth();
  if (authError) return authError;
  
  // Rate limiting (more strict for expensive operations)
  const rateLimitError = checkRateLimit("admin-generate-blueprint");
  if (rateLimitError) return rateLimitError;

  try {
    const body = await req.json();
    const { prompt, options } = body;
    
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    let blueprint;
    let attempts = 0;
    const maxAttempts = 3;
    let lastError = "";

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const enhancedPrompt = lastError 
          ? `${prompt}\n\nPREVIOUS ATTEMPT FAILED WITH ERROR: ${lastError}\nPlease fix the issues and try again.`
          : prompt;
        
        blueprint = await generateBlueprint(enhancedPrompt, options || {});
        
        // Validate with Zod
        TestBlueprintSchema.parse(blueprint);
        
        // If we get here, validation passed
        return NextResponse.json({ 
          blueprint,
          attempts,
          message: attempts > 1 ? `Success after ${attempts} attempts` : "Generated successfully"
        });
      } catch (e: any) {
        console.error(`Attempt ${attempts} failed:`, e.message);
        lastError = e.message;
        
        if (attempts >= maxAttempts) {
          throw new Error(`Failed after ${maxAttempts} attempts. Last error: ${lastError}`);
        }
      }
    }

    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  } catch (error: any) {
    console.error("Blueprint generation failed:", error);
    return NextResponse.json({ 
      error: error.message || "Generation failed",
      details: error.issues || null
    }, { status: 500 });
  }
}
