# DESIGN_RULES.md — Synder Design System Rules

Reference for prototype builders and the Design System Guardian skill.
Source of truth: `skills/synder-explorer/references/synder-design-tokens.css`

---

## Typography
- **Font family:** Roboto (300, 400, 500, 700) — NOT Inter, NOT system-ui
- **Base size:** 14px body text
- **Heading sizes:** H1=24px, H2=20px, H3=16px, H4=14px (500 weight)
- **Labels/captions:** 12px, weight 400
- **Line height:** 1.5 for body, 1.2 for headings

## Color
- **Primary blue:** #0053CC — buttons, links, active states
- **Primary hover:** #0047B3
- **Primary light (bg):** #E8F0FC — selected row backgrounds, highlight tints
- **Text primary:** #1A1A2E (near-black)
- **Text secondary:** #6B7280
- **Text disabled:** #9CA3AF
- **Border default:** #E5E7EB
- **Border focus:** #0053CC
- **Background page:** #F9FAFB
- **Background card:** #FFFFFF
- **Error red:** #DC2626
- **Warning amber:** #D97706
- **Success green:** #16A34A
- **Marketing palette:** DIFFERENT — Poppins + different blues. Never mix with app palette.

## Spacing (8px grid — strict)
- 4px — tight internal padding (icon gaps, chip padding)
- 8px — small gaps (between label and input, between list items)
- 16px — standard padding (card padding, section spacing)
- 24px — medium sections
- 32px — large section gaps
- 48px — page-level spacing

## Components
- **Buttons:** height 36px (default), 28px (small). Border-radius 4px. No border-radius > 4px for action buttons.
- **Inputs:** height 36px. Border 1px #E5E7EB. Border-radius 4px. Focus: border #0053CC + box-shadow 0 0 0 2px rgba(0,83,204,0.2)
- **Tables:** row height 48px. Header: 12px uppercase 500 weight, #6B7280. Hover row: #F9FAFB. Selected row: #E8F0FC.
- **Chips/badges:** height 20px. Border-radius 10px. Font 12px 500.
- **Sidesheets:** width 480px (default), 600px (wide). Slide in from right. Overlay backdrop #000 at 40% opacity.
- **Modals:** max-width 560px (default), 720px (wide). Border-radius 8px. Drop shadow.
- **Toasts:** bottom-right, 320px wide, auto-dismiss 5s.

## Interaction rules
- **Loading states:** use skeleton screens (gray animated bars), NOT spinners for page-level loads. Spinners OK for button-level actions.
- **Empty states:** always include an icon + heading + subtext + CTA. Never just blank space.
- **Error states inline:** show error below the field, 12px red text, icon optional.
- **Destructive actions:** always require a confirmation modal. Button label must say exactly what will happen ("Delete 3 transactions" not "Confirm").
- **Undo:** offer undo for any bulk action affecting >1 item. Toast with undo link, 8s timeout.

## Forbidden patterns
- ❌ No tooltips as the only source of important information
- ❌ No confirmation modals with "Are you sure?" — must describe the action
- ❌ No disabled buttons without explanation (use tooltip or helper text to explain why)
- ❌ No placeholder text as a substitute for labels
- ❌ No more than 2 primary (blue filled) buttons visible at once
- ❌ No full-page spinners for operations < 3s
- ❌ No inline forms that expand without animating — always use transition
- ❌ No Marketing site fonts/colors (Poppins, marketing blues) in app UI

## Enterprise UX philosophy
- **Density:** Synder is a professional tool. Use compact spacing, not consumer-app breathing room.
- **Predictability:** same action = same result everywhere. No surprises.
- **Reversibility:** always give an escape hatch. Back, cancel, undo.
- **Data first:** don't hide data behind progressive disclosure unless the data is genuinely optional.
- **Trust:** financial tools require explicit confirmation for irreversible actions. Always.
