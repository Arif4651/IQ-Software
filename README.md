# IQ-Software (Personal IQ Test & Reasoning Practice Platform)

A computer-based aptitude, reasoning, and IQ examination application designed for personal practice, test simulation, and performance tracking.

---

## 🚀 Features

- **Examination & Practice Modes**:
  - **Standard IQ Simulation**: Timed, fixed question count, realistic test simulation without mid-test interruptions.
  - **Practice Mode**: Instant feedback after every question with full solution logic and retry options.
  - **Speed Drill**: Strict per-question countdown (e.g. 30s/45s/60s) for rapid pattern recognition.
  - **Weak Area Focus**: Auto-generated tests focusing on previously missed questions.
  - **Custom Test**: Configure categories, difficulties, question counts, and randomization.

- **Exam UI & Keyboard Shortcuts**:
  - `A` - `F` or `1` - `6`: Select options
  - `←` / `→`: Navigate questions
  - `M` / `F`: Flag/unflag question for review
  - `C`: Clear selection
  - Question palette / navigator showing answered, unanswered, and flagged questions
  - Low-time warning indicators

- **Question Bank Management**:
  - Full search by keyword, ID, or tag.
  - Filtering by category, difficulty, status (Unused, Frequently Wrong, Never Attempted).
  - Bulk and single actions (export, duplicate, edit, delete).
  - **Import / Export**: Supports JSON and CSV with built-in validation and downloadable templates.
  - Minimal format support: only Question, Options, and Correct Answer required.

- **Analytics & Progress Tracking**:
  - Accuracy and score progression charts.
  - Category mastery analysis (Numerical, Verbal, Logical, Abstract, Spatial, Pattern, Analogy, Classification, Series).
  - Time pacing breakdown per category.

- **Data Persistence & Privacy**:
  - Completely offline-first and private with zero external backend dependencies.
  - Full JSON backup and restore capabilities.
  - Pre-populated starter dataset of 20 verified questions.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript
- **Styling**: Tailwind CSS v4, Lucide React Icons
- **Charts**: Recharts
- **Build Tool**: Vite

---

## 💻 Getting Started Locally

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

### Installation & Run

```bash
# Clone the repository
git clone https://github.com/Arif4651/IQ-Software.git

# Navigate into the project folder
cd IQ-Software

# Install dependencies
npm install

# Start the local development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📦 Production Build

```bash
npm run build
npm run preview
```
