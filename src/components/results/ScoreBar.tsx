"use client";

import { useEffect, useState } from "react";

interface ScoreBarProps {
  score: number; // 0-100
  lowLabel: string;
  highLabel: string;
}

export default function ScoreBar({ score, lowLabel, highLabel }: ScoreBarProps) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setWidth(score), 500);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-bold uppercase tracking-tighter text-muted-foreground italic">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
      <div className="h-4 bg-teal-700/5 rounded-full relative overflow-hidden">
        {/* Center line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-muted-foreground/20 z-0" />
        
        {/* Score indicator */}
        <div 
          className="absolute top-0 bottom-0 transition-all duration-1000 ease-out z-10"
          style={{ 
            left: score >= 50 ? "50%" : `${width}%`,
            width: `${Math.abs(width - 50)}%`,
            backgroundColor: score >= 50 ? "#0F766E" : "#F97316"
          }}
        />
      </div>
      <div className="flex justify-between text-[10px] font-medium text-muted-foreground/50">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

