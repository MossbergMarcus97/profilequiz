"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Locale, locales, localeNames, localeFlags } from "@/i18n/config";

interface TranslationStatus {
  [locale: string]: boolean;
}

interface JobStatus {
  id: string;
  locale: string;
  status: "pending" | "processing" | "done" | "error";
  error?: string;
  createdAt: string;
  updatedAt: string;
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
  const [jobs, setJobs] = useState<JobStatus[]>([]);
  const [selectedLocales, setSelectedLocales] = useState<Locale[]>([]);
  const [queueing, setQueueing] = useState(false);
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
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const translatableLocales = locales.filter((l) => l !== "en") as Locale[];

  // Fetch translation status and jobs
  const fetchStatus = useCallback(async () => {
    try {
      // Fetch job status
      const jobRes = await fetch(`/api/admin/translate-job?testId=${testId}`);
      const jobData = await jobRes.json();
      
      if (jobData.jobs) {
        setJobs(jobData.jobs);
      }
      
      if (jobData.existingTranslations) {
        const statusMap: TranslationStatus = { en: true };
        jobData.existingTranslations.forEach((locale: string) => {
          statusMap[locale] = true;
        });
        setStatus(statusMap);
      }

      // Check if any jobs are still pending/processing
      const activeJobs = jobData.jobs?.filter(
        (j: JobStatus) => j.status === "pending" || j.status === "processing"
      );
      
      return activeJobs?.length > 0;
    } catch (e) {
      console.error("Failed to fetch status:", e);
      return false;
    }
  }, [testId]);

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

  // Start polling when there are active jobs
  const startPolling = useCallback(() => {
    if (pollingRef.current) return; // Already polling
    
    pollingRef.current = setInterval(async () => {
      const hasActiveJobs = await fetchStatus();
      
      if (!hasActiveJobs) {
        // Stop polling when no more active jobs
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        setProgress("");
        onTranslationComplete?.();
      }
    }, 3000); // Poll every 3 seconds
  }, [fetchStatus, onTranslationComplete]);

  // Stop polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchStatus().then((hasActive) => {
      if (hasActive) {
        startPolling();
      }
    });
    if (testVersionId) {
      fetchReportStatus();
    }
  }, [testId, testVersionId, fetchStatus, startPolling]);

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

  const handleQueueTranslations = async () => {
    if (selectedLocales.length === 0) return;

    setQueueing(true);
    setError("");
    setProgress(`Queueing ${selectedLocales.length} translation(s)...`);

    try {
      const res = await fetch("/api/admin/translate-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId,
          targetLocales: selectedLocales,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to queue translations");
      }

      setProgress(`✓ Queued ${data.jobs.length} job(s). Processing...`);
      setSelectedLocales([]);
      
      // Start polling for updates
      await fetchStatus();
      startPolling();
    } catch (e: any) {
      setError(e.message);
      setProgress("");
    } finally {
      setQueueing(false);
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

      // Also cancel any pending job
      await fetch("/api/admin/translate-job", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testId, locale }),
      });

      fetchStatus();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleTranslateReports = async () => {
    if (!testVersionId || selectedLocales.length === 0) return;

    setQueueing(true);
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
      setQueueing(false);
    }
  };

  // Get job status for a locale
  const getJobForLocale = (locale: string) => {
    return jobs.find((j) => j.locale === locale);
  };

  // Count active jobs
  const activeJobCount = jobs.filter(
    (j) => j.status === "pending" || j.status === "processing"
  ).length;

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
          {activeJobCount > 0 && (
            <div className="w-4 h-4 border-2 border-teal-700 border-t-transparent rounded-full animate-spin" />
          )}
          {progress}
        </div>
      )}

      {activeTab === "quiz" && (
        <>
          {/* Active jobs banner */}
          {activeJobCount > 0 && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="font-medium">
                  {activeJobCount} translation(s) in progress...
                </span>
              </div>
              <p className="text-sm mt-1 text-blue-600">
                Jobs are processed automatically. This page updates every 3 seconds.
              </p>
            </div>
          )}

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
              const job = getJobForLocale(locale);
              const isPending = job?.status === "pending";
              const isProcessing = job?.status === "processing";
              const hasError = job?.status === "error";

              return (
                <button
                  key={locale}
                  onClick={() => toggleLocale(locale)}
                  disabled={queueing || isPending || isProcessing}
                  className={`p-3 rounded-xl border-2 transition-all text-left relative ${
                    isSelected
                      ? "border-teal-700 bg-teal-50 ring-2 ring-teal-200"
                      : isProcessing
                        ? "border-blue-300 bg-blue-50"
                        : isPending
                          ? "border-amber-300 bg-amber-50"
                          : hasError
                            ? "border-red-300 bg-red-50"
                            : isTranslated
                              ? "border-green-200 bg-green-50 hover:border-green-300"
                              : "border-gray-200 bg-gray-50 hover:border-gray-300"
                  } disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl">{localeFlags[locale]}</span>
                    {isProcessing ? (
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    ) : isPending ? (
                      <span className="text-amber-600 text-xs">⏳</span>
                    ) : hasError ? (
                      <span className="text-red-600" title={job?.error}>✗</span>
                    ) : isTranslated ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <span className="text-gray-400">○</span>
                    )}
                  </div>
                  <div className="text-sm font-medium mt-1">
                    {localeNames[locale]}
                  </div>
                  {isProcessing && (
                    <div className="text-xs text-blue-600 mt-1">Translating...</div>
                  )}
                  {isPending && (
                    <div className="text-xs text-amber-600 mt-1">Queued</div>
                  )}
                  {hasError && (
                    <div className="text-xs text-red-600 mt-1 truncate" title={job?.error}>
                      Failed
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t">
            <button
              onClick={selectAllMissing}
              disabled={queueing || activeJobCount > 0}
              className="text-sm text-teal-700 font-medium hover:underline disabled:opacity-50"
            >
              Select all missing
            </button>

            <button
              onClick={handleQueueTranslations}
              disabled={queueing || selectedLocales.length === 0}
              className="ml-auto bg-teal-700 text-white px-6 py-2.5 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-teal-800 transition-colors flex items-center gap-2"
            >
              {queueing && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              Queue Translations ({selectedLocales.length})
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
                      disabled={queueing}
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
                  disabled={queueing || selectedLocales.length === 0}
                  className="bg-teal-700 text-white px-6 py-2.5 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-teal-800 transition-colors flex items-center gap-2"
                >
                  {queueing && (
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
