import { MasterConfig, DayOrderConfig, TimeTable } from '../types';

const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/glitch-xp/loyola-academic-calender/main';

export const DataService = {
    async fetchMasterConfig(): Promise<MasterConfig> {
        const response = await fetch(`${GITHUB_BASE_URL}/master_config.json`);
        if (!response.ok) {
            throw new Error(`Failed to fetch master config: ${response.status}`);
        }
        return await response.json();
    },

    async fetchCourseData(dept: string, year: string, shift: string): Promise<{
        timetable: TimeTable;
        calendar: DayOrderConfig;
    }> {
        // First, fetch the master config to get the timetable ID and calendar URL
        const masterConfig = await this.fetchMasterConfig();

        // 1. Find the timetable ID from the Master Config
        const deptConfig = masterConfig.departments.find(d => d.name === dept);
        const yearConfig = deptConfig?.years.find(y => y.year === year);
        const timetableId = yearConfig?.timetableId;

        if (!timetableId) {
            throw new Error(`No timetable found for department: ${dept}, year: ${year}`);
        }

        // 2. Fetch the timetable using the timetableId
        const timetableUrl = `${GITHUB_BASE_URL}/timetables/${timetableId}.json`;
        const timetableResponse = await fetch(timetableUrl);

        if (!timetableResponse.ok) {
            throw new Error(`Failed to fetch timetable: ${timetableResponse.status}`);
        }
        const timetable: TimeTable = await timetableResponse.json();

        // 3. Fetch the calendar data
        const calendarUrl = `${GITHUB_BASE_URL}/calendar.json`;
        const calendarResponse = await fetch(calendarUrl);

        if (!calendarResponse.ok) {
            throw new Error(`Failed to fetch calendar: ${calendarResponse.status}`);
        }
        const calendar: DayOrderConfig = await calendarResponse.json();

        return {
            timetable,
            calendar
        };
    }

};
