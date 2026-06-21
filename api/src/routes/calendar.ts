import { Hono } from 'hono';
import { Env, CalendarDayRow } from '../types';

const calendar = new Hono<{ Bindings: Env }>();

/**
 * GET /api/calendar
 * Returns calendar data in the exact format the frontend expects:
 * { "2025-06-02": { "dayOrder": "Day-1", "isHoliday": false }, ... }
 */
calendar.get('/', async (c) => {
    const db = c.env.DB;

    try {
        const result = await db
            .prepare('SELECT * FROM calendar_days ORDER BY date')
            .all<CalendarDayRow>();

        // Transform to the format the frontend expects
        const calendarData: Record<string, any> = {};

        for (const row of result.results) {
            calendarData[row.date] = {
                dayOrder: row.day_order ? `Day-${row.day_order}` : null,
                isHoliday: row.is_holiday === 1,
                ...(row.event_title && { event: row.event_title }),
                ...(row.event_description && { description: row.event_description }),
            };
        }

        return c.json(calendarData);
    } catch (error) {
        console.error('Error fetching calendar:', error);
        return c.json({ error: 'Failed to fetch calendar' }, 500);
    }
});

export default calendar;
