import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { translateBlueprint, TranslatedBlueprint } from "@/lib/gemini";
import { Locale, locales } from "@/i18n/config";

export const maxDuration = 120; // Allow up to 2 minutes for translation

interface TranslationsMap {
  [locale: string]: TranslatedBlueprint;
}

export async function POST(req: NextRequest) {
  // Verify admin auth
  const authError = verifyAdminAuth();
  if (authError) return authError;

  try {
    const body = await req.json();
    const { testId, targetLocales, tone } = body as {
      testId: string;
      targetLocales: Locale[];
      tone?: string;
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
    const localesToTranslate = targetLocales.filter((l) => l !== "en");
    if (localesToTranslate.length === 0) {
      return NextResponse.json(
        { error: "Cannot translate to English (source language)" },
        { status: 400 }
      );
    }

    // Fetch the test
    const test = await prisma.test.findUnique({
      where: { id: testId },
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    const blueprint = JSON.parse(test.blueprintJson);
    const existingTranslations: TranslationsMap = test.translationsJson
      ? JSON.parse(test.translationsJson)
      : {};

    // Translate to each target locale
    const results: { locale: Locale; success: boolean; error?: string }[] = [];

    for (const locale of localesToTranslate) {
      try {
        console.log(`Translating blueprint to ${locale}...`);
        const translated = await translateBlueprint(blueprint, locale, { tone });
        existingTranslations[locale] = translated;
        results.push({ locale, success: true });
      } catch (error: any) {
        console.error(`Translation to ${locale} failed:`, error);
        results.push({ locale, success: false, error: error.message });
      }
    }

    // Update the test with new translations
    await prisma.test.update({
      where: { id: testId },
      data: {
        translationsJson: JSON.stringify(existingTranslations),
        updatedAt: new Date(),
      },
    });

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    // If all translations failed, return an error
    if (successCount === 0 && failedCount > 0) {
      const errorMessages = results
        .filter((r) => !r.success)
        .map((r) => `${r.locale}: ${r.error}`)
        .join("; ");
      return NextResponse.json(
        { 
          error: `All translations failed: ${errorMessages}`,
          results 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Translated to ${successCount} locale(s)${failedCount > 0 ? `, ${failedCount} failed` : ""}`,
      results,
      translatedLocales: Object.keys(existingTranslations),
    });
  } catch (error: any) {
    console.error("Translation error:", error);
    return NextResponse.json(
      { error: error.message || "Translation failed" },
      { status: 500 }
    );
  }
}

// GET endpoint to check translation status for a test
export async function GET(req: NextRequest) {
  const authError = verifyAdminAuth();
  if (authError) return authError;

  const testId = req.nextUrl.searchParams.get("testId");

  if (!testId) {
    return NextResponse.json({ error: "testId is required" }, { status: 400 });
  }

  try {
    const test = await prisma.test.findUnique({
      where: { id: testId },
      select: {
        id: true,
        title: true,
        translationsJson: true,
      },
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    const translations: TranslationsMap = test.translationsJson
      ? JSON.parse(test.translationsJson)
      : {};

    // Build status map for all locales
    const translationStatus: Record<Locale, boolean> = {} as Record<Locale, boolean>;
    for (const locale of locales) {
      translationStatus[locale] = locale === "en" || locale in translations;
    }

    return NextResponse.json({
      testId: test.id,
      title: test.title,
      translatedLocales: Object.keys(translations),
      translationStatus,
    });
  } catch (error: any) {
    console.error("Error fetching translation status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch translation status" },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove a translation
export async function DELETE(req: NextRequest) {
  const authError = verifyAdminAuth();
  if (authError) return authError;

  try {
    const body = await req.json();
    const { testId, locale } = body as { testId: string; locale: Locale };

    if (!testId || !locale) {
      return NextResponse.json(
        { error: "testId and locale are required" },
        { status: 400 }
      );
    }

    if (locale === "en") {
      return NextResponse.json(
        { error: "Cannot delete English (source language)" },
        { status: 400 }
      );
    }

    const test = await prisma.test.findUnique({
      where: { id: testId },
      select: { translationsJson: true },
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    const translations: TranslationsMap = test.translationsJson
      ? JSON.parse(test.translationsJson)
      : {};

    if (!(locale in translations)) {
      return NextResponse.json(
        { error: `No translation exists for ${locale}` },
        { status: 404 }
      );
    }

    delete translations[locale];

    await prisma.test.update({
      where: { id: testId },
      data: {
        translationsJson:
          Object.keys(translations).length > 0
            ? JSON.stringify(translations)
            : null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Deleted translation for ${locale}`,
      translatedLocales: Object.keys(translations),
    });
  } catch (error: any) {
    console.error("Error deleting translation:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete translation" },
      { status: 500 }
    );
  }
}

