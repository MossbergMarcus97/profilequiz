import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { TestBlueprintSchema } from "@/lib/schemas/blueprint";
import { getTranslatedBlueprint, getTranslatedProfile } from "@/lib/translations";
import { Locale, defaultLocale, locales } from "@/i18n/config";
import PrintButton from "@/components/results/PrintButton";
import { stripe } from "@/lib/stripe";

interface PageProps {
  params: { attemptId: string };
  searchParams: { session_id?: string };
}

/**
 * Report page with instant access via Stripe session verification.
 * 
 * Flow:
 * 1. Check if purchase is already marked as paid (webhook processed)
 * 2. If not paid but session_id is in URL, verify with Stripe directly
 * 3. If verified, mark purchase as paid immediately (don't wait for webhook)
 * 4. Render the pre-made profile report in the user's locale
 */
export default async function ReportPage({ params, searchParams }: PageProps) {
  const attempt = await prisma.attempt.findUnique({
    where: { id: params.attemptId },
    include: {
      test: true,
      profile: {
        include: {
          reports: true, // Get all report variants/locales
        },
      },
      purchases: true,
    },
  });

  if (!attempt) notFound();

  let isPaid = attempt.purchases.some((p) => p.status === "paid");
  
  // If not paid but we have a session_id, try to verify it directly with Stripe
  if (!isPaid && searchParams.session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(searchParams.session_id);
      
      // Verify the session is completed and matches this attempt
      if (
        session.payment_status === "paid" &&
        session.metadata?.attemptId === params.attemptId
      ) {
        // Mark purchase as paid immediately (don't wait for webhook)
        await prisma.purchase.updateMany({
          where: {
            attemptId: params.attemptId,
            stripeSessionId: searchParams.session_id,
          },
          data: {
            status: "paid",
            paidAt: new Date(),
          },
        });
        isPaid = true;
      }
    } catch (e) {
      console.error("Failed to verify Stripe session:", e);
      // Continue - will check isPaid status from DB
    }
  }
  
  if (!isPaid) {
    redirect(`/r/${attempt.id}`);
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
  const scores = JSON.parse(attempt.scoresJson || "{}");
  
  // Get translated profile name
  let profileName = attempt.profile?.name || attempt.resultLabel || "Your Profile";
  if (attempt.profile) {
    const translatedProfile = getTranslatedProfile(
      {
        name: attempt.profile.name,
        oneLineHook: attempt.profile.oneLineHook,
        teaserBullets: attempt.profile.teaserBullets,
        shareTitle: attempt.profile.shareTitle,
      },
      attempt.test.translationsJson,
      attempt.profile.slug,
      locale
    );
    profileName = translatedProfile.name;
  }
  
  // Try to get the report in the user's locale, fall back to English
  let profileReport = attempt.profile?.reports?.find(
    (r) => r.variant === 0 && r.locale === locale
  );
  
  // Fallback to English if no translation exists
  if (!profileReport) {
    profileReport = attempt.profile?.reports?.find(
      (r) => r.variant === 0 && r.locale === "en"
    );
  }
  
  // If still no report, fall back to primary variant (for legacy data)
  if (!profileReport) {
    profileReport = attempt.profile?.reports?.find((r) => r.variant === 0);
  }
  
  // If no pre-made report exists yet, show a placeholder (admin needs to generate)
  const reportHtml = profileReport?.contentHtml || generatePlaceholderReport(
    profileName,
    scores,
    blueprint.scales
  );

  return (
    <div className="bg-white min-h-screen print:bg-white">
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .report-content { font-size: 11pt; }
          .report-content h2 { page-break-before: always; }
          .report-content h2:first-of-type { page-break-before: avoid; }
        }
        
        .personality-report .report-header {
          text-align: center;
          padding-bottom: 2rem;
          border-bottom: 2px solid #0f766e;
          margin-bottom: 2rem;
        }
        
        .personality-report .report-header h1 {
          font-size: 2rem;
          font-weight: bold;
          color: #0f766e;
          margin-bottom: 0.5rem;
        }
        
        .personality-report .report-date {
          color: #6b7280;
          font-style: italic;
        }
        
        .personality-report .score-summary {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 1rem;
          margin-top: 1.5rem;
        }
        
        .personality-report .score-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0.75rem 1rem;
          background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%);
          border-radius: 0.75rem;
          min-width: 100px;
        }
        
        .personality-report .score-name {
          font-size: 0.75rem;
          font-weight: 600;
          color: #0f766e;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .personality-report .score-value {
          font-size: 1.5rem;
          font-weight: bold;
          color: #134e4a;
        }
        
        .personality-report .report-content h2 {
          color: #0f766e;
          font-size: 1.5rem;
          font-weight: bold;
          margin-top: 2.5rem;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .personality-report .report-content h3 {
          color: #134e4a;
          font-size: 1.125rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
        }
        
        .personality-report .report-content p {
          line-height: 1.75;
          margin-bottom: 1rem;
          color: #374151;
        }
        
        .personality-report .report-content ul {
          margin-left: 1.5rem;
          margin-bottom: 1rem;
        }
        
        .personality-report .report-content li {
          margin-bottom: 0.5rem;
          line-height: 1.6;
        }
        
        .personality-report .report-content blockquote {
          border-left: 4px solid #0f766e;
          padding-left: 1.5rem;
          margin: 1.5rem 0;
          font-style: italic;
          color: #1f2937;
          background: #f9fafb;
          padding: 1rem 1.5rem;
          border-radius: 0 0.5rem 0.5rem 0;
        }
        
        .personality-report .report-content strong {
          color: #0f766e;
          font-weight: 600;
        }
        
        .personality-report .report-footer {
          margin-top: 3rem;
          padding-top: 2rem;
          border-top: 2px solid #e5e7eb;
          text-align: center;
        }
        
        .personality-report .disclaimer {
          font-size: 0.75rem;
          color: #6b7280;
          max-width: 600px;
          margin: 0 auto 1rem;
          line-height: 1.5;
        }
        
        .personality-report .copyright {
          font-size: 0.75rem;
          color: #9ca3af;
        }
      `}</style>
      
      <div className="max-w-4xl mx-auto px-8 py-16 space-y-8">
        {/* Header with print button */}
        <div className="flex justify-between items-center pb-8 no-print">
          <div>
            <h1 className="text-2xl font-serif font-bold text-teal-700">ProfileQuiz</h1>
            <p className="text-sm text-muted-foreground">Your {profileName} Report</p>
          </div>
          <PrintButton />
        </div>

        {/* Report content */}
        <div 
          className="report-content"
          dangerouslySetInnerHTML={{ __html: reportHtml }} 
        />
      </div>
    </div>
  );
}

/**
 * Generate a placeholder report when pre-made content isn't available yet.
 * This is a temporary fallback while the admin generates reports for profiles.
 */
function generatePlaceholderReport(
  profileName: string,
  scores: Record<string, number>,
  scales: Array<{ id: string; name: string; lowLabel: string; highLabel: string }>
): string {
  const scaleAnalysis = scales.map(s => {
    const score = scores[s.id] || 50;
    const tendency = score >= 65 ? "high" : score <= 35 ? "low" : "moderate";
    return { ...s, score, tendency };
  });

  return `
    <div class="personality-report">
      <header class="report-header">
        <h1>${profileName} - Your Personal Profile</h1>
        <p class="report-date">Generated on ${new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</p>
        <div class="score-summary">
          ${scaleAnalysis.map(s => `
            <div class="score-badge">
              <span class="score-name">${s.name}</span>
              <span class="score-value">${s.score}%</span>
            </div>
          `).join('')}
        </div>
      </header>
      
      <main class="report-content">
        <h2>Your ${profileName} Profile</h2>
        <p>
          As ${profileName.startsWith("The") ? "" : "a "}${profileName}, your unique combination of traits creates 
          a distinctive approach to life. Your profile reveals patterns in how you 
          think, feel, and act that are distinctly yours.
        </p>
        
        <h2>Your Trait Analysis</h2>
        ${scaleAnalysis.map(s => `
          <h3>${s.name}: ${s.score}%</h3>
          <p>
            Your ${s.tendency} score in ${s.name} suggests you tend towards 
            ${s.score >= 50 ? s.highLabel.toLowerCase() : s.lowLabel.toLowerCase()} tendencies.
            ${s.tendency === 'high' 
              ? `This is a pronounced trait that likely plays a significant role in your daily life.`
              : s.tendency === 'low'
                ? `This indicates a natural inclination away from this dimension.`
                : `This balanced score suggests flexibility in this area.`
            }
          </p>
        `).join('')}
        
        <h2>What's Next</h2>
        <p>
          Your full premium report with detailed insights, career recommendations, relationship guidance, 
          and a personalized 90-day growth plan is being prepared. Check back soon for the complete analysis.
        </p>
        
        <blockquote>
          "Understanding your personality archetype is the first step toward leveraging your natural 
          strengths and addressing your growth areas with intention."
        </blockquote>
      </main>
      
      <footer class="report-footer">
        <p class="disclaimer">
          This report is for educational and self-reflection purposes only. It is not a clinical 
          assessment or psychological diagnosis. For professional mental health support, please 
          consult a licensed practitioner.
        </p>
        <p class="copyright">© ${new Date().getFullYear()} ProfileQuiz. All rights reserved.</p>
      </footer>
    </div>
  `;
}
