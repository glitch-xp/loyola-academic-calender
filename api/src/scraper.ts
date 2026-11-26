import * as cheerio from 'cheerio';
import { Env } from './types';

export interface ScrapedCalendarRecord {
    date: string;
    day_order: number | null;
    is_holiday: number;
    event_title: string | null;
    event_description: string | null;
}

export interface ScrapeResult {
    monthsScraped: number;
    recordsParsed: number;
    upserted: number;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const FETCH_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
};

const HOLIDAY_KEYWORDS = [
    'holiday',
    'vacation',
    'christmas',
    'new year',
    'pongal',
    'thiruvalluvar',
    'uzhavar',
    'thaipusam',
    'republic day',
    'independence day',
    'gandhi jayanthi',
    'may day',
    'good friday',
    'maundy thursday',
    'holy saturday',
    'easter',
    'ramzan',
    'eid',
    'bakrid',
    'muharram',
    'milad',
    'deepavali',
    'diwali',
    'ayudha pooja',
    'vijayadashami',
    'vinayakar',
    'krishna jayanthi',
    'onam',
    'mahavir',
    'ambedkar',
    "founder's day",
    'all saints',
];

function normalizeText(value: string): string | null {
    const cleaned = value.replace(/\s+/g, ' ').trim();
    if (!cleaned || /^[-–—]+$/.test(cleaned)) {
        return null;
    }
    return cleaned;
}

function parseDayOrder(value: string): number | null {
    const match = value.match(/day-\s*([1-6])\b/i);
    if (!match) return null;
    const order = parseInt(match[1], 10);
    return order >= 1 && order <= 6 ? order : null;
}

function isHolidayDay(isSunday: boolean, dayOrder: number | null, eventTitle: string | null): number {
    if (isSunday) return 1;
    if (dayOrder !== null) return 0;
    if (!eventTitle) return 0;

    const lower = eventTitle.toLowerCase();
    return HOLIDAY_KEYWORDS.some(keyword => lower.includes(keyword)) ? 1 : 0;
}

function formatIsoDate(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Parse a single month's HTML from loyolacollege.edu/acnew.php.
 * Supports the current list-view table and falls back to the calendar grid view.
 */
export function parseCalendarMonthHtml(html: string, year: number, month: number): ScrapedCalendarRecord[] {
    const $ = cheerio.load(html);
    const records: ScrapedCalendarRecord[] = [];

    // Primary source: list-view table (.events-table tbody tr)
    $('.events-table tbody tr').each((_, el) => {
        const dayText = $(el).find('.date-number-large').text().trim();
        const dayMatch = dayText.match(/^(\d{1,2})\b/);
        if (!dayMatch) return;

        const day = parseInt(dayMatch[1], 10);
        if (isNaN(day) || day < 1 || day > 31) return;

        const dayAbbr = $(el).find('.day-abbr').text().trim().toLowerCase();
        const isSunday = dayAbbr === 'sun' || dayAbbr === 'sunday';

        const eventTitle = normalizeText($(el).find('.events-cell').text());
        const dayOrderText = $(el).find('td[data-label="Day Order"]').text().trim();
        const dayOrder = parseDayOrder(dayOrderText);

        records.push({
            date: formatIsoDate(year, month, day),
            day_order: dayOrder,
            is_holiday: isHolidayDay(isSunday, dayOrder, eventTitle),
            event_title: eventTitle,
            event_description: null,
        });
    });

    if (records.length > 0) {
        return records;
    }

    // Fallback: calendar grid view (.calendar-view-container .calendar-cell)
    $('.calendar-view-container .calendar-cell').each((_, el) => {
        if ($(el).hasClass('empty') || $(el).hasClass('day-header')) return;

        const dayText = $(el).find('.date-number').text().trim();
        const day = parseInt(dayText, 10);
        if (isNaN(day) || day < 1 || day > 31) return;

        const isSunday = new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 0;
        const eventTitle = normalizeText($(el).find('.event-text').text());
        const dayOrder = parseDayOrder($(el).find('.day-order-badge').text());

        records.push({
            date: formatIsoDate(year, month, day),
            day_order: dayOrder,
            is_holiday: isHolidayDay(isSunday, dayOrder, eventTitle),
            event_title: eventTitle,
            event_description: null,
        });
    });

    return records;
}

export async function scrapeCalendar(env: Env, monthsCount: number = 6): Promise<ScrapeResult> {
    console.log('Starting calendar scraper...');

    const db = env.DB;
    // Use IST (UTC+5:30) so midnight cron runs align with the Indian calendar date
    const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    let currentYear = istNow.getUTCFullYear();
    let currentMonth = istNow.getUTCMonth() + 1; // 1-12

    const records: ScrapedCalendarRecord[] = [];
    let monthsScraped = 0;

    for (let i = 0; i < monthsCount; i++) {
        const fetchUrl = `https://www.loyolacollege.edu/acnew.php?year=${currentYear}&month=${currentMonth}`;
        console.log(`Fetching ${fetchUrl}...`);

        try {
            const response = await fetch(fetchUrl, { headers: FETCH_HEADERS });

            if (!response.ok) {
                console.error(`Failed to fetch ${fetchUrl}: ${response.status} ${response.statusText}`);
            } else {
                const html = await response.text();
                const parsed = parseCalendarMonthHtml(html, currentYear, currentMonth);
                if (parsed.length > 0) {
                    monthsScraped++;
                    records.push(...parsed);
                } else {
                    console.warn(`No calendar rows parsed for ${currentYear}-${currentMonth}`);
                }
            }
        } catch (error) {
            console.error(`Error fetching ${fetchUrl}:`, error);
        }

        currentMonth++;
        if (currentMonth > 12) {
            currentMonth = 1;
            currentYear++;
        }

        if (i < monthsCount - 1) {
            await sleep(1500);
        }
    }

    console.log(`Finished scraping. Parsed ${records.length} dates across ${monthsScraped} months. Upserting to database...`);

    let upserted = 0;
    if (records.length > 0) {
        // D1 limit is 100 bound parameters per statement; 18 rows * 5 columns = 90 params
        const chunkSize = 18;
        for (let i = 0; i < records.length; i += chunkSize) {
            const chunk = records.slice(i, i + chunkSize);
            const placeholders = chunk.map(() => '(?, ?, ?, ?, ?)').join(', ');
            const values = chunk.flatMap(r => [r.date, r.day_order, r.is_holiday, r.event_title, r.event_description]);

            const query = `
                INSERT INTO calendar_days (date, day_order, is_holiday, event_title, event_description)
                VALUES ${placeholders}
                ON CONFLICT(date) DO UPDATE SET
                    day_order = excluded.day_order,
                    is_holiday = excluded.is_holiday,
                    event_title = excluded.event_title,
                    event_description = excluded.event_description
            `;

            try {
                await db.prepare(query).bind(...values).run();
                upserted += chunk.length;
            } catch (err) {
                console.error(`Error inserting chunk ${i}:`, err);
            }
        }
        console.log('Database update complete.');
    } else {
        console.warn('No records parsed from loyolacollege.edu.');
    }

    return {
        monthsScraped,
        recordsParsed: records.length,
        upserted,
    };
}
