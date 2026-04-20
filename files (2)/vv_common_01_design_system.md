VIVAVAULT — COMMON DESIGN SYSTEM AND SHARED COMPONENTS REDESIGN
File: COMMON-01 — Design Foundation, Navbar, Shared Components

This prompt must be applied before any page-specific redesign. Every page shares these foundations. Apply this first.

---

CURRENT PROBLEMS IDENTIFIED FROM SCREENSHOTS

The desktop navbar is overloaded and visually noisy. It contains Home, Dashboard, Study OS, Notes OS, Resources, Admin, Focus, Desktop App, theme toggle, fullscreen, notifications, a sync status badge, and a user avatar — all in one horizontal bar. This is too much information competing for attention. The sync status badge "Synced 8m ago" uses a green chip with a circular refresh icon that feels like a system status indicator from an enterprise tool, not a premium student app. The "Desktop App" link in the navbar makes no sense as a navigation item — it is an action, not a destination. The Focus link in the navbar is redundant with Focus being accessible from Study OS. The overall navbar spacing is uneven and the items have inconsistent visual weight.

The mobile layout shows a hamburger menu on the left and basic icons on the right, but the hamburger suggests a hidden sidebar that does not exist in a meaningful way — on mobile, navigation should be through the bottom bar, not a slide-out. The current mobile pages show inconsistent header treatments across pages.

---

DESKTOP NAVBAR — COMPLETE REDESIGN

Remove the current navbar entirely and replace it with this new design.

The new desktop navbar is 56 pixels tall, white background, with a very subtle 1 pixel bottom border in the lightest gray color. It has three zones: left, center, and right.

Left zone: the VivaVault V logo mark (a purple rounded square with a white V, 28 pixels) followed by the text VivaVault in 16 pixels bold using the brand font. Clicking this always returns to the home page. This logo-wordmark pair is 140 pixels wide and sits flush left with 20 pixels left padding.

Center zone: six navigation items arranged in a horizontal pill-style tab group centered in the navbar. The six items are: Home, Dashboard, Study, Notes, Library, Admin. Each item is 80 pixels wide, 36 pixels tall. The active item has a light purple background (primary-100 color) and the text in the primary purple color. Inactive items have no background and use the text-secondary color. On hover: a very light gray background appears (not the purple, just a barely-visible gray). The items should not have borders or underlines. They should feel like a calm pill toggle group, not a tabbed navigation. Admin is only visible to admin users. If Admin is not visible, the remaining items distribute across the center.

Right zone: from right to left — user avatar (32 pixels circle, tappable to open profile dropdown), then notification bell (24 pixels icon, with a red dot badge if unread), then theme toggle (sun or moon icon, 24 pixels), then a sync indicator. The sync indicator is not a green chip. Replace it with a very small gray text label that simply says "Saved" when synced, with a tiny checkmark icon before it, in 12 pixels gray. When syncing, it says "Saving..." with a subtle spinning indicator. This takes up much less space and feels less alarming. Remove the Desktop App link from the navbar entirely — if there is a desktop app download, it belongs in settings or the user profile dropdown, not in the primary navigation. Remove the Focus link from the navbar — Focus is accessed from Study OS, not from the top nav. Remove the fullscreen icon from the navbar — fullscreen is a keyboard shortcut (F11) or accessed from within a specific module.

The result is a clean, calm navbar with only what is needed.

---

DESKTOP NAVBAR USER PROFILE DROPDOWN

When the user clicks their avatar, a dropdown appears below the avatar with these options: Profile, Settings, Download Desktop App, Keyboard Shortcuts, What's New, Sign Out. Each option is 40 pixels tall with an icon and label. A divider separates Sign Out from the others. The dropdown is 220 pixels wide with 8 pixel radius and a subtle shadow.

---

MOBILE HEADER — REDESIGN FOR ALL PAGES

On mobile screens below 768 pixels, the header is completely different from desktop. There is no hamburger menu visible as a primary navigation element since the bottom bar handles navigation.

The mobile header is 56 pixels tall with the VivaVault logo mark and wordmark on the left, and on the right: theme toggle icon and notification bell icon only. No hamburger menu. No extra links. No sync badge.

For module-specific pages (Study, Notes, Library), the header changes context: the left side shows a back chevron (only when deep in a subpage) or the module name in 17 pixels semibold, and the right shows relevant module actions (described per page prompt).

---

BOTTOM NAVIGATION BAR — MOBILE ONLY

The bottom navigation bar is 64 pixels tall, white background, no blur, no glass effect, solid white. A 1 pixel top border in the lightest gray. It contains six items: Home, Dash, Study, Notes, Library, Me. The center position (between Study and Notes visually) has the universal FAB (floating action button) that rises 8 pixels above the bar level as a purple circle of 52 pixels diameter with a white plus icon. The FAB has a shadow.

Each nav item: 24 pixel icon, 10 pixel label below in the same color. Active: primary purple color with a 3-pixel wide, 24-pixel long, rounded purple indicator pill sitting 4 pixels above the icon. Inactive: medium gray. The indicator sits above the icon, not below.

Safe area: the bottom bar has extra padding below equal to env(safe-area-inset-bottom) to handle gesture navigation bars on Android and home indicators on iOS.

---

CARD COMPONENT STANDARDIZATION

All cards throughout the app must follow this one standard. A card has: white background, 1 pixel border in the standard border color (a very light gray), 12 pixel border radius, a shadow of 0 1px 3px rgba(0,0,0,0.06) and 0 1px 2px rgba(0,0,0,0.04), and 16 pixels internal padding. On hover, the shadow deepens slightly: 0 4px 12px rgba(0,0,0,0.08). On mobile, cards have no hover state (hover states do not apply on touch screens). Cards never have a visible colored border except for semantic states (error = red border, success = green border).

No card should have a second card visually nested inside it with its own visible border. If a card has sections, use a faint 1 pixel internal divider line instead of a nested bordered box.

---

BUTTON STANDARDIZATION

Primary button: primary purple background, white text, 10 pixel radius, 44 pixels tall on mobile (40 pixels on desktop), with 16 pixels horizontal padding minimum. Text is 14 pixels semibold. Has the primary shadow on hover. On press: scale 0.97 for 100 milliseconds. Disabled: 50% opacity, no pointer events.

Secondary button: white background, primary purple text, 1 pixel primary purple border, same sizing. On hover: light purple background fill.

Destructive button: white background, red text, 1 pixel red border. On hover: light red background. Never show a red filled button except for the final confirmation of a truly destructive action.

Ghost button: no background, no border, primary purple text. Used for tertiary actions.

Icon button: 40 by 40 pixels touch target (44 by 44 on mobile), centered icon, no visible background, a subtle background appears on hover.

---

FORM INPUT STANDARDIZATION

All text inputs: light gray background (surface-input color), 1 pixel border in the standard border color, 10 pixel radius, 44 pixels tall on mobile, 40 pixels on desktop, 14 pixels text, 12 pixels left and right padding. On focus: border changes to the primary purple color, no box shadow. Label sits above the input in 13 pixels semibold with 6 pixels gap below the label. Error state: red border, red helper text below in 12 pixels. Success state: green border.

Search inputs: same as text inputs but with a search magnifier icon (18 pixels) on the left inside the input with 12 pixels left padding, and the placeholder text following the icon.

Dropdowns: same styling as text inputs. The chevron icon appears on the right inside at 14 pixels. Clicking opens a floating dropdown panel (not a native select element) with 8 pixel radius and shadow.

---

EMPTY STATE STANDARDIZATION

All empty states follow this format: a centered illustration or icon (SVG or image, 80 to 120 pixels), a heading in 18 pixels semibold (concise, 3 to 5 words), a description in 14 pixels gray (one to two sentences explaining why it's empty and what to do), and a primary CTA button if applicable. The empty state sits in the vertical and horizontal center of its container. The tone is friendly and encouraging, never clinical.

---

LOADING STATE STANDARDIZATION

Use skeleton screens everywhere. Never use a spinner overlay that blocks content. Each skeleton element matches the approximate size of the content it represents. Skeletons use a light gray background with a shimmer animation (a gradient sweep from left to right, 1.5 second loop). For text: use gray rounded rectangles of varying widths (60% to 90% of expected content width). For images or thumbnails: gray squares or rectangles with the correct aspect ratio. Skeletons fade out and content fades in when data loads, not a sudden swap.

---

TOAST NOTIFICATION STANDARDIZATION

Toasts appear at the bottom right of the screen on desktop, bottom center on mobile. Each toast is 48 to 56 pixels tall, white background, 10 pixel radius, shadow. Left border is 4 pixels wide in the semantic color. Icon on the left (16 pixels), message text in 14 pixels, optional action link, and an X dismiss button. Auto-dismiss after 4 seconds with a thin depleting progress bar visible at the bottom of the toast. Slide in from below on appear, slide out to the right on dismiss. Stack multiple toasts with 8 pixels gap between them, maximum 3 at once.

---

TYPOGRAPHY HIERARCHY

Page titles (largest headings): 28 pixels bold on desktop, 22 pixels bold on mobile.
Section headers: 18 pixels semibold on desktop, 16 pixels semibold on mobile.
Card titles: 15 pixels semibold.
Body text: 14 pixels regular, line height 1.5.
Secondary text (descriptions, metadata): 13 pixels, text-secondary color.
Captions and timestamps: 12 pixels, text-muted color.
Labels above inputs: 13 pixels semibold.
Navigation items (desktop center nav): 14 pixels medium.
Navigation items (mobile bottom bar): 10 pixels regular.

Do not use any other sizes. All text in the app must map to one of these sizes.

---

COLOR USAGE RULES

Primary purple is used for: active navigation states, primary buttons, progress bars, active tab indicators, interactive links, focus rings, selected states.

Primary purple must NOT be used for: page backgrounds, card backgrounds, decorative purposes, large text blocks, or anywhere it creates visual noise.

Gray is used for: inactive navigation, secondary text, borders, input backgrounds, skeleton loaders, disabled states.

Green is used for: success states, completed checkboxes, positive progress indicators.

Red is used for: error states, destructive action warnings, delete buttons.

Amber is used for: warning states, items needing attention.

White is the primary surface color for all cards and panels.

The page background is the very slightly purple-tinted gray (approximately #F8F8FC).

---

SPACING RULES

All horizontal page padding on desktop: 24 pixels minimum from the page edge to the nearest card or content.
All horizontal page padding on mobile: 16 pixels.
Gap between cards in a grid: 16 pixels on desktop, 12 pixels on mobile.
Gap between sections on a page: 32 pixels on desktop, 24 pixels on mobile.
Internal card padding: 16 to 20 pixels.
Gap between label and input: 6 pixels.
Gap between form fields: 16 pixels.

No arbitrary spacing values. All spacing uses the 4-pixel base unit scale.
