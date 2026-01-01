"use client";

import { cn } from "@/lib/utils";

interface ScenarioQuestionProps {
  question: {
    id: string;
    text: string;
    options: Array<{ id: string; label: string }>;
  };
  value?: string;
  onChange: (value: string) => void;
}

export default function ScenarioQuestion({ question, value, onChange }: ScenarioQuestionProps) {
  return (
    <div className="space-y-8 animate-in slide-in-from-right duration-500">
      <div className="space-y-4">
        <span className="bg-teal-700/10 text-teal-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider block w-fit mx-auto">
          Scenario
        </span>
        <h2 className="text-2xl md:text-3xl font-serif text-center px-4 leading-tight">
          {question.text}
        </h2>
      </div>
      
      <div className="grid gap-3 max-w-lg mx-auto px-4">
        {question.options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={cn(
              "p-5 text-left border-2 rounded-2xl transition-all hover:border-teal-700/50 hover:bg-white active:scale-95",
              value === opt.id 
                ? "border-teal-700 bg-white shadow-md ring-1 ring-teal-700" 
                : "bg-white/50 border-muted-foreground/10"
            )}
          >
            <p className="font-medium text-lg leading-snug">{opt.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

