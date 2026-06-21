import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env } from './types';
import configRoutes from './routes/config';
import calendarRoutes from './routes/calendar';
import timetableRoutes from './routes/timetable';
import versionRoutes from './routes/version';
import adminRoutes from './routes/admin';
import contributionRoutes from './routes/contributions';
import { scrapeCalendar } from './scraper';

const app = new Hono<{ Bindings: Env }>();

// CORS — allow frontend + admin panel origins securely
app.use(
    '*',
    cors({
        origin: (origin) => {
            if (!origin) return '*'; // Allow non-browser clients (like mobile app)
            
            const allowedOrigins = [
                'http://localhost:8081', // Expo web local
                'http://localhost:5173', // Admin Vite local
                'https://loyola-timetable.pages.dev',
                'https://loyola-admin.pages.dev'
            ];
            
            // Allow exact matches or Cloudflare preview deployments
            if (allowedOrigins.includes(origin) || origin.endsWith('.pages.dev')) {
                return origin;
            }
            
            return null; // Deny other origins
        },
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
        maxAge: 86400,
    })
);

// Health check
app.get('/', (c) => {
    return c.json({
        name: 'Loyola Academic Calendar API',
        version: '1.0.0',
        status: 'ok',
    });
});

// Public API routes
app.route('/api/config', configRoutes);
app.route('/api/calendar', calendarRoutes);
app.route('/api/timetable', timetableRoutes);
app.route('/api/version', versionRoutes);
app.route('/api/contributions', contributionRoutes);

// Admin API routes
app.route('/api/admin', adminRoutes);

// 404 handler
app.notFound((c) => {
    return c.json({ error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
    console.error('Unhandled error:', err);
    return c.json({ error: 'Internal server error' }, 500);
});

export default {
    fetch: app.fetch,
    scheduled: async (event: ScheduledEvent, env: Env, ctx: ExecutionContext) => {
        ctx.waitUntil(scrapeCalendar(env));
    }
};
