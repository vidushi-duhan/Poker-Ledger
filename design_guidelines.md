# Design Guidelines: Poker Game Settlement & Player Ledger App

## Design Approach

**Selected Approach**: Design System with Productivity Focus

Drawing inspiration from Linear and Notion for clean data presentation, with Material Design principles for mobile touch interactions. This utility-focused app prioritizes clarity, efficiency, and easy financial data comprehension.

**Core Principles**:
- Mobile-first workflow optimization
- Instant data legibility for financial information
- Minimal cognitive load during active games
- Clear visual distinction between positive/negative values
- Generous touch targets for error-free input

---

## Typography System

**Font Family**: Inter (via Google Fonts CDN)

**Hierarchy**:
- Page Titles: text-2xl font-semibold (24px)
- Section Headers: text-lg font-medium (18px)
- Primary Data (amounts, player names): text-base font-medium (16px)
- Secondary Info (timestamps, labels): text-sm font-normal (14px)
- Financial Figures (settlements): text-xl font-semibold (20px)
- Small Labels: text-xs font-medium (12px)

**Special Treatment**:
- Positive amounts: font-semibold with "+" prefix
- Negative amounts: font-semibold with "-" prefix
- Currency symbol: Always visible, slightly muted (opacity-70)

---

## Layout System

**Spacing Primitives**: Tailwind units of 3, 4, 6, and 8
- Component padding: p-4
- Section spacing: space-y-6
- Card internal spacing: p-6
- List item spacing: py-3
- Touch target minimum: h-12 (48px minimum)

**Container Strategy**:
- Max width: max-w-2xl mx-auto (optimal for mobile and tablet)
- Page padding: px-4
- Safe area: pb-20 for bottom navigation clearance

**Grid Layouts**:
- Player lists: Single column stack
- Settlement calculations: Two-column grid (payer → receiver)
- Game history cards: Single column with full details

---

## Component Library

### Navigation
**Bottom Navigation Bar** (fixed, always visible):
- 4 items: Active Game, Ledger, History, New Game
- Icons with labels
- Active state: Bold icon + text
- Height: h-16 with safe area padding

### Cards & Containers
**Game Session Card**:
- Rounded corners: rounded-lg
- Shadow: shadow-md
- Padding: p-6
- Border on active game: border-2

**Player Row**:
- Full width, touch-friendly: min-h-12
- Flex layout: justify-between items-center
- Dividers between rows: border-b last:border-0

**Settlement Display**:
- Two-column layout: Grid with arrow between
- From player (left) → To player (right)
- Amount prominently displayed: text-xl
- Arrow icon: → (using Heroicons)

### Forms & Inputs
**Number Inputs** (for amounts/buy-ins):
- Large size: h-12 text-lg
- Numeric keyboard triggered on mobile
- Right-aligned text for numbers
- Clear visual focus state

**Player Name Input**:
- Autocomplete from existing players
- Dropdown suggestion list
- Add new player inline option

**Action Buttons**:
- Primary CTA: w-full h-12 rounded-lg font-medium
- Secondary: outlined variant
- Icon buttons: w-10 h-10 rounded-full (for buy-in increment)

### Data Display
**Player Ledger Row**:
- Player name: font-medium
- Total W/L: text-lg font-semibold, right-aligned
- Game count: text-sm muted, below name

**Buy-in Tracker**:
- Chip/token icon
- Counter badge: rounded-full px-3 py-1
- Increment button: Large + button (touch-friendly)

**Settlement Matrix**:
- Clear visual hierarchy: Who owes whom
- Amount display: Large, bold
- Status indicator: Pending/Completed (future phase)

### Lists & History
**Game History Item**:
- Date/time: text-sm at top
- Player count and total pot
- Quick stats: Winners/losers count
- Tap to expand full details
- Collapsed height: h-20, expanded: auto

### Empty States
- Large icon (96px)
- Helpful message: "No active game" / "No history yet"
- Primary action button

---

## Screen Layouts

### Active Game Screen
1. Header: Game info (date, time, total pot calculation)
2. Player list with buy-in counters (scrollable)
3. Add player button (sticky at top)
4. End game CTA (bottom, before nav)

### Settlement Screen
1. Summary card: Total pot, player count
2. Final amounts input (one row per player)
3. Calculate button (triggers settlement)
4. Settlement matrix (who pays whom)
5. Complete game button

### Player Ledger Screen
1. Search/filter bar (sticky)
2. Sorted player list (total W/L descending)
3. Tap player → detailed game history

### Game History Screen
1. Chronological list (newest first)
2. Collapsible cards
3. Filter options (date range, players)

---

## Mobile Optimizations

**Touch Targets**: Minimum 44x44px (h-12 or larger)
**Spacing**: Extra padding around interactive elements (p-4 minimum)
**Typography**: Slightly larger than desktop (minimum 16px for readability)
**Input Fields**: Large with clear labels, numeric keyboards for amounts
**Scrolling**: Generous padding at bottom (pb-24) for thumb reach
**Sticky Elements**: Bottom nav always visible, important CTAs sticky

---

## Icons
**Library**: Heroicons (via CDN) - outline style for navigation, solid for actions

**Key Icons**:
- Plus Circle: Add buy-in
- User Group: Players
- Calculator: Settlement
- Chart Bar: Ledger
- Clock: History
- Arrow Right: Settlement direction
- Check Circle: Complete game

---

## Accessibility
- All touch targets minimum 44x44px
- Clear focus indicators on all inputs
- Semantic HTML for screen readers
- ARIA labels on icon-only buttons
- Sufficient contrast for financial data
- Error states clearly communicated