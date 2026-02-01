export interface Subject {
    name: string;
    code: string;
    room?: string;
    teacher?: string;
    startTime: string; // "08:30"
    endTime: string;   // "09:25"
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
    section: string;
}

export interface MasterConfig {
    departments: string[];
    years: ['I', 'II', 'III'];
    sections: string[];
    dataUrls: {
        [dept_year_sec: string]: { // key format: "B.Com CA_I_A"
            calendar: string;
            timetable: string;
        }
    }
}
