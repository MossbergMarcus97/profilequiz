# ProfileQuiz

A mobile-first personality quiz platform with archetype-based premium reports. Designed for Vercel deployment with minimal LLM costs through pre-generated profile reports.

## Key Features

- **Archetype-First Results**: Users are assigned to one of 10-20 personality archetypes, creating a collectible, shareable identity.
- **Pre-made Premium Reports**: Reports are generated once per archetype using GPT-5.2 Pro, then served instantly to all users with that profile.
- **Zero Per-User LLM Cost**: All scoring is deterministic. LLM is only used for admin batch operations.
- **Privacy-First**: User answers are never stored - only the final scores and profile assignment.
- **Instant Report Access**: Stripe session verification on the report page bypasses webhook delays.
- **Addictive Sharing**: Beautiful OG images, social share buttons, and next-quiz recommendations.

## Architecture

```
Quiz Completion Flow:
1. User answers questions (stored in React state only)
2. On finish, answers sent to /api/attempts/finish
3. Deterministic scoring computes trait scores (0-100)
4. Nearest-prototype matching assigns an archetype profile
5. Only scores + profileId stored in DB (no answers)
6. User sees results with paywall
7. After Stripe payment, user sees pre-made profile report
```

## Tech Stack

- **Next.js 14** (App Router, Server Components)
- **TypeScript**
- **Tailwind CSS**
- **Prisma** + **Supabase Postgres** (Vercel-safe)
- **OpenAI API**
  - GPT-5.2 for blueprint generation
  - GPT-5.2 Pro for premium report generation (batch/offline)
- **Stripe Checkout**

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Supabase Database

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Project Settings > Database > Connection string**
3. Copy the **Transaction** (pooled) and **Session** (direct) connection strings

### 3. Environment Variables

Create a `.env` file:

```bash
# Database (Supabase Postgres)
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# Admin Access
ADMIN_PASSWORD="your-secure-password"

# OpenAI API
OPENAI_API_KEY="sk-..."

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# App URL
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

### 4. Database Migration

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed the database with Big Five test + 16 archetypes
npx prisma db seed
```

### 5. Generate Pre-made Reports (Admin)

After deploying, log in to `/admin` and use the "Generate Reports" feature to create premium reports for each archetype. This uses GPT-5.2 Pro and only needs to be done once per test version.

### 6. Run Development Server

```bash
npm run dev
```

### 7. Access Points

- **Home**: `/` - Quiz catalog
- **Quiz**: `/t/big-five` - Take the Big Five personality test
- **Results**: `/r/[attemptId]` - View results and paywall
- **Report**: `/report/[attemptId]` - Premium report (after payment)
- **Admin**: `/admin` - Test management and report generation

## Data Model

```
Test (quiz metadata)
└── TestVersion (frozen blueprint for a cohort)
    └── Profile (archetype definition)
        └── ProfileReport (pre-made premium report HTML)

Attempt (user's quiz session)
├── scoresJson (normalized 0-100 per trait)
├── profileId (assigned archetype)
└── Purchase (Stripe transaction)
```

## Cost Analysis

| Operation | Model | Cost | When |
|-----------|-------|------|------|
| Blueprint generation | GPT-5.2 | ~$0.15 | Admin creates quiz |
| Report generation | GPT-5.2 Pro | ~$0.50 | Once per archetype |
| User quiz completion | None | $0 | Every user |
| Report access | None | $0 | Every purchase |

With 16 archetypes, total setup cost per quiz is ~$8-10. No additional LLM costs as users scale.

## Deployment (Vercel)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

The app is optimized for Vercel serverless:
- No background workers needed
- Supabase Postgres with connection pooling
- Edge-compatible OG image generation

## API Routes

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/attempts/start` | POST | Public | Start a quiz attempt |
| `/api/attempts/finish` | POST | Public | Submit answers, get profile |
| `/api/stripe/create-checkout-session` | POST | Public | Create payment session |
| `/api/stripe/webhook` | POST | Stripe | Handle payment events |
| `/api/admin/tests` | GET/POST | Admin | List/create tests |
| `/api/admin/tests/[id]` | GET/PUT/DELETE | Admin | Manage test |
| `/api/admin/generate-blueprint` | POST | Admin | Generate quiz blueprint |
| `/api/admin/generate-reports` | GET/POST | Admin | Generate archetype reports |
| `/api/admin/generate-images` | POST | Admin | Generate question images |

## License

MIT
