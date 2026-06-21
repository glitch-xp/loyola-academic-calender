import { Hono } from 'hono';
import { Env, AppReleaseRow } from '../types';

const version = new Hono<{ Bindings: Env }>();

/**
 * GET /api/version?platform=android&currentVersion=1.0.4
 * Returns the latest release info for the specified platform.
 * Used by the Android app to check for updates.
 */
version.get('/', async (c) => {
    const platform = c.req.query('platform') || 'android';
    const currentVersion = c.req.query('currentVersion');
    const db = c.env.DB;

    try {
        const latest = await db
            .prepare(
                'SELECT * FROM app_releases WHERE platform = ? AND is_latest = 1 LIMIT 1'
            )
            .bind(platform)
            .first<AppReleaseRow>();

        if (!latest) {
            return c.json({
                version: null,
                isUpdateAvailable: false,
                message: 'No releases found',
            });
        }

        const isUpdateAvailable = currentVersion
            ? compareVersions(latest.version, currentVersion) > 0
            : false;

        return c.json({
            version: latest.version,
            platform: latest.platform,
            releaseNotes: latest.release_notes,
            downloadUrl: latest.download_url,
            isUpdateAvailable,
            releasedAt: latest.created_at,
        });
    } catch (error) {
        console.error('Error fetching version:', error);
        return c.json({ error: 'Failed to fetch version info' }, 500);
    }
});

/**
 * Compare two semver version strings.
 * Returns > 0 if a > b, < 0 if a < b, 0 if equal.
 */
function compareVersions(a: string, b: string): number {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);
    const maxLen = Math.max(partsA.length, partsB.length);

    for (let i = 0; i < maxLen; i++) {
        const numA = partsA[i] || 0;
        const numB = partsB[i] || 0;
        if (numA !== numB) return numA - numB;
    }

    return 0;
}

export default version;
