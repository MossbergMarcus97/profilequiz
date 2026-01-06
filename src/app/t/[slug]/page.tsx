import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import QuizShell from "@/components/quiz/QuizShell";
import { TestBlueprintSchema } from "@/lib/schemas/blueprint";
import { getTranslatedBlueprint } from "@/lib/translations";
import { Locale, defaultLocale, locales } from "@/i18n/config";

export default async function QuizPage({ params }: { params: { slug: string } }) {
  const test = await prisma.test.findUnique({
    where: { slug: params.slug },
  });

  if (!test) {
    notFound();
  }

  // Get current locale from cookie
  const cookieStore = cookies();
  const localeCookie = cookieStore.get("profilequiz_locale")?.value as Locale | undefined;
  const locale: Locale = localeCookie && locales.includes(localeCookie) 
    ? localeCookie 
    : defaultLocale;

  // Parse the base blueprint
  const baseBlueprint = JSON.parse(test.blueprintJson);
  
  // Get translated blueprint if available
  const translatedBlueprint = getTranslatedBlueprint(
    baseBlueprint,
    test.translationsJson,
    locale
  );

  // Validate the blueprint
  const blueprint = TestBlueprintSchema.parse(translatedBlueprint);

  return (
    <div className="max-w-screen-xl mx-auto">
      <QuizShell testId={test.id} blueprint={blueprint} />
    </div>
  );
}
