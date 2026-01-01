import ScoreBar from "./ScoreBar";

interface TraitCardProps {
  id: string;
  name: string;
  score: number;
  lowLabel: string;
  highLabel: string;
  description: string;
}

export default function TraitCard({ name, score, lowLabel, highLabel, description }: TraitCardProps) {
  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-teal-700/5 space-y-6">
      <div className="flex justify-between items-start">
        <h3 className="text-xl md:text-2xl font-serif font-bold text-teal-700">{name}</h3>
        <span className="text-3xl font-bold tabular-nums text-teal-700/20">{score}%</span>
      </div>
      
      <ScoreBar score={score} lowLabel={lowLabel} highLabel={highLabel} />
      
      <p className="text-muted-foreground leading-relaxed italic">
        {description}
      </p>
    </div>
  );
}

