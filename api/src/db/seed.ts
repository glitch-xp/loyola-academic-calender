/**
 * Seed script — reads existing JSON data files and imports them into D1
 * via the admin API's /api/admin/seed endpoint.
 * 
 * Usage:
 *   1. Start the worker locally: cd api && npm run dev
 *   2. Create an admin user first (via /api/admin/setup)
 *   3. Run: cd api && npm run seed
 * 
 * Or use with wrangler D1 directly:
 *   wrangler d1 execute loyola-db --local --file=./src/db/schema.sql
 *   Then run this script.
 */

import * as fs from 'fs';
import * as path from 'path';

const API_URL = process.env.REMOTE === 'true'
    ? 'https://loyola-api.yuvar4313.workers.dev'
    : 'http://localhost:8787';

async function seed() {
    const dataDir = path.join(__dirname, '../../../assets/data');

    console.log('📂 Reading data files from:', dataDir);

    // Read master config
    const masterConfig = JSON.parse(
        fs.readFileSync(path.join(dataDir, 'master_config.json'), 'utf-8')
    );
    console.log('✅ Read master_config.json');

    // Read calendar
    const calendar = JSON.parse(
        fs.readFileSync(path.join(dataDir, 'calendar.json'), 'utf-8')
    );
    console.log('✅ Read calendar.json');

    // Read all timetable files
    const timetableDir = path.join(dataDir, 'timetable');
    const timetableFiles = fs.readdirSync(timetableDir).filter(f => f.endsWith('.json'));
    const timetables: Record<string, any> = {};

    for (const file of timetableFiles) {
        const id = file.replace('.json', '');
        const content = fs.readFileSync(path.join(timetableDir, file), 'utf-8').trim();
        if (content.length > 1) {
            try {
                timetables[id] = JSON.parse(content);
                console.log(`✅ Read timetable/${file}`);
            } catch (e) {
                console.warn(`⚠️  Skipping ${file} — invalid JSON`);
            }
        } else {
            console.warn(`⚠️  Skipping ${file} — empty file`);
        }
    }

    console.log('\n📡 Sending seed data to API...');
    console.log(`   URL: ${API_URL}/api/admin/seed`);

    // First, try to create admin user if none exists
    try {
        const setupRes = await fetch(`${API_URL}/api/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'LoyolaAdmin2026!' }),
        });

        if (!setupRes.ok) {
            console.log('ℹ️  No admin user found, creating default admin...');
            // We need a token for setup, but setup doesn't require auth if no admin exists
            // Use a workaround: call the seed endpoint with the data directly via wrangler
            console.log('\n⚠️  Cannot seed via API without auth.');
            console.log('   Alternative: Use the admin panel to import data after creating an admin user.');
            console.log('   Or use: wrangler d1 execute loyola-db --local --command "..."');
            console.log('\n📋 Generating SQL insert statements instead...\n');
            generateSQL(masterConfig, calendar, timetables);
            return;
        }

        const { token } = await setupRes.json() as { token: string };
        console.log('✅ Authenticated as admin');

        // Send seed request
        const seedRes = await fetch(`${API_URL}/api/admin/seed`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ masterConfig, calendar, timetables }),
        });

        if (!seedRes.ok) {
            const err = await seedRes.text();
            throw new Error(`Seed failed: ${err}`);
        }

        const result = await seedRes.json();
        console.log('\n✅ Seed completed!', result);
    } catch (error) {
        console.error('❌ Seed error:', error);
        console.log('\n📋 Generating SQL insert statements as fallback...\n');
        generateSQL(masterConfig, calendar, timetables);
    }
}

function generateSQL(masterConfig: any, calendar: any, timetables: any) {
    const sqlFile = path.join(__dirname, 'seed_data.sql');
    const lines: string[] = [];

    lines.push('-- Auto-generated seed data');
    lines.push('-- Run: wrangler d1 execute loyola-db --local --file=./src/db/seed_data.sql\n');

    // Shifts
    for (const shift of masterConfig.shifts || []) {
        lines.push(`INSERT OR REPLACE INTO shifts (id, name) VALUES ('${shift.id}', '${esc(shift.name)}');`);
        for (const t of shift.timings || []) {
            lines.push(
                `INSERT OR REPLACE INTO shift_timings (shift_id, period, start_time, end_time) VALUES ('${shift.id}', ${t.period}, '${t.startTime}', '${t.endTime}');`
            );
        }
    }
    lines.push('');

    // Departments + timetable mappings
    let deptOrder = 0;
    for (const dept of masterConfig.departments || []) {
        const deptId = dept.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        lines.push(`INSERT OR REPLACE INTO departments (id, name, sort_order) VALUES ('${deptId}', '${esc(dept.name)}', ${deptOrder++});`);

        for (const year of dept.years || []) {
            if (year.shiftDetails) {
                for (const sd of year.shiftDetails) {
                    if (sd.timetableId) {
                        lines.push(
                            `INSERT OR REPLACE INTO timetables (id, department_id, year, shift_id, contributor) VALUES ('${sd.timetableId}', '${deptId}', '${year.year}', '${sd.shiftId || ''}', ${sd.contributor ? `'${esc(sd.contributor)}'` : 'NULL'});`
                        );
                    }
                }
            }
        }
    }
    lines.push('');

    // Timetable entries
    for (const [ttId, data] of Object.entries(timetables)) {
        lines.push(`-- Timetable: ${ttId}`);
        lines.push(`DELETE FROM timetable_entries WHERE timetable_id = '${ttId}';`);
        const ttData = data as Record<string, any[]>;
        for (const [dayOrder, subjects] of Object.entries(ttData)) {
            const dayNum = parseInt(dayOrder);
            if (isNaN(dayNum)) continue;
            for (let i = 0; i < subjects.length; i++) {
                const sub = subjects[i];
                lines.push(
                    `INSERT INTO timetable_entries (timetable_id, day_order, period, subject_name, subject_code) VALUES ('${ttId}', ${dayNum}, ${i + 1}, '${esc(sub.name || '')}', '${esc(sub.code || '')}');`
                );
            }
        }
        lines.push('');
    }

    // Calendar
    lines.push('-- Calendar data');
    for (const [date, config] of Object.entries(calendar)) {
        const cfg = config as any;
        let dayOrder: string = 'NULL';
        if (cfg.dayOrder) {
            const match = String(cfg.dayOrder).match(/(\d+)/);
            dayOrder = match ? match[1] : 'NULL';
        }
        const isHoliday = cfg.isHoliday ? 1 : 0;
        const event = cfg.event ? `'${esc(cfg.event)}'` : 'NULL';
        lines.push(
            `INSERT OR REPLACE INTO calendar_days (date, day_order, is_holiday, event_title) VALUES ('${date}', ${dayOrder}, ${isHoliday}, ${event});`
        );
    }

    // Default admin user (password: admin123 — CHANGE THIS!)
    lines.push('\n-- Default admin user (password: admin123)');
    lines.push("-- NOTE: You must set up admin via the API's /api/admin/setup endpoint instead,");
    lines.push('-- as password hashing requires the Web Crypto API (not available in plain SQL).');

    fs.writeFileSync(sqlFile, lines.join('\n'), 'utf-8');
    console.log(`✅ SQL file generated: ${sqlFile}`);
    console.log(`   Run: wrangler d1 execute loyola-db --local --file=./src/db/seed_data.sql`);
}

function esc(str: string): string {
    return str.replace(/'/g, "''");
}

seed().catch(console.error);
