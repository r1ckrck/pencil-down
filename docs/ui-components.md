# UI components and layout contract

Design rules live in `spec.md` §4. This file is how to use what exists. Gallery of every component and state: `/dev/gallery`.

## Routes and shells

| Path | Use |
|---|---|
| `app/src/app/layout.tsx` | Root: fonts, tokens, theme only |
| `app/src/app/(app)/layout.tsx` | App chrome: bottom tabs < 768 px, left rail ≥ 768 px |
| `app/src/app/(app)/page.tsx` | Today |
| `app/src/app/(exam)/` | Live sessions: no nav |

## Tokens in Tailwind

- Tailwind's default palette is disabled; only token classes exist: `bg-bg` `text-fg` `text-mute` `border-hairline` `text-accent` `bg-tint` `text-good` `text-bad` `text-on-fg`.
- Spacing base 4 px: the 8-point steps are `1 2 3 4 6 8 12 16 24` (`p-6` = 24 px). Touch: `min-h-touch`, `size-touch` (44 px).
- Type: `text-display` `text-display-sm` `text-title` `text-heading` `text-lead` `text-body` `text-small` `text-caption` `text-label` `text-timer` `text-counter`; faces `font-body` `font-mono`.
- No hex outside `app/src/styles/tokens.css`.

## Time

- `serverNow` always comes from an API response.
- `useServerNow(serverNow)`, `useCountdown({ deadline, serverNow, onExpire })`, `<CountdownText deadline serverNow accent warnBelowMs />`.
- Never call `Date.now()` during render (Cache Components blocks it at prerender).

## Components (`app/src/components/ui/`)

| Component | Notes |
|---|---|
| `Button` | primary · quiet · danger |
| `Switch`, `Toggle`, `SegmentedControl` | SegmentedControl for Easy / Hard / Custom |
| `Dialog`, `ConfirmDialog` | Radix; ConfirmDialog for Quit |
| `Panel`, `Rule` | Hairline frames and dividers |
| `Eyebrow`, `Label`, `RoleLabel` | Mono caps · body label · italic role label |
| `Stat` | The one large number per screen (General Sans semibold, `text-display` sizes) |
| `Metric` | Every other number |
| `DimensionBar budgetMs elapsedMs live concealed` | Time budget as a dimension line; `live` = accent fill; `concealed` = Hard mode |
| `QuestionPalette items={[{ n, state }]} current onSelect` + `PaletteLegend` | state: unseen · answered · skipped · marked |
| `OptionButton letter label? mode="radio|checkbox" selected onSelect review?` inside `OptionGroup` | `label`: printed label shown instead of the letter, e.g. "1" for A |
| `NumericKeypad value onValueChange captureKeyboard unit` | Also exports `applyKey` |
| `TapCounter` | Part B idea counter |
| `CheckRow value: boolean \| null` | Commit-screen checks |
| `Figure svg label` | Trusted generator SVG; `.mute` and `.soft` classes themed |

Shell (`app/src/components/shell/`): app shell, exam shell, nav, page header, `ThemeControl` (Settings only), theme script.
