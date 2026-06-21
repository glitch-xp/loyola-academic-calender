import { Hono } from 'hono';
import { Env } from '../types';

const contributions = new Hono<{ Bindings: Env }>();

// ─── Sanitization Helpers ────────────────────────────────────────────────────

/** Strip HTML tags and trim whitespace */
function stripHtml(str: string): string {
    return str.replace(/<[^>]*>/g, '').trim();
}

/** Validate a string field: strip HTML, enforce max length */
function sanitizeString(value: unknown, maxLen: number): string | null {
    if (value === undefined || value === null || value === '') return '';
    if (typeof value !== 'string') return null; // invalid type
    const cleaned = stripHtml(value).substring(0, maxLen);
    // Reject strings that are only whitespace or control characters
    if (/^[\s\x00-\x1f]*$/.test(cleaned) && cleaned.length > 0) return '';
    return cleaned;
}

/** Validate that a string matches a safe pattern (alphanumeric + basic chars) */
function isSafeAlphanumeric(str: string, maxLen: number): boolean {
    if (str.length > maxLen) return false;
    return /^[a-zA-Z0-9\s\-_.]*$/.test(str);
}

// ─── Timetable Data Validation ───────────────────────────────────────────────

interface TimetableEntry {
    name: string;
    code: string;
    room?: string;
    teacher?: string;
}

type TimetableData = Record<string, TimetableEntry[]>;

function validateAndSanitizeTimetable(data: unknown): { valid: boolean; sanitized?: TimetableData; error?: string } {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return { valid: false, error: 'Timetable data must be an object' };
    }

    const obj = data as Record<string, unknown>;
    const validDayOrders = ['1', '2', '3', '4', '5', '6'];
    const result: TimetableData = {};

    // Check for unexpected keys
    const keys = Object.keys(obj);
    for (const key of keys) {
        if (!validDayOrders.includes(key)) {
            return { valid: false, error: `Invalid day order key: "${key}". Only 1-6 are allowed.` };
        }
    }

    let totalEntries = 0;
    let hasAnySubject = false;

    for (const dayOrder of validDayOrders) {
        const dayData = obj[dayOrder];
        if (dayData === undefined || dayData === null) {
            result[dayOrder] = [];
            continue;
        }

        if (!Array.isArray(dayData)) {
            return { valid: false, error: `Day order ${dayOrder} must be an array` };
        }

        if (dayData.length > 8) {
            return { valid: false, error: `Day order ${dayOrder} has too many periods (max 8)` };
        }

        const sanitizedDay: TimetableEntry[] = [];

        for (let i = 0; i < dayData.length; i++) {
            const entry = dayData[i];
            if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
                return { valid: false, error: `Day ${dayOrder}, period ${i + 1}: invalid entry format` };
            }

            const name = sanitizeString(entry.name, 100);
            const code = sanitizeString(entry.code, 20);
            const room = sanitizeString(entry.room, 20);
            const teacher = sanitizeString(entry.teacher, 50);

            if (name === null || code === null || room === null || teacher === null) {
                return { valid: false, error: `Day ${dayOrder}, period ${i + 1}: contains invalid field types` };
            }

            if (name.length > 0) hasAnySubject = true;

            sanitizedDay.push({
                name,
                code,
                ...(room ? { room } : {}),
                ...(teacher ? { teacher } : {}),
            });

            totalEntries++;
        }

        result[dayOrder] = sanitizedDay;
    }

    if (!hasAnySubject) {
        return { valid: false, error: 'Timetable must contain at least one subject' };
    }

    if (totalEntries > 48) {
        return { valid: false, error: 'Too many total entries (max 48)' };
    }

    return { valid: true, sanitized: result };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * POST /api/contributions
 * Public endpoint — students submit a timetable for review.
 */
contributions.post('/', async (c) => {
    const db = c.env.DB;

    // ── Request size check ──────────────────────────────────────────────
    const contentLength = c.req.header('content-length');
    if (contentLength && parseInt(contentLength) > 51200) {
        return c.json({ error: 'Request too large (max 50KB)' }, 413);
    }

    let body: any;
    try {
        body = await c.req.json();
    } catch {
        return c.json({ error: 'Invalid JSON body' }, 400);
    }

    if (!body || typeof body !== 'object') {
        return c.json({ error: 'Request body must be a JSON object' }, 400);
    }

    // ── Rate limiting (5 submissions per hour per IP) ───────────────────
    const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

    const recentCount = await db
        .prepare(
            `SELECT COUNT(*) as count FROM pending_contributions 
             WHERE submitted_ip = ? AND created_at > ?`
        )
        .bind(clientIp, oneHourAgo)
        .first<{ count: number }>();

    if (recentCount && recentCount.count >= 5) {
        return c.json({ error: 'Too many submissions. Please try again later.' }, 429);
    }

    // ── Extract and validate fields ─────────────────────────────────────
    const { department_id, year, shift_id, section, contributor_name, timetable_data } = body;

    // Department: must be a non-empty string and exist in DB
    if (!department_id || typeof department_id !== 'string') {
        return c.json({ error: 'department_id is required' }, 400);
    }

    const cleanDeptId = stripHtml(department_id).substring(0, 100);
    const deptExists = await db
        .prepare('SELECT id FROM departments WHERE id = ?')
        .bind(cleanDeptId)
        .first();

    if (!deptExists) {
        return c.json({ error: 'Invalid department' }, 400);
    }

    // Year: must be I, II, or III
    if (!year || !['I', 'II', 'III'].includes(year)) {
        return c.json({ error: 'year must be I, II, or III' }, 400);
    }

    // Shift: optional, but if provided must exist in DB
    let cleanShiftId: string | null = null;
    if (shift_id !== undefined && shift_id !== null && shift_id !== '') {
        if (typeof shift_id !== 'string') {
            return c.json({ error: 'shift_id must be a string' }, 400);
        }
        cleanShiftId = stripHtml(shift_id).substring(0, 20);
        const shiftExists = await db
            .prepare('SELECT id FROM shifts WHERE id = ?')
            .bind(cleanShiftId)
            .first();

        if (!shiftExists) {
            return c.json({ error: 'Invalid shift' }, 400);
        }
    }

    // Section: optional, alphanumeric only, max 10 chars
    let cleanSection: string | null = null;
    if (section !== undefined && section !== null && section !== '') {
        if (typeof section !== 'string') {
            return c.json({ error: 'section must be a string' }, 400);
        }
        cleanSection = stripHtml(section).substring(0, 10);
        if (!isSafeAlphanumeric(cleanSection, 10)) {
            return c.json({ error: 'section contains invalid characters' }, 400);
        }
    }

    // Contributor name: optional, max 50 chars
    let cleanContributor: string | null = null;
    if (contributor_name !== undefined && contributor_name !== null && contributor_name !== '') {
        if (typeof contributor_name !== 'string') {
            return c.json({ error: 'contributor_name must be a string' }, 400);
        }
        cleanContributor = stripHtml(contributor_name).substring(0, 50);
        if (cleanContributor.length === 0) cleanContributor = null;
    }

    // Timetable data: full validation and sanitization
    const ttValidation = validateAndSanitizeTimetable(timetable_data);
    if (!ttValidation.valid) {
        return c.json({ error: ttValidation.error }, 400);
    }

    // ── Duplicate detection ─────────────────────────────────────────────
    const existingPending = await db
        .prepare(
            `SELECT id FROM pending_contributions 
             WHERE department_id = ? AND year = ? 
             AND (shift_id = ? OR (shift_id IS NULL AND ? IS NULL))
             AND (section = ? OR (section IS NULL AND ? IS NULL))
             AND status = 'pending'`
        )
        .bind(cleanDeptId, year, cleanShiftId, cleanShiftId, cleanSection, cleanSection)
        .first();

    if (existingPending) {
        return c.json({
            error: 'A contribution for this department/year/shift/section is already pending review.'
        }, 409);
    }

    // ── Insert ──────────────────────────────────────────────────────────
    const timetableJson = JSON.stringify(ttValidation.sanitized);

    // Final size check on the serialized data
    if (timetableJson.length > 51200) {
        return c.json({ error: 'Timetable data too large' }, 413);
    }

    const result = await db
        .prepare(
            `INSERT INTO pending_contributions 
             (department_id, year, shift_id, section, contributor_name, timetable_data, submitted_ip)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
            cleanDeptId,
            year,
            cleanShiftId,
            cleanSection,
            cleanContributor,
            timetableJson,
            clientIp
        )
        .run();

    return c.json({
        success: true,
        id: result.meta.last_row_id,
        message: 'Your timetable has been submitted for review. Thank you!'
    }, 201);
});

/**
 * GET /api/contributions/check
 * Check if a pending contribution already exists for a given slot.
 * Query params: department_id, year, shift_id (optional), section (optional)
 */
contributions.get('/check', async (c) => {
    const db = c.env.DB;
    const deptId = c.req.query('department_id');
    const year = c.req.query('year');
    const shiftId = c.req.query('shift_id') || null;
    const section = c.req.query('section') || null;

    if (!deptId || !year) {
        return c.json({ error: 'department_id and year are required' }, 400);
    }

    const existing = await db
        .prepare(
            `SELECT id, status, created_at FROM pending_contributions 
             WHERE department_id = ? AND year = ? 
             AND (shift_id = ? OR (shift_id IS NULL AND ? IS NULL))
             AND (section = ? OR (section IS NULL AND ? IS NULL))
             AND status = 'pending'
             LIMIT 1`
        )
        .bind(deptId, year, shiftId, shiftId, section, section)
        .first();

    return c.json({
        hasPending: !!existing,
        submission: existing ? { id: existing.id, created_at: existing.created_at } : null
    });
});

export default contributions;
