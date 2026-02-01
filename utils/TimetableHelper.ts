import { MasterConfig, ShiftTiming, Subject } from '../types';

export interface SubjectWithTiming extends Subject {
    startTime: string;
    endTime: string;
    period: number;
}

export class TimetableHelper {
    /**
     * Get timing information for a subject based on its period number and shift configuration
     */
    static getSubjectTiming(
        subject: Subject,
        periodIndex: number,
        shiftId: string,
        masterConfig: MasterConfig | null
    ): SubjectWithTiming {
        if (!masterConfig) {
            // Fallback to default timings if config not available
            return {
                ...subject,
                startTime: '00:00',
                endTime: '00:00',
                period: periodIndex + 1,
            };
        }

        const shift = masterConfig.shifts.find(s => s.id === shiftId);
        if (!shift || !shift.timings[periodIndex]) {
            return {
                ...subject,
                startTime: '00:00',
                endTime: '00:00',
                period: periodIndex + 1,
            };
        }

        const timing = shift.timings[periodIndex];
        return {
            ...subject,
            startTime: timing.startTime,
            endTime: timing.endTime,
            period: timing.period,
        };
    }

    /**
     * Enrich an array of subjects with timing information
     */
    static enrichSubjectsWithTiming(
        subjects: Subject[],
        shiftId: string,
        masterConfig: MasterConfig | null
    ): SubjectWithTiming[] {
        return subjects.map((subject, index) =>
            this.getSubjectTiming(subject, index, shiftId, masterConfig)
        );
    }
}
