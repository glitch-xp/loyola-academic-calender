import { Hono } from 'hono';
import { Env, TimetableRow, ShiftTimingRow, DepartmentRow, TimetableEntryRow } from '../types';

const config = new Hono<{ Bindings: Env }>();

/**
 * GET /api/config
 * Returns master config in the exact format the frontend expects.
 * This reconstructs the nested JSON from relational tables.
 */
config.get('/', async (c) => {
    const db = c.env.DB;

    try {
        // Fetch all data in parallel
        const [departments, shifts, shiftTimings, timetables] = await Promise.all([
            db.prepare('SELECT * FROM departments ORDER BY sort_order, name').all<DepartmentRow>(),
            db.prepare('SELECT * FROM shifts').all(),
            db.prepare('SELECT * FROM shift_timings ORDER BY shift_id, period').all<ShiftTimingRow>(),
            db.prepare('SELECT * FROM timetables ORDER BY department_id, year, shift_id, section').all<TimetableRow>(),
        ]);

        // Build shifts config with timings
        const shiftsConfig = shifts.results.map((shift: any) => ({
            id: shift.id,
            name: shift.name,
            timings: shiftTimings.results
                .filter((t) => t.shift_id === shift.id)
                .map((t) => ({
                    period: t.period,
                    startTime: t.start_time,
                    endTime: t.end_time,
                })),
        }));

        // Build departments config with nested years/shifts/sections
        const departmentsConfig = departments.results.map((dept) => {
            // Get all timetables for this department
            const deptTimetables = timetables.results.filter(
                (t) => t.department_id === dept.id
            );

            // Group by year
            const yearGroups = new Map<string, TimetableRow[]>();
            for (const tt of deptTimetables) {
                if (!yearGroups.has(tt.year)) {
                    yearGroups.set(tt.year, []);
                }
                yearGroups.get(tt.year)!.push(tt);
            }

            const years = Array.from(yearGroups.entries()).map(([year, yearTTs]) => {
                // Check if this year has shift/section breakdowns
                const hasShifts = yearTTs.some((t) => t.shift_id);
                const hasSections = yearTTs.some((t) => t.section);

                if (hasShifts) {
                    // Group by shift
                    const shiftGroups = new Map<string, TimetableRow[]>();
                    for (const tt of yearTTs) {
                        const sid = tt.shift_id || 'default';
                        if (!shiftGroups.has(sid)) {
                            shiftGroups.set(sid, []);
                        }
                        shiftGroups.get(sid)!.push(tt);
                    }

                    const shiftDetails = Array.from(shiftGroups.entries()).map(
                        ([shiftId, shiftTTs]) => {
                            if (hasSections && shiftTTs.some((t) => t.section)) {
                                return {
                                    shiftId,
                                    contributor: shiftTTs[0]?.contributor || undefined,
                                    sections: shiftTTs
                                        .filter((t) => t.section)
                                        .map((t) => ({
                                            name: t.section!,
                                            timetableId: t.id,
                                            contributor: t.contributor || undefined,
                                        })),
                                };
                            }
                            return {
                                shiftId,
                                timetableId: shiftTTs[0]?.id,
                                contributor: shiftTTs[0]?.contributor || undefined,
                            };
                        }
                    );

                    const uniqueShifts = [...new Set(yearTTs.map((t) => t.shift_id).filter(Boolean))] as string[];

                    return {
                        year,
                        shifts: uniqueShifts,
                        shiftDetails,
                    };
                }

                // Simple case: one timetable per year
                return {
                    year,
                    timetableId: yearTTs[0]?.id,
                    contributor: yearTTs[0]?.contributor || undefined,
                };
            });

            return {
                name: dept.name,
                years,
            };
        });

        return c.json({
            departments: departmentsConfig,
            shifts: shiftsConfig,
        });
    } catch (error) {
        console.error('Error fetching config:', error);
        return c.json({ error: 'Failed to fetch configuration' }, 500);
    }
});

export default config;
