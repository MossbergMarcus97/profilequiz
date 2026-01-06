import { cookies } from "next/headers";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { locales, localeFlags, Locale } from "@/i18n/config";
import BatchTranslationPanel from "@/components/admin/BatchTranslationPanel";

export default async function AdminPage() {
  const adminCookie = cookies().get("admin_pass")?.value;
  const correctPass = process.env.ADMIN_PASSWORD;

  if (adminCookie !== correctPass) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <h1 className="text-2xl font-bold">Admin Login</h1>
        <AdminLoginForm />
      </div>
    );
  }

  const tests = await prisma.test.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      versions: {
        orderBy: { version: "desc" },
        take: 1,
        include: {
          profiles: {
            include: {
              _count: {
                select: { reports: true },
              },
            },
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

  // Parse translations to get available locales for each test
  const testsWithTranslations = tests.map((test) => {
    let translatedLocales: Locale[] = [];
    if (test.translationsJson) {
      try {
        const translations = JSON.parse(test.translationsJson);
        translatedLocales = Object.keys(translations) as Locale[];
      } catch {
        // Invalid JSON, ignore
      }
    }
    return {
      ...test,
      translatedLocales,
    };
  });

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your personality quizzes and translations
          </p>
        </div>
        <Link
          href="/admin/tests/new"
          className="bg-teal-700 text-white px-6 py-3 rounded-xl font-bold hover:bg-teal-800 transition-colors"
        >
          + Create New Quiz
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-xl p-4">
          <div className="text-3xl font-bold text-teal-700">{tests.length}</div>
          <div className="text-sm text-muted-foreground">Total Quizzes</div>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="text-3xl font-bold text-teal-700">
            {tests.reduce((sum, t) => sum + t._count.attempts, 0)}
          </div>
          <div className="text-sm text-muted-foreground">Total Attempts</div>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="text-3xl font-bold text-teal-700">
            {testsWithTranslations.filter((t) => t.translatedLocales.length > 0).length}
          </div>
          <div className="text-sm text-muted-foreground">Translated Quizzes</div>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="text-3xl font-bold text-teal-700">{locales.length}</div>
          <div className="text-sm text-muted-foreground">Supported Languages</div>
        </div>
      </div>

      {/* Batch Translation Panel */}
      <BatchTranslationPanel tests={testsWithTranslations.map((t) => ({
        id: t.id,
        title: t.title,
        translatedLocales: t.translatedLocales,
        hasVersion: t.versions.length > 0,
        testVersionId: t.versions[0]?.id,
      }))} />

      {/* Tests List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">All Quizzes</h2>
        <div className="grid gap-4">
          {testsWithTranslations.map((test) => (
            <div
              key={test.id}
              className="border rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <h2 className="font-bold text-lg">{test.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    <code className="bg-gray-100 px-2 py-0.5 rounded">/t/{test.slug}</code>
                    <span className="mx-2">•</span>
                    {test._count.attempts} attempts
                    {test.versions[0] && (
                      <>
                        <span className="mx-2">•</span>
                        {test.versions[0].profiles.length} profiles
                      </>
                    )}
                  </p>
                  
                  {/* Translation Status */}
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs font-medium text-gray-500">Translations:</span>
                    <div className="flex gap-1">
                      {locales.map((locale) => {
                        const isTranslated =
                          locale === "en" || test.translatedLocales.includes(locale);
                        return (
                          <span
                            key={locale}
                            className={`text-sm ${isTranslated ? "" : "opacity-30 grayscale"}`}
                            title={`${locale}: ${isTranslated ? "Translated" : "Not translated"}`}
                          >
                            {localeFlags[locale]}
                          </span>
                        );
                      })}
                    </div>
                    {test.translatedLocales.length > 0 && (
                      <span className="text-xs text-green-600 font-medium">
                        {test.translatedLocales.length}/{locales.length - 1} languages
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="flex space-x-3">
                    <Link
                      href={`/admin/tests/${test.id}`}
                      className="text-teal-700 font-medium hover:underline"
                    >
                      Edit →
                    </Link>
                    <Link
                      href={`/t/${test.slug}`}
                      target="_blank"
                      className="text-muted-foreground hover:underline"
                    >
                      Preview
                    </Link>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Created {new Date(test.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {tests.length === 0 && (
            <div className="text-center py-16 bg-gray-50 rounded-xl">
              <p className="text-muted-foreground mb-4">No quizzes created yet.</p>
              <Link
                href="/admin/tests/new"
                className="bg-teal-700 text-white px-6 py-3 rounded-xl font-bold hover:bg-teal-800 transition-colors inline-block"
              >
                Create Your First Quiz
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
