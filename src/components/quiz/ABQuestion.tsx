"use client";

import { cn } from "@/lib/utils";

interface ABQuestionProps {
  question: {
    id: string;
    text: string;
    optionA: string;
    optionB: string;
  };
  value?: string;
  onChange: (value: string) => void;
}

export default function ABQuestion({ question, value, onChange }: ABQuestionProps) {
  return (
    <div className="space-y-8 animate-in slide-in-from-right duration-500">
      <h2 className="text-2xl md:text-3xl font-serif text-center px-4 leading-tight">
        {question.text}
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto px-4">
        {[
          { id: "A", label: question.optionA },
          { id: "B", label: question.optionB },
        ].map((opt) => (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={cn(
              "p-8 text-center border-2 rounded-3xl transition-all hover:border-teal-700/50 hover:bg-white min-h-[160px] flex flex-col items-center justify-center space-y-2",
              value === opt.id 
                ? "border-teal-700 bg-white shadow-md ring-1 ring-teal-700" 
                : "bg-white/50 border-muted-foreground/10"
            )}
          >
            <span className="text-sm font-bold text-muted-foreground uppercase opacity-50">Option {opt.id}</span>
            <p className="font-bold text-xl leading-tight">{opt.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

