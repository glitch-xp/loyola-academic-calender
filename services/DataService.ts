import { MasterConfig, DayOrderConfig, TimeTable } from '../types';

const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/glitch-xp/loyola-academic-calender/main';

// Custom error classes for better error handling
export class NetworkError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NetworkError';
    }
}

export class DataFetchError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DataFetchError';
    }
}

export const DataService = {
    async fetchMasterConfig(): Promise<MasterConfig> {
        try {
            const response = await fetch(`${GITHUB_BASE_URL}/assets/data/master_config.json`);
            if (!response.ok) {
                throw new DataFetchError(`Failed to fetch master config: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            // Check if it's a network error (no internet connection)
            if (error instanceof TypeError || (error as any).message?.includes('Network request failed')) {
                throw new NetworkError('No internet connection. Please check your network.');
            }
            // Re-throw if it's already our custom error
            if (error instanceof NetworkError || error instanceof DataFetchError) {
                throw error;
            }
            // Otherwise, wrap it as a DataFetchError
            throw new DataFetchError(`Failed to fetch master config: ${(error as Error).message}`);
        }
    },

    async fetchCourseData(dept: string, year: string, shift?: string): Promise<{
        timetable: TimeTable;
        calendar: DayOrderConfig;
    }> {
        try {
            // First, fetch the master config to get the timetable ID and calendar URL
            const masterConfig = await this.fetchMasterConfig();

            // 1. Find the timetable ID from the Master Config
            const deptConfig = masterConfig.departments.find(d => d.name === dept);
            const yearConfig = deptConfig?.years.find(y => y.year === year);
            const timetableId = yearConfig?.timetableId;

            if (!timetableId) {
                throw new DataFetchError(`No timetable found for department: ${dept}, year: ${year}`);
            }

            // 2. Fetch the timetable using the timetableId
            const timetableUrl = `${GITHUB_BASE_URL}/assets/data/timetable/${timetableId}.json`;
            let timetableResponse;
            try {
                timetableResponse = await fetch(timetableUrl);
            } catch (error) {
                if (error instanceof TypeError || (error as any).message?.includes('Network request failed')) {
                    throw new NetworkError('No internet connection. Please check your network.');
                }
                throw error;
            }

            if (!timetableResponse.ok) {
                throw new DataFetchError(`Failed to fetch timetable: ${timetableResponse.status}`);
            }
            const timetable: TimeTable = await timetableResponse.json();

            // 3. Fetch the calendar data
            const calendarUrl = `${GITHUB_BASE_URL}/assets/data/calendar.json`;
            let calendarResponse;
            try {
                calendarResponse = await fetch(calendarUrl);
            } catch (error) {
                if (error instanceof TypeError || (error as any).message?.includes('Network request failed')) {
                    throw new NetworkError('No internet connection. Please check your network.');
                }
                throw error;
            }

            if (!calendarResponse.ok) {
                throw new DataFetchError(`Failed to fetch calendar: ${calendarResponse.status}`);
            }
            const calendar: DayOrderConfig = await calendarResponse.json();

            return {
                timetable,
                calendar
            };
        } catch (error) {
            // Re-throw if it's already our custom error
            if (error instanceof NetworkError || error instanceof DataFetchError) {
                throw error;
            }
            // Otherwise, wrap it as a DataFetchError
            throw new DataFetchError(`Failed to fetch course data: ${(error as Error).message}`);
        }
    }

};
