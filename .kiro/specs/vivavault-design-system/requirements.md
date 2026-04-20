# Requirements Document

## Introduction

COMMON-01 is the design system foundation for the VivaVault web application — a React + TypeScript + Vite app using Tailwind CSS and shadcn/ui. This module must be implemented before any page-specific redesign because every page depends on the shared components defined here. It covers the desktop navbar, mobile header, mobile bottom navigation bar, and the standardized design tokens and component patterns for cards, buttons, form inputs, empty states, loading states, toast notifications, typography, color usage, and spacing.

The current implementation has a visually noisy desktop navbar with too many competing items, an inconsistent mobile header, and no enforced design token system across shared components. This module replaces all of that with a clean, consistent, premium-feeling foundation.

## Glossary

- **Navbar**: The fixed horizontal navigation bar rendered at the top of every desktop page.
- **MobileHeader**: The 56px fixed header rendered at the top of every mobile page (viewport < 768px).
- **BottomNav**: The fixed bottom navigation bar rendered on mobile only.
- **FAB**: Floating Action Button — the centered purple circle in the BottomNav that triggers quick actions.
- **ProfileDropdown**: The dropdown menu that opens when the user clicks their avatar in the Navbar.
- **SyncIndicator**: The small text label in the Navbar right zone showing save/sync status.
- **Card**: The standard surface container component used throughout the app.
- **PrimaryButton**: The main call-to-action button variant.
- **SecondaryButton**: The outlined button variant for secondary actions.
- **DestructiveButton**: The button variant for dangerous or irreversible actions.
- **GhostButton**: The borderless, backgroundless button variant for tertiary actions.
- **IconButton**: A square button containing only an icon.
- **FormInput**: The standard text input field component.
- **SearchInput**: A FormInput variant with a leading search icon.
- **Dropdown**: A custom-styled select component with a floating panel.
- **EmptyState**: The standardized placeholder shown when a container has no content.
- **Skeleton**: An animated placeholder element shown while content is loading.
- **Toast**: A transient notification message shown at the edge of the screen.
- **DesignToken**: A named CSS custom property representing a single design decision (color, spacing, radius, etc.).
- **Admin**: A user with the admin role, as determined by the AuthContext.
- **primary-purple**: The brand primary color used for active states, buttons, and interactive elements.
- **text-secondary**: The muted foreground color used for inactive and descriptive text.
- **text-muted**: The most subdued foreground color used for captions and timestamps.
- **safe-area-inset-bottom**: The CSS environment variable providing the device's bottom safe area height.

---

## Requirements

### Requirement 1: Desktop Navbar Structure

**User Story:** As a student, I want a clean, uncluttered desktop navigation bar, so that I can find the section I need without visual noise distracting me.

#### Acceptance Criteria

1. THE Navbar SHALL be 56px tall with a white background and a 1px bottom border in the lightest gray.
2. THE Navbar SHALL be divided into three horizontal zones: left (logo), center (nav pills), and right (actions).
3. THE Navbar SHALL be sticky at the top of the viewport on desktop (viewport ≥ 768px) and hidden on mobile.
4. THE Navbar left zone SHALL display the VivaVault logo mark (28px purple rounded square with white V) followed by the wordmark "VivaVault" in 16px bold, occupying 140px total width with 20px left padding.
5. WHEN the user clicks the logo or wordmark, THE Navbar SHALL navigate to the home page ("/").
6. THE Navbar right zone SHALL contain, from right to left: user avatar (32px circle), notification bell (24px icon with red dot badge when unread), theme toggle (24px icon), and SyncIndicator.
7. THE Navbar SHALL NOT display a "Desktop App" link, a "Focus" link, or a fullscreen toggle icon.

### Requirement 2: Desktop Navbar Center Navigation Pills

**User Story:** As a student, I want clearly labeled navigation pills in the center of the navbar, so that I can switch between the main sections of the app at a glance.

#### Acceptance Criteria

1. THE Navbar center zone SHALL display navigation items as a horizontal pill-style tab group: Home, Dashboard, Study, Notes, Library, and (conditionally) Admin.
2. WHEN the current user does not have the Admin role, THE Navbar SHALL NOT render the Admin navigation item.
3. WHEN the current user has the Admin role, THE Navbar SHALL render the Admin navigation item alongside the other five items.
4. THE Navbar SHALL render each navigation pill at 80px wide and 36px tall.
5. WHEN a navigation item matches the current route, THE Navbar SHALL apply a primary-100 purple background and primary purple text to that item.
6. WHEN a navigation item does not match the current route, THE Navbar SHALL render it with no background and text-secondary color.
7. WHEN the user hovers over an inactive navigation item, THE Navbar SHALL apply a very light gray background to that item.
8. THE Navbar navigation pills SHALL NOT have visible borders or underlines.

### Requirement 3: Desktop Navbar Sync Indicator

**User Story:** As a student, I want a subtle, non-alarming sync status indicator, so that I know my work is saved without it feeling like a system alert.

#### Acceptance Criteria

1. WHILE the app is in a synced state, THE SyncIndicator SHALL display a checkmark icon followed by the text "Saved" in 12px gray.
2. WHILE the app is actively syncing, THE SyncIndicator SHALL display a spinning indicator followed by the text "Saving..." in 12px gray.
3. THE SyncIndicator SHALL NOT use a colored chip, badge, or filled background of any kind.

### Requirement 4: Desktop Navbar Profile Dropdown

**User Story:** As a student, I want a profile dropdown accessible from my avatar, so that I can access account settings and secondary actions without cluttering the main navbar.

#### Acceptance Criteria

1. WHEN the user clicks their avatar in the Navbar right zone, THE ProfileDropdown SHALL open below the avatar.
2. THE ProfileDropdown SHALL be 220px wide with 8px border radius and a subtle drop shadow.
3. THE ProfileDropdown SHALL contain the following items in order: Profile, Settings, Download Desktop App, Keyboard Shortcuts, What's New, Sign Out.
4. THE ProfileDropdown SHALL render each item at 40px tall with a leading icon and a text label.
5. THE ProfileDropdown SHALL display a horizontal divider between "What's New" and "Sign Out".
6. WHEN the user clicks "Sign Out", THE ProfileDropdown SHALL trigger the authentication sign-out flow.

### Requirement 5: Mobile Header

**User Story:** As a student on a mobile device, I want a minimal, focused header, so that the screen space is used for content rather than navigation chrome.

#### Acceptance Criteria

1. THE MobileHeader SHALL be 56px tall and visible only on viewports narrower than 768px.
2. THE MobileHeader SHALL display the VivaVault logo mark and wordmark on the left side.
3. THE MobileHeader SHALL display only the theme toggle icon and notification bell icon on the right side.
4. THE MobileHeader SHALL NOT display a hamburger menu icon as a primary navigation element.
5. WHEN the user is on a module-specific subpage, THE MobileHeader SHALL display a back chevron on the left side in place of the logo.
6. WHEN the user is on a module-specific top-level page, THE MobileHeader SHALL display the module name in 17px semibold on the left side.

### Requirement 6: Mobile Bottom Navigation Bar

**User Story:** As a student on a mobile device, I want a persistent bottom navigation bar, so that I can switch between the main sections of the app with my thumb without reaching to the top of the screen.

#### Acceptance Criteria

1. THE BottomNav SHALL be visible only on viewports narrower than 768px.
2. THE BottomNav SHALL be 64px tall with a solid white background, no blur or glass effect, and a 1px top border in the lightest gray.
3. THE BottomNav SHALL contain six navigation items: Home, Dash, Study, Notes, Library, Me.
4. THE BottomNav SHALL render each navigation item with a 24px icon and a 10px label below it.
5. WHEN a navigation item matches the current route, THE BottomNav SHALL render the icon and label in primary purple and display a 3px wide, 24px long, rounded purple indicator pill 4px above the icon.
6. WHEN a navigation item does not match the current route, THE BottomNav SHALL render the icon and label in medium gray with no indicator pill.
7. THE BottomNav SHALL include bottom padding equal to env(safe-area-inset-bottom) to accommodate device gesture navigation areas.
8. THE BottomNav SHALL render a FAB in the center position between Study and Notes.

### Requirement 7: Mobile Bottom Navigation FAB

**User Story:** As a student on mobile, I want a prominent center action button in the bottom bar, so that I can quickly create or add content from anywhere in the app.

#### Acceptance Criteria

1. THE FAB SHALL be a 52px diameter circle with a primary purple background and a white plus icon.
2. THE FAB SHALL rise 8px above the BottomNav bar level and have a drop shadow.
3. WHEN the user taps the FAB, THE BottomNav SHALL open the quick-action sheet.
4. THE FAB SHALL NOT shift position or change size when tapped.

### Requirement 8: Card Component

**User Story:** As a student, I want all content cards to look and feel consistent, so that the app feels polished and I can focus on the content rather than inconsistent UI.

#### Acceptance Criteria

1. THE Card SHALL have a white background, a 1px border in the standard light gray border color, and 12px border radius.
2. THE Card SHALL have a default shadow of `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)`.
3. WHEN the user hovers over a Card on a non-touch device, THE Card SHALL transition to a deeper shadow of `0 4px 12px rgba(0,0,0,0.08)`.
4. THE Card SHALL have 16px internal padding.
5. THE Card SHALL NOT have a colored border except in semantic states: red border for error, green border for success.
6. THE Card SHALL NOT contain a visually nested card with its own visible border; internal sections SHALL use a faint 1px divider line instead.

### Requirement 9: Button Components

**User Story:** As a student, I want buttons to have clear, consistent visual hierarchy, so that I always know which action is primary and which is secondary.

#### Acceptance Criteria

1. THE PrimaryButton SHALL have a primary purple background, white text, 10px border radius, 40px height on desktop, 44px height on mobile, 16px minimum horizontal padding, and 14px semibold text.
2. WHEN the user hovers over a PrimaryButton, THE PrimaryButton SHALL display a primary-colored drop shadow.
3. WHEN the user presses a PrimaryButton, THE PrimaryButton SHALL scale to 0.97 over 100ms.
4. WHEN a PrimaryButton is disabled, THE PrimaryButton SHALL render at 50% opacity and ignore pointer events.
5. THE SecondaryButton SHALL have a white background, primary purple text, and a 1px primary purple border with the same sizing as PrimaryButton.
6. WHEN the user hovers over a SecondaryButton, THE SecondaryButton SHALL display a light purple background fill.
7. THE DestructiveButton SHALL have a white background, red text, and a 1px red border.
8. WHEN the user hovers over a DestructiveButton, THE DestructiveButton SHALL display a light red background fill.
9. THE GhostButton SHALL have no background and no border, with primary purple text.
10. THE IconButton SHALL have a 40x40px touch target on desktop and 44x44px on mobile, with a centered icon and no visible background at rest.
11. WHEN the user hovers over an IconButton, THE IconButton SHALL display a subtle background.

### Requirement 10: Form Input Components

**User Story:** As a student, I want form inputs to be clearly labeled and easy to interact with, so that I can fill in information quickly and understand any errors.

#### Acceptance Criteria

1. THE FormInput SHALL have a light gray background, a 1px standard border, 10px border radius, 40px height on desktop, 44px height on mobile, 14px text, and 12px horizontal padding.
2. WHEN the FormInput receives focus, THE FormInput SHALL change its border color to primary purple with no box shadow.
3. THE FormInput label SHALL be rendered above the input in 13px semibold with a 6px gap between label and input.
4. WHEN a FormInput is in an error state, THE FormInput SHALL display a red border and a red helper text message below the input in 12px.
5. WHEN a FormInput is in a success state, THE FormInput SHALL display a green border.
6. THE SearchInput SHALL render a search magnifier icon (18px) inside the left edge of the input with 12px left padding, with placeholder text following the icon.
7. THE Dropdown SHALL use the same visual styling as FormInput and SHALL display a chevron icon on the right inside edge.
8. WHEN the user clicks a Dropdown, THE Dropdown SHALL open a floating panel with 8px border radius and a drop shadow instead of using the native select element.

### Requirement 11: Empty State Component

**User Story:** As a student, I want a friendly, informative empty state when a section has no content, so that I understand why it's empty and know what to do next.

#### Acceptance Criteria

1. THE EmptyState SHALL display a centered illustration or icon between 80px and 120px in size.
2. THE EmptyState SHALL display a heading in 18px semibold containing 3 to 5 words.
3. THE EmptyState SHALL display a description in 14px text-secondary color containing one to two sentences.
4. WHERE a primary action is applicable, THE EmptyState SHALL display a PrimaryButton below the description.
5. THE EmptyState SHALL be centered both vertically and horizontally within its container.
6. THE EmptyState heading and description SHALL use friendly, encouraging language rather than clinical or technical language.

### Requirement 12: Loading Skeleton Component

**User Story:** As a student, I want skeleton placeholders while content loads, so that the app feels fast and I can see the layout before data arrives.

#### Acceptance Criteria

1. THE Skeleton SHALL use a light gray background with a shimmer animation (gradient sweep left to right, 1.5s loop).
2. THE Skeleton SHALL match the approximate dimensions of the content it represents.
3. WHEN representing text content, THE Skeleton SHALL render as a gray rounded rectangle between 60% and 90% of the expected content width.
4. WHEN representing image or thumbnail content, THE Skeleton SHALL render as a gray rectangle with the correct aspect ratio.
5. WHEN content finishes loading, THE Skeleton SHALL fade out and the content SHALL fade in.
6. THE System SHALL NOT use a spinner overlay that blocks existing content during loading.

### Requirement 13: Toast Notification Component

**User Story:** As a student, I want brief, non-intrusive notifications for app events, so that I stay informed without being interrupted.

#### Acceptance Criteria

1. THE Toast SHALL appear at the bottom-right of the screen on desktop and bottom-center on mobile.
2. THE Toast SHALL be between 48px and 56px tall with a white background, 10px border radius, and a drop shadow.
3. THE Toast SHALL display a 4px left border in the semantic color corresponding to the notification type (success = green, error = red, warning = amber, info = primary purple).
4. THE Toast SHALL display a 16px icon on the left, a 14px message, an optional action link, and an X dismiss button.
5. THE Toast SHALL auto-dismiss after 4 seconds and SHALL display a depleting progress bar at the bottom during that time.
6. WHEN a Toast appears, THE Toast SHALL slide in from below.
7. WHEN a Toast is dismissed, THE Toast SHALL slide out to the right.
8. WHEN multiple Toasts are active simultaneously, THE System SHALL stack them with 8px gaps and display a maximum of 3 at once.

### Requirement 14: Typography Scale

**User Story:** As a student, I want consistent text sizing across the app, so that the visual hierarchy is clear and the app feels professionally designed.

#### Acceptance Criteria

1. THE System SHALL define and enforce the following type scale: page titles (28px bold desktop / 22px bold mobile), section headers (18px semibold desktop / 16px semibold mobile), card titles (15px semibold), body text (14px regular, line-height 1.5), secondary text (13px text-secondary), captions and timestamps (12px text-muted), input labels (13px semibold), desktop nav items (14px medium), mobile bottom bar labels (10px regular).
2. THE System SHALL NOT use any font size outside of the defined type scale.

### Requirement 15: Color Token System

**User Story:** As a developer, I want a defined color token system, so that every component uses colors consistently and the design can be updated from a single source.

#### Acceptance Criteria

1. THE System SHALL define primary-purple as the color for active navigation states, primary buttons, progress bars, active tab indicators, interactive links, focus rings, and selected states.
2. THE System SHALL NOT apply primary-purple to page backgrounds, card backgrounds, decorative elements, or large text blocks.
3. THE System SHALL define gray tokens for inactive navigation, secondary text, borders, input backgrounds, skeleton loaders, and disabled states.
4. THE System SHALL define green tokens for success states, completed checkboxes, and positive progress indicators.
5. THE System SHALL define red tokens for error states, destructive action warnings, and delete buttons.
6. THE System SHALL define amber tokens for warning states and items needing attention.
7. THE System SHALL use white as the primary surface color for all cards and panels.
8. THE System SHALL use a very slightly purple-tinted gray (approximately #F8F8FC) as the page background color.

### Requirement 16: Spacing Token System

**User Story:** As a developer, I want a consistent spacing scale, so that all layout gaps and padding values are predictable and visually harmonious.

#### Acceptance Criteria

1. THE System SHALL use a 4px base unit scale for all spacing values.
2. THE System SHALL apply a minimum of 24px horizontal padding from the page edge to content on desktop.
3. THE System SHALL apply 16px horizontal padding from the page edge to content on mobile.
4. THE System SHALL apply a 16px gap between cards in a grid on desktop and 12px on mobile.
5. THE System SHALL apply a 32px gap between page sections on desktop and 24px on mobile.
6. THE System SHALL apply 16px to 20px internal padding inside cards.
7. THE System SHALL apply a 6px gap between an input label and its input field.
8. THE System SHALL apply a 16px gap between consecutive form fields.
9. THE System SHALL NOT use arbitrary spacing values outside the 4px base unit scale.
