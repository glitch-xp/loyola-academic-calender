-- Loyola Academic Calendar - D1 Database Schema

-- Departments (B.Com CA, B.Com Hons, BA Economics, etc.)
CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Global shift definitions (Shift 1, Shift 2)
CREATE TABLE IF NOT EXISTS shifts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

-- Shift period timings
CREATE TABLE IF NOT EXISTS shift_timings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shift_id TEXT NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    period INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    UNIQUE(shift_id, period)
);

-- Timetable definitions (links to department/year/shift/section)
CREATE TABLE IF NOT EXISTS timetables (
    id TEXT PRIMARY KEY,
    department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    year TEXT NOT NULL,
    shift_id TEXT REFERENCES shifts(id),
    section TEXT,
    contributor TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Individual timetable entries (the actual class schedule)
CREATE TABLE IF NOT EXISTS timetable_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timetable_id TEXT NOT NULL REFERENCES timetables(id) ON DELETE CASCADE,
    day_order INTEGER NOT NULL CHECK(day_order BETWEEN 1 AND 6),
    period INTEGER NOT NULL CHECK(period >= 1),
    subject_name TEXT NOT NULL DEFAULT '',
    subject_code TEXT DEFAULT '',
    teacher TEXT DEFAULT ''
);

-- Create index for faster timetable lookups
CREATE INDEX IF NOT EXISTS idx_timetable_entries_lookup
    ON timetable_entries(timetable_id, day_order, period);

-- Academic calendar (one row per date)
CREATE TABLE IF NOT EXISTS calendar_days (
    date TEXT PRIMARY KEY,
    day_order INTEGER CHECK(day_order IS NULL OR (day_order BETWEEN 1 AND 6)),
    is_holiday INTEGER DEFAULT 0,
    event_title TEXT,
    event_description TEXT
);

-- Create index for calendar date range queries
CREATE INDEX IF NOT EXISTS idx_calendar_days_date
    ON calendar_days(date);

-- App releases (for update notification system)
CREATE TABLE IF NOT EXISTS app_releases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT NOT NULL,
    platform TEXT NOT NULL CHECK(platform IN ('android', 'ios', 'web')),
    release_notes TEXT,
    download_url TEXT,
    is_latest INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Admin users
CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Pending timetable contributions from students (moderation queue)
CREATE TABLE IF NOT EXISTS pending_contributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    department_id TEXT NOT NULL,
    year TEXT NOT NULL CHECK(year IN ('I', 'II', 'III')),
    shift_id TEXT,
    section TEXT,
    contributor_name TEXT,
    timetable_data TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    submitted_ip TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    reviewed_at TEXT,
    reviewed_by INTEGER REFERENCES admin_users(id)
);

CREATE INDEX IF NOT EXISTS idx_pending_status ON pending_contributions(status);
CREATE INDEX IF NOT EXISTS idx_pending_ip ON pending_contributions(submitted_ip, created_at);
