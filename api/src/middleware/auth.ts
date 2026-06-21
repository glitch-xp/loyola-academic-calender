import { Context, Next } from 'hono';
import { Env } from '../types';

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized: Missing or invalid token' }, 401);
    }

    const token = authHeader.substring(7);

    try {
        const payload = await verifyJWT(token, c.env.JWT_SECRET);
        c.set('adminUser', payload);
        await next();
    } catch (error) {
        return c.json({ error: 'Unauthorized: Invalid or expired token' }, 401);
    }
}

export async function createJWT(
    payload: Record<string, unknown>,
    secret: string,
    expiresInHours: number = 24
): Promise<string> {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const fullPayload = {
        ...payload,
        iat: now,
        exp: now + expiresInHours * 3600,
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        new TextEncoder().encode(signingInput)
    );

    const encodedSignature = base64UrlEncode(
        String.fromCharCode(...new Uint8Array(signature))
    );

    return `${signingInput}.${encodedSignature}`;
}

export async function verifyJWT(
    token: string,
    secret: string
): Promise<Record<string, unknown>> {
    const parts = token.split('.');
    if (parts.length !== 3) {
        throw new Error('Invalid token format');
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
    );

    const signatureBytes = Uint8Array.from(
        atob(encodedSignature.replace(/-/g, '+').replace(/_/g, '/')),
        (c) => c.charCodeAt(0)
    );

    const valid = await crypto.subtle.verify(
        'HMAC',
        key,
        signatureBytes,
        new TextEncoder().encode(signingInput)
    );

    if (!valid) {
        throw new Error('Invalid signature');
    }

    const payload = JSON.parse(atob(encodedPayload.replace(/-/g, '+').replace(/_/g, '/')));

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('Token expired');
    }

    return payload;
}

export async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256',
        },
        keyMaterial,
        256
    );

    const hashArray = new Uint8Array(derivedBits);
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const hashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');

    return `${saltHex}:${hashHex}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
    const [saltHex, storedHashHex] = stored.split(':');
    if (!saltHex || !storedHashHex) return false;

    const salt = new Uint8Array(
        saltHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16))
    );

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256',
        },
        keyMaterial,
        256
    );

    const hashHex = Array.from(new Uint8Array(derivedBits))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    return hashHex === storedHashHex;
}

function base64UrlEncode(str: string): string {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
