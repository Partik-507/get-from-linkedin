
# VivaVault — Full Build Plan

## Design System
- Dark-first theme with deep indigo/purple gradients
- Glassmorphism cards: `backdrop-blur-xl bg-white/5 border border-white/10`
- Accent colors: purple-500, indigo-500, amber-400, emerald-400
- Smooth animations on all interactions (framer-motion)
- Large, confident typography with generous spacing

## Pages & Features

### 1. Auth Page (`/auth`)
- Full-screen dark gradient background with animated gradient mesh (CSS animation)
- Centered glassmorphism card with VivaVault logo
- Google sign-in button, email/password form, and "Continue as Guest" button
- Firebase Auth integration (Google + email/password)

### 2. Home Page (`/`)
- Grid of project cards with gradient icons, project code (MAD1, etc.), name, description
- Two action buttons per card: "Viva Prep" and "Resources"
- Projects fetched from Firestore `projects` collection

### 3. Viva Prep Page (`/project/:projectId/viva`)
- **Sticky filter bar**: Search input (debounced 300ms), scrollable category chips, frequency filters (All/Hot/Medium/Low), live question count
- **Question cards**: Glassmorphism, expandable with smooth animation
  - Closed: question text, frequency badge (colored), proctor chips, chevron
  - Expanded: rich answer with Simple Answer, Interview Tip (amber border), In Your Project (green border), syntax-highlighted code blocks with copy button, follow-up question chips
- **Collaborative editing**: Tiptap block editor with slash commands (headings, lists, code block, tip block, project tip block, divider, quote). Anyone can edit, saves to Firestore
- **Upvoting**: Heart/thumbs-up with count on each question
- **Community Experiences section**: Submission cards with student name, proctor, level, date, duration, questions asked, code changes, tips, star ratings. Filters by proctor/level, sort by newest/most helpful, load more (10 at a time)
- **"Share Your Experience" button** → links to submit page

### 4. Submit Experience Page (`/project/:projectId/submit`)
- Clean centered form, all fields optional with green badge
- Sections: About You (name, roll number, anonymous toggle), Viva Details (proctor, level, date, duration), What Was Asked (questions, code changes), Tips, Ratings (difficulty + proctor friendliness with 5-star selectors)
- Gradient submit button, success animation, redirect after 3s

### 5. Resources Page (`/project/:projectId/resources`)
- Category tabs: All, Guidelines, Milestones, YouTube, GitHub, Docs, Drive, Other
- Resource cards with colored type icons, title, description, Open button
- Type-specific icons (YouTube red, GitHub dark, etc.)

### 6. Admin Panel (`/admin`) — protected route
- Sidebar nav: Projects, Questions, Resources, Submissions
- **Import Questions**: Drag-and-drop JSON upload, preview table, progress bar, detailed import log. Extremely forgiving parser — handles missing fields with defaults, skips bad entries, shows summary
- **Manage Projects**: Add/delete projects
- **Add Resources**: Form with project, title, URL, type, category, description
- **Submissions**: Table view with delete buttons

## Technical Stack
- React + Vite + TypeScript + Tailwind CSS
- Firebase Auth (Google + email/password) + Firestore
- Tiptap editor for collaborative answer editing
- Framer Motion for animations
- React Router for routing (scroll to top, dynamic titles)
- Lucide icons
- Firebase config via `VITE_` environment variables
- `.env.example` file + README with full setup instructions

## Data Model (Firestore)
- `projects`: id, code, name, description, color, icon
- `questions`: id, projectId, question, answer (rich JSON), category, frequency, tip, projectTip, codeExample, codeLanguage, proctors[], upvotes, createdAt
- `submissions`: id, projectId, name, rollNumber, isAnonymous, proctorId, level, date, duration, questionsAsked, codeChanges, tips, difficultyRating, friendlinessRating, createdAt
- `resources`: id, projectId, title, url, type, category, description

## UX Details
- Loading skeletons on every data fetch
- Beautiful empty states with icons and helpful messages
- Toast notifications for all operations
- Fully responsive (mobile, tablet, desktop)
- Debounced search, combined filters
- Route-based scroll-to-top and page titles
