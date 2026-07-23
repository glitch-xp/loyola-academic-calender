import { Env } from '../types';

export interface ContributionNotificationData {
    id: number;
    department_id: string;
    year: string;
    shift_id?: string | null;
    section?: string | null;
    contributor_name?: string | null;
    timetable_data?: any;
    clientIp?: string | null;
}

const DEFAULT_BOT_TOKEN = '8603958753:AAFiXxlGs5WB-KaU0M9fZTwq1ZjfhaDQr_M';
const DEFAULT_CHAT_ID = '5391995999';

/**
 * Get active Telegram chat ID (direct user ID 5391995999, without fallbacks).
 */
function getTargetChatIds(env: Env): string[] {
    const chatId = (env.TELEGRAM_CHAT_ID || DEFAULT_CHAT_ID).trim();
    return [chatId];
}

/**
 * Sends a Telegram notification when a new timetable contribution is submitted.
 */
export async function sendTelegramContributionNotification(
    env: Env,
    data: ContributionNotificationData
): Promise<{ success: boolean; deliveredChats: number; errors?: string[] }> {
    const token = env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;
    const chatIds = getTargetChatIds(env);

    // Count entries
    let entryCount = 0;
    if (data.timetable_data && typeof data.timetable_data === 'object') {
        for (const day of Object.values(data.timetable_data)) {
            if (Array.isArray(day)) {
                entryCount += day.filter((e) => e && (e.name || e.code)).length;
            }
        }
    }

    // Format rich HTML message for Telegram
    const formattedMessage = [
        `📥 <b>New Timetable Contribution Submitted!</b>`,
        ``,
        `🆔 <b>Contribution ID:</b> #${data.id}`,
        `🎓 <b>Department:</b> <code>${escapeHtml(data.department_id)}</code>`,
        `📅 <b>Year:</b> ${escapeHtml(data.year)}`,
        `🕒 <b>Shift:</b> ${data.shift_id ? escapeHtml(data.shift_id) : '<i>N/A</i>'}`,
        `🏫 <b>Section:</b> ${data.section ? escapeHtml(data.section) : '<i>N/A</i>'}`,
        `👤 <b>Contributor:</b> ${data.contributor_name ? escapeHtml(data.contributor_name) : '<i>Anonymous</i>'}`,
        `📚 <b>Total Classes Added:</b> ${entryCount}`,
        `🌐 <b>IP Address:</b> <code>${escapeHtml(data.clientIp || 'Unknown')}</code>`,
        `⏱ <b>Submitted At:</b> ${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC`,
        ``,
        `🔗 Manage in Admin Portal: <a href="https://loyola-admin.pages.dev">loyola-admin.pages.dev</a>`
    ].join('\n');

    let deliveredChats = 0;
    const errors: string[] = [];

    // Dispatch directly to Telegram API for target user ID
    for (const chatId of chatIds) {
        try {
            const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: formattedMessage,
                    parse_mode: 'HTML',
                    disable_web_page_preview: true,
                }),
            });

            if (response.ok) {
                deliveredChats++;
            } else {
                const errText = await response.text();
                errors.push(`Chat ${chatId}: ${errText}`);
            }
        } catch (err: any) {
            errors.push(`Chat ${chatId}: ${err.message}`);
        }
    }

    // Dispatch to external HTTP Webhook URL if configured
    if (env.TELEGRAM_WEBHOOK_URL) {
        try {
            await fetch(env.TELEGRAM_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: 'timetable.contribution.created',
                    timestamp: new Date().toISOString(),
                    data: {
                        ...data,
                        entryCount,
                    },
                }),
            });
        } catch (webhookErr: any) {
            errors.push(`Webhook POST failed: ${webhookErr.message}`);
        }
    }

    return {
        success: deliveredChats > 0,
        deliveredChats,
        errors: errors.length > 0 ? errors : undefined,
    };
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
