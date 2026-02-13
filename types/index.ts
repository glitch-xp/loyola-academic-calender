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

export interface SectionConfig {
    name: string; // "A", "B", "Default"
    timetableId: string;
    contributor?: string;
}

export interface ShiftDetailConfig {
    shiftId: string;
    timetableId?: string; // Used if no sections
    contributor?: string;
    sections?: SectionConfig[];
}

export interface CourseYearConfig {
    year: 'I' | 'II' | 'III';

    // Legacy/Simple mode
    timetableId?: string;
    contributor?: string;
    shifts?: string[]; // IDs of available shifts

    // New granular mode
    shiftDetails?: ShiftDetailConfig[];
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
        dayOrder: string | number | null; // Allow string format like "Day-1" or numeric format like 1
        isHoliday: boolean;
        event?: string;
    };
}

export interface UserProfile {
    department: string;
    year: 'I' | 'II' | 'III';
    shift?: string; // Optional: "1" or "2"
    section?: string; // Optional: "A", "B"
}

export interface MasterConfig {
    departments: DepartmentConfig[];
    shifts: Shift[];
    dataUrls: {
        calendar: string; // URL to calendar.json
        timetableBase: string;
    }
}
