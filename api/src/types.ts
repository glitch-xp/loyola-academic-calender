export interface Env {
    DB: D1Database;
    JWT_SECRET: string;
}

// Database row types
export interface DepartmentRow {
    id: string;
    name: string;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface ShiftRow {
    id: string;
    name: string;
}

export interface ShiftTimingRow {
    id: number;
    shift_id: string;
    period: number;
    start_time: string;
    end_time: string;
}

export interface TimetableRow {
    id: string;
    department_id: string;
    year: string;
    shift_id: string | null;
    section: string | null;
    contributor: string | null;
    created_at: string;
    updated_at: string;
}

export interface TimetableEntryRow {
    id: number;
    timetable_id: string;
    day_order: number;
    period: number;
    subject_name: string;
    subject_code: string;
    room: string;
    teacher: string;
}

export interface CalendarDayRow {
    date: string;
    day_order: number | null;
    is_holiday: number;
    event_title: string | null;
    event_description: string | null;
}

export interface AppReleaseRow {
    id: number;
    version: string;
    platform: string;
    release_notes: string | null;
    download_url: string | null;
    is_latest: number;
    created_at: string;
}

export interface AdminUserRow {
    id: number;
    username: string;
    password_hash: string;
    created_at: string;
}

export interface PendingContributionRow {
    id: number;
    department_id: string;
    year: string;
    shift_id: string | null;
    section: string | null;
    contributor_name: string | null;
    timetable_data: string; // JSON string
    status: 'pending' | 'approved' | 'rejected';
    admin_notes: string | null;
    submitted_ip: string | null;
    created_at: string;
    reviewed_at: string | null;
    reviewed_by: number | null;
}

// API response types matching the frontend's expected format
export interface MasterConfigResponse {
    departments: DepartmentConfigResponse[];
    shifts: ShiftConfigResponse[];
}

export interface DepartmentConfigResponse {
    name: string;
    years: CourseYearConfigResponse[];
}

export interface CourseYearConfigResponse {
    year: string;
    timetableId?: string;
    contributor?: string;
    shifts?: string[];
    shiftDetails?: ShiftDetailConfigResponse[];
}

export interface ShiftDetailConfigResponse {
    shiftId: string;
    timetableId?: string;
    contributor?: string;
    sections?: SectionConfigResponse[];
}

export interface SectionConfigResponse {
    name: string;
    timetableId: string;
    contributor?: string;
}

export interface ShiftConfigResponse {
    id: string;
    name: string;
    timings: {
        period: number;
        startTime: string;
        endTime: string;
    }[];
}
