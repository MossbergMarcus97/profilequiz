"use client";

import { useState, useEffect } from "react";
import { Locale, locales, localeNames, localeFlags } from "@/i18n/config";

interface TranslationStatus {
  [locale: string]: boolean;
}

interface TranslationPanelProps {
  testId: string;
  testVersionId?: string;
  onTranslationComplete?: () => void;
}

export default function TranslationPanel({
  testId,
  testVersionId,
  onTranslationComplete,
}: TranslationPanelProps) {
  const [status, setStatus] = useState<TranslationStatus>({});
  const [selectedLocales, setSelectedLocales] = useState<Locale[]>([]);
  const [translating, setTranslating] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"quiz" | "reports">("quiz");
  const [reportStatus, setReportStatus] = useState<{
    totalProfiles: number;
    fullyTranslated: number;
    profiles: Array<{
      profileId: string;
      profileName: string;
      translatedLocales: string[];
      missingLocales: string[];
    }>;
  } | null>(null);

  const translatableLocales = locales.filter((l) => l !== "en") as Locale[];

  // Fetch translation status
  useEffect(() => {
    fetchStatus();
    if (testVersionId) {
      fetchReportStatus();
    }
  }, [testId, testVersionId]);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/admin/translate-blueprint?testId=${testId}`);
      const data = await res.json();
      if (data.translationStatus) {
        setStatus(data.translationStatus);
      }
    } catch (e) {
      console.error("Failed to fetch translation status:", e);
    }
  };

  const fetchReportStatus = async () => {
    if (!testVersionId) return;
    try {
      const res = await fetch(
        `/api/admin/translate-report?testVersionId=${testVersionId}`
      );
      const data = await res.json();
      if (data.profiles) {
        setReportStatus(data);
      }
    } catch (e) {
      console.error("Failed to fetch report translation status:", e);
    }
  };

  const toggleLocale = (locale: Locale) => {
    setSelectedLocales((prev) =>
      prev.includes(locale)
        ? prev.filter((l) => l !== locale)
        : [...prev, locale]
    );
  };

  const selectAllMissing = () => {
    const missing = translatableLocales.filter((l) => !status[l]);
    setSelectedLocales(missing);
  };

  const handleTranslateQuiz = async () => {
    if (selectedLocales.length === 0) return;

    setTranslating(true);
    setError("");
    setProgress(`Translating quiz to ${selectedLocales.length} language(s)...`);

    try {
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

      setProgress(data.message);
      setSelectedLocales([]);
      fetchStatus();
      onTranslationComplete?.();

      // Clear progress after a delay
      setTimeout(() => setProgress(""), 3000);
    } catch (e: any) {
      setError(e.message);
      setProgress("");
    } finally {
      setTranslating(false);
    }
  };

  const handleTranslateReports = async () => {
    if (!testVersionId || selectedLocales.length === 0) return;

    setTranslating(true);
    setError("");
    setProgress(
      `Translating reports to ${selectedLocales.length} language(s)...`
    );

    try {
      const res = await fetch("/api/admin/translate-report", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testVersionId,
          targetLocales: selectedLocales,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Translation failed");
      }

      setProgress(data.message);
      setSelectedLocales([]);
      fetchReportStatus();
      onTranslationComplete?.();

      setTimeout(() => setProgress(""), 3000);
    } catch (e: any) {
      setError(e.message);
      setProgress("");
    } finally {
      setTranslating(false);
    }
  };

  const handleDeleteTranslation = async (locale: Locale) => {
    if (!confirm(`Delete ${localeNames[locale]} translation?`)) return;

    try {
      const res = await fetch("/api/admin/translate-blueprint", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testId, locale }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      fetchStatus();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <span className="text-2xl">🌐</span> Translations
        </h3>
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab("quiz")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "quiz"
                ? "bg-white shadow text-teal-700"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Quiz Content
          </button>
          {testVersionId && (
            <button
              onClick={() => setActiveTab("reports")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "reports"
                  ? "bg-white shadow text-teal-700"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Reports
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {progress && (
        <div className="bg-teal-50 border border-teal-200 text-teal-700 px-4 py-3 rounded-xl flex items-center gap-2">
          {translating && (
            <div className="w-4 h-4 border-2 border-teal-700 border-t-transparent rounded-full animate-spin" />
          )}
          {progress}
        </div>
      )}

      {activeTab === "quiz" && (
        <>
          {/* Language Status Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {/* English (source) */}
            <div className="p-3 rounded-xl bg-teal-50 border-2 border-teal-200">
              <div className="flex items-center justify-between">
                <span className="text-xl">{localeFlags.en}</span>
                <span className="text-xs bg-teal-700 text-white px-2 py-0.5 rounded-full">
                  Source
                </span>
              </div>
              <div className="text-sm font-medium mt-1">English</div>
            </div>

            {/* Other languages */}
            {translatableLocales.map((locale) => {
              const isTranslated = status[locale];
              const isSelected = selectedLocales.includes(locale);

              return (
                <button
                  key={locale}
                  onClick={() => toggleLocale(locale)}
                  disabled={translating}
                  className={`p-3 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? "border-teal-700 bg-teal-50 ring-2 ring-teal-200"
                      : isTranslated
                        ? "border-green-200 bg-green-50 hover:border-green-300"
                        : "border-gray-200 bg-gray-50 hover:border-gray-300"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl">{localeFlags[locale]}</span>
                    {isTranslated ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <span className="text-gray-400">○</span>
                    )}
                  </div>
                  <div className="text-sm font-medium mt-1">
                    {localeNames[locale]}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t">
            <button
              onClick={selectAllMissing}
              disabled={translating}
              className="text-sm text-teal-700 font-medium hover:underline disabled:opacity-50"
            >
              Select all missing
            </button>

            <button
              onClick={handleTranslateQuiz}
              disabled={translating || selectedLocales.length === 0}
              className="ml-auto bg-teal-700 text-white px-6 py-2.5 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-teal-800 transition-colors flex items-center gap-2"
            >
              {translating && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              Translate Quiz ({selectedLocales.length})
            </button>
          </div>

          {/* Existing translations management */}
          {Object.keys(status).filter((l) => l !== "en" && status[l]).length >
            0 && (
            <div className="pt-4 border-t">
              <h4 className="text-sm font-bold text-gray-600 mb-3">
                Manage Existing Translations
              </h4>
              <div className="flex flex-wrap gap-2">
                {translatableLocales
                  .filter((l) => status[l])
                  .map((locale) => (
                    <div
                      key={locale}
                      className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5"
                    >
                      <span>{localeFlags[locale]}</span>
                      <span className="text-sm">{localeNames[locale]}</span>
                      <button
                        onClick={() => handleDeleteTranslation(locale)}
                        className="text-red-500 hover:text-red-700 ml-1"
                        title="Delete translation"
                      >
                        ×
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === "reports" && testVersionId && (
        <>
          {reportStatus ? (
            <>
              <div className="text-sm text-gray-600 mb-4">
                {reportStatus.fullyTranslated} of {reportStatus.totalProfiles}{" "}
                profiles fully translated
              </div>

              {/* Profile Translation Status */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {reportStatus.profiles.map((profile) => (
                  <div
                    key={profile.profileId}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{profile.profileName}</div>
                      <div className="flex gap-1 mt-1">
                        {locales.map((l) => (
                          <span
                            key={l}
                            className={`text-xs ${
                              profile.translatedLocales.includes(l)
                                ? "text-green-600"
                                : "text-gray-300"
                            }`}
                          >
                            {localeFlags[l]}
                          </span>
                        ))}
                      </div>
                    </div>
                    {profile.missingLocales.length > 0 && (
                      <span className="text-xs text-amber-600">
                        {profile.missingLocales.length} missing
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Language selection for reports */}
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-4 border-t">
                {translatableLocales.map((locale) => {
                  const isSelected = selectedLocales.includes(locale);
                  return (
                    <button
                      key={locale}
                      onClick={() => toggleLocale(locale)}
                      disabled={translating}
                      className={`p-2 rounded-lg border-2 transition-all ${
                        isSelected
                          ? "border-teal-700 bg-teal-50"
                          : "border-gray-200 hover:border-gray-300"
                      } disabled:opacity-50`}
                    >
                      <span className="text-lg">{localeFlags[locale]}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={handleTranslateReports}
                  disabled={translating || selectedLocales.length === 0}
                  className="bg-teal-700 text-white px-6 py-2.5 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-teal-800 transition-colors flex items-center gap-2"
                >
                  {translating && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  Translate All Reports ({selectedLocales.length} languages)
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No report data available. Generate reports first.
            </div>
          )}
        </>
      )}
    </div>
  );
}

