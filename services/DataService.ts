import { MasterConfig, DayOrderConfig, TimeTable } from '../types';
import { StorageService } from './StorageService';

// MOCK DATA GENERATORS
const MOCK_MASTER_CONFIG: MasterConfig = {
    departments: ['B.Com CA', 'B.Sc CS', 'B.A English'],
    years: ['I', 'II', 'III'],
    sections: ['A', 'B', 'C'],
    dataUrls: {
        // We will just use this structure to valid selection possibilities
    } as any
};

// Generate some dummy timetable data
const MOCK_TIMETABLE: TimeTable = {
    1: [
        { name: 'Accounting', code: 'ACC101', startTime: '08:30', endTime: '09:25' },
        { name: 'Computer App', code: 'CA102', startTime: '09:25', endTime: '10:20' },
        { name: 'English', code: 'ENG101', startTime: '10:40', endTime: '11:35' },
        { name: 'Language', code: 'TAM101', startTime: '11:35', endTime: '12:30' },
        { name: 'Value Ed', code: 'VED101', startTime: '12:30', endTime: '01:25' },
    ],
    2: [
        { name: 'Maths', code: 'MAT101', startTime: '08:30', endTime: '09:25' },
        { name: 'Accounting', code: 'ACC101', startTime: '09:25', endTime: '10:20' },
        { name: 'Computer App', code: 'CA102', startTime: '10:40', endTime: '11:35' },
        { name: 'Library', code: 'LIB', startTime: '11:35', endTime: '12:30' },
        { name: 'Sports', code: 'SPT', startTime: '12:30', endTime: '01:25' },
    ],
    // Add more as needed, replicating for 3-6
    3: [{ name: 'Economics', code: 'ECO101', startTime: '08:30', endTime: '09:25' }],
    4: [{ name: 'History', code: 'HIS101', startTime: '08:30', endTime: '09:25' }],
    5: [{ name: 'Physics', code: 'PHY101', startTime: '08:30', endTime: '09:25' }],
    6: [{ name: 'Chemistry', code: 'CHE101', startTime: '08:30', endTime: '09:25' }],
};

export const DataService = {
    async fetchMasterConfig(): Promise<MasterConfig> {
        // In real app, fetch(GITHUB_URL)
        // For now, return mock
        return new Promise(resolve => setTimeout(() => resolve(MOCK_MASTER_CONFIG), 500));
    },

    async fetchCourseData(dept: string, year: string, section: string): Promise<{
        timetable: TimeTable;
        calendar: DayOrderConfig;
    }> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Generate a mock calendar for 2026
        const calendar: DayOrderConfig = {};
        const startDate = new Date(2026, 0, 1); // Jan 1 2026
        const endDate = new Date(2026, 11, 31);

        let currentDayOrder = 1;

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const dayOfWeek = d.getDay(); // 0 = Sun, 6 = Sat

            // Simple logic: Weekend = Holiday, else Cycle 1-6
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            if (isWeekend) {
                calendar[dateStr] = { dayOrder: null, isHoliday: true, event: 'Weekend' };
            } else {
                // Add some random holidays
                if (d.getMonth() === 1 && d.getDate() === 14) { // Feb 14
                    calendar[dateStr] = { dayOrder: null, isHoliday: true, event: 'Sports Day' };
                } else {
                    calendar[dateStr] = { dayOrder: currentDayOrder, isHoliday: false };
                    currentDayOrder = currentDayOrder >= 6 ? 1 : currentDayOrder + 1;
                }
            }
        }

        return {
            timetable: MOCK_TIMETABLE,
            calendar: calendar
        };
    }
};
