VIVAVAULT — DESKTOP DASHBOARD COMPLETE REDESIGN
File: DESKTOP-02 — Dashboard Page Full Redesign

Apply COMMON-01 before this. This redesigns the Dashboard page for desktop screens.

---

CURRENT PROBLEMS IN THE DESKTOP DASHBOARD

The screenshot shows "Your command center" as the page heading with four metric cards (Today's Focus, Study Streak, Tasks Today, Habits Today), a Study Activity heatmap, Upcoming events panel, Habits panel, Course Progress card, and Recent Notes card. The overall structure is reasonable but has several specific problems.

The page title "Your command center — All systems at a glance" takes up 80 pixels of vertical space with nothing particularly useful in those words. Students know what a dashboard is. The Study Streak card shows "od" which appears to be a rendering error for "0d" — a data display bug. The Study Activity heatmap is very small and the month labels overlap awkwardly. The Habits card shows items with single-letter labels (D, k, k, k) which are clearly placeholder or truncated data. The Course Progress rows show "0/145 0%", "0/199 0%", "0/1300 0%" — all zero progress which reveals the student has not started, but the display format makes it hard to tell at a glance which courses need the most attention. The Recent Notes card shows an empty state but the empty state message is in a very small font and the call to action "Open Notes OS" is a small link that is easy to miss.

---

DASHBOARD DESKTOP REDESIGN

Remove the "Your command center — All systems at a glance" heading. Replace it with a compact greeting row that is contextual and personal. Left side: "Good morning, Kunal" in 20 pixels semibold (changes to afternoon/evening based on time). Right side: today's date in 14 pixels gray. This greeting is only 40 pixels tall and immediately gives way to the data.

FOUR METRIC CARDS ROW (full width, 4 equal columns, 16 pixel gap):

Today's Focus card: clock icon in purple, label "Today's Focus" in 12 pixels gray uppercase, value "9h 17m" in 32 pixels bold. Below the value: a small mini bar chart showing focus time per day for the past 7 days (7 bars, approximately 40 pixels tall). The bars are proportional to the daily amounts. Today's bar is solid purple, past days are lighter purple.

Study Streak card: fire icon in orange, label "Study Streak" in 12 pixels gray uppercase, value "1 day" in 32 pixels bold (fix the "od" rendering — ensure the number followed by "day" or "days" shows correctly). Below: "Longest: 0 days" in 13 pixels gray. Below that: seven small circles for the past 7 days (filled orange if studied, empty gray if not), showing the streak visually.

Tasks Today card: checkbox icon in green, label "Tasks Today" in 12 pixels gray uppercase, value "0 of 0" in 32 pixels bold. Below: a thin progress bar (full width of card, 6 pixels tall, green fill). Below: "No tasks scheduled" in 13 pixels gray if no tasks exist for today.

Habits Today card: heart icon, label "Habits Today" in 12 pixels gray uppercase, value "1 of 4" in 32 pixels bold. Below: a row of colored dots representing each habit (filled if complete, outlined if not). Each dot is 10 pixels diameter. Up to 8 habits shown as dots, with "+X more" text if more exist.

All four cards are equal height (a minimum of 120 pixels). They should be the most visually prominent element on the page.

SECOND ROW (three columns: Study Activity 55% width, Upcoming 22% width, Habits 23% width):

Study Activity card: title "Study Activity" in 15 pixels semibold. Below: time range chips (3M, 6M, 1Y) aligned right, defaulting to 3M selected. The heatmap grid itself — fix the current implementation. The heatmap shows Mon, Wed, Fri labels on the left (not M, W, F which are too small). Month labels above the columns must be positioned correctly with no overlap. Each heatmap cell is 12 by 12 pixels with 2 pixels gap. The color scale: no fill for no activity, progressively deeper purple for more activity. A legend below the heatmap showing 0 to high with colored squares. The heatmap scrolls horizontally if showing 6M or 1Y ranges.

Upcoming card: title "Upcoming" in 15 pixels semibold. Shows the next 5 calendar events as list items. Each item: a colored dot (calendar color), event title in 14 pixels, time or date in 12 pixels gray. If no upcoming events: an empty state with a small calendar illustration and "Nothing scheduled — enjoy the calm" in 13 pixels gray and a "Go to Calendar" link. At the bottom: "View Calendar →" link in the primary purple.

Habits card: title "Habits" in 15 pixels semibold. Shows up to 6 habits as list rows. Each row: colored circle with emoji (or default icon), habit name in 14 pixels, and a checkbox on the right. Checking the checkbox marks today's habit complete with an immediate visual animation (the checkbox fills green and a brief scale animation plays). Fix the current display that shows single-letter names — habit names must show their full name, truncated with ellipsis if longer than the available width. At the bottom: "Manage Habits →" link.

THIRD ROW (two columns: Course Progress 55% width, Recent Notes 45% width):

Course Progress card: title "Course Progress" in 15 pixels semibold. Shows enrolled courses as a list. Each course row (48 pixels tall): course icon on the left (36 pixels), course name in 14 pixels bold, course description in 12 pixels gray below the name, and on the right side of the row: the fraction "0/145" in 13 pixels and the percentage "0%" in 13 pixels semibold in the primary purple. Below each row: a thin progress bar (4 pixels tall, full row width minus icon, purple fill, gray background). The rows are separated by a subtle 1 pixel divider. If there are more than 5 courses, show only the first 5 and add "See all X courses" link at the bottom. 

For courses at 0% completion: show the progress bar as a gray background bar with no fill, and the percentage in gray instead of purple. This visually distinguishes untouched courses from in-progress ones without being alarming.

Recent Notes card: title "Recent Notes" in 15 pixels semibold. Shows the last 4 opened notes as list rows. Each row: a note icon (16 pixels), note title in 14 pixels, relative timestamp in 12 pixels gray ("2 hours ago", "yesterday"). The row is the full card width. Clicking opens that note in Notes OS. Empty state: a centered document icon (48 pixels), "No recent notes" in 14 pixels semibold, "Open Notes OS to start writing" in 13 pixels gray, and a "Go to Notes OS" button (outlined, 36 pixels tall). The button must be a clearly visible button, not just a small link.

ACTIVITY FEED (below the second and third rows, full width, optional):
A compact horizontal scrolling row (not a vertical list) showing the last 10 activity items. Each item is a small chip showing an icon and text: "Studied 5 questions in MAD1 · 2h ago". This gives the student a quick sense of recent activity without taking up too much vertical space.

---

DASHBOARD EMPTY STATE (new user with no data)

When a student has just signed up and has no enrolled courses, no habits, no study sessions, no notes: show a special onboarding dashboard state instead of the normal dashboard. This state shows:
- A centered welcome message in the top area: "You're all set up, Kunal. Let's get started."
- Four large action tiles in a 2x2 grid: "Enroll in a course" (links to home), "Set up habits" (links to habits in Study OS), "Create your first note" (links to Notes OS), "Start a focus session" (links to Study OS focus). Each tile is 160 pixels tall with a colored gradient background, a large icon, and label text. This converts the dashboard into an onboarding launcher for new users.
- Once the user has any enrolled course, this special state goes away and the normal dashboard shows.

---

DASHBOARD DATA ACCURACY

Fix all data rendering bugs: streak shows "od" — this must show "0d" correctly or better "0 days". Habit names must not be single characters. Progress must distinguish between zero progress (never opened) and courses with actual data. All numbers must format correctly (1300 questions shows as "1,300" not "1300").
