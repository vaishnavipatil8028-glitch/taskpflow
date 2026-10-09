# 🎓 TaskFlow – Student Task Planning & Productivity System

TaskFlow is a modern, responsive, and intuitive web application designed specifically for college and university students to manage their academic workload, homework assignments, exams, project milestones, and daily study schedules in one centralized productivity hub.

Built with pure **HTML5**, **Vanilla CSS3**, and **Vanilla JavaScript**, TaskFlow runs entirely client-side with persistent **LocalStorage**, zero dependencies or heavy frameworks, and state-of-the-art UI/UX design.

---

## 🌟 Key Features

### 1. 📊 Comprehensive Student Dashboard
- **KPI Metrics at a Glance:**
  - Total Tasks, Completed Tasks, Pending Tasks, and Overdue Tasks counters.
  - Interactive click-through: Clicking any metric card instantly filters your tasks list.
- **Overall Completion Rate Ring:** Animated SVG circular progress meter displaying total workload percentage completed.
- **Weekly Productivity Bar Chart:** Visualizes tasks completed per day across the current week (Monday – Sunday) with peak productivity insights.
- **Academic Category Breakdown:** Visual workload distribution bars across *Assignment*, *Study*, *Project*, *Personal*, and *Other*.
- **Quick-Glance Sections:** Dual columns displaying today's priority tasks and impending deadlines.

### 2. 📝 Full Task Management (CRUD)
- **Add Tasks:** Create tasks with Title, Category, Priority, Due Date & Time, Description/Notes, and Step-by-Step Subtasks (Checklists).
- **Edit Tasks:** Update any task details, milestones, or deadlines seamlessly.
- **Mark Complete / Incomplete:** One-click toggle with immediate recalculation of all statistics.
- **Delete Tasks:** Confirmation safety modal to prevent accidental data loss.
- **Quick Date Shortcuts:** One-click presets for *Today*, *Tomorrow*, *This Weekend*, and *Next Monday*.
- **Subtasks & Milestone Tracker:** Create nested checklist items with progress tracking per task.

### 3. 🔍 Search, Filter & Sort Engine
- **Instant Search:** Debounced real-time search across task titles, notes, and categories.
- **Multi-Dimensional Filters:**
  - Filter by Category (*Assignment*, *Study*, *Project*, *Personal*, *Other*)
  - Filter by Priority (*High*, *Medium*, *Low*)
  - Filter by Status (*All*, *Pending*, *Completed*, *Overdue*)
- **Flexible Sorting:**
  - Deadline (Soonest first / Latest first)
  - Priority (High to Low / Low to High)
  - Title (A – Z)
  - Recently Created
- **Active Filter Chips:** One-click badges allowing quick removal of individual filters.
- **Layout Switcher:** Toggle between **Grid Card View** and **Compact List View**.

### 4. 📅 Timeline & Dedicated Views
- **Today's View:** Dedicated focus space for everything due before midnight.
- **Upcoming View:** Chronologically grouped into *Tomorrow*, *Later This Week (Next 7 Days)*, and *Beyond 7 Days*.
- **Overdue View:** Clear red alert indicators highlighting missed deadlines with overdue day calculations.
- **Completed Archive:** History of accomplished assignments with bulk clear option.
- **Categories Hub:** Coursework-specific overview with completion bars per category.

### 5. ⏱️ Integrated Pomodoro Focus Timer
- 25-minute study focus sessions, 5-minute short breaks, and 15-minute long breaks.
- Link timer directly to an active assignment or task.
- Synthesized audio chime upon session completion.
- Tracks daily completed focus sessions and study minutes.

### 6. 🎨 Modern Design & UI/UX Aesthetics
- **Dark Mode & Light Mode:** Seamless toggle with instant transition and stored preferences.
- **Typography:** Uses Google Fonts (*Outfit* for bold headings, *Plus Jakarta Sans* for clean interface typography).
- **Audio Feedback:** Real-time synthesized chimes via the browser Web Audio API (zero external audio files).
- **Celebration Confetti:** Pure HTML5 Canvas confetti shower on completing assignments.
- **100% Responsive:** Optimized for desktops, laptops, tablets, and mobile smartphones (with slide-out drawer navigation and floating action button).

### 7. 💾 LocalStorage & Data Management
- Automatically persists all tasks, student profile settings, and timer stats in browser `localStorage`.
- **Pre-seeded Student Demo Data:** Comes pre-loaded with realistic college assignments, lab reports, and exam prep tasks.
- **Export Backup:** Download tasks as a structured `.json` backup file.
- **Import Backup:** Restore from previously saved JSON backups.
- **Reset Option:** Easily wipe data or reload sample coursework anytime.

---

## 🛠️ Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Structure** | HTML5 | Semantic elements, accessible ARIA roles, modern modals |
| **Styling** | Vanilla CSS3 | Custom CSS Properties (Tokens), Flexbox, CSS Grid, Glassmorphism, Dark/Light Themes |
| **Logic** | Vanilla JavaScript (ES6+) | Modular architecture, Event-driven, DOM manipulation, Web Audio API, Canvas |
| **Icons** | Font Awesome 6 | CDN-delivered vector iconography |
| **Fonts** | Google Fonts | Outfit & Plus Jakarta Sans |

---

## 🚀 How to Run Locally

Since TaskFlow is built using standard web technologies with no build steps or dependencies:

### Option 1: Direct Browser Launch
1. Double-click `index.html` or open it with any modern web browser (Google Chrome, Microsoft Edge, Mozilla Firefox, Safari, Brave).

### Option 2: Local HTTP Server (Recommended)
Using Python:
```bash
python -m http.server 5050
```
Then navigate to: `http://localhost:5050`

Using Node.js / npx:
```bash
npx serve .
```

---

## 📂 Project Directory Structure

```text
├── index.html       # Main semantic markup, templates, modals, and views
├── style.css        # Design system, CSS variables, dark/light themes, animations, responsive rules
├── app.js           # Core state store, CRUD handlers, Pomodoro timer, audio synthesizer, confetti
└── README.md        # Comprehensive documentation and features overview
```

---

## ⌨️ Keyboard Shortcuts

- `N`: Open "Add New Task" modal (when not focused in a text field)
- `/` or `Ctrl + K`: Focus global search bar
- `Escape`: Close any active modal or drawer

---

## 🎓 Academic Use Cases

- **Coursework Tracking:** Never miss lab report submissions or problem sets.
- **Exam Preparation:** Break down major exams into revision chapters with checklists.
- **Group Projects:** Track sprint deliverables, prototype deadlines, and presentation decks.
- **Extracurricular & Personal:** Balance study with campus activities and housing deadlines.
