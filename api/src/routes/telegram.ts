import { Hono } from 'hono';
import { Env } from '../types';
import { sendTelegramContributionNotification } from '../services/telegram';

const telegram = new Hono<{ Bindings: Env }>();

const DEFAULT_BOT_TOKEN = '8603958753:AAFiXxlGs5WB-KaU0M9fZTwq1ZjfhaDQr_M';

/**
 * GET /api/telegram/info
 * Returns Telegram bot info and subscription count.
 */
telegram.get('/info', async (c) => {
    const token = c.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;

    try {
        const botRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
        const botData: any = await botRes.json();

        let subCount = 0;
        if (c.env.DB) {
            try {
                const countRes = await c.env.DB.prepare('SELECT COUNT(*) as count FROM telegram_subscriptions').first<{ count: number }>();
                subCount = countRes?.count || 0;
            } catch (err) {}
        }

        return c.json({
            ok: true,
            bot: botData.result || null,
            subscriberCount: subCount,
            hasEnvChatId: !!c.env.TELEGRAM_CHAT_ID,
            hasWebhookUrl: !!c.env.TELEGRAM_WEBHOOK_URL,
        });
    } catch (err: any) {
        return c.json({ error: 'Failed to fetch Telegram bot info', details: err.message }, 500);
    }
});

/**
 * POST /api/telegram/webhook
 * Receive incoming updates from Telegram webhook.
 */
telegram.post('/webhook', async (c) => {
    let update: any;
    try {
        update = await c.req.json();
    } catch {
        return c.json({ error: 'Invalid JSON' }, 400);
    }

    const message = update?.message || update?.channel_post;
    if (!message || !message.chat) {
        return c.json({ status: 'ignored' }, 200);
    }

    const chatId = String(message.chat.id);
    const username = message.from?.username || message.chat?.username || null;
    const firstName = message.from?.first_name || message.chat?.title || null;
    const text = (message.text || '').trim();

    // Store subscriber in D1 if available
    if (c.env.DB) {
        try {
            await c.env.DB.prepare(
                `INSERT INTO telegram_subscriptions (chat_id, username, first_name)
                 VALUES (?, ?, ?)
                 ON CONFLICT(chat_id) DO UPDATE SET username = excluded.username, first_name = excluded.first_name`
            )
                .bind(chatId, username, firstName)
                .run();
        } catch (dbErr) {
            console.error('Error saving telegram subscriber:', dbErr);
        }
    }

    // Send confirmation back if user sent /start or /help
    if (text.startsWith('/start') || text.startsWith('/help')) {
        const token = c.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;
        const replyText = [
            `✅ <b>Loyola Timetable Notification Bot Activated!</b>`,
            ``,
            `You will now receive instant Telegram notifications whenever a new timetable contribution is submitted by students for review.`,
            ``,
            `<b>Chat ID:</b> <code>${chatId}</code>`
        ].join('\n');

        c.executionCtx?.waitUntil(
            fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: replyText,
                    parse_mode: 'HTML',
                }),
            })
        );
    }

    return c.json({ status: 'ok', chat_id: chatId });
});

/**
 * POST /api/telegram/test
 * Send a test notification to Telegram subscribers.
 */
telegram.post('/test', async (c) => {
    const result = await sendTelegramContributionNotification(c.env, {
        id: 999,
        department_id: 'bcom_ca',
        year: 'II',
        shift_id: '1',
        section: 'A',
        contributor_name: 'Test Contributor',
        timetable_data: { '1': [{ name: 'Test Subject', code: 'TS101' }] },
        clientIp: '127.0.0.1',
    });

    return c.json({
        message: 'Test notification executed',
        result,
    });
});

/**
 * POST /api/telegram/set-webhook
 * Registers the Cloudflare Worker URL with Telegram API.
 */
telegram.post('/set-webhook', async (c) => {
    let body: any = {};
    try {
        body = await c.req.json();
    } catch {}

    const token = c.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;
    const webhookUrl = body.url || `${new URL(c.req.url).origin}/api/telegram/webhook`;

    try {
        const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
        const data: any = await response.json();
        return c.json({ success: data.ok, webhookUrl, telegramResponse: data });
    } catch (err: any) {
        return c.json({ error: err.message }, 500);
    }
});

export default telegram;
