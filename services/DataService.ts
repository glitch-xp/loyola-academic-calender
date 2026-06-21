import { MasterConfig, DayOrderConfig, TimeTable } from '../types';

// API base URL — update this after deploying the Cloudflare Worker
const API_BASE_URL = 'https://loyola-api.yuvar4313.workers.dev';

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

async function fetchJSON<T>(url: string): Promise<T> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new DataFetchError(`Failed to fetch: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        if (error instanceof TypeError || (error as any).message?.includes('Network request failed')) {
            throw new NetworkError('No internet connection. Please check your network.');
        }
        if (error instanceof NetworkError || error instanceof DataFetchError) {
            throw error;
        }
        throw new DataFetchError(`Failed to fetch: ${(error as Error).message}`);
    }
}

export const DataService = {
    async fetchMasterConfig(): Promise<MasterConfig> {
        return fetchJSON<MasterConfig>(`${API_BASE_URL}/api/config`);
    },

    async fetchCourseData(dept: string, year: string, shift?: string, section?: string): Promise<{
        timetable: TimeTable;
        calendar: DayOrderConfig;
        contributor?: string;
    }> {
        try {
            // First, fetch the master config to get the timetable ID
            const masterConfig = await this.fetchMasterConfig();

            // 1. Find the timetable ID from the Master Config
            const deptConfig = masterConfig.departments.find(d => d.name === dept);
            const yearConfig = deptConfig?.years.find(y => y.year === year);

            let timetableId: string | undefined;
            let contributor: string | undefined;

            if (yearConfig?.shiftDetails) {
                // New logic: Check shiftDetails
                const shiftDetail = yearConfig.shiftDetails.find(s => s.shiftId === shift);
                if (shiftDetail) {
                    if (section && shiftDetail.sections) {
                        const sectionConfig = shiftDetail.sections.find(s => s.name === section);
                        timetableId = sectionConfig?.timetableId;
                        contributor = sectionConfig?.contributor || shiftDetail.contributor;
                    } else {
                        timetableId = shiftDetail.timetableId;
                        contributor = shiftDetail.contributor;
                    }
                }
            } else {
                // Legacy logic
                timetableId = yearConfig?.timetableId;
                contributor = yearConfig?.contributor;
            }

            if (!timetableId) {
                if (yearConfig?.timetableId) {
                    timetableId = yearConfig.timetableId;
                    contributor = yearConfig.contributor;
                } else {
                    throw new DataFetchError(`No timetable found for department: ${dept}, year: ${year}, shift: ${shift}, section: ${section}`);
                }
            }

            // 2. Fetch timetable and calendar in parallel
            const [timetable, calendar] = await Promise.all([
                fetchJSON<TimeTable>(`${API_BASE_URL}/api/timetable/${timetableId}`),
                fetchJSON<DayOrderConfig>(`${API_BASE_URL}/api/calendar`),
            ]);

            return {
                timetable,
                calendar,
                contributor
            };
        } catch (error) {
            if (error instanceof NetworkError || error instanceof DataFetchError) {
                throw error;
            }
            throw new DataFetchError(`Failed to fetch course data: ${(error as Error).message}`);
        }
    },

    /**
     * Check for app updates (Android only).
     * Returns the latest version info for the given platform.
     */
    async checkForUpdate(currentVersion: string, platform: string = 'android'): Promise<{
        version: string | null;
        isUpdateAvailable: boolean;
        releaseNotes: string | null;
        downloadUrl: string | null;
    }> {
        return fetchJSON(`${API_BASE_URL}/api/version?platform=${platform}&currentVersion=${currentVersion}`);
    }
};
