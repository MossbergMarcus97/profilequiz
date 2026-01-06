import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { TestBlueprintSchema } from "@/lib/schemas/blueprint";
import { getTranslatedBlueprint, getTranslatedProfile } from "@/lib/translations";
import { Locale, defaultLocale, locales } from "@/i18n/config";
import TraitCard from "@/components/results/TraitCard";
import Paywall from "@/components/results/Paywall";
import ShareButtons from "@/components/results/ShareButtons";

export default async function ResultsPage({ params }: { params: { attemptId: string } }) {
  const attempt = await prisma.attempt.findUnique({
    where: { id: params.attemptId },
    include: {
      test: true,
      profile: true, // Include the assigned profile
      purchases: true,
    },
  });

  // Get other tests for recommendations (excluding current test)
  const otherTests = attempt ? await prisma.test.findMany({
    where: {
      id: { not: attempt.testId },
    },
    take: 3,
    orderBy: { createdAt: "desc" },
    include: {
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
  }) : [];

  if (!attempt || !attempt.scoresJson) {
    notFound();
  }

  // Check if already paid - redirect to full report
  const isPaid = attempt.purchases.some((p) => p.status === "paid");
  if (isPaid) {
    redirect(`/report/${attempt.id}`);
  }

  // Get current locale from cookie
  const cookieStore = cookies();
  const localeCookie = cookieStore.get("profilequiz_locale")?.value as Locale | undefined;
  const locale: Locale = localeCookie && locales.includes(localeCookie) 
    ? localeCookie 
    : defaultLocale;

  // Parse and translate the blueprint
  const baseBlueprint = JSON.parse(attempt.test.blueprintJson);
  const translatedBlueprint = getTranslatedBlueprint(
    baseBlueprint,
    attempt.test.translationsJson,
    locale
  );
  const blueprint = TestBlueprintSchema.parse(translatedBlueprint);
  const scores = JSON.parse(attempt.scoresJson);

  // Get translated profile info
  let profileName = attempt.resultLabel || "Your Profile";
  let profileHook = "A unique blend of traits that defines your approach to life";
  let profileTeaserBullets: string[] = [];

  if (attempt.profile) {
    const translatedProfile = getTranslatedProfile(
      {
        name: attempt.profile.name,
        oneLineHook: attempt.profile.oneLineHook,
        teaserBullets: attempt.profile.teaserBullets,
        shareTitle: attempt.profile.shareTitle,
      },
      attempt.test.translationsJson,
      attempt.profile.slug, // Use slug as the profile ID
      locale
    );
    profileName = translatedProfile.name;
    profileHook = translatedProfile.oneLineHook;
    profileTeaserBullets = translatedProfile.teaserBullets;
  }

  // Combine profile teaser bullets with blueprint paywall bullets
  const paywallBullets = [
    ...profileTeaserBullets,
    ...blueprint.paywall.bullets,
  ].slice(0, 6); // Limit to 6 bullets

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-16 animate-in fade-in duration-1000">
      {/* Hero - Profile Result */}
      <div className="text-center space-y-6">
        <span className="text-sm font-bold uppercase tracking-[0.3em] text-coral-500">
          Your Personality Archetype
        </span>
        <h1 className="text-5xl md:text-7xl font-serif font-bold text-teal-700 leading-tight">
          {profileName}
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto font-serif">
          {profileHook}
        </p>
      </div>

      {/* Share Buttons */}
      <ShareButtons
        url={`${process.env.NEXT_PUBLIC_BASE_URL || "https://profilequiz.app"}/r/${attempt.id}`}
        profileName={profileName}
      />

      {/* Trait Bars */}
      <div className="space-y-6">
        <h2 className="text-2xl font-serif font-bold text-center text-teal-700">
          Your Trait Scores
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {blueprint.scales.map((scale) => (
            <TraitCard
              key={scale.id}
              id={scale.id}
              name={scale.name}
              score={scores[scale.id]}
              lowLabel={scale.lowLabel}
              highLabel={scale.highLabel}
              description={`Your score of ${scores[scale.id]}% indicates a tendency towards ${scores[scale.id] >= 50 ? scale.highLabel.toLowerCase() : scale.lowLabel.toLowerCase()} traits.`}
            />
          ))}
        </div>
      </div>

      {/* Report Ready Indicator */}
      <div className="text-center">
        <span className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
          Your full {profileName} report is ready!
        </span>
      </div>

      {/* Teaser / Paywall */}
      <div className="space-y-12">
        {/* Blurred preview */}
        <div className="relative">
          <div className="space-y-6 select-none pointer-events-none">
            <h2 className="text-3xl font-serif font-bold text-teal-700">
              Inside Your {profileName} Report
            </h2>
            <div className="relative overflow-hidden rounded-2xl">
              <div className="blur-[6px] opacity-60 p-6 bg-gray-50">
                <div className="space-y-4">
                  <p className="text-lg leading-relaxed">
                    As {profileName.startsWith("The") ? "" : "a "}{profileName}, your unique combination of traits creates 
                    a distinctive approach to life. You bring natural strengths that set you apart, and your 
                    full report reveals exactly how to leverage them...
                  </p>
                  <p className="text-lg leading-relaxed">
                    In relationships and career, your archetype suggests specific patterns and opportunities 
                    that, once understood, can transform how you navigate challenges and pursue growth...
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-20 bg-teal-100 rounded-xl" />
                    <div className="h-20 bg-teal-100 rounded-xl" />
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
            </div>
          </div>
          
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white/90 backdrop-blur-sm px-8 py-4 rounded-2xl shadow-xl border border-gray-200">
              <span className="text-lg font-bold text-teal-700">🔒 Unlock Full Report</span>
            </div>
          </div>
        </div>

        {/* What's included */}
        <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-8 space-y-4">
          <h3 className="text-xl font-bold text-teal-800">Your Premium {profileName} Report Includes:</h3>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start space-x-2">
              <span className="text-teal-600">✓</span>
              <span>Deep dive into your {profileName} archetype</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-teal-600">✓</span>
              <span>All 5 personality dimensions analyzed</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-teal-600">✓</span>
              <span>Career & work style recommendations</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-teal-600">✓</span>
              <span>Relationship & communication insights</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-teal-600">✓</span>
              <span>Stress response & self-care guide</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-teal-600">✓</span>
              <span>90-day personal growth roadmap</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-teal-600">✓</span>
              <span>3,000+ words of expert insights</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-teal-600">✓</span>
              <span>Printable PDF download</span>
            </div>
          </div>
        </div>

        <Paywall 
          attemptId={attempt.id} 
          priceLabel={blueprint.paywall.priceLabel}
          bullets={paywallBullets}
        />
      </div>

      {/* Next Quiz Recommendations */}
      {otherTests.length > 0 && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-serif font-bold text-slate-800">
              Discover More About Yourself
            </h2>
            <p className="text-muted-foreground mt-2">
              Each quiz reveals a different facet of your personality
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            {otherTests.map((test) => (
              <a
                key={test.id}
                href={`/t/${test.slug}`}
                className="group bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100 hover:-translate-y-1"
              >
                <h3 className="font-bold text-slate-800 group-hover:text-teal-700 transition-colors mb-2">
                  {test.title}
                </h3>
                <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                  {test.description}
                </p>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{test.versions[0]?._count?.profiles || 16} archetypes</span>
                  <span className="text-teal-600 font-semibold group-hover:underline">
                    Take Quiz →
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
