import { MasterConfig, DayOrderConfig, TimeTable, ContributionSubmission } from '../types';

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
                }
                // We no longer throw an error here if timetableId is missing.
                // This allows the user to complete setup and contribute a timetable later.
            }

            let timetable: TimeTable = {};
            let calendar: DayOrderConfig;

            if (timetableId) {
                // Fetch timetable and calendar in parallel
                const [tt, cal] = await Promise.all([
                    fetchJSON<TimeTable>(`${API_BASE_URL}/api/timetable/${timetableId}`),
                    fetchJSON<DayOrderConfig>(`${API_BASE_URL}/api/calendar`),
                ]);
                timetable = tt;
                calendar = cal;
            } else {
                // Fetch only the calendar if there is no timetable yet
                calendar = await fetchJSON<DayOrderConfig>(`${API_BASE_URL}/api/calendar`);
            }

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
    },

    /**
     * Submit a timetable contribution for admin review.
     * Performs client-side pre-validation before sending.
     */
    async submitContribution(submission: ContributionSubmission): Promise<{
        success: boolean;
        id?: number;
        message?: string;
        error?: string;
    }> {
        // Client-side pre-validation
        if (!submission.department_id || !submission.year) {
            throw new DataFetchError('Department and year are required');
        }

        if (!['I', 'II', 'III'].includes(submission.year)) {
            throw new DataFetchError('Invalid year');
        }

        // Check timetable has at least one subject
        const tt = submission.timetable_data;
        let hasSubject = false;
        for (let d = 1; d <= 6; d++) {
            const daySubjects = tt[d];
            if (daySubjects && daySubjects.length > 0) {
                for (const sub of daySubjects) {
                    if (sub.name && sub.name.trim().length > 0) {
                        hasSubject = true;
                        break;
                    }
                }
            }
            if (hasSubject) break;
        }

        if (!hasSubject) {
            throw new DataFetchError('Timetable must contain at least one subject');
        }

        // Strip HTML from contributor name on client side too
        if (submission.contributor_name) {
            submission.contributor_name = submission.contributor_name.replace(/<[^>]*>/g, '').trim().substring(0, 50);
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/contributions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submission),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new DataFetchError(data.error || `Submission failed: ${response.status}`);
            }

            return data;
        } catch (error) {
            if (error instanceof TypeError || (error as any).message?.includes('Network request failed')) {
                throw new NetworkError('No internet connection. Please check your network.');
            }
            if (error instanceof NetworkError || error instanceof DataFetchError) {
                throw error;
            }
            throw new DataFetchError(`Submission failed: ${(error as Error).message}`);
        }
    },

    /**
     * Check if a pending contribution already exists for a given slot.
     */
    async checkPendingContribution(departmentId: string, year: string, shiftId?: string, section?: string): Promise<{
        hasPending: boolean;
        submission?: { id: number; created_at: string } | null;
    }> {
        let url = `${API_BASE_URL}/api/contributions/check?department_id=${encodeURIComponent(departmentId)}&year=${encodeURIComponent(year)}`;
        if (shiftId) url += `&shift_id=${encodeURIComponent(shiftId)}`;
        if (section) url += `&section=${encodeURIComponent(section)}`;
        return fetchJSON(url);
    },
};
