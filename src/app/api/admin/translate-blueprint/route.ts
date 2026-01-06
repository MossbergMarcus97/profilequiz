import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { TranslatedBlueprint } from "@/lib/gemini";
import { Locale, locales } from "@/i18n/config";

interface TranslationsMap {
  [locale: string]: TranslatedBlueprint;
}

/**
 * GET: Check translation status for a test
 */
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

/**
 * PUT: Save a translation (used by cron job or for manual imports)
 */
export async function PUT(req: NextRequest) {
  const authError = verifyAdminAuth();
  if (authError) return authError;

  try {
    const body = await req.json();
    const { testId, locale, translation } = body as {
      testId: string;
      locale: Locale;
      translation: TranslatedBlueprint;
    };

    if (!testId || !locale || !translation) {
      return NextResponse.json(
        { error: "testId, locale, and translation are required" },
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

    const existingTranslations: TranslationsMap = test.translationsJson
      ? JSON.parse(test.translationsJson)
      : {};

    existingTranslations[locale] = translation;

    await prisma.test.update({
      where: { id: testId },
      data: {
        translationsJson: JSON.stringify(existingTranslations),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Saved translation for ${locale}`,
      translatedLocales: Object.keys(existingTranslations),
    });
  } catch (error: any) {
    console.error("Error saving translation:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save translation" },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Remove a translation
 */
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
