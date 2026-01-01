"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TestBlueprint } from "@/lib/schemas/blueprint";

const TEMPLATES = [
  {
    id: "custom",
    name: "🎨 Custom",
    description: "Write your own prompt from scratch",
    prompt: "",
  },
  {
    id: "leadership",
    name: "👔 Leadership Style",
    description: "Discover your leadership archetype",
    prompt: "Create a leadership style assessment that measures: Strategic Vision (big-picture thinking vs detail-oriented), Team Dynamics (collaborative vs independent), Decision Making (analytical vs intuitive), Communication Style (direct vs diplomatic), and Change Management (adaptive vs stability-focused). Include real workplace scenarios.",
  },
  {
    id: "emotional-iq",
    name: "❤️ Emotional Intelligence",
    description: "Measure EQ dimensions",
    prompt: "Create an emotional intelligence assessment measuring: Self-Awareness (recognizing own emotions), Self-Regulation (managing impulses), Motivation (intrinsic drive), Empathy (reading others), and Social Skills (relationship management). Use relatable everyday scenarios and relationship-based questions.",
  },
  {
    id: "work-style",
    name: "💼 Work Style",
    description: "How you thrive at work",
    prompt: "Create a work style assessment measuring: Focus Mode (deep work vs multitasking), Collaboration (team vs solo), Structure (planned vs spontaneous), Energy (morning person vs night owl), and Environment (quiet vs buzzing). Include questions about typical workday preferences.",
  },
  {
    id: "communication",
    name: "💬 Communication Style",
    description: "How you connect with others",
    prompt: "Create a communication style assessment measuring: Expressiveness (reserved vs animated), Listening Style (empathetic vs solution-focused), Conflict Approach (confrontational vs avoidant), Formality (casual vs professional), and Medium Preference (written vs verbal). Include conversation-based scenarios.",
  },
  {
    id: "creative",
    name: "🎭 Creative Profile",
    description: "Your creative personality",
    prompt: "Create a creativity assessment measuring: Ideation (convergent vs divergent thinking), Process (structured vs chaotic), Inspiration (internal vs external), Risk-Taking (experimental vs safe), and Output (quality vs quantity). Include artistic and problem-solving scenarios.",
  },
  {
    id: "relationship",
    name: "💕 Relationship Style",
    description: "How you love and connect",
    prompt: "Create a relationship style assessment measuring: Attachment (secure vs anxious vs avoidant), Love Language (words, acts, gifts, time, touch), Communication (direct vs indirect), Independence (interdependent vs autonomous), and Conflict Resolution (engage vs withdraw). Keep it warm and non-judgmental.",
  },
];

const QUESTION_TYPES = [
  { id: "likert", label: "Likert Scale", description: "Agree/Disagree statements" },
  { id: "slider", label: "Slider", description: "Spectrum between two endpoints" },
  { id: "scenario", label: "Scenario", description: "Multiple choice situations" },
  { id: "ab", label: "A/B Choice", description: "Binary preference questions" },
];

const TONES = [
  { id: "professional", label: "Professional", description: "Formal and business-appropriate" },
  { id: "casual", label: "Casual & Friendly", description: "Warm and conversational" },
  { id: "playful", label: "Playful & Fun", description: "Light-hearted and engaging" },
  { id: "thoughtful", label: "Thoughtful & Deep", description: "Introspective and philosophical" },
];

const IMAGE_STYLES = [
  { id: "none", label: "No Images", description: "Text-only questions" },
  { id: "abstract", label: "Abstract Art", description: "Modern, conceptual illustrations" },
  { id: "nature", label: "Nature Scenes", description: "Landscapes and natural imagery" },
  { id: "minimal", label: "Minimalist", description: "Clean, simple geometric visuals" },
];

export default function NewTestPage() {
  const [step, setStep] = useState<"template" | "configure" | "generate" | "preview">("template");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("custom");
  const [prompt, setPrompt] = useState("");
  const [numQuestions, setNumQuestions] = useState(20);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["likert", "slider", "scenario", "ab"]);
  const [targetAudience, setTargetAudience] = useState("general adult audience");
  const [tone, setTone] = useState("professional");
  const [generateImages, setGenerateImages] = useState(false);
  const [imageStyle, setImageStyle] = useState("abstract");
  const [loading, setLoading] = useState(false);
  const [imageProgress, setImageProgress] = useState({ current: 0, total: 0 });
  const [progress, setProgress] = useState("");
  const [blueprint, setBlueprint] = useState<TestBlueprint | null>(null);
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [jsonEdit, setJsonEdit] = useState("");
  const [previewQuestion, setPreviewQuestion] = useState(0);
  const router = useRouter();

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setPrompt(template.prompt);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setProgress("🧠 Initializing quiz generator...");
    
    try {
      setProgress("✨ Generating your personalized quiz blueprint...");
      
      // Enhance prompt with image style if enabled
      const enhancedPrompt = generateImages 
        ? `${prompt}\n\nImage style preference: ${imageStyle} - use this aesthetic for all image prompts.`
        : prompt;
      
      const res = await fetch("/api/admin/generate-blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: enhancedPrompt,
          options: {
            numQuestions,
            questionTypes: selectedTypes,
            targetAudience,
            tone,
            generateImages,
          }
        }),
      });
      
      const data = await res.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      let finalBlueprint = data.blueprint;
      
      // If images are enabled, generate them
      if (generateImages) {
        const questionsWithPrompts = finalBlueprint.questions.filter((q: any) => q.imagePrompt);
        setImageProgress({ current: 0, total: questionsWithPrompts.length });
        setProgress(`🎨 Generating ${questionsWithPrompts.length} images with DALL-E 3...`);
        
        const imageRes = await fetch("/api/admin/generate-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blueprint: finalBlueprint }),
        });
        
        const imageData = await imageRes.json();
        
        if (imageData.error) {
          console.error("Image generation failed:", imageData.error);
          setProgress("⚠️ Blueprint ready, but some images failed to generate");
        } else {
          finalBlueprint = imageData.blueprint;
          setProgress(`✅ Generated ${imageData.generated} images!`);
        }
      }
      
      setProgress("✅ Blueprint generated successfully!");
      setBlueprint(finalBlueprint);
      setJsonEdit(JSON.stringify(finalBlueprint, null, 2));
      setStep("preview");
    } catch (e: any) {
      alert("Generation failed: " + e.message);
      setProgress("");
    } finally {
      setLoading(false);
    }
  };

  const handleJsonSave = () => {
    try {
      const parsed = JSON.parse(jsonEdit);
      setBlueprint(parsed);
      setShowJsonEditor(false);
    } catch (e) {
      alert("Invalid JSON");
    }
  };

  const handleSave = async () => {
    if (!blueprint) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: blueprint.title,
          description: blueprint.intro.subhead,
          blueprintJson: JSON.stringify(blueprint),
          slug: blueprint.title.toLowerCase().replace(/ /g, "-").replace(/[^\w-]/g, ""),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      router.push("/admin");
    } catch (e: any) {
      alert("Save failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestionType = (typeId: string) => {
    setSelectedTypes(prev => 
      prev.includes(typeId) 
        ? prev.filter(t => t !== typeId)
        : [...prev, typeId]
    );
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold">Create New Quiz</h1>
          <p className="text-muted-foreground mt-1">
            Intelligent quiz generation
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {["template", "configure", "generate", "preview"].map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                ${step === s ? "bg-teal-700 text-white" : 
                  ["template", "configure", "generate", "preview"].indexOf(step) > i 
                    ? "bg-teal-200 text-teal-800" : "bg-gray-200 text-gray-500"}`}>
                {i + 1}
              </div>
              {i < 3 && <div className={`w-8 h-0.5 ${["template", "configure", "generate", "preview"].indexOf(step) > i ? "bg-teal-400" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Template Selection */}
      {step === "template" && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold">Choose a Starting Point</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATES.map(template => (
              <button
                key={template.id}
                onClick={() => handleTemplateSelect(template.id)}
                className={`p-6 rounded-2xl text-left transition-all border-2 hover:shadow-lg
                  ${selectedTemplate === template.id 
                    ? "border-teal-700 bg-teal-50 shadow-md" 
                    : "border-gray-200 bg-white hover:border-teal-300"}`}
              >
                <div className="text-2xl mb-2">{template.name.split(" ")[0]}</div>
                <div className="font-bold text-lg">{template.name.slice(template.name.indexOf(" ") + 1)}</div>
                <div className="text-muted-foreground text-sm mt-1">{template.description}</div>
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep("configure")}
            disabled={!selectedTemplate}
            className="bg-teal-700 text-white px-8 py-4 rounded-xl font-bold text-lg disabled:opacity-50 hover:bg-teal-800 transition-colors"
          >
            Continue →
          </button>
        </div>
      )}

      {/* Step 2: Configuration */}
      {step === "configure" && (
        <div className="space-y-8">
          <button onClick={() => setStep("template")} className="text-teal-700 font-bold">
            ← Back to Templates
          </button>
          
          <div className="space-y-6">
            <div>
              <label className="block font-bold text-lg mb-2">Describe Your Quiz</label>
              <textarea
                className="w-full border-2 border-gray-200 rounded-xl p-4 min-h-[150px] focus:border-teal-500 focus:ring-0 transition-colors"
                placeholder="Describe the personality dimensions, topics, or concepts you want to assess..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block font-bold mb-2">Number of Questions</label>
                <input
                  type="range"
                  min="10"
                  max="50"
                  step="5"
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Number(e.target.value))}
                  className="w-full accent-teal-700"
                />
                <div className="flex justify-between text-sm text-muted-foreground mt-1">
                  <span>10 (Quick)</span>
                  <span className="font-bold text-teal-700">{numQuestions} questions</span>
                  <span>50 (Thorough)</span>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-2">Target Audience</label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-teal-500 focus:ring-0"
                  placeholder="e.g., professionals, students, couples..."
                />
              </div>
            </div>

            <div>
              <label className="block font-bold mb-3">Question Types</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {QUESTION_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => toggleQuestionType(type.id)}
                    className={`p-4 rounded-xl text-left border-2 transition-all
                      ${selectedTypes.includes(type.id) 
                        ? "border-teal-700 bg-teal-50" 
                        : "border-gray-200 bg-white"}`}
                  >
                    <div className="font-bold">{type.label}</div>
                    <div className="text-xs text-muted-foreground">{type.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold mb-3">Tone & Voice</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {TONES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTone(t.id)}
                    className={`p-4 rounded-xl text-left border-2 transition-all
                      ${tone === t.id 
                        ? "border-teal-700 bg-teal-50" 
                        : "border-gray-200 bg-white"}`}
                  >
                    <div className="font-bold">{t.label}</div>
                    <div className="text-xs text-muted-foreground">{t.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Image Generation Toggle */}
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-bold text-lg">🎨 AI-Generated Images</label>
                  <p className="text-sm text-muted-foreground">Add unique DALL-E 3 illustrations to each question</p>
                </div>
                <button
                  onClick={() => setGenerateImages(!generateImages)}
                  className={`relative w-14 h-8 rounded-full transition-colors ${generateImages ? "bg-teal-700" : "bg-gray-300"}`}
                >
                  <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${generateImages ? "translate-x-7" : "translate-x-1"}`} />
                </button>
              </div>
              
              {generateImages && (
                <div className="pt-4 border-t">
                  <label className="block font-bold mb-3">Image Style</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {IMAGE_STYLES.filter(s => s.id !== "none").map(style => (
                      <button
                        key={style.id}
                        onClick={() => setImageStyle(style.id)}
                        className={`p-4 rounded-xl text-left border-2 transition-all
                          ${imageStyle === style.id 
                            ? "border-orange-500 bg-orange-50" 
                            : "border-gray-200 bg-white"}`}
                      >
                        <div className="font-bold">{style.label}</div>
                        <div className="text-xs text-muted-foreground">{style.description}</div>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-amber-600 mt-3">
                    ⚠️ Image generation adds ~$0.04 per question and takes 2-3 minutes for a full quiz
                  </p>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => { setStep("generate"); handleGenerate(); }}
            disabled={!prompt || selectedTypes.length === 0}
            className="bg-teal-700 text-white px-8 py-4 rounded-xl font-bold text-lg disabled:opacity-50 hover:bg-teal-800 transition-colors"
          >
            Generate Quiz →
          </button>
        </div>
      )}

      {/* Step 3: Generating */}
      {step === "generate" && loading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-6">
          <div className="w-16 h-16 border-4 border-teal-200 border-t-teal-700 rounded-full animate-spin" />
          <div className="text-xl font-bold text-center">{progress}</div>
          <p className="text-muted-foreground text-center max-w-md">
            Analyzing your requirements and crafting a scientifically-grounded assessment with validated question formats...
          </p>
        </div>
      )}

      {/* Step 4: Preview */}
      {step === "preview" && blueprint && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <button onClick={() => setStep("configure")} className="text-teal-700 font-bold">
              ← Back to Configure
            </button>
            <button
              onClick={() => setShowJsonEditor(!showJsonEditor)}
              className="text-sm border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50"
            >
              {showJsonEditor ? "Hide JSON" : "Edit JSON"}
            </button>
          </div>

          {showJsonEditor ? (
            <div className="space-y-4">
              <textarea
                className="w-full h-[500px] font-mono text-sm border-2 border-gray-200 rounded-xl p-4"
                value={jsonEdit}
                onChange={(e) => setJsonEdit(e.target.value)}
              />
              <button
                onClick={handleJsonSave}
                className="bg-gray-800 text-white px-6 py-2 rounded-lg font-bold"
              >
                Apply Changes
              </button>
            </div>
          ) : (
            <>
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
                  {blueprint.scales.map(scale => (
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
                  {blueprint.questions.some((q: any) => q.imageUrl) && (
                    <span className="ml-2 text-sm font-normal text-pink-600">
                      🖼️ {blueprint.questions.filter((q: any) => q.imageUrl).length} with images
                    </span>
                  )}
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
                        onClick={() => setPreviewQuestion(Math.min(blueprint.questions.length - 1, previewQuestion + 1))}
                        disabled={previewQuestion === blueprint.questions.length - 1}
                        className="px-3 py-1 border rounded disabled:opacity-30"
                      >
                        →
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Question Image */}
                    {(blueprint.questions[previewQuestion] as any).imageUrl && (
                      <div className="rounded-xl overflow-hidden mb-4">
                        <img 
                          src={(blueprint.questions[previewQuestion] as any).imageUrl} 
                          alt="Question illustration"
                          className="w-full h-48 object-cover"
                        />
                      </div>
                    )}
                    {(blueprint.questions[previewQuestion] as any).imagePrompt && !(blueprint.questions[previewQuestion] as any).imageUrl && (
                      <div className="bg-gray-100 rounded-xl p-4 text-sm text-muted-foreground">
                        <span className="font-bold">Image Prompt:</span> {(blueprint.questions[previewQuestion] as any).imagePrompt}
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded font-bold uppercase
                        ${blueprint.questions[previewQuestion].type === "likert" ? "bg-blue-100 text-blue-800" :
                          blueprint.questions[previewQuestion].type === "slider" ? "bg-purple-100 text-purple-800" :
                          blueprint.questions[previewQuestion].type === "scenario" ? "bg-orange-100 text-orange-800" :
                          "bg-green-100 text-green-800"}`}>
                        {blueprint.questions[previewQuestion].type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Scale: {blueprint.scales.find(s => s.id === blueprint.questions[previewQuestion].scaleId)?.name}
                      </span>
                      {(blueprint.questions[previewQuestion] as any).imageUrl && (
                        <span className="px-2 py-1 text-xs rounded font-bold uppercase bg-pink-100 text-pink-800">
                          🖼️ Has Image
                        </span>
                      )}
                    </div>
                    <p className="text-xl">{blueprint.questions[previewQuestion].text}</p>
                    
                    {/* Type-specific preview */}
                    {blueprint.questions[previewQuestion].type === "likert" && (
                      <div className="flex justify-between pt-4">
                        {["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"].map((label, i) => (
                          <button key={i} className="w-12 h-12 rounded-full border-2 border-gray-300 hover:border-teal-500 transition-colors flex items-center justify-center text-xs">
                            {i + 1}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {blueprint.questions[previewQuestion].type === "slider" && (
                      <div className="pt-4">
                        <input type="range" className="w-full accent-teal-700" />
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{(blueprint.questions[previewQuestion] as any).leftLabel}</span>
                          <span>{(blueprint.questions[previewQuestion] as any).rightLabel}</span>
                        </div>
                      </div>
                    )}
                    
                    {blueprint.questions[previewQuestion].type === "scenario" && (
                      <div className="space-y-2 pt-4">
                        {(blueprint.questions[previewQuestion] as any).options?.map((opt: any) => (
                          <button key={opt.id} className="w-full p-3 text-left border rounded-xl hover:border-teal-500 transition-colors">
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {blueprint.questions[previewQuestion].type === "ab" && (
                      <div className="grid grid-cols-2 gap-4 pt-4">
                        <button className="p-4 border-2 rounded-xl hover:border-teal-500 transition-colors">
                          {(blueprint.questions[previewQuestion] as any).optionA}
                        </button>
                        <button className="p-4 border-2 rounded-xl hover:border-teal-500 transition-colors">
                          {(blueprint.questions[previewQuestion] as any).optionB}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Paywall Preview */}
              <div>
                <h3 className="font-bold text-lg mb-4">💰 Paywall Preview</h3>
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-6">
                  <div className="font-bold text-2xl text-orange-600">{blueprint.paywall.priceLabel}</div>
                  <ul className="mt-4 space-y-2">
                    {blueprint.paywall.bullets.map((bullet, i) => (
                      <li key={i} className="flex items-start">
                        <span className="text-green-600 mr-2">✓</span>
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-4 pt-4 border-t">
            <button
              onClick={handleSave}
              disabled={loading}
              className="bg-teal-700 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-teal-800 transition-colors disabled:opacity-50"
            >
              {loading ? "Saving..." : "✅ Save & Publish"}
            </button>
            <button
              onClick={() => { setBlueprint(null); setStep("configure"); }}
              className="border-2 border-gray-300 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition-colors"
            >
              🔄 Regenerate
            </button>
            <button
              onClick={() => { setBlueprint(null); setStep("template"); setPrompt(""); }}
              className="text-gray-500 px-6 py-4 rounded-xl font-bold hover:text-gray-700 transition-colors"
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
