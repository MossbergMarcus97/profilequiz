"use client";

interface SliderQuestionProps {
  question: {
    id: string;
    text: string;
    leftLabel: string;
    rightLabel: string;
  };
  value?: number;
  onChange: (value: number) => void;
}

export default function SliderQuestion({ question, value = 50, onChange }: SliderQuestionProps) {
  return (
    <div className="space-y-12 animate-in slide-in-from-right duration-500">
      <h2 className="text-2xl md:text-3xl font-serif text-center px-4 leading-tight">
        {question.text}
      </h2>
      
      <div className="space-y-6 max-w-md mx-auto px-4">
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-teal-700"
        />
        <div className="flex justify-between text-sm font-bold text-muted-foreground italic">
          <span className="max-w-[120px] text-left leading-tight">{question.leftLabel}</span>
          <span className="max-w-[120px] text-right leading-tight">{question.rightLabel}</span>
        </div>
      </div>
    </div>
  );
}

