"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface LikertQuestionProps {
  question: {
    id: string;
    text: string;
  };
  value?: number;
  onChange: (value: number) => void;
}

export default function LikertQuestion({ question, value, onChange }: LikertQuestionProps) {
  const t = useTranslations("quiz");
  
  const options = [
    { label: t("stronglyDisagree"), value: 1 },
    { label: t("disagree"), value: 2 },
    { label: t("neutral"), value: 3 },
    { label: t("agree"), value: 4 },
    { label: t("stronglyAgree"), value: 5 },
  ];

  return (
    <div className="space-y-8 animate-in slide-in-from-right duration-500">
      <h2 className="text-2xl md:text-3xl font-serif text-center px-4 leading-tight">
        {question.text}
      </h2>
      
      <div className="flex flex-col items-center space-y-4">
        <div className="flex justify-between w-full max-w-md px-2 text-xs font-bold uppercase text-muted-foreground">
          <span>{t("disagree")}</span>
          <span>{t("agree")}</span>
        </div>
        <div className="flex justify-between w-full max-w-md items-center">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={cn(
                "rounded-full transition-all flex items-center justify-center border-2",
                // Circle sizes: 1=48px, 2=40px, 3=32px, 4=40px, 5=48px (V-shape)
                opt.value === 1 || opt.value === 5 ? "w-14 h-14" : 
                opt.value === 2 || opt.value === 4 ? "w-11 h-11" : "w-8 h-8",
                value === opt.value 
                  ? "border-teal-700 bg-teal-700/10 scale-110" 
                  : "border-muted-foreground/30 hover:border-teal-700/50"
              )}
              title={opt.label}
            >
              {value === opt.value && <div className="w-1/2 h-1/2 rounded-full bg-teal-700" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
