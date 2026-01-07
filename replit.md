# Poker Ledger - Game Settlement & Player Tracker

## Overview

A mobile-first web application for tracking poker games, buy-ins, and settlements. The app maintains a persistent ledger of each player's total winnings and losses across all games. Built with a React frontend and Express backend, using PostgreSQL for data persistence.

Core functionality includes:
- Active game management with player buy-ins and settlements
- Player ledger tracking cumulative balances across all games
- Game history with detailed settlement records
- Settlement calculation between players at game end

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter (lightweight client-side router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite with hot module replacement

The frontend follows a page-based structure with reusable components. Pages are located in `client/src/pages/` and shared components in `client/src/components/`. The design system prioritizes mobile-first workflow with generous touch targets (48px minimum) and clear financial data presentation.

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Pattern**: RESTful JSON API under `/api/*` routes
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Validation**: Zod with drizzle-zod integration

The server uses a storage abstraction layer (`server/storage.ts`) implementing the `IStorage` interface, which wraps all database operations. This pattern allows for potential storage backend changes without modifying route handlers.

### Data Model
Four main entities:
1. **Players** - Persistent player records with cumulative balance and games played count
2. **Games** - Individual poker sessions with status (active/settling/completed)
3. **GamePlayers** - Junction table linking players to games with buy-in counts and results
4. **Settlements** - Calculated payment records between players at game end

### API Structure
- `GET/POST /api/players` - Player management
- `GET/POST /api/games` - Game management
- `GET /api/games/active` - Current active game
- `POST /api/games/:id/complete` - Complete game with final amounts
- `GET/POST/DELETE /api/game-players` - Game participant management
- `GET /api/settlements` - Settlement records

### Build System
- Development: Vite dev server with HMR proxied through Express
- Production: Vite builds static assets to `dist/public`, esbuild bundles server to `dist/index.cjs`
- Database migrations: Drizzle Kit with `db:push` command

## External Dependencies

### Database
- **PostgreSQL** - Primary data store, connection via `DATABASE_URL` environment variable
- **Drizzle ORM** - Database operations and schema management
- **connect-pg-simple** - PostgreSQL session store (available but sessions not currently implemented)

### Frontend Libraries
- **@tanstack/react-query** - Server state management and caching
- **date-fns** - Date formatting and manipulation
- **Radix UI** - Headless UI primitives (dialog, dropdown, tabs, etc.)
- **Lucide React** - Icon library

### Development Tools
- **Vite** - Frontend build tool and dev server
- **esbuild** - Server bundling for production
- **TypeScript** - Type checking across the full stack
- **Tailwind CSS** - Utility-first styling

### Replit-Specific
- `@replit/vite-plugin-runtime-error-modal` - Error overlay in development
- `@replit/vite-plugin-cartographer` - Development tooling
- `@replit/vite-plugin-dev-banner` - Development environment indicator