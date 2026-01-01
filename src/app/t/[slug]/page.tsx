import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import QuizShell from "@/components/quiz/QuizShell";
import { TestBlueprintSchema } from "@/lib/schemas/blueprint";

export default async function QuizPage({ params }: { params: { slug: string } }) {
  const test = await prisma.test.findUnique({
    where: { slug: params.slug },
  });

  if (!test) {
    notFound();
  }

  const blueprint = TestBlueprintSchema.parse(JSON.parse(test.blueprintJson));

  return (
    <div className="max-w-screen-xl mx-auto">
      <QuizShell testId={test.id} blueprint={blueprint} />
    </div>
  );
}

