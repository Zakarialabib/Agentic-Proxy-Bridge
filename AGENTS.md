# Agent Coding Guidelines

## Project Architecture

This is a **Next.js frontend + Bun proxy bridge** architecture:

- **Frontend (port 3000)**: Next.js 16 webapp with React, Tailwind CSS, shadcn/ui
- **Proxy Bridge (port 3001)**: Bun server that wraps LM Studio with OpenAI-compatible API
- **LM Studio (port 1234)**: Local LLM runtime (must be running with models downloaded)

**Key flow**: Webapp → Proxy Bridge (3001) → LM Studio (1234)

## Build/Lint/Test Commands

```bash
# Prerequisites
# 1. Start LM Studio and download/load models (runs on port 1234)
# 2. Run proxy bridge (port 3001)
# 3. Run webapp (port 3000)

# Development - run each in separate terminal:
# Terminal 1: Start LM Studio first (download models via LM Studio UI)
# Terminal 2: Start proxy bridge
cd mini-services/proxy-bridge && bun run dev   # or: bun --hot index.ts

# Terminal 3: Start webapp
npm run dev                    # Starts on http://localhost:3000

# Build (includes TypeScript validation)
npm run build                  # Build Next.js for production

# Database (Prisma) - requires .env with DATABASE_URL
npm run db:generate           # Generate Prisma client
npm run db:push              # Push schema changes to SQLite DB

# Linting & Type Checking
npx eslint "src/**/*.{ts,tsx}" --max-warnings=100  # Run ESLint
npm run build                  # Also runs TypeScript validation (excludes examples/, mini-services/)
```

**Environment Variables Required:**
```bash
# .env file (create if missing)
DATABASE_URL="file:./dev.db"
```

**Note:** This project does not currently have a test framework configured.

## Code Style Guidelines

### TypeScript
- Use explicit types for function parameters and return values when not obvious
- Prefer `interface` over `type` for object shapes (see codebase convention)
- Use `any` sparingly - ESLint rule is set to warn only, not error
- Enable `strict: true` (already set in tsconfig.json)

### React Components
- Default to Server Components; add `'use client'` directive only when needed (hooks, browser APIs, event handlers)
- Use functional components with explicit return types for complex components
- Props interfaces defined above the component or inline for simple cases

### File Structure
```
src/
├── app/                      # Next.js App Router pages and API routes
│   ├── api/                  # API route handlers
│   ├── page.tsx              # Page components
│   └── layout.tsx            # Root layout
├── components/
│   ├── ui/                   # shadcn/ui components
│   └── *.tsx                 # Feature components
├── hooks/                    # Custom React hooks
└── lib/                     # Utilities, database client, helpers
```

### Naming Conventions
- **Files:** kebab-case for components (`model-card.tsx`), camelCase for utilities (`use-toast.ts`)
- **Components:** PascalCase (`Button`, `ModelCard`)
- **Functions:** camelCase (`fetchModels`, `handleSubmit`)
- **Interfaces:** PascalCase with descriptive names (`interface ProxyStatus`)
- **Variables:** camelCase; use `snake_case` for API response fields (they come from the proxy bridge)

### Imports
```typescript
// Order: React → External libraries → Internal imports
import * as React from "react"
import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
```

### Tailwind CSS
- Use shadcn/ui CSS variable pattern: `bg-primary`, `text-primary-foreground`
- Use `cn()` utility from `@/lib/utils` to merge Tailwind classes
- Avoid arbitrary values; use the design system's spacing/color scale

### UI Components (shadcn/ui)
- Use the "new-york" style variant (configured in components.json)
- Import from `@/components/ui/` for base components
- Use `className` prop for custom styling
- Button variants: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`

### State Management
- Prefer React hooks (`useState`, `useCallback`, `useEffect`)
- Use `useCallback` for functions passed to child components or used in effects
- Complex state may warrant a custom hook in `src/hooks/`

### Error Handling
- Use try/catch for async operations (fetch calls)
- Log errors with `console.error()` and provide user-friendly fallback UI
- API errors should display meaningful messages to users

### API Routes
- Use Next.js App Router route handlers (`route.ts`)
- Handle both success and error cases; return appropriate HTTP status codes
- Parse JSON request bodies with `await request.json()`
- Use `NextResponse` for responses

### Database (Prisma)
- Use Prisma Client for SQLite database
- Import from `@/lib/db` (configured singleton pattern)
- Run `npm run db:generate` after schema changes

### Form Handling
- Use `react-hook-form` with `zod` resolver for validation
- Define schemas with `zod` v4 syntax

### Code Patterns

**Fetching data:**
```typescript
const fetchData = useCallback(async () => {
  try {
    const res = await fetch(`/api/endpoint`)
    if (res.ok) {
      const data = await res.json()
      setState(data)
    }
  } catch (error) {
    console.error('Failed to fetch:', error)
  }
}, [])
```

**Client component:**
```typescript
'use client'

import { useState } from 'react'

export function ClientComponent({ initialData }: { initialData: unknown }) {
  const [data, setData] = useState(initialData)
  // ...
}
```

### ESLint Configuration
- Uses flat config (`eslint.config.mjs`)
- Key disabled rules: `no-explicit-any`, `no-unused-vars`, `prefer-const`, `react-hooks/exhaustive-deps`
- React strict mode is disabled in Next.js config

### Path Aliases
- `@/*` maps to `./src/*` (configured in tsconfig.json)
- Use absolute imports via `@/` prefix

## Key Dependencies
- Next.js 16 with App Router
- React 19
- Tailwind CSS v4
- shadcn/ui (new-york style)
- Prisma (SQLite)
- Zod v4 for validation
- Zustand (state management)
- TanStack Query (server state)
- next-auth (authentication)
