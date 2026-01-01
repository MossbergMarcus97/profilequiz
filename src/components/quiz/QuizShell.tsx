"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { TestBlueprint, Question } from "@/lib/schemas/blueprint";
import LikertQuestion from "./LikertQuestion";
import SliderQuestion from "./SliderQuestion";
import ScenarioQuestion from "./ScenarioQuestion";
import ABQuestion from "./ABQuestion";

interface QuizShellProps {
  testId: string;
  blueprint: TestBlueprint;
}

export default function QuizShell({ testId, blueprint }: QuizShellProps) {
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(-1); // -1 for intro
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isFinishing, setIsFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const t = useTranslations("quiz");

  const questions = blueprint.questions;
  const currentQuestion = questions[currentIndex];
  const progress = currentIndex === -1 ? 0 : Math.round(((currentIndex + 1) / questions.length) * 100);

  useEffect(() => {
    // Start attempt on mount
    const startAttempt = async () => {
      try {
        const res = await fetch("/api/attempts/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testId }),
        });
        const data = await res.json();
        if (data.error) {
          setError(data.error);
        } else {
          setAttemptId(data.attemptId);
        }
      } catch (e) {
        console.error("Failed to start attempt:", e);
        setError("Failed to start quiz. Please refresh and try again.");
      }
    };
    startAttempt();
  }, [testId]);

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    if (!attemptId) {
      setError("Session error. Please refresh and try again.");
      return;
    }
    
    setIsFinishing(true);
    setError(null);
    
    try {
      // Send all answers in one request (answers are NOT stored in DB)
      const res = await fetch("/api/attempts/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, answers }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to complete quiz");
      }
      
      // Navigate to results page
      router.push(`/r/${attemptId}`);
    } catch (e: any) {
      console.error("Failed to finish quiz:", e);
      setError(e.message || "Failed to complete quiz. Please try again.");
      setIsFinishing(false);
    }
  };

  const handleAnswer = (value: any) => {
    const qId = currentQuestion.id;
    // Store answer in local state only (not sent to server until finish)
    setAnswers((prev) => ({ ...prev, [qId]: value }));

    // Auto-advance after a small delay for visual feedback
    setTimeout(() => {
      handleNext();
    }, 400);
  };

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 space-y-6 text-center">
        <div className="text-6xl">😕</div>
        <h2 className="text-2xl font-bold text-red-600">Something went wrong</h2>
        <p className="text-muted-foreground max-w-md">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (currentIndex === -1) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 space-y-8 text-center animate-in fade-in duration-1000">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-teal-700 leading-tight">
            {blueprint.intro.headline}
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {blueprint.intro.subhead}
          </p>
        </div>
        
        <button
          onClick={() => setCurrentIndex(0)}
          disabled={!attemptId}
          className="bg-primary text-primary-foreground text-xl font-bold px-12 py-5 rounded-2xl shadow-xl hover:scale-105 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {attemptId ? t("beginDiscovery") : "Loading..."}
        </button>
        
        <p className="text-xs text-muted-foreground max-w-md mx-auto italic opacity-60">
          {blueprint.intro.disclaimer}
        </p>
      </div>
    );
  }

  if (isFinishing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-6">
        <div className="w-16 h-16 border-4 border-teal-700 border-t-transparent rounded-full animate-spin" />
        <p className="text-xl font-medium font-serif italic text-teal-700">{t("calculating")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header / Progress */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-md z-10 pt-6 pb-2 px-4 space-y-4">
        <div className="max-w-2xl mx-auto flex justify-between items-end">
          <span className="text-sm font-bold uppercase tracking-widest text-teal-700/60">
            {t("discoveryInProgress")}
          </span>
          <span className="text-sm font-bold tabular-nums">
            {t("questionOf", { current: currentIndex + 1, total: questions.length })}
          </span>
        </div>
        <div className="max-w-2xl mx-auto h-2 bg-teal-700/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-teal-700 transition-all duration-500 ease-out" 
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question Content */}
      <div className="flex-1 flex flex-col items-center justify-center py-12 max-w-4xl mx-auto w-full px-4">
        {/* Question Image (if available) */}
        {(currentQuestion as any).imageUrl && (
          <div className="w-full max-w-md mb-8 rounded-2xl overflow-hidden shadow-lg animate-in fade-in duration-500">
            <img 
              src={(currentQuestion as any).imageUrl} 
              alt="Question illustration"
              className="w-full h-48 md:h-64 object-cover"
            />
          </div>
        )}
        
        {currentQuestion.type === "likert" && (
          <LikertQuestion 
            question={currentQuestion} 
            value={answers[currentQuestion.id]} 
            onChange={handleAnswer} 
          />
        )}
        {currentQuestion.type === "slider" && (
          <SliderQuestion 
            question={currentQuestion} 
            value={answers[currentQuestion.id]} 
            onChange={handleAnswer} 
          />
        )}
        {currentQuestion.type === "scenario" && (
          <ScenarioQuestion 
            question={currentQuestion} 
            value={answers[currentQuestion.id]} 
            onChange={handleAnswer} 
          />
        )}
        {currentQuestion.type === "ab" && (
          <ABQuestion 
            question={currentQuestion} 
            value={answers[currentQuestion.id]} 
            onChange={handleAnswer} 
          />
        )}
      </div>

      {/* Footer Navigation (optional fallback) */}
      <div className="p-6 flex justify-center opacity-20 hover:opacity-100 transition-opacity">
        <button 
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          className="text-xs font-bold uppercase tracking-tighter"
        >
          {t("previousQuestion")}
        </button>
      </div>
    </div>
  );
}

