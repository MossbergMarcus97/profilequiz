import { TestBlueprint, ProfileDefinition } from "../lib/schemas/blueprint";

// ─────────────────────────────────────────────────────────────────────────────
// 16 Archetype Profiles for Big Five
// Each profile has a prototype vector (C, E, A, N, O scores 0-100)
// Users are assigned to the nearest prototype by Euclidean distance
// ─────────────────────────────────────────────────────────────────────────────

export const bigFiveProfiles: ProfileDefinition[] = [
  {
    id: "the-architect",
    name: "The Architect",
    oneLineHook: "Strategic visionary who builds systems and sees the big picture",
    teaserBullets: [
      "Discover why your mind naturally creates frameworks",
      "Learn how to leverage your long-term thinking",
      "Unlock your strategic planning superpowers"
    ],
    shareTitle: "I'm The Architect",
    prototype: { C: 85, E: 40, A: 50, N: 35, O: 80 }
  },
  {
    id: "the-explorer",
    name: "The Explorer",
    oneLineHook: "Adventurous spirit who thrives on novelty and discovery",
    teaserBullets: [
      "Understand your drive for new experiences",
      "Learn to channel your curiosity productively",
      "Find careers that match your adventurous nature"
    ],
    shareTitle: "I'm The Explorer",
    prototype: { C: 30, E: 65, A: 55, N: 40, O: 90 }
  },
  {
    id: "the-commander",
    name: "The Commander",
    oneLineHook: "Natural leader who organizes people and drives results",
    teaserBullets: [
      "Discover your leadership strengths",
      "Learn how to inspire without overwhelming",
      "Master the balance of authority and approachability"
    ],
    shareTitle: "I'm The Commander",
    prototype: { C: 80, E: 85, A: 45, N: 30, O: 55 }
  },
  {
    id: "the-diplomat",
    name: "The Diplomat",
    oneLineHook: "Harmonizing connector who builds bridges between people",
    teaserBullets: [
      "Understand your gift for reading social dynamics",
      "Learn to set boundaries while staying warm",
      "Leverage your natural mediation abilities"
    ],
    shareTitle: "I'm The Diplomat",
    prototype: { C: 55, E: 75, A: 85, N: 45, O: 60 }
  },
  {
    id: "the-analyst",
    name: "The Analyst",
    oneLineHook: "Deep thinker who finds patterns others miss",
    teaserBullets: [
      "Discover why your mind craves understanding",
      "Learn to share insights without overwhelming",
      "Find the thinking environments that suit you"
    ],
    shareTitle: "I'm The Analyst",
    prototype: { C: 75, E: 25, A: 50, N: 40, O: 80 }
  },
  {
    id: "the-mediator",
    name: "The Mediator",
    oneLineHook: "Empathetic supporter who creates safe spaces for others",
    teaserBullets: [
      "Understand your deep capacity for empathy",
      "Learn to protect your energy while helping",
      "Find your unique way of making a difference"
    ],
    shareTitle: "I'm The Mediator",
    prototype: { C: 50, E: 30, A: 85, N: 55, O: 70 }
  },
  {
    id: "the-performer",
    name: "The Performer",
    oneLineHook: "Creative extrovert who lights up every room",
    teaserBullets: [
      "Discover how to channel your expressive energy",
      "Learn when to shine and when to share the stage",
      "Find creative outlets that fulfill you"
    ],
    shareTitle: "I'm The Performer",
    prototype: { C: 40, E: 90, A: 60, N: 45, O: 85 }
  },
  {
    id: "the-sentinel",
    name: "The Sentinel",
    oneLineHook: "Reliable guardian who protects traditions and people",
    teaserBullets: [
      "Understand your drive for stability and order",
      "Learn to embrace change when it matters",
      "Discover your role as a trusted anchor"
    ],
    shareTitle: "I'm The Sentinel",
    prototype: { C: 85, E: 50, A: 65, N: 50, O: 25 }
  },
  {
    id: "the-advocate",
    name: "The Advocate",
    oneLineHook: "Idealistic helper driven by values and vision",
    teaserBullets: [
      "Discover the causes that ignite your passion",
      "Learn to sustain your energy for the long haul",
      "Find ways to make impact without burnout"
    ],
    shareTitle: "I'm The Advocate",
    prototype: { C: 60, E: 55, A: 85, N: 55, O: 80 }
  },
  {
    id: "the-entrepreneur",
    name: "The Entrepreneur",
    oneLineHook: "Bold risk-taker who sees opportunities everywhere",
    teaserBullets: [
      "Understand your competitive drive",
      "Learn to collaborate without losing your edge",
      "Find ventures that match your ambition"
    ],
    shareTitle: "I'm The Entrepreneur",
    prototype: { C: 65, E: 85, A: 35, N: 30, O: 70 }
  },
  {
    id: "the-logician",
    name: "The Logician",
    oneLineHook: "Independent thinker who values truth over comfort",
    teaserBullets: [
      "Discover why you question everything",
      "Learn to connect without compromising logic",
      "Find intellectual communities that fit you"
    ],
    shareTitle: "I'm The Logician",
    prototype: { C: 55, E: 25, A: 30, N: 35, O: 85 }
  },
  {
    id: "the-caregiver",
    name: "The Caregiver",
    oneLineHook: "Nurturing soul who creates warmth and reliability",
    teaserBullets: [
      "Understand your gift for supporting others",
      "Learn to receive care as well as give it",
      "Find balance between service and self"
    ],
    shareTitle: "I'm The Caregiver",
    prototype: { C: 75, E: 55, A: 90, N: 50, O: 45 }
  },
  {
    id: "the-free-spirit",
    name: "The Free Spirit",
    oneLineHook: "Carefree creative who flows with life's currents",
    teaserBullets: [
      "Embrace your spontaneous nature",
      "Learn when structure actually helps you",
      "Find freedom within sustainable routines"
    ],
    shareTitle: "I'm The Free Spirit",
    prototype: { C: 20, E: 60, A: 55, N: 25, O: 85 }
  },
  {
    id: "the-protector",
    name: "The Protector",
    oneLineHook: "Vigilant guardian who anticipates and prevents problems",
    teaserBullets: [
      "Understand your heightened awareness",
      "Learn to channel worry into preparation",
      "Find peace within your protective nature"
    ],
    shareTitle: "I'm The Protector",
    prototype: { C: 70, E: 40, A: 75, N: 80, O: 45 }
  },
  {
    id: "the-realist",
    name: "The Realist",
    oneLineHook: "Grounded pragmatist who deals with what is, not what if",
    teaserBullets: [
      "Discover your practical superpowers",
      "Learn to dream without losing your edge",
      "Find success through steady execution"
    ],
    shareTitle: "I'm The Realist",
    prototype: { C: 70, E: 50, A: 50, N: 30, O: 25 }
  },
  {
    id: "the-visionary",
    name: "The Visionary",
    oneLineHook: "Inspiring dreamer who sees possibilities and rallies people",
    teaserBullets: [
      "Understand your gift for inspiration",
      "Learn to execute on your grand ideas",
      "Find partners who complement your vision"
    ],
    shareTitle: "I'm The Visionary",
    prototype: { C: 35, E: 80, A: 60, N: 40, O: 90 }
  }
];

export const bigFiveBlueprint: TestBlueprint = {
  version: "1.0",
  title: "Big Five Personality Discovery",
  intro: {
    headline: "Uncover the Architecture of Your Personality",
    subhead: "Based on the scientifically-validated Big Five model, this discovery tool reveals which of 16 personality archetypes best describes you.",
    disclaimer: "This test is for educational and self-reflection purposes. It is not a diagnostic tool or medical assessment."
  },
  scales: [
    { id: "C", name: "Conscientiousness", lowLabel: "Spontaneous", highLabel: "Planner" },
    { id: "E", name: "Extraversion", lowLabel: "Reserved", highLabel: "Social" },
    { id: "A", name: "Agreeableness", lowLabel: "Straight-shooter", highLabel: "Connector" },
    { id: "N", name: "Negative Emotionality", lowLabel: "Steady", highLabel: "Vigilant" },
    { id: "O", name: "Openness", lowLabel: "Traditional", highLabel: "Explorer" }
  ],
  questions: [
    // Conscientiousness
    { id: "q1", type: "likert", scaleId: "C", text: "I like to have a plan before I start." },
    { id: "q2", type: "likert", scaleId: "C", text: "I often put things off even when they matter.", reverse: true },
    { id: "q3", type: "likert", scaleId: "C", text: "I usually follow through on what I promise." },
    { id: "q4", type: "likert", scaleId: "C", text: "I often lose track when I have many things to do.", reverse: true },
    { id: "q23", type: "scenario", scaleId: "C", text: "You have a deadline tomorrow, and a friend invites you out tonight. What do you do most often?", options: [
      { id: "A", label: "Go out — I'll deal with it tomorrow.", score: -2 },
      { id: "B", label: "Decline — I want to finish first.", score: 2 },
      { id: "C", label: "Join briefly, then work later.", score: 1 },
      { id: "D", label: "I feel stressed and end up doing both halfway.", score: -1 }
    ]},
    { id: "q25", type: "slider", scaleId: "C", text: "How much do you plan ahead for a trip?", leftLabel: "Wing it entirely", rightLabel: "Detailed itinerary" },

    // Extraversion
    { id: "q5", type: "likert", scaleId: "E", text: "I get energized by being around people." },
    { id: "q6", type: "likert", scaleId: "E", text: "I often speak up in a group when decisions are being made." },
    { id: "q7", type: "likert", scaleId: "E", text: "I'm happy spending several days mostly on my own.", reverse: true },
    { id: "q8", type: "likert", scaleId: "E", text: "Small talk with new people feels fairly easy to me." },
    { id: "q24", type: "scenario", scaleId: "E", text: "At a get-together where you know few people, what usually happens?", options: [
      { id: "A", label: "I quickly find someone new to talk to.", score: 2 },
      { id: "B", label: "I mostly stick with the people I know.", score: 1 },
      { id: "C", label: "I end up observing more than participating.", score: -1 },
      { id: "D", label: "I leave early to recharge.", score: -2 }
    ]},
    { id: "q29", type: "ab", scaleId: "E", text: "How do you process your thoughts?", optionA: "I think out loud with others", optionB: "I think best alone", scoreA: 2, scoreB: -2 },

    // Agreeableness
    { id: "q9", type: "likert", scaleId: "A", text: "I try to understand how the other person feels, even when I disagree." },
    { id: "q10", type: "likert", scaleId: "A", text: "I can be direct in a way others experience as harsh.", reverse: true },
    { id: "q11", type: "likert", scaleId: "A", text: "I forgive quickly when someone makes an honest mistake." },
    { id: "q12", type: "likert", scaleId: "A", text: "I care more about winning arguments than finding a solution.", reverse: true },
    { id: "q27", type: "scenario", scaleId: "A", text: "A friend says something that hurts you. What do you do most often?", options: [
      { id: "A", label: "I calmly say it affected me and ask what they meant.", score: 2 },
      { id: "B", label: "I let it go and hope it improves.", score: 1 },
      { id: "C", label: "I confront it directly, without sugarcoating.", score: -1 },
      { id: "D", label: "I get sarcastic back.", score: -2 }
    ]},
    { id: "q28", type: "ab", scaleId: "A", text: "What do you value more in communication?", optionA: "Harmony matters; I look for common ground", optionB: "Honesty matters most; I say it plainly", scoreA: 2, scoreB: -2 },

    // Negative Emotionality
    { id: "q13", type: "likert", scaleId: "N", text: "I often worry about things that could go wrong." },
    { id: "q14", type: "likert", scaleId: "N", text: "Small problems can show up in my body as stress or tension." },
    { id: "q15", type: "likert", scaleId: "N", text: "I usually stay calm when something unexpected happens.", reverse: true },
    { id: "q16", type: "likert", scaleId: "N", text: "I get irritated easily when things don't go as planned." },
    { id: "q17", type: "likert", scaleId: "N", text: "I can replay a conversation in my head for a long time afterward." },
    { id: "q26", type: "slider", scaleId: "N", text: "When you receive criticism, how long does it linger?", leftLabel: "Bounces right off", rightLabel: "Replays for days" },

    // Openness
    { id: "q18", type: "likert", scaleId: "O", text: "I enjoy learning new things just because it's interesting." },
    { id: "q19", type: "likert", scaleId: "O", text: "I prefer safe, familiar solutions over new ways of doing things.", reverse: true },
    { id: "q20", type: "likert", scaleId: "O", text: "Art, culture, or ideas can make me think in new ways." },
    { id: "q21", type: "likert", scaleId: "O", text: "I get curious when I meet someone who sees the world very differently." },
    { id: "q22", type: "likert", scaleId: "O", text: "I'm most comfortable when weeks are predictable and similar.", reverse: true },
    { id: "q30", type: "ab", scaleId: "O", text: "What is your preference for trying new things?", optionA: "I try new things even if the outcome is uncertain", optionB: "I prefer what I know works", scoreA: 2, scoreB: -2 }
  ],
  scoring: {
    likertMap: { "1": -2, "2": -1, "3": 0, "4": 1, "5": 2 },
    sliderRange: { min: -2, max: 2 }
  },
  // Profiles array for archetype assignment
  profiles: bigFiveProfiles,
  // Legacy result labeling (kept for backwards compatibility, but profiles take precedence)
  resultLabeling: {
    method: "nearest-prototype",
    labelsByScaleHigh: { C: "Planner", E: "Social", A: "Connector", N: "Vigilant", O: "Explorer" },
    labelsByScaleLow: { C: "Spontaneous", E: "Reserved", A: "Straight-shooter", N: "Steady", O: "Traditional" }
  },
  paywall: {
    priceLabel: "$3.00",
    bullets: [
      "Deep dive into your unique archetype",
      "Personalized strengths and growth areas",
      "Actionable advice for work, relationships, and stress",
      "Professional PDF report for your records"
    ]
  },
  reportTemplate: {
    sections: [
      { id: "overview", title: "Your Personality Landscape", instruction: "Summarize the overall personality profile based on archetype and trait scores." },
      { id: "work", title: "Professional Performance", instruction: "Discuss how their archetype influences work-life and leadership." },
      { id: "relationships", title: "Interpersonal Dynamics", instruction: "Explain their communication and relationship style based on archetype." },
      { id: "growth", title: "Actionable Growth", instruction: "Provide 3 specific tips for personal development tailored to archetype." }
    ]
  }
};

