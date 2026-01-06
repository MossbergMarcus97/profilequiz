"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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

interface JobStatus {
  testId: string;
  locale: string;
  status: "pending" | "processing" | "done" | "error";
  error?: string;
}

export default function BatchTranslationPanel({ tests }: BatchTranslationPanelProps) {
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [selectedLocales, setSelectedLocales] = useState<Locale[]>([]);
  const [queueing, setQueueing] = useState(false);
  const [jobs, setJobs] = useState<JobStatus[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

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

  // Fetch job status for all selected tests
  const fetchJobStatus = useCallback(async () => {
    if (selectedTests.length === 0) return false;

    try {
      const allJobs: JobStatus[] = [];
      
      for (const testId of selectedTests) {
        const res = await fetch(`/api/admin/translate-job?testId=${testId}`);
        const data = await res.json();
        if (data.jobs) {
          allJobs.push(...data.jobs.map((j: any) => ({
            testId,
            locale: j.locale,
            status: j.status,
            error: j.error,
          })));
        }
      }

      setJobs(allJobs);

      // Check if any jobs are still active
      return allJobs.some((j) => j.status === "pending" || j.status === "processing");
    } catch (e) {
      console.error("Failed to fetch job status:", e);
      return false;
    }
  }, [selectedTests]);

  // Start polling
  const startPolling = useCallback(() => {
    if (pollingRef.current) return;

    pollingRef.current = setInterval(async () => {
      const hasActive = await fetchJobStatus();
      if (!hasActive && pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }, 3000);
  }, [fetchJobStatus]);

  // Stop polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const handleBatchTranslate = async () => {
    if (selectedTests.length === 0 || selectedLocales.length === 0) return;

    setQueueing(true);

    try {
      // Queue jobs for each test
      for (const testId of selectedTests) {
        await fetch("/api/admin/translate-job", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testId,
            targetLocales: selectedLocales,
          }),
        });
      }

      // Fetch initial status and start polling
      await fetchJobStatus();
      startPolling();
    } catch (error: any) {
      console.error("Failed to queue jobs:", error);
    } finally {
      setQueueing(false);
    }
  };

  // Calculate stats
  const pendingCount = jobs.filter((j) => j.status === "pending").length;
  const processingCount = jobs.filter((j) => j.status === "processing").length;
  const doneCount = jobs.filter((j) => j.status === "done").length;
  const errorCount = jobs.filter((j) => j.status === "error").length;
  const activeCount = pendingCount + processingCount;

  // Get jobs for a specific test
  const getTestJobs = (testId: string) => jobs.filter((j) => j.testId === testId);

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
          {/* Active jobs banner */}
          {activeCount > 0 && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="font-medium">
                  {activeCount} translation(s) in progress...
                </span>
              </div>
              <p className="text-sm mt-1 text-blue-600">
                {doneCount} done, {errorCount} failed. Updates every 3 seconds.
              </p>
            </div>
          )}

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
              {tests.map((test) => {
                const testJobs = getTestJobs(test.id);
                const hasActiveJobs = testJobs.some(
                  (j) => j.status === "pending" || j.status === "processing"
                );

                return (
                  <button
                    key={test.id}
                    onClick={() => toggleTest(test.id)}
                    disabled={queueing || hasActiveJobs}
                    className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                      selectedTests.includes(test.id)
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    } disabled:opacity-50`}
                  >
                    <div className="flex items-center gap-2">
                      {hasActiveJobs && (
                        <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      )}
                      <span>{test.title}</span>
                      {test.translatedLocales.length > 0 && (
                        <span className="text-xs text-green-600">
                          ({test.translatedLocales.length})
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
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
                  disabled={queueing}
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

          {/* Job Status Display */}
          {jobs.length > 0 && (
            <div className="bg-white rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold">Job Status</h4>
                <span className="text-sm text-muted-foreground">
                  {doneCount} done, {pendingCount} queued, {processingCount} processing
                </span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedTests.map((testId) => {
                  const test = tests.find((t) => t.id === testId);
                  const testJobs = getTestJobs(testId);

                  return (
                    <div
                      key={testId}
                      className="py-2 px-3 bg-gray-50 rounded-lg"
                    >
                      <div className="font-medium text-sm mb-1">{test?.title}</div>
                      <div className="flex flex-wrap gap-1">
                        {testJobs.map((job) => (
                          <span
                            key={job.locale}
                            className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${
                              job.status === "done"
                                ? "bg-green-100 text-green-700"
                                : job.status === "processing"
                                  ? "bg-blue-100 text-blue-700"
                                  : job.status === "error"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-amber-100 text-amber-700"
                            }`}
                            title={job.error}
                          >
                            {localeFlags[job.locale as Locale]}
                            {job.status === "processing" && (
                              <div className="w-2 h-2 border border-blue-600 border-t-transparent rounded-full animate-spin" />
                            )}
                            {job.status === "done" && "✓"}
                            {job.status === "error" && "✗"}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {selectedTests.length} quizzes × {selectedLocales.length} languages
            </div>
            <button
              onClick={handleBatchTranslate}
              disabled={
                queueing ||
                activeCount > 0 ||
                selectedTests.length === 0 ||
                selectedLocales.length === 0
              }
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              {queueing && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {queueing ? "Queueing..." : "Queue Batch Translation"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
