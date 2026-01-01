import { ImageResponse } from "next/og";
import prisma from "@/lib/prisma";

export const runtime = "edge";
export const alt = "Your Personality Profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage({ params }: { params: { attemptId: string } }) {
  const attempt = await prisma.attempt.findUnique({
    where: { id: params.attemptId },
    include: {
      test: true,
      profile: true,
    },
  });

  if (!attempt || !attempt.scoresJson) {
    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0f766e",
            color: "white",
            fontSize: 48,
            fontWeight: 700,
          }}
        >
          ProfileQuiz
        </div>
      ),
      { ...size }
    );
  }

  const scores = JSON.parse(attempt.scoresJson);
  const profileName = attempt.profile?.name || attempt.resultLabel || "Your Profile";
  const profileHook = attempt.profile?.oneLineHook || "";

  // Create score bars
  const traitNames = ["C", "E", "A", "N", "O"];
  const traitLabels: Record<string, string> = {
    C: "Conscientiousness",
    E: "Extraversion",
    A: "Agreeableness",
    N: "Neuroticism",
    O: "Openness",
  };

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0f766e",
          color: "white",
          padding: 60,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 40,
          }}
        >
          <div style={{ fontSize: 24, opacity: 0.8, letterSpacing: "0.2em" }}>
            PROFILEQUIZ
          </div>
          <div style={{ fontSize: 20, opacity: 0.6 }}>
            {attempt.test.title}
          </div>
        </div>

        {/* Main Content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 28,
              opacity: 0.7,
              marginBottom: 16,
              letterSpacing: "0.15em",
            }}
          >
            I AM
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              marginBottom: 24,
              lineHeight: 1.1,
            }}
          >
            {profileName}
          </div>
          {profileHook && (
            <div
              style={{
                fontSize: 28,
                opacity: 0.85,
                maxWidth: 800,
                lineHeight: 1.4,
              }}
            >
              {profileHook}
            </div>
          )}
        </div>

        {/* Trait Bars */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 24,
            marginTop: 40,
          }}
        >
          {traitNames.map((trait) => (
            <div
              key={trait}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div style={{ fontSize: 14, opacity: 0.7 }}>
                {traitLabels[trait]}
              </div>
              <div
                style={{
                  width: 80,
                  height: 8,
                  backgroundColor: "rgba(255,255,255,0.2)",
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${scores[trait] || 50}%`,
                    height: "100%",
                    backgroundColor: "#fbbf24",
                    borderRadius: 4,
                  }}
                />
              </div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>
                {scores[trait] || 50}%
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}

