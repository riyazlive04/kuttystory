# Kutty Story

Personalized AI storybook platform for the Indian market. Parents upload their child's photos, the platform generates illustrated books starring the child as the hero, printed and shipped in 3-5 business days.

## Tech Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + TailwindCSS + Framer Motion
- **Backend:** NestJS + TypeScript
- **Database:** PostgreSQL 16 + Prisma ORM
- **Queue:** Redis 7 + BullMQ
- **Storage:** Cloudflare R2
- **Auth:** Better Auth (Email + Google OAuth)
- **Payments:** Razorpay (UPI, cards, wallets)
- **Email:** Resend
- **AI:** Google Gemini (images) + Anthropic Claude (text)

## Repository Structure

```
kutty-story/
├── apps/
│   ├── web/          # Customer-facing Next.js app (port 3000)
│   ├── admin/        # Admin panel Next.js app (port 3001)
│   └── api/          # NestJS backend API (port 4000)
├── packages/
│   ├── database/     # Prisma schema + migrations + seed
│   ├── shared/       # Shared types, Zod schemas, constants
│   ├── ai/           # AI provider abstraction
│   ├── print/        # PDF generation utilities
│   └── ui/           # Shared UI components
├── infrastructure/
│   ├── nginx/        # Nginx config
│   ├── docker/       # Docker Compose for local dev
│   ├── scripts/      # Deploy, backup, provision scripts
│   └── pm2/          # PM2 ecosystem config
└── .github/workflows/ # CI/CD pipelines
```

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- PostgreSQL 16
- Redis 7

### Local Development with Docker

```bash
# Start PostgreSQL and Redis
cd infrastructure/docker
docker compose up -d

# Back to root
cd ../..

# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Seed the database
pnpm db:seed

# Start all apps in dev mode
pnpm dev
```

### Environment Variables

Copy `.env.example` to `.env` in each app directory and fill in the values.

```bash
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local
cp .env.example apps/admin/.env.local
```

## Apps

| App | URL | Description |
|-----|-----|-------------|
| Web | http://localhost:3000 | Customer-facing storefront |
| Admin | http://localhost:3001 | Admin panel for press team |
| API | http://localhost:4000 | Backend API |

## Key Features

- 6-step personalization wizard
- AI-powered illustration generation with child's likeness
- Interactive book preview with page-flip animation
- Razorpay checkout (UPI, cards, wallets)
- Customer book approval flow with fine-tuning
- Print-ready PDF generation (CMYK, 300 DPI, bleed)
- Admin order management and print queue
- Story template CMS
- Email notifications via Resend
- English + Tamil bilingual support

## License

Proprietary - All rights reserved.
