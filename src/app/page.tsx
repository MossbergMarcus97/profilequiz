import Link from "next/link";
import prisma from "@/lib/prisma";

// Archetype-themed colors for test cards
const cardThemes = [
  { bg: "from-teal-500 to-cyan-600", accent: "bg-cyan-400" },
  { bg: "from-purple-500 to-indigo-600", accent: "bg-indigo-400" },
  { bg: "from-amber-500 to-orange-600", accent: "bg-orange-400" },
  { bg: "from-rose-500 to-pink-600", accent: "bg-pink-400" },
  { bg: "from-emerald-500 to-green-600", accent: "bg-green-400" },
  { bg: "from-blue-500 to-violet-600", accent: "bg-violet-400" },
];

export default async function Home() {
  // Simple query to avoid complex joins
  let tests: any[] = [];
  try {
    tests = await prisma.test.findMany({
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Database error:", error);
    // Return empty array on error, show empty state
    tests = [];
  }

  const featuredTest = tests[0];
  const otherTests = tests.slice(1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-teal-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob" />
          <div className="absolute top-40 right-10 w-72 h-72 bg-cyan-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000" />
          <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-amber-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000" />
        </div>

        <div className="max-w-7xl mx-auto px-6 py-24 md:py-32">
          <div className="text-center space-y-6 max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-100 text-teal-800 rounded-full text-sm font-semibold">
              <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
              Discover your archetypes
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold text-teal-800 tracking-tight leading-tight">
              Who are you,
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-cyan-600">
                really?
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Take our personality quizzes to discover your unique archetypes. 
              Each test reveals a different facet of who you are.
            </p>

            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <svg className="w-5 h-5 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Science-backed
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <svg className="w-5 h-5 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                AI-powered insights
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <svg className="w-5 h-5 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                5 min per quiz
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Test */}
      {featuredTest && (
        <div className="max-w-7xl mx-auto px-6 pb-16">
          <div className="relative group">
            <div className={`absolute inset-0 bg-gradient-to-r ${cardThemes[0].bg} rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity`} />
            <div className={`relative bg-gradient-to-br ${cardThemes[0].bg} rounded-3xl p-8 md:p-12 text-white overflow-hidden`}>
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
              
              <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-8">
                <div className="flex-1 space-y-4">
                  <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-sm font-semibold">
                    ⭐ Featured Quiz
                  </span>
                  <h2 className="text-3xl md:text-4xl font-serif font-bold">
                    {featuredTest.title}
                  </h2>
                  <p className="text-white/80 text-lg max-w-xl">
                    {featuredTest.description}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-white/70">
                    <span>16 archetypes</span>
                    <span>•</span>
                    <span>Psychology-backed</span>
                  </div>
                </div>
                
                <Link
                  href={`/t/${featuredTest.slug}`}
                  className="flex-shrink-0 inline-flex items-center gap-2 bg-white text-teal-700 text-xl font-bold px-8 py-4 rounded-2xl shadow-lg hover:scale-105 transition-transform active:scale-95"
                >
                  Start Quiz
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Other Tests Grid */}
      {otherTests.length > 0 && (
        <div className="max-w-7xl mx-auto px-6 pb-24">
          <h3 className="text-2xl font-serif font-bold text-slate-800 mb-8">
            More Quizzes to Explore
          </h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {otherTests.map((test, i) => {
              const theme = cardThemes[(i + 1) % cardThemes.length];
              return (
                <Link
                  key={test.id}
                  href={`/t/${test.slug}`}
                  className="group relative bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-slate-100 hover:-translate-y-1"
                >
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${theme.bg} rounded-t-2xl`} />
                  
                  <h4 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-teal-700 transition-colors">
                    {test.title}
                  </h4>
                  <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                    {test.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Unique archetypes</span>
                    <span className="flex items-center gap-1">
                      <span className={`w-2 h-2 ${theme.accent} rounded-full`} />
                      Psychology-backed
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {tests.length === 0 && (
        <div className="max-w-7xl mx-auto px-6 py-24 text-center">
          <div className="space-y-4">
            <div className="text-6xl">🧠</div>
            <h2 className="text-2xl font-bold text-slate-800">No quizzes available yet</h2>
            <p className="text-slate-600">Check back soon for personality discovery quizzes!</p>
            <Link href="/admin" className="inline-block text-teal-700 font-bold hover:underline">
              Admin Dashboard →
            </Link>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <div className="text-xl font-serif font-bold text-teal-700">ProfileQuiz</div>
              <p className="text-sm text-slate-500 mt-1">Discover your personality archetypes</p>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <Link href="/admin" className="hover:text-teal-700 transition-colors">
                Admin
              </Link>
              <span>•</span>
              <span>Powered by GPT-5.2 Pro</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
