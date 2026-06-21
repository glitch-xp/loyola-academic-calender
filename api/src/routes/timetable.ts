import { Hono } from 'hono';
import { Env, TimetableEntryRow } from '../types';

const timetable = new Hono<{ Bindings: Env }>();

/**
 * GET /api/timetable/:id
 * Returns timetable data in the exact format the frontend expects:
 * { "1": [{ "name": "...", "code": "..." }, ...], "2": [...], ... "6": [...] }
 */
timetable.get('/:id', async (c) => {
    const timetableId = c.req.param('id');
    const db = c.env.DB;

    try {
        // Check if timetable exists
        const ttExists = await db
            .prepare('SELECT id FROM timetables WHERE id = ?')
            .bind(timetableId)
            .first();

        if (!ttExists) {
            return c.json({ error: 'Timetable not found' }, 404);
        }

        // Fetch all entries for this timetable
        const result = await db
            .prepare(
                'SELECT * FROM timetable_entries WHERE timetable_id = ? ORDER BY day_order, period'
            )
            .bind(timetableId)
            .all<TimetableEntryRow>();

        // Transform to the format the frontend expects
        const timetableData: Record<string, any[]> = {};

        for (const entry of result.results) {
            const dayKey = String(entry.day_order);
            if (!timetableData[dayKey]) {
                timetableData[dayKey] = [];
            }
            timetableData[dayKey].push({
                name: entry.subject_name,
                code: entry.subject_code || '',
                ...(entry.room && { room: entry.room }),
                ...(entry.teacher && { teacher: entry.teacher }),
            });
        }

        // Ensure all 6 day orders exist (even if empty)
        for (let i = 1; i <= 6; i++) {
            if (!timetableData[String(i)]) {
                timetableData[String(i)] = [];
            }
        }

        return c.json(timetableData);
    } catch (error) {
        console.error('Error fetching timetable:', error);
        return c.json({ error: 'Failed to fetch timetable' }, 500);
    }
});

export default timetable;
