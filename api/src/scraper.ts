import * as cheerio from 'cheerio';
import { Env } from './types';

// Sleep utility for rate limiting
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1'
};

export async function scrapeCalendar(env: Env) {
    console.log('Starting calendar scraper...');
    
    const db = env.DB;
    const now = new Date();
    let currentYear = now.getFullYear();
    let currentMonth = now.getMonth() + 1; // 1-12

    const records = [];

    for (let i = 0; i < 12; i++) {
        const fetchUrl = `https://www.loyolacollege.edu/acnew.php?year=${currentYear}&month=${currentMonth}`;
        console.log(`Fetching ${fetchUrl}...`);

        try {
            const response = await fetch(fetchUrl, { headers });
            
            if (!response.ok) {
                console.error(`Failed to fetch ${fetchUrl}: ${response.status} ${response.statusText}`);
                if (response.status === 403 || response.status === 503) {
                    console.error('Possible Cloudflare block. Headers might need adjustment or proxy required.');
                }
            } else {
                const html = await response.text();
                const $ = cheerio.load(html);

                $('.events-list .event-item').each((_, el) => {
                    const dayStr = $(el).find('.event-day').text().trim();
                    const dayOrderStr = $(el).find('.event-day-order').text().trim();
                    const eventText = $(el).find('.event-text').text().trim();
                    const dayName = $(el).find('.event-day-name').text().trim();

                    if (!dayStr) return; // Skip empty rows

                    const paddedMonth = currentMonth.toString().padStart(2, '0');
                    const paddedDay = dayStr.padStart(2, '0');
                    const date = `${currentYear}-${paddedMonth}-${paddedDay}`;

                    let dayOrder = null;
                    if (dayOrderStr && dayOrderStr.toLowerCase().startsWith('day-')) {
                        const order = parseInt(dayOrderStr.replace(/[^0-9]/g, ''), 10);
                        if (!isNaN(order) && order >= 1 && order <= 6) {
                            dayOrder = order;
                        }
                    }

                    const isHoliday = (dayName.toLowerCase() === 'sunday' || eventText.toLowerCase().includes('holiday')) ? 1 : 0;

                    records.push({
                        date,
                        day_order: dayOrder,
                        is_holiday: isHoliday,
                        event_title: eventText || null,
                        event_description: null
                    });
                });
            }
        } catch (error) {
            console.error(`Error fetching ${fetchUrl}:`, error);
        }

        // Increment month
        currentMonth++;
        if (currentMonth > 12) {
            currentMonth = 1;
            currentYear++;
        }

        // Rate limiting: sleep 5 seconds if not the last iteration
        if (i < 11) {
            await sleep(5000);
        }
    }

    console.log(`Finished scraping. Parsed ${records.length} dates. Upserting to database...`);

    if (records.length > 0) {
        // Upsert into D1 Database
        // D1 limit is usually ~100 parameters per statement. We'll execute statements in chunks of 50.
        const chunkSize = 20; 
        for (let i = 0; i < records.length; i += chunkSize) {
            const chunk = records.slice(i, i + chunkSize);
            
            // Build the UPSERT query
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
            } catch (err) {
                console.error(`Error inserting chunk ${i}:`, err);
            }
        }
        console.log('Database update complete.');
    } else {
        console.warn('No records parsed. Cloudflare might be blocking the request.');
    }
}
