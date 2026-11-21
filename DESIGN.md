# CivicResolve: Design System and Interface Specification

## 1. Brand and Product Identity

CivicResolve is a restrained, civic-editorial platform for municipal issue intake, dispatch, and public resolution tracking. Inspired by the quiet functional discipline of Notion, the warm typographic hierarchy of Granola, and the operational clarity of Linear.

### The Design Read
The design read: CivicResolve looks like an archival public broadsheet digitized into a modern civic utility. It feels calm, official, and grounded, with warm canvas surfaces (#F6F5F0), crisp borders (#E6E4DC), deep charcoal text (#242522), and a quiet warm espresso accent (#765448).

### Anti-Slop Dial Calibration
- ENERGY: 1 (Quiet, intellectual, authoritative, no neon gimmicks or fluorescent cards)
- RHYTHM: 2 (Structured, typographic cadence, subtle horizontal hair lines)
- MOTION: 1 (Restrained, micro-interactions strictly under 150ms, respects prefers-reduced-motion)

---

## 2. Color Palette and Semantic Tokens

| Token Name | Hex Code | Role / Usage | WCAG Ratio vs Canvas (#F6F5F0) |
|---|---|---|---|
| canvas | #F6F5F0 | Warm stone/paper canvas | Base |
| surface | #FFFFFF | Elevated card surface, inputs | 1.05:1 (1px border defined) |
| surface-subtle | #EFECE6 | Subtle section fills, table row alternation | 1.08:1 |
| ink-primary | #242522 | Deep charcoal body text and headers | 12.53:1 (AAA) |
| ink-secondary | #706F68 | Warm muted gray for labels, timestamps, metadata | 4.62:1 (AA) |
| ink-muted | #9C9A91 | Quiet captions, tertiary annotations | 3.1:1 (large/non-text) |
| border | #E6E4DC | Subtle hairline borders and section dividers | 1.25:1 against white |
| accent | #765448 | Primary action buttons and subtle interactive focus | 6.14:1 (AA text) / 6.70:1 (white on button) |
| P1 Critical | #8A2222 on #FBEBEB | Emergency road/water hazards | 7.80:1 (AAA) |
| P2 High | #914811 on #FDF2E9 | Major arterial disruptions | 6.07:1 (AA) |
| P3 Medium | #7A5B0B on #FEF9E7 | Neighborhood repairs | 5.98:1 (AA) |
| P4 Low | #306B48 on #EDF6F0 | Minor maintenance | 5.73:1 (AA) |

---

## 3. Typography System

- Headings: Instrument Serif, Georgia, serif.
- Interface & Body: Lato, system-ui, -apple-system, sans-serif.
- Telemetry & Identifiers: SFMono-Regular, Consolas, Menlo, monospace.

---

## 4. Layout and Navigation Principles

- Header: Minimal, restrained. Wordmark on left, text links on right, no implementation telemetry in public view.
- Dashboard: Compact editorial introduction. Prioritizes the actual civic report list without giant promotional heroes.
- Form: Single cohesive surface (max-w-2xl), subtle horizontal dividers, compact photo preview, clear location capture, secondary contact fields.
- Footer: Quiet single-line public service statement.
