"use client";

import { useState } from "react";
import { Locale, locales, localeNames, localeFlags } from "@/i18n/config";

interface Test {
  id: string;
  title: string;
  translatedLocales: Locale[];
  hasVersion: boolean;
  testVersionId?: string;
}

interface BatchTranslationPanelProps {
  tests: Test[];
}

interface TranslationProgress {
  testId: string;
  testTitle: string;
  status: "pending" | "translating" | "completed" | "failed";
  currentLocale?: Locale;
  completedLocales: Locale[];
  error?: string;
}

export default function BatchTranslationPanel({ tests }: BatchTranslationPanelProps) {
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [selectedLocales, setSelectedLocales] = useState<Locale[]>([]);
  const [translating, setTranslating] = useState(false);
  const [progress, setProgress] = useState<TranslationProgress[]>([]);
  const [showPanel, setShowPanel] = useState(false);

  const translatableLocales = locales.filter((l) => l !== "en") as Locale[];

  const toggleTest = (testId: string) => {
    setSelectedTests((prev) =>
      prev.includes(testId)
        ? prev.filter((id) => id !== testId)
        : [...prev, testId]
    );
  };

  const toggleLocale = (locale: Locale) => {
    setSelectedLocales((prev) =>
      prev.includes(locale)
        ? prev.filter((l) => l !== locale)
        : [...prev, locale]
    );
  };

  const selectAllTests = () => {
    setSelectedTests(tests.map((t) => t.id));
  };

  const selectMissingLocales = () => {
    // Find locales that are missing from at least one selected test
    const missing = new Set<Locale>();
    selectedTests.forEach((testId) => {
      const test = tests.find((t) => t.id === testId);
      if (test) {
        translatableLocales.forEach((locale) => {
          if (!test.translatedLocales.includes(locale)) {
            missing.add(locale);
          }
        });
      }
    });
    setSelectedLocales(Array.from(missing));
  };

  const handleBatchTranslate = async () => {
    if (selectedTests.length === 0 || selectedLocales.length === 0) return;

    setTranslating(true);
    setProgress(
      selectedTests.map((testId) => {
        const test = tests.find((t) => t.id === testId);
        return {
          testId,
          testTitle: test?.title || "Unknown",
          status: "pending",
          completedLocales: [],
        };
      })
    );

    // Process each test sequentially
    for (let i = 0; i < selectedTests.length; i++) {
      const testId = selectedTests[i];
      const test = tests.find((t) => t.id === testId);

      setProgress((prev) =>
        prev.map((p) =>
          p.testId === testId ? { ...p, status: "translating" } : p
        )
      );

      try {
        // Translate quiz blueprint
        const res = await fetch("/api/admin/translate-blueprint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testId,
            targetLocales: selectedLocales,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Translation failed");
        }

        // Update progress with completed locales
        const completedLocales = data.results
          ?.filter((r: any) => r.success)
          .map((r: any) => r.locale) || [];

        setProgress((prev) =>
          prev.map((p) =>
            p.testId === testId
              ? { ...p, status: "completed", completedLocales }
              : p
          )
        );

        // If test has a version with reports, translate those too
        if (test?.hasVersion && test.testVersionId) {
          try {
            await fetch("/api/admin/translate-report", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                testVersionId: test.testVersionId,
                targetLocales: selectedLocales,
              }),
            });
          } catch (e) {
            console.error("Report translation failed:", e);
            // Continue - report translation is optional
          }
        }
      } catch (error: any) {
        setProgress((prev) =>
          prev.map((p) =>
            p.testId === testId
              ? { ...p, status: "failed", error: error.message }
              : p
          )
        );
      }
    }

    setTranslating(false);
  };

  const completedCount = progress.filter((p) => p.status === "completed").length;
  const failedCount = progress.filter((p) => p.status === "failed").length;
  const totalTranslations = progress.reduce(
    (sum, p) => sum + p.completedLocales.length,
    0
  );

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="w-full p-5 flex items-center justify-between text-left hover:bg-white/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚡</span>
          <div>
            <h3 className="font-bold text-lg">Batch Translation</h3>
            <p className="text-sm text-muted-foreground">
              Translate multiple quizzes at once
            </p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 transition-transform ${showPanel ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {showPanel && (
        <div className="p-5 pt-0 space-y-6">
          {/* Test Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold">Select Quizzes</h4>
              <button
                onClick={selectAllTests}
                className="text-sm text-indigo-600 font-medium hover:underline"
              >
                Select all
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {tests.map((test) => (
                <button
                  key={test.id}
                  onClick={() => toggleTest(test.id)}
                  disabled={translating}
                  className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    selectedTests.includes(test.id)
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  } disabled:opacity-50`}
                >
                  {test.title}
                  {test.translatedLocales.length > 0 && (
                    <span className="ml-2 text-xs text-green-600">
                      ({test.translatedLocales.length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Language Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold">Select Languages</h4>
              {selectedTests.length > 0 && (
                <button
                  onClick={selectMissingLocales}
                  className="text-sm text-indigo-600 font-medium hover:underline"
                >
                  Select missing
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {translatableLocales.map((locale) => (
                <button
                  key={locale}
                  onClick={() => toggleLocale(locale)}
                  disabled={translating}
                  className={`px-4 py-2 rounded-lg border-2 flex items-center gap-2 transition-all ${
                    selectedLocales.includes(locale)
                      ? "border-indigo-600 bg-indigo-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  } disabled:opacity-50`}
                >
                  <span className="text-lg">{localeFlags[locale]}</span>
                  <span className="text-sm font-medium">{localeNames[locale]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Progress Display */}
          {progress.length > 0 && (
            <div className="bg-white rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold">Progress</h4>
                {!translating && (
                  <span className="text-sm text-muted-foreground">
                    {completedCount} completed, {failedCount} failed,{" "}
                    {totalTranslations} translations
                  </span>
                )}
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {progress.map((p) => (
                  <div
                    key={p.testId}
                    className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      {p.status === "pending" && (
                        <span className="w-2 h-2 bg-gray-300 rounded-full" />
                      )}
                      {p.status === "translating" && (
                        <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      )}
                      {p.status === "completed" && (
                        <span className="text-green-600">✓</span>
                      )}
                      {p.status === "failed" && (
                        <span className="text-red-600">✗</span>
                      )}
                      <span className="text-sm font-medium">{p.testTitle}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.completedLocales.length > 0 && (
                        <div className="flex gap-0.5">
                          {p.completedLocales.map((l) => (
                            <span key={l} className="text-sm">
                              {localeFlags[l]}
                            </span>
                          ))}
                        </div>
                      )}
                      {p.error && (
                        <span className="text-xs text-red-600">{p.error}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {selectedTests.length} quizzes × {selectedLocales.length} languages
              {selectedTests.length > 0 && selectedLocales.length > 0 && (
                <span className="ml-2 text-indigo-600">
                  ~${(selectedTests.length * selectedLocales.length * 0.01).toFixed(2)} estimated
                </span>
              )}
            </div>
            <button
              onClick={handleBatchTranslate}
              disabled={
                translating ||
                selectedTests.length === 0 ||
                selectedLocales.length === 0
              }
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              {translating && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {translating ? "Translating..." : "Start Batch Translation"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

