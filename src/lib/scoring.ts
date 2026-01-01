import { TestBlueprint, ProfileDefinition, assignToNearestProfile } from "./schemas/blueprint";

export interface ScoringResult {
  scores: Record<string, number>;
  resultLabel: string;
  profileId: string | null;
  profileName: string | null;
}

/**
 * Compute normalized trait scores (0-100) from quiz answers.
 * Returns scores, a result label, and the assigned profile (if profiles exist).
 */
export function computeScores(
  blueprint: TestBlueprint,
  answers: Record<string, any>
): ScoringResult {
  const scores: Record<string, number> = {};
  const traitCounts: Record<string, number> = {};

  // Initialize scores
  blueprint.scales.forEach((scale) => {
    scores[scale.id] = 0;
    traitCounts[scale.id] = 0;
  });

  blueprint.questions.forEach((q) => {
    const answer = answers[q.id];
    if (answer === undefined) return;

    let points = 0;
    if (q.type === "likert") {
      const map = blueprint.scoring.likertMap;
      points = map[String(answer)] || 0;
      if (q.reverse) points = -points;
    } else if (q.type === "slider") {
      // 0..100 -> -2..+2
      const val = Number(answer);
      const min = blueprint.scoring.sliderRange.min;
      const max = blueprint.scoring.sliderRange.max;
      points = min + (val / 100) * (max - min);
    } else if (q.type === "scenario") {
      const option = q.options.find((o) => o.id === answer);
      points = option?.score || 0;
    } else if (q.type === "ab") {
      points = answer === "A" ? q.scoreA : q.scoreB;
    }

    scores[q.scaleId] += points;
    traitCounts[q.scaleId]++;
  });

  // Normalize to 0-100 for each scale
  const normalized: Record<string, number> = {};
  blueprint.scales.forEach((scale) => {
    const raw = scores[scale.id];
    const count = traitCounts[scale.id];
    if (count === 0) {
      normalized[scale.id] = 50;
      return;
    }
    
    // Max points per question is 2, min is -2
    const maxRaw = count * 2;
    const minRaw = count * -2;
    
    // Normalize raw to 0-100: (raw - min) / (max - min) * 100
    const norm = ((raw - minRaw) / (maxRaw - minRaw)) * 100;
    normalized[scale.id] = Math.round(norm);
  });

  // Assign to profile using nearest-prototype if profiles exist
  let assignedProfile: ProfileDefinition | null = null;
  if (blueprint.profiles && blueprint.profiles.length > 0) {
    assignedProfile = assignToNearestProfile(normalized, blueprint.profiles);
  }

  // Result labeling: use profile name if assigned, otherwise fall back to top-2 method
  let resultLabel = "";
  if (assignedProfile) {
    resultLabel = assignedProfile.name;
  } else {
    // Legacy top-2 labeling
    const sortedTraits = Object.entries(normalized)
      .sort(([, a], [, b]) => Math.abs(b - 50) - Math.abs(a - 50))
      .slice(0, 2);

    const labels = sortedTraits.map(([id, score]) => {
      const scale = blueprint.scales.find((s) => s.id === id);
      if (!scale) return "";
      return score >= 50
        ? blueprint.resultLabeling.labelsByScaleHigh[id as keyof typeof blueprint.resultLabeling.labelsByScaleHigh]
        : blueprint.resultLabeling.labelsByScaleLow[id as keyof typeof blueprint.resultLabeling.labelsByScaleLow];
    });

    resultLabel = labels.join(" ");
  }

  return {
    scores: normalized,
    resultLabel,
    profileId: assignedProfile?.id || null,
    profileName: assignedProfile?.name || null,
  };
}

