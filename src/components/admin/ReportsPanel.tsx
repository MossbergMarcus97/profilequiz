"use client";

import { useState, useEffect } from "react";

interface ProfileStatus {
  id: string;
  slug: string;
  name: string;
  hasReport: boolean;
  reportCreatedAt: string | null;
  reportUpdatedAt: string | null;
}

interface ReportStatus {
  testVersionId: string;
  testTitle: string;
  version: number;
  totalProfiles: number;
  profilesWithReports: number;
  complete: boolean;
  profiles: ProfileStatus[];
}

interface ReportsPanelProps {
  testId: string;
  testVersionId?: string;
}

export default function ReportsPanel({ testId, testVersionId }: ReportsPanelProps) {
  const [status, setStatus] = useState<ReportStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingProfileId, setGeneratingProfileId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [viewingReport, setViewingReport] = useState<{ profileId: string; name: string; html: string } | null>(null);

  const fetchStatus = async () => {
    if (!testVersionId) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/admin/generate-reports?testVersionId=${testVersionId}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStatus(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [testVersionId]);

  const generateAllReports = async (force = false) => {
    if (!testVersionId) return;
    
    setGenerating(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/generate-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testVersionId, force }),
      });
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);
      
      setSuccess(data.message);
      await fetchStatus();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const generateSingleReport = async (profileId: string) => {
    if (!testVersionId) return;
    
    setGeneratingProfileId(profileId);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/generate-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testVersionId, profileIds: [profileId], force: true }),
      });
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);
      
      setSuccess(`Report generated for ${data.results?.[0]?.profileName || "profile"}`);
      await fetchStatus();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGeneratingProfileId(null);
    }
  };

  const viewReport = async (profileId: string, profileName: string) => {
    try {
      const res = await fetch(`/api/admin/profile-report?profileId=${profileId}`);
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);
      
      setViewingReport({
        profileId,
        name: profileName,
        html: data.contentHtml,
      });
    } catch (e: any) {
      setError(`Failed to load report: ${e.message}`);
    }
  };

  if (!testVersionId) {
    return (
      <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl">
        No test version found. Save the test first to generate reports.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-700 rounded-full animate-spin" />
      </div>
    );
  }

  // Report viewer modal
  if (viewingReport) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-teal-700">
            📄 {viewingReport.name} Report
          </h3>
          <button
            onClick={() => setViewingReport(null)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ← Back to Reports List
          </button>
        </div>
        
        <div className="bg-white border rounded-xl p-6 max-h-[70vh] overflow-y-auto">
          <div 
            className="prose prose-teal max-w-none"
            dangerouslySetInnerHTML={{ __html: viewingReport.html }} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Profile Reports</h3>
          <p className="text-sm text-muted-foreground">
            {status?.profilesWithReports || 0} of {status?.totalProfiles || 0} profiles have reports
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {status && status.profilesWithReports > 0 && (
            <button
              onClick={() => generateAllReports(true)}
              disabled={generating}
              className="border border-orange-300 text-orange-700 px-4 py-2 rounded-lg hover:bg-orange-50 transition-colors disabled:opacity-50"
            >
              🔄 Regenerate All
            </button>
          )}
          <button
            onClick={() => generateAllReports(false)}
            disabled={generating || status?.complete}
            className="bg-teal-700 text-white px-6 py-2 rounded-lg font-medium hover:bg-teal-800 transition-colors disabled:opacity-50"
          >
            {generating ? (
              <span className="flex items-center">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Generating...
              </span>
            ) : status?.complete ? (
              "✅ All Reports Generated"
            ) : (
              "🚀 Generate Missing Reports"
            )}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {status && (
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-teal-600 h-3 rounded-full transition-all duration-500"
            style={{
              width: `${(status.profilesWithReports / status.totalProfiles) * 100}%`,
            }}
          />
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl">
          {success}
        </div>
      )}

      {/* Profile List */}
      <div className="border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-sm">Profile</th>
              <th className="text-left px-4 py-3 font-medium text-sm">Status</th>
              <th className="text-left px-4 py-3 font-medium text-sm">Last Updated</th>
              <th className="text-right px-4 py-3 font-medium text-sm">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {status?.profiles.map((profile) => (
              <tr key={profile.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium">{profile.name}</div>
                  <div className="text-xs text-muted-foreground">{profile.slug}</div>
                </td>
                <td className="px-4 py-3">
                  {profile.hasReport ? (
                    <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      ✓ Generated
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                      ○ Pending
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {profile.reportUpdatedAt
                    ? new Date(profile.reportUpdatedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    {profile.hasReport && (
                      <button
                        onClick={() => viewReport(profile.id, profile.name)}
                        className="text-teal-600 hover:text-teal-800 text-sm font-medium"
                      >
                        👁️ View
                      </button>
                    )}
                    <button
                      onClick={() => generateSingleReport(profile.id)}
                      disabled={generatingProfileId === profile.id}
                      className="text-orange-600 hover:text-orange-800 text-sm font-medium disabled:opacity-50"
                    >
                      {generatingProfileId === profile.id ? (
                        <span className="flex items-center">
                          <span className="w-3 h-3 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mr-1" />
                          Generating...
                        </span>
                      ) : profile.hasReport ? (
                        "🔄 Regenerate"
                      ) : (
                        "⚡ Generate"
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Info Note */}
      <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl text-sm">
        <strong>Note:</strong> Report generation uses AI (GPT-5.2 Pro) to create detailed personality
        reports. Each report costs approximately $0.05-0.10 to generate. Reports are generated in
        English and can then be translated to other languages via the Translations tab.
      </div>
    </div>
  );
}

