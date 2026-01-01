"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { TestBlueprint, TestBlueprintSchema } from "@/lib/schemas/blueprint";

export default function EditTestPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [blueprintJson, setBlueprintJson] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchTest = async () => {
      const res = await fetch(`/api/admin/tests/${id}`);
      const data = await res.json();
      if (data.test) {
        setBlueprintJson(JSON.stringify(JSON.parse(data.test.blueprintJson), null, 2));
      }
    };
    fetchTest();
  }, [id]);

  const handleSave = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-serif font-bold">Edit Test Blueprint</h1>
      
      {error && <p className="text-destructive font-bold">{error}</p>}

      <div className="space-y-2">
        <label className="block font-bold">Blueprint JSON</label>
        <textarea
          className="w-full border rounded-xl p-4 min-h-[500px] font-mono text-sm"
          value={blueprintJson}
          onChange={(e) => setBlueprintJson(e.target.value)}
        />
        <div className="flex space-x-4">
          <button
            onClick={handleSave}
            disabled={loading}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold"
          >
            {loading ? "Saving..." : "Update Blueprint"}
          </button>
          <button
            onClick={() => router.push("/admin")}
            className="border px-6 py-3 rounded-xl font-bold"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

