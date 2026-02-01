export interface Subject {
    name: string;
    code: string;
    room?: string;
    teacher?: string;
}

export interface ShiftTiming {
    period: number;
    startTime: string;
    endTime: string;
}

export interface Shift {
    id: string; // "1" or "2"
    name: string; // "Shift 1" or "Shift 2"
    timings: ShiftTiming[];
}

export interface CourseYearConfig {
    year: 'I' | 'II' | 'III';
    timetableId: string; // e.g., "cs_1"
    shifts?: string[]; // Optional: IDs of available shifts for this year (e.g., ["1", "2"] or ["1"])
}

export interface DepartmentConfig {
    name: string;
    years: CourseYearConfig[];
}

// Map of Day Order (1-6) to list of Subjects
export interface TimeTable {
    [dayOrder: number]: Subject[];
}

export interface CalendarEvent {
    date: string; // "YYYY-MM-DD"
    title: string;
    isHoliday: boolean;
    dayOrder?: number; // 1-6, null if holiday or weekend
    description?: string;
}

export interface DayOrderConfig {
    [date: string]: {
        dayOrder: number | null;
        isHoliday: boolean;
        event?: string;
    };
}

export interface UserProfile {
    department: string;
    year: 'I' | 'II' | 'III';
    shift?: string; // Optional: "1" or "2", auto-selected for single-shift courses
}

export interface MasterConfig {
    departments: DepartmentConfig[];
    shifts: Shift[];
    dataUrls: {
        calendar: string; // URL to calendar.json
        timetableBase: string;
    }
}
