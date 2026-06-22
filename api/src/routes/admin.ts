import { Hono } from 'hono';
import { Env } from '../types';
import { authMiddleware, createJWT, hashPassword, verifyPassword } from '../middleware/auth';

const admin = new Hono<{ Bindings: Env; Variables: { adminUser: any } }>();

// ─── Auth ────────────────────────────────────────────────────────────────────

admin.post('/login', async (c) => {
    const { username, password } = await c.req.json();

    if (!username || !password) {
        return c.json({ error: 'Username and password are required' }, 400);
    }

    const user = await c.env.DB
        .prepare('SELECT * FROM admin_users WHERE username = ?')
        .bind(username)
        .first<{ id: number; username: string; password_hash: string }>();

    if (!user) {
        return c.json({ error: 'Invalid credentials' }, 401);
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
        return c.json({ error: 'Invalid credentials' }, 401);
    }

    const token = await createJWT(
        { sub: user.id, username: user.username },
        c.env.JWT_SECRET
    );

    return c.json({ token, username: user.username });
});



// Protected routes
admin.use('/departments/*', authMiddleware);
admin.use('/shifts/*', authMiddleware);
admin.use('/timetables/*', authMiddleware);
admin.use('/timetable-entries/*', authMiddleware);
admin.use('/calendar/*', authMiddleware);
admin.use('/releases/*', authMiddleware);
admin.use('/contributions/*', authMiddleware);
admin.use('/contributions', authMiddleware);
admin.use('/change-password', authMiddleware);
admin.use('/stats', authMiddleware);
admin.use('/seed', authMiddleware);

admin.use('/departments', authMiddleware);
admin.use('/shifts', authMiddleware);
admin.use('/timetables', authMiddleware);
admin.use('/timetable-entries', authMiddleware);
admin.use('/calendar', authMiddleware);
admin.use('/releases', authMiddleware);

// ─── Departments ─────────────────────────────────────────────────────────────

admin.get('/departments', async (c) => {
    const result = await c.env.DB
        .prepare('SELECT * FROM departments ORDER BY sort_order, name')
        .all();
    return c.json(result.results);
});

admin.post('/departments', async (c) => {
    const { id, name, sort_order } = await c.req.json();
    if (!id || !name) return c.json({ error: 'id and name are required' }, 400);

    await c.env.DB
        .prepare('INSERT INTO departments (id, name, sort_order) VALUES (?, ?, ?)')
        .bind(id, name, sort_order || 0)
        .run();

    return c.json({ success: true, id });
});

admin.put('/departments/:id', async (c) => {
    const id = c.req.param('id');
    const { name, sort_order } = await c.req.json();

    await c.env.DB
        .prepare('UPDATE departments SET name = ?, sort_order = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .bind(name, sort_order || 0, id)
        .run();

    return c.json({ success: true });
});

admin.delete('/departments/:id', async (c) => {
    const id = c.req.param('id');

    await c.env.DB
        .prepare('DELETE FROM departments WHERE id = ?')
        .bind(id)
        .run();

    return c.json({ success: true });
});

// ─── Shifts ──────────────────────────────────────────────────────────────────

admin.get('/shifts', async (c) => {
    const shifts = await c.env.DB.prepare('SELECT * FROM shifts').all();
    const timings = await c.env.DB.prepare('SELECT * FROM shift_timings ORDER BY shift_id, period').all();

    const result = shifts.results.map((shift: any) => ({
        ...shift,
        timings: timings.results.filter((t: any) => t.shift_id === shift.id),
    }));

    return c.json(result);
});

admin.post('/shifts', async (c) => {
    const { id, name, timings } = await c.req.json();
    if (!id || !name) return c.json({ error: 'id and name are required' }, 400);

    await c.env.DB.prepare('INSERT INTO shifts (id, name) VALUES (?, ?)').bind(id, name).run();

    if (timings && Array.isArray(timings)) {
        for (const t of timings) {
            await c.env.DB
                .prepare('INSERT INTO shift_timings (shift_id, period, start_time, end_time) VALUES (?, ?, ?, ?)')
                .bind(id, t.period, t.startTime || t.start_time, t.endTime || t.end_time)
                .run();
        }
    }

    return c.json({ success: true, id });
});

admin.put('/shifts/:id', async (c) => {
    const id = c.req.param('id');
    const { name, timings } = await c.req.json();

    if (name) {
        await c.env.DB.prepare('UPDATE shifts SET name = ? WHERE id = ?').bind(name, id).run();
    }

    if (timings && Array.isArray(timings)) {
        await c.env.DB.prepare('DELETE FROM shift_timings WHERE shift_id = ?').bind(id).run();
        for (const t of timings) {
            await c.env.DB
                .prepare('INSERT INTO shift_timings (shift_id, period, start_time, end_time) VALUES (?, ?, ?, ?)')
                .bind(id, t.period, t.startTime || t.start_time, t.endTime || t.end_time)
                .run();
        }
    }

    return c.json({ success: true });
});

admin.delete('/shifts/:id', async (c) => {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM shift_timings WHERE shift_id = ?').bind(id).run();
    await c.env.DB.prepare('DELETE FROM shifts WHERE id = ?').bind(id).run();
    return c.json({ success: true });
});

// ─── Timetables ──────────────────────────────────────────────────────────────

admin.get('/timetables', async (c) => {
    const result = await c.env.DB
        .prepare(`
            SELECT t.*, d.name as department_name 
            FROM timetables t 
            LEFT JOIN departments d ON t.department_id = d.id 
            ORDER BY d.sort_order, d.name, t.year, t.shift_id, t.section
        `)
        .all();
    return c.json(result.results);
});

admin.post('/timetables', async (c) => {
    const { id, department_id, year, shift_id, section, contributor } = await c.req.json();
    if (!id || !department_id || !year) {
        return c.json({ error: 'id, department_id, and year are required' }, 400);
    }

    await c.env.DB
        .prepare(
            'INSERT INTO timetables (id, department_id, year, shift_id, section, contributor) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .bind(id, department_id, year, shift_id || null, section || null, contributor || null)
        .run();

    return c.json({ success: true, id });
});

admin.put('/timetables/:id', async (c) => {
    const id = c.req.param('id');
    const { department_id, year, shift_id, section, contributor } = await c.req.json();

    await c.env.DB
        .prepare(
            `UPDATE timetables SET department_id = ?, year = ?, shift_id = ?, section = ?, contributor = ?, updated_at = datetime('now') WHERE id = ?`
        )
        .bind(department_id, year, shift_id || null, section || null, contributor || null, id)
        .run();

    return c.json({ success: true });
});

admin.delete('/timetables/:id', async (c) => {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM timetable_entries WHERE timetable_id = ?').bind(id).run();
    await c.env.DB.prepare('DELETE FROM timetables WHERE id = ?').bind(id).run();
    return c.json({ success: true });
});

// ─── Timetable Entries ───────────────────────────────────────────────────────

admin.get('/timetable-entries/:timetableId', async (c) => {
    const timetableId = c.req.param('timetableId');

    const result = await c.env.DB
        .prepare('SELECT * FROM timetable_entries WHERE timetable_id = ? ORDER BY day_order, period')
        .bind(timetableId)
        .all();

    return c.json(result.results);
});

admin.post('/timetable-entries', async (c) => {
    const { timetable_id, day_order, period, subject_name, subject_code, teacher } = await c.req.json();

    if (!timetable_id || !day_order || !period) {
        return c.json({ error: 'timetable_id, day_order, and period are required' }, 400);
    }

    const result = await c.env.DB
        .prepare(
            'INSERT INTO timetable_entries (timetable_id, day_order, period, subject_name, subject_code, teacher) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .bind(timetable_id, day_order, period, subject_name || '', subject_code || '', teacher || '')
        .run();

    return c.json({ success: true, id: result.meta.last_row_id });
});

admin.put('/timetable-entries/:id', async (c) => {
    const id = c.req.param('id');
    const { subject_name, subject_code, teacher } = await c.req.json();

    await c.env.DB
        .prepare(
            'UPDATE timetable_entries SET subject_name = ?, subject_code = ?, teacher = ? WHERE id = ?'
        )
        .bind(subject_name || '', subject_code || '', teacher || '', id)
        .run();

    return c.json({ success: true });
});

admin.delete('/timetable-entries/:id', async (c) => {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM timetable_entries WHERE id = ?').bind(id).run();
    return c.json({ success: true });
});

// Bulk save: replace all entries for a timetable
admin.post('/timetable-entries/bulk/:timetableId', async (c) => {
    const timetableId = c.req.param('timetableId');
    const { entries } = await c.req.json();

    if (!Array.isArray(entries)) {
        return c.json({ error: 'entries must be an array' }, 400);
    }

    // Delete existing entries
    await c.env.DB
        .prepare('DELETE FROM timetable_entries WHERE timetable_id = ?')
        .bind(timetableId)
        .run();

    // Insert new entries
    for (const entry of entries) {
        await c.env.DB
            .prepare(
                'INSERT INTO timetable_entries (timetable_id, day_order, period, subject_name, subject_code, teacher) VALUES (?, ?, ?, ?, ?, ?)'
            )
            .bind(
                timetableId,
                entry.day_order,
                entry.period,
                entry.subject_name || '',
                entry.subject_code || '',
                entry.teacher || ''
            )
            .run();
    }

    // Update timetable timestamp
    await c.env.DB
        .prepare("UPDATE timetables SET updated_at = datetime('now') WHERE id = ?")
        .bind(timetableId)
        .run();

    return c.json({ success: true, count: entries.length });
});

// ─── Calendar ────────────────────────────────────────────────────────────────

admin.get('/calendar', async (c) => {
    const month = c.req.query('month'); // Optional: "2025-06" format
    let query = 'SELECT * FROM calendar_days';
    const params: string[] = [];

    if (month) {
        query += ' WHERE date LIKE ?';
        params.push(`${month}%`);
    }

    query += ' ORDER BY date';

    const stmt = params.length > 0
        ? c.env.DB.prepare(query).bind(...params)
        : c.env.DB.prepare(query);

    const result = await stmt.all();
    return c.json(result.results);
});

admin.post('/calendar', async (c) => {
    const { date, day_order, is_holiday, event_title, event_description } = await c.req.json();

    if (!date) return c.json({ error: 'date is required' }, 400);

    await c.env.DB
        .prepare(
            'INSERT OR REPLACE INTO calendar_days (date, day_order, is_holiday, event_title, event_description) VALUES (?, ?, ?, ?, ?)'
        )
        .bind(date, day_order || null, is_holiday ? 1 : 0, event_title || null, event_description || null)
        .run();

    return c.json({ success: true });
});

// Bulk save calendar days
admin.post('/calendar/bulk', async (c) => {
    const { days } = await c.req.json();

    if (!Array.isArray(days)) {
        return c.json({ error: 'days must be an array' }, 400);
    }

    for (const day of days) {
        await c.env.DB
            .prepare(
                'INSERT OR REPLACE INTO calendar_days (date, day_order, is_holiday, event_title, event_description) VALUES (?, ?, ?, ?, ?)'
            )
            .bind(
                day.date,
                day.day_order || null,
                day.is_holiday ? 1 : 0,
                day.event_title || null,
                day.event_description || null
            )
            .run();
    }

    return c.json({ success: true, count: days.length });
});

admin.delete('/calendar/:date', async (c) => {
    const date = c.req.param('date');
    await c.env.DB.prepare('DELETE FROM calendar_days WHERE date = ?').bind(date).run();
    return c.json({ success: true });
});

// ─── Releases ────────────────────────────────────────────────────────────────

admin.get('/releases', async (c) => {
    const result = await c.env.DB
        .prepare('SELECT * FROM app_releases ORDER BY created_at DESC')
        .all();
    return c.json(result.results);
});

admin.post('/releases', async (c) => {
    const { version, platform, release_notes, download_url, is_latest } = await c.req.json();

    if (!version || !platform) {
        return c.json({ error: 'version and platform are required' }, 400);
    }

    // If marking as latest, unmark previous latest for this platform
    if (is_latest) {
        await c.env.DB
            .prepare('UPDATE app_releases SET is_latest = 0 WHERE platform = ?')
            .bind(platform)
            .run();
    }

    const result = await c.env.DB
        .prepare(
            'INSERT INTO app_releases (version, platform, release_notes, download_url, is_latest) VALUES (?, ?, ?, ?, ?)'
        )
        .bind(version, platform, release_notes || null, download_url || null, is_latest ? 1 : 0)
        .run();

    return c.json({ success: true, id: result.meta.last_row_id });
});

admin.put('/releases/:id', async (c) => {
    const id = c.req.param('id');
    const { version, platform, release_notes, download_url, is_latest } = await c.req.json();

    if (is_latest) {
        await c.env.DB
            .prepare('UPDATE app_releases SET is_latest = 0 WHERE platform = ?')
            .bind(platform)
            .run();
    }

    await c.env.DB
        .prepare(
            'UPDATE app_releases SET version = ?, platform = ?, release_notes = ?, download_url = ?, is_latest = ? WHERE id = ?'
        )
        .bind(version, platform, release_notes || null, download_url || null, is_latest ? 1 : 0, id)
        .run();

    return c.json({ success: true });
});

admin.delete('/releases/:id', async (c) => {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM app_releases WHERE id = ?').bind(id).run();
    return c.json({ success: true });
});

// ─── Password Change ─────────────────────────────────────────────────────────

admin.post('/change-password', async (c) => {
    const { currentPassword, newPassword } = await c.req.json();
    const adminUser = c.get('adminUser') as any;

    const user = await c.env.DB
        .prepare('SELECT * FROM admin_users WHERE id = ?')
        .bind(adminUser.sub)
        .first<{ id: number; password_hash: string }>();

    if (!user) return c.json({ error: 'User not found' }, 404);

    const valid = await verifyPassword(currentPassword, user.password_hash);
    if (!valid) return c.json({ error: 'Current password is incorrect' }, 401);

    const newHash = await hashPassword(newPassword);
    await c.env.DB
        .prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?')
        .bind(newHash, user.id)
        .run();

    return c.json({ success: true });
});

// ─── Contributions (Moderation Queue) ────────────────────────────────────────

admin.get('/contributions', async (c) => {
    const status = c.req.query('status'); // 'pending', 'approved', 'rejected', or omit for all
    const db = c.env.DB;

    let query = `
        SELECT pc.*, d.name as department_name 
        FROM pending_contributions pc
        LEFT JOIN departments d ON pc.department_id = d.id
    `;
    const params: string[] = [];

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
        query += ' WHERE pc.status = ?';
        params.push(status);
    }

    query += ' ORDER BY pc.created_at DESC';

    const stmt = params.length > 0
        ? db.prepare(query).bind(...params)
        : db.prepare(query);

    const result = await stmt.all();
    return c.json(result.results);
});

admin.get('/contributions/:id', async (c) => {
    const id = c.req.param('id');
    const db = c.env.DB;

    const contribution = await db
        .prepare(`
            SELECT pc.*, d.name as department_name 
            FROM pending_contributions pc
            LEFT JOIN departments d ON pc.department_id = d.id
            WHERE pc.id = ?
        `)
        .bind(id)
        .first();

    if (!contribution) {
        return c.json({ error: 'Contribution not found' }, 404);
    }

    // Also fetch existing timetable for this slot (for comparison)
    let existingTimetable = null;
    const existingTT = await db
        .prepare(`
            SELECT id FROM timetables 
            WHERE department_id = ? AND year = ? 
            AND (shift_id = ? OR (shift_id IS NULL AND ? IS NULL))
            AND (section = ? OR (section IS NULL AND ? IS NULL))
        `)
        .bind(
            contribution.department_id,
            contribution.year,
            contribution.shift_id, contribution.shift_id,
            contribution.section, contribution.section
        )
        .first();

    if (existingTT) {
        const entries = await db
            .prepare('SELECT * FROM timetable_entries WHERE timetable_id = ? ORDER BY day_order, period')
            .bind((existingTT as any).id)
            .all();

        // Transform to same format as contribution data
        const timetableData: Record<string, any[]> = {};
        for (const entry of entries.results) {
            const dayKey = String((entry as any).day_order);
            if (!timetableData[dayKey]) timetableData[dayKey] = [];
            timetableData[dayKey].push({
                name: (entry as any).subject_name,
                code: (entry as any).subject_code || '',
                ...((entry as any).teacher ? { teacher: (entry as any).teacher } : {}),
            });
        }

        existingTimetable = {
            id: (existingTT as any).id,
            data: timetableData
        };
    }

    return c.json({
        contribution,
        existingTimetable
    });
});

admin.post('/contributions/:id/approve', async (c) => {
    const id = c.req.param('id');
    const db = c.env.DB;
    const adminUser = c.get('adminUser') as any;

    let body = {};
    try {
        body = await c.req.json();
    } catch (e) {}

    const overrideDeptId = (body as any).department_id;
    const overrideDeptName = (body as any).department_name;
    const overrideYear = (body as any).year;
    const overrideShiftId = (body as any).shift_id;
    const overrideSection = (body as any).section;

    try {
        const contribution = await db
            .prepare('SELECT * FROM pending_contributions WHERE id = ? AND status = ?')
            .bind(id, 'pending')
            .first();

        if (!contribution) {
            return c.json({ error: 'Contribution not found or already reviewed' }, 404);
        }

        const contrib = contribution as any;
        if (overrideDeptId) contrib.department_id = overrideDeptId;
        if (overrideYear) contrib.year = overrideYear;
        if (overrideShiftId !== undefined) contrib.shift_id = overrideShiftId || null;
        if (overrideSection !== undefined) contrib.section = overrideSection || null;
        
        // Always ensure department exists to prevent Foreign Key constraint errors
        if (overrideDeptName) {
            await db.prepare('INSERT INTO departments (id, name) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name')
                .bind(contrib.department_id, overrideDeptName)
                .run();
        } else {
            await db.prepare('INSERT OR IGNORE INTO departments (id, name) VALUES (?, ?)')
                .bind(contrib.department_id, contrib.department_id)
                .run();
        }

        let timetableData: Record<string, any[]>;
        try {
            timetableData = JSON.parse(contrib.timetable_data);
        } catch {
            return c.json({ error: 'Corrupt timetable data in contribution' }, 500);
        }

        // Generate a timetable ID
        const ttId = `${contrib.department_id}_${contrib.year}${contrib.shift_id ? '_s' + contrib.shift_id : ''}${contrib.section ? '_' + contrib.section : ''}_contrib`;

        // Check if a timetable already exists for this slot
        const existingTT = await db
            .prepare(`
                SELECT id FROM timetables 
                WHERE department_id = ? AND year = ? 
                AND (shift_id = ? OR (shift_id IS NULL AND ? IS NULL))
                AND (section = ? OR (section IS NULL AND ? IS NULL))
            `)
            .bind(
                contrib.department_id, contrib.year,
                contrib.shift_id, contrib.shift_id,
                contrib.section, contrib.section
            )
            .first();

        const finalTtId = existingTT ? (existingTT as any).id : ttId;

        if (existingTT) {
            // Update existing: clear old entries and update contributor
            await db.prepare('DELETE FROM timetable_entries WHERE timetable_id = ?')
                .bind(finalTtId).run();
            await db.prepare(
                `UPDATE timetables SET contributor = ?, updated_at = datetime('now') WHERE id = ?`
            ).bind(contrib.contributor_name || null, finalTtId).run();
        } else {
            // Create new timetable record
            await db.prepare(
                'INSERT INTO timetables (id, department_id, year, shift_id, section, contributor) VALUES (?, ?, ?, ?, ?, ?)'
            ).bind(
                finalTtId,
                contrib.department_id,
                contrib.year,
                contrib.shift_id || null,
                contrib.section || null,
                contrib.contributor_name || null
            ).run();
        }

        // Insert timetable entries from the contribution data
        let entryCount = 0;
        for (const [dayOrder, subjects] of Object.entries(timetableData)) {
            const dayNum = parseInt(dayOrder);
            if (isNaN(dayNum) || dayNum < 1 || dayNum > 6) continue;

            for (let period = 0; period < (subjects as any[]).length; period++) {
                const sub = (subjects as any[])[period];
                if (!sub || (!sub.name && !sub.code)) continue; // skip empty entries

                await db.prepare(
                    'INSERT INTO timetable_entries (timetable_id, day_order, period, subject_name, subject_code, teacher) VALUES (?, ?, ?, ?, ?, ?)'
                ).bind(
                    finalTtId,
                    dayNum,
                    period + 1,
                    sub.name || '',
                    sub.code || '',
                    sub.teacher || ''
                ).run();
                entryCount++;
            }
        }

        // Mark contribution as approved
        await db.prepare(
            `UPDATE pending_contributions SET status = 'approved', department_id = ?, year = ?, shift_id = ?, section = ?, reviewed_at = datetime('now'), reviewed_by = ? WHERE id = ?`
        ).bind(contrib.department_id, contrib.year, contrib.shift_id, contrib.section, adminUser.sub, id).run();

        return c.json({
            success: true,
            timetableId: finalTtId,
            entriesCreated: entryCount
        });
    } catch (error: any) {
        console.error('Approve contribution error:', error);
        return c.json({ error: error.message || 'Internal server error' }, 500);
    }
});
admin.put('/contributions/:id', async (c) => {
    const id = c.req.param('id');
    const db = c.env.DB;
    let body = {};
    try {
        body = await c.req.json();
    } catch (e) {}

    const { department_id, department_name, year, shift_id, section } = body as any;

    try {
        // Fetch the old contribution to calculate the original timetable ID
        const oldContrib = await db.prepare('SELECT * FROM pending_contributions WHERE id = ?').bind(id).first();
        if (!oldContrib) {
            return c.json({ error: 'Contribution not found' }, 404);
        }

        const oldTtId = `${oldContrib.department_id}_${oldContrib.year}${oldContrib.shift_id ? '_s' + oldContrib.shift_id : ''}${oldContrib.section ? '_' + oldContrib.section : ''}_contrib`;
        const newTtId = `${department_id}_${year}${shift_id ? '_s' + shift_id : ''}${section ? '_' + section : ''}_contrib`;

        // Update departments table if a new name is provided
        if (department_name) {
            await db.prepare('INSERT INTO departments (id, name) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name')
                .bind(department_id, department_name)
                .run();
        } else {
            await db.prepare('INSERT OR IGNORE INTO departments (id, name) VALUES (?, ?)')
                .bind(department_id, department_id)
                .run();
        }

        // Update pending_contributions record
        await db.prepare(
            `UPDATE pending_contributions SET department_id = ?, year = ?, shift_id = ?, section = ? WHERE id = ?`
        ).bind(department_id, year, shift_id || null, section || null, id).run();

        // If it was already approved, update the active timetable too
        if (oldContrib.status === 'approved') {
            await db.prepare(
                `UPDATE timetables SET id = ?, department_id = ?, year = ?, shift_id = ?, section = ?, updated_at = datetime('now') WHERE id = ?`
            ).bind(newTtId, department_id, year, shift_id || null, section || null, oldTtId).run();
            // Since we're changing the primary key of timetables and SQLite doesn't have ON UPDATE CASCADE enabled by default for foreign keys,
            // we should also update timetable_entries if the ID actually changed.
            if (oldTtId !== newTtId) {
                await db.prepare('UPDATE timetable_entries SET timetable_id = ? WHERE timetable_id = ?')
                    .bind(newTtId, oldTtId).run();
            }
        }

        return c.json({ success: true });
    } catch (error: any) {
        console.error('Update contribution error:', error);
        return c.json({ error: error.message || 'Internal server error' }, 500);
    }
});

admin.post('/contributions/:id/reject', async (c) => {
    const id = c.req.param('id');
    const db = c.env.DB;
    const adminUser = c.get('adminUser') as any;
    const { notes } = await c.req.json().catch(() => ({ notes: '' }));

    const contribution = await db
        .prepare('SELECT id FROM pending_contributions WHERE id = ? AND status = ?')
        .bind(id, 'pending')
        .first();

    if (!contribution) {
        return c.json({ error: 'Contribution not found or already reviewed' }, 404);
    }

    await db.prepare(
        `UPDATE pending_contributions SET status = 'rejected', admin_notes = ?, reviewed_at = datetime('now'), reviewed_by = ? WHERE id = ?`
    ).bind(notes || null, adminUser.sub, id).run();

    return c.json({ success: true });
});

admin.delete('/contributions/:id', async (c) => {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM pending_contributions WHERE id = ?').bind(id).run();
    return c.json({ success: true });
});

// ─── Dashboard Stats ─────────────────────────────────────────────────────────

admin.get('/stats', async (c) => {
    const [departments, timetables, calendarDays, releases, pendingContributions] = await Promise.all([
        c.env.DB.prepare('SELECT COUNT(*) as count FROM departments').first<{ count: number }>(),
        c.env.DB.prepare('SELECT COUNT(*) as count FROM timetables').first<{ count: number }>(),
        c.env.DB.prepare('SELECT COUNT(*) as count FROM calendar_days').first<{ count: number }>(),
        c.env.DB.prepare('SELECT COUNT(*) as count FROM app_releases').first<{ count: number }>(),
        c.env.DB.prepare("SELECT COUNT(*) as count FROM pending_contributions WHERE status = 'pending'").first<{ count: number }>(),
    ]);

    return c.json({
        departments: departments?.count || 0,
        timetables: timetables?.count || 0,
        calendarDays: calendarDays?.count || 0,
        releases: releases?.count || 0,
        pendingContributions: pendingContributions?.count || 0,
    });
});

// ─── Seed (bulk import) ─────────────────────────────────────────────────────

admin.post('/seed', async (c) => {
    const { masterConfig, calendar, timetables } = await c.req.json();
    const db = c.env.DB;
    let imported = { departments: 0, shifts: 0, timetables: 0, entries: 0, calendarDays: 0 };

    try {
        // Import shifts
        if (masterConfig?.shifts) {
            for (const shift of masterConfig.shifts) {
                await db.prepare('INSERT OR REPLACE INTO shifts (id, name) VALUES (?, ?)').bind(shift.id, shift.name).run();
                imported.shifts++;

                if (shift.timings) {
                    await db.prepare('DELETE FROM shift_timings WHERE shift_id = ?').bind(shift.id).run();
                    for (const t of shift.timings) {
                        await db
                            .prepare('INSERT INTO shift_timings (shift_id, period, start_time, end_time) VALUES (?, ?, ?, ?)')
                            .bind(shift.id, t.period, t.startTime, t.endTime)
                            .run();
                    }
                }
            }
        }

        // Import departments and timetable mappings
        if (masterConfig?.departments) {
            for (const dept of masterConfig.departments) {
                const deptId = dept.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
                await db
                    .prepare('INSERT OR REPLACE INTO departments (id, name, sort_order) VALUES (?, ?, ?)')
                    .bind(deptId, dept.name, imported.departments)
                    .run();
                imported.departments++;

                for (const year of dept.years || []) {
                    if (year.shiftDetails) {
                        for (const sd of year.shiftDetails) {
                            if (sd.timetableId) {
                                await db
                                    .prepare(
                                        'INSERT OR REPLACE INTO timetables (id, department_id, year, shift_id, section, contributor) VALUES (?, ?, ?, ?, ?, ?)'
                                    )
                                    .bind(sd.timetableId, deptId, year.year, sd.shiftId || null, null, sd.contributor || null)
                                    .run();
                                imported.timetables++;
                            }
                            if (sd.sections) {
                                for (const sec of sd.sections) {
                                    await db
                                        .prepare(
                                            'INSERT OR REPLACE INTO timetables (id, department_id, year, shift_id, section, contributor) VALUES (?, ?, ?, ?, ?, ?)'
                                        )
                                        .bind(sec.timetableId, deptId, year.year, sd.shiftId || null, sec.name, sec.contributor || sd.contributor || null)
                                        .run();
                                    imported.timetables++;
                                }
                            }
                        }
                    } else if (year.timetableId) {
                        await db
                            .prepare(
                                'INSERT OR REPLACE INTO timetables (id, department_id, year, shift_id, section, contributor) VALUES (?, ?, ?, ?, ?, ?)'
                            )
                            .bind(year.timetableId, deptId, year.year, null, null, year.contributor || null)
                            .run();
                        imported.timetables++;
                    }
                }
            }
        }

        // Import timetable entries
        if (timetables) {
            for (const [ttId, ttData] of Object.entries(timetables)) {
                // Clear existing entries
                await db.prepare('DELETE FROM timetable_entries WHERE timetable_id = ?').bind(ttId).run();

                const data = ttData as Record<string, any[]>;
                for (const [dayOrder, subjects] of Object.entries(data)) {
                    const dayNum = parseInt(dayOrder);
                    if (isNaN(dayNum)) continue;

                    for (let period = 0; period < subjects.length; period++) {
                        const sub = subjects[period];
                        await db
                            .prepare(
                                'INSERT INTO timetable_entries (timetable_id, day_order, period, subject_name, subject_code, teacher) VALUES (?, ?, ?, ?, ?, ?)'
                            )
                            .bind(ttId, dayNum, period + 1, sub.name || '', sub.code || '', sub.teacher || '')
                            .run();
                        imported.entries++;
                    }
                }
            }
        }

        // Import calendar
        if (calendar) {
            for (const [date, config] of Object.entries(calendar)) {
                const cfg = config as any;
                let dayOrder: number | null = null;
                if (cfg.dayOrder) {
                    const match = String(cfg.dayOrder).match(/(\d+)/);
                    dayOrder = match ? parseInt(match[1]) : null;
                }

                await db
                    .prepare(
                        'INSERT OR REPLACE INTO calendar_days (date, day_order, is_holiday, event_title, event_description) VALUES (?, ?, ?, ?, ?)'
                    )
                    .bind(date, dayOrder, cfg.isHoliday ? 1 : 0, cfg.event || null, cfg.description || null)
                    .run();
                imported.calendarDays++;
            }
        }

        return c.json({ success: true, imported });
    } catch (error) {
        console.error('Seed error:', error);
        return c.json({ error: `Seed failed: ${(error as Error).message}` }, 500);
    }
});

export default admin;
