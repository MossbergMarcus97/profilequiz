"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { TestBlueprint, TestBlueprintSchema } from "@/lib/schemas/blueprint";
import TranslationPanel from "@/components/admin/TranslationPanel";

interface TestData {
  id: string;
  title: string;
  slug: string;
  blueprintJson: string;
  translationsJson: string | null;
  versions: Array<{
    id: string;
    version: number;
    profiles: Array<{
      id: string;
      name: string;
    }>;
  }>;
}

export default function EditTestPage() {
  const { id } = useParams();
  const [test, setTest] = useState<TestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blueprintJson, setBlueprintJson] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"blueprint" | "translations" | "preview">("blueprint");
  const [previewQuestion, setPreviewQuestion] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const res = await fetch(`/api/admin/tests/${id}`);
        const data = await res.json();
        if (data.test) {
          setTest(data.test);
          setBlueprintJson(JSON.stringify(JSON.parse(data.test.blueprintJson), null, 2));
        }
      } catch (e) {
        console.error("Failed to fetch test:", e);
        setError("Failed to load test");
      } finally {
        setLoading(false);
      }
    };
    fetchTest();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const parsed = JSON.parse(blueprintJson);
      TestBlueprintSchema.parse(parsed);

      const res = await fetch(`/api/admin/tests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: parsed.title,
          description: parsed.intro.subhead,
          blueprintJson: JSON.stringify(parsed),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      router.push("/admin");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const getParsedBlueprint = (): TestBlueprint | null => {
    try {
      return TestBlueprintSchema.parse(JSON.parse(blueprintJson));
    } catch {
      return null;
    }
  };

  const blueprint = getParsedBlueprint();
  const latestVersion = test?.versions?.[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-700 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold">{test?.title || "Edit Test"}</h1>
          <p className="text-muted-foreground mt-1">
            Slug: <code className="bg-gray-100 px-2 py-0.5 rounded">/t/{test?.slug}</code>
          </p>
        </div>
        <div className="flex space-x-3">
          <a
            href={`/t/${test?.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            View Public →
          </a>
          <button
            onClick={() => router.push("/admin")}
            className="border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ← Back
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("blueprint")}
          className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
            activeTab === "blueprint"
              ? "bg-white shadow text-teal-700"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          📝 Blueprint
        </button>
        <button
          onClick={() => setActiveTab("preview")}
          className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
            activeTab === "preview"
              ? "bg-white shadow text-teal-700"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          👁️ Preview
        </button>
        <button
          onClick={() => setActiveTab("translations")}
          className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
            activeTab === "translations"
              ? "bg-white shadow text-teal-700"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          🌐 Translations
        </button>
      </div>

      {/* Blueprint Tab */}
      {activeTab === "blueprint" && (
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block font-bold text-lg">Blueprint JSON</label>
            <p className="text-sm text-muted-foreground">
              Edit the quiz structure, questions, scales, and profiles directly.
            </p>
            <textarea
              className="w-full border-2 border-gray-200 rounded-xl p-4 min-h-[600px] font-mono text-sm focus:border-teal-500 focus:ring-0 transition-colors"
              value={blueprintJson}
              onChange={(e) => setBlueprintJson(e.target.value)}
            />
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-teal-700 text-white px-8 py-3 rounded-xl font-bold hover:bg-teal-800 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "💾 Save Changes"}
            </button>
            <button
              onClick={() => {
                if (test) {
                  setBlueprintJson(JSON.stringify(JSON.parse(test.blueprintJson), null, 2));
                }
              }}
              className="border-2 border-gray-300 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Preview Tab */}
      {activeTab === "preview" && blueprint && (
        <div className="space-y-8">
          {/* Quiz Header Preview */}
          <div className="bg-gradient-to-br from-teal-700 to-teal-900 text-white p-8 rounded-2xl">
            <h2 className="text-3xl font-serif font-bold">{blueprint.title}</h2>
            <p className="text-xl mt-2 opacity-90">{blueprint.intro.headline}</p>
            <p className="mt-4 opacity-75">{blueprint.intro.subhead}</p>
          </div>

          {/* Scales Overview */}
          <div>
            <h3 className="font-bold text-lg mb-4">📊 Scales ({blueprint.scales.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {blueprint.scales.map((scale) => (
                <div key={scale.id} className="bg-white border rounded-xl p-4">
                  <div className="font-bold text-teal-700">{scale.name}</div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Low: {scale.lowLabel}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    High: {scale.highLabel}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Questions Preview */}
          <div>
            <h3 className="font-bold text-lg mb-4">
              ❓ Questions ({blueprint.questions.length})
            </h3>
            <div className="bg-white border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">
                  Question {previewQuestion + 1} of {blueprint.questions.length}
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPreviewQuestion(Math.max(0, previewQuestion - 1))}
                    disabled={previewQuestion === 0}
                    className="px-3 py-1 border rounded disabled:opacity-30"
                  >
                    ←
                  </button>
                  <button
                    onClick={() =>
                      setPreviewQuestion(
                        Math.min(blueprint.questions.length - 1, previewQuestion + 1)
                      )
                    }
                    disabled={previewQuestion === blueprint.questions.length - 1}
                    className="px-3 py-1 border rounded disabled:opacity-30"
                  >
                    →
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2 py-1 text-xs rounded font-bold uppercase
                    ${
                      blueprint.questions[previewQuestion].type === "likert"
                        ? "bg-blue-100 text-blue-800"
                        : blueprint.questions[previewQuestion].type === "slider"
                          ? "bg-purple-100 text-purple-800"
                          : blueprint.questions[previewQuestion].type === "scenario"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-green-100 text-green-800"
                    }`}
                  >
                    {blueprint.questions[previewQuestion].type}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Scale:{" "}
                    {
                      blueprint.scales.find(
                        (s) => s.id === blueprint.questions[previewQuestion].scaleId
                      )?.name
                    }
                  </span>
                </div>
                <p className="text-xl">{blueprint.questions[previewQuestion].text}</p>
              </div>
            </div>
          </div>

          {/* Profiles Preview */}
          {blueprint.profiles && blueprint.profiles.length > 0 && (
            <div>
              <h3 className="font-bold text-lg mb-4">
                👤 Profiles ({blueprint.profiles.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {blueprint.profiles.slice(0, 6).map((profile) => (
                  <div key={profile.id} className="bg-white border rounded-xl p-4">
                    <div className="font-bold text-teal-700">{profile.name}</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {profile.oneLineHook}
                    </p>
                  </div>
                ))}
                {blueprint.profiles.length > 6 && (
                  <div className="bg-gray-50 border rounded-xl p-4 flex items-center justify-center text-muted-foreground">
                    +{blueprint.profiles.length - 6} more profiles
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Translations Tab */}
      {activeTab === "translations" && test && (
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl">
            <strong>Note:</strong> Translations use AI (Gemini 3 Flash) to create
            culturally-adapted versions of your quiz content. Each language costs
            approximately $0.01 to translate.
          </div>

          <TranslationPanel
            testId={test.id}
            testVersionId={latestVersion?.id}
            onTranslationComplete={() => {
              // Refetch test data to update translation status
            }}
          />
        </div>
      )}
    </div>
  );
}
