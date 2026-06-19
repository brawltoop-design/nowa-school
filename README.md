# nowa school

Premium AI-LMS MVP for online course creators. The project is built as a premium SaaS foundation with a clean App Router architecture, reusable design system, auth scaffolding, Prisma schema, and role-based dashboard shells for authors, students, and admins.

## Stack

- Next.js 15 + App Router
- TypeScript
- Tailwind CSS
- shadcn/ui foundation
- Prisma ORM + PostgreSQL
- NextAuth/Auth.js credentials scaffolding
- bcrypt password strategy with a JS fallback for constrained local runtimes
- zod + react-hook-form
- lucide-react
- date-fns
- framer-motion
- clsx + tailwind-merge + class-variance-authority

## Project Structure

```text
src/
  app/
    (public)/
    (auth)/
    (author)/
    (student)/
    (admin)/
  components/
    auth/
    premium/
    ui/
  lib/
  server/
prisma/
```

## Environment

1. Copy `.env.example` to `.env`.
2. Update the PostgreSQL credentials and auth secret.

```bash
cp .env.example .env
```

## Run Locally

```bash
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

## Available Scripts

- `npm run dev` starts the app.
- `npm run build` creates a production build.
- `npm run lint` runs ESLint.
- `npm run db:generate` generates the Prisma client.
- `npm run db:migrate` runs Prisma migrations in development.
- `npm run db:seed` seeds demo data.

## Seeded Demo Accounts

After running `npx prisma db seed`, you get:

- `admin@example.com` / `password123`
- `author@example.com` / `password123`
- `student@example.com` / `password123`

## Implemented MVP Foundation

- Premium landing page and public course catalogue
- Login and registration UI with validation
- Shared dashboard shell for `/author`, `/learn`, and `/admin`
- Reusable premium components and motion helpers
- Prisma schema for users, courses, modules, lessons, enrollments, and generated AI assets
- NextAuth credentials provider scaffolding and password utilities

## Notes

- The app is intentionally light on business logic for now and focuses on architecture, visual language, and launch-ready scaffolding.
- The Prisma schema targets PostgreSQL. You need a running local database before running migrations and seeding.
