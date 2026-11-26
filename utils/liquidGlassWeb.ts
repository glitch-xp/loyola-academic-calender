import { Platform } from 'react-native';

export interface LiquidGlassRefractOptions {
    strength?: number;
    bezel?: number;
    blur?: number;
    dispersion?: number;
    magnify?: number;
    clear?: boolean;
}

const STYLE_ELEMENT_ID = 'loyola-liquid-glass-styles';
const SVG_NS = 'http://www.w3.org/2000/svg';

let stylesInjected = false;
let svgDefs: SVGDefsElement | null = null;
let filterCounter = 0;

const LIQUID_GLASS_CSS = `
:root {
  --lg-glass: rgba(255, 255, 255, 0.78);
  --lg-glass-thick: rgba(255, 255, 255, 0.95);
  --lg-glass-rim: rgba(255, 255, 255, 0.95);
  --lg-glass-rim-2: rgba(15, 23, 42, 0.08);
  --lg-glass-shadow: 0 12px 32px rgba(15, 23, 42, 0.13), 0 2px 6px rgba(15, 23, 42, 0.07);
  --lg-glass-blur: saturate(145%) blur(26px);
  --lg-glass-sheen: 0.44;
  --lg-rim-1: rgba(255, 255, 255, 0.98);
  --lg-rim-2: rgba(255, 255, 255, 0.28);
  --lg-rim-3: rgba(255, 255, 255, 0.74);
  --lg-glass-refract: rgba(255, 255, 255, 0.72);
}

.lg-tone-dark {
  --lg-glass: rgba(34, 34, 40, 0.74);
  --lg-glass-thick: rgba(28, 28, 32, 0.95);
  --lg-glass-rim: rgba(255, 255, 255, 0.24);
  --lg-glass-rim-2: rgba(255, 255, 255, 0.08);
  --lg-glass-shadow: 0 10px 34px rgba(0, 0, 0, 0.45), 0 1px 3px rgba(0, 0, 0, 0.32);
  --lg-glass-sheen: 0.16;
  --lg-rim-1: rgba(255, 255, 255, 0.44);
  --lg-rim-2: rgba(255, 255, 255, 0.07);
  --lg-rim-3: rgba(255, 255, 255, 0.22);
  --lg-glass-refract: rgba(28, 28, 34, 0.52);
}

.lg-surface {
  position: relative;
  isolation: isolate;
  background-color: var(--lg-glass);
  -webkit-backdrop-filter: var(--lg-glass-blur);
  backdrop-filter: var(--lg-glass-blur);
  box-shadow:
    inset 0 0.5px 0 var(--lg-glass-rim),
    inset 0 0 0 0.5px var(--lg-glass-rim-2),
    var(--lg-glass-shadow);
}

.lg-surface.lg-variant-clear {
  background-color: rgba(255, 255, 255, 0.20);
  -webkit-backdrop-filter: saturate(160%) blur(14px);
  backdrop-filter: saturate(160%) blur(14px);
}

/* Specular sheen separating actual Liquid Glass from flat frost */
.lg-surface::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, var(--lg-glass-sheen)) 0%,
    rgba(255, 255, 255, calc(var(--lg-glass-sheen) * 0.2)) 34%,
    transparent 62%
  );
}

/* Directional bevel rim: brightest upper-left, fainter along sides, rising lower-right */
.lg-surface::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 2;
  border-radius: inherit;
  padding: 1px;
  pointer-events: none;
  background: linear-gradient(135deg, var(--lg-rim-1) 0%, var(--lg-rim-2) 45%, var(--lg-rim-3) 100%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
}

.lg-surface.is-refracting {
  background-color: var(--lg-glass-refract);
}

.lg-surface.lg-text-heavy.is-refracting {
  background-color: var(--lg-glass);
}

.lg-surface.lg-variant-clear.is-refracting {
  background-color: rgba(255, 255, 255, 0.12);
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .lg-surface,
  .lg-surface.lg-variant-clear {
    background-color: var(--lg-glass-thick);
  }
}

@media (prefers-reduced-transparency: reduce) {
  .lg-surface,
  .lg-surface.lg-variant-clear,
  .lg-surface.is-refracting {
    background-color: var(--lg-glass-thick);
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
  }
  .lg-surface::after {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .lg-surface,
  .lg-surface * {
    transition-duration: 0.001ms !important;
  }
}
`;

export function ensureLiquidGlassWebStyles(): void {
    if (Platform.OS !== 'web' || typeof document === 'undefined' || stylesInjected) return;
    if (document.getElementById(STYLE_ELEMENT_ID)) {
        stylesInjected = true;
        return;
    }

    const styleEl = document.createElement('style');
    styleEl.id = STYLE_ELEMENT_ID;
    styleEl.textContent = LIQUID_GLASS_CSS;
    document.head.appendChild(styleEl);
    stylesInjected = true;
}

function isChromiumBrowser(): boolean {
    if (typeof navigator === 'undefined') return false;
    const navAny = navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } };
    const brands = navAny.userAgentData?.brands;
    if (brands && brands.some((b) => /Chromium/.test(b.brand))) return true;
    const ua = navigator.userAgent;
    return /Chrome\/\d+/.test(ua) && !/Firefox|FxiOS|EdgiOS|CriOS/.test(ua);
}

export function prefersReducedTransparencyWeb(): boolean {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
    return (
        window.matchMedia('(prefers-reduced-transparency: reduce)').matches ||
        document.documentElement.hasAttribute('data-rt')
    );
}

export function supportsBackdropRefractionWeb(): boolean {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
    if (!isChromiumBrowser()) return false;
    if (!window.CSS || !CSS.supports('backdrop-filter', 'url(#a)')) return false;
    return !prefersReducedTransparencyWeb();
}

function ensureSvgDefs(): SVGDefsElement | null {
    if (typeof document === 'undefined' || !document.body) return null;
    if (svgDefs && svgDefs.isConnected) return svgDefs;

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
    const defs = document.createElementNS(SVG_NS, 'defs');
    svg.appendChild(defs);
    document.body.appendChild(svg);
    svgDefs = defs;
    return svgDefs;
}

function roundedRectField(x: number, y: number, hw: number, hh: number, r: number) {
    const ax = Math.abs(x);
    const ay = Math.abs(y);
    const qx = ax - (hw - r);
    const qy = ay - (hh - r);
    const sx = x < 0 ? -1 : 1;
    const sy = y < 0 ? -1 : 1;

    if (qx > 0 && qy > 0) {
        const len = Math.sqrt(qx * qx + qy * qy) || 1;
        return { d: len - r, nx: (qx / len) * sx, ny: (qy / len) * sy };
    }
    if (qx > qy) {
        return { d: qx - r, nx: sx, ny: 0 };
    }
    return { d: qy - r, nx: 0, ny: sy };
}

function buildDisplacementMap(w: number, h: number, radius: number, bezel: number, magnify: number): string | null {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const img = ctx.createImageData(w, h);
    const data = img.data;
    const hw = w / 2;
    const hh = h / 2;
    const maxMag = Math.max(1e-6, magnify);

    for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
            const x = px + 0.5 - hw;
            const y = py + 0.5 - hh;
            const f = roundedRectField(x, y, hw, hh, radius);
            const inside = -f.d;
            let vx = 0;
            let vy = 0;

            if (inside < bezel && inside > -1) {
                const t = 1 - Math.max(0, inside) / bezel;
                let m = t * t * (3 - 2 * t);
                m = Math.pow(m, 1.6);
                vx = -f.nx * m;
                vy = -f.ny * m;
            }

            if (magnify > 0) {
                vx -= ((x / hw) * magnify) / maxMag * 0.25;
                vy -= ((y / hh) * magnify) / maxMag * 0.25;
            }

            const i = (py * w + px) * 4;
            data[i] = Math.round(128 + Math.max(-1, Math.min(1, vx)) * 127);
            data[i + 1] = Math.round(128 + Math.max(-1, Math.min(1, vy)) * 127);
            data[i + 2] = 128;
            data[i + 3] = 255;
        }
    }

    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL('image/png');
}

export function attachLiquidGlassRefraction(
    el: HTMLElement | null,
    options: LiquidGlassRefractOptions = {}
): () => void {
    if (Platform.OS !== 'web' || !el || typeof window === 'undefined') {
        return () => {};
    }

    ensureLiquidGlassWebStyles();

    let currentFilterId: string | null = null;
    let lastKey = '';

    const cleanupFilter = () => {
        if (currentFilterId) {
            const old = document.getElementById(currentFilterId);
            if (old) old.remove();
            currentFilterId = null;
        }
        el.style.removeProperty('backdrop-filter');
        el.style.removeProperty('-webkit-backdrop-filter');
        el.classList.remove('is-refracting');
        lastKey = '';
    };

    const applyRefraction = () => {
        if (!supportsBackdropRefractionWeb()) {
            cleanupFilter();
            return;
        }

        const rect = el.getBoundingClientRect();
        const w = Math.round(rect.width);
        const h = Math.round(rect.height);
        if (w < 8 || h < 8) return;

        const cs = getComputedStyle(el);
        const parsedRadius = parseFloat(cs.borderTopLeftRadius) || 0;
        const radius = Math.min(parsedRadius, w / 2, h / 2);

        const strength = Math.max(0, Math.min(2, options.strength ?? 1));
        const defaultBezel = Math.max(8, Math.min(20, radius * 0.5 || 12));
        const bezel = Math.min(options.bezel ?? defaultBezel, Math.min(w, h) * 0.32);
        const blur = options.blur ?? (options.clear ? 0.5 : 10);
        const dispersion = Math.max(0, Math.min(0.2, options.dispersion ?? 0.04));
        const magnify = options.magnify ?? 0;
        const scale = Math.round(bezel * 1.2 * strength);

        const key = [w, h, radius, bezel, scale, blur, magnify, dispersion].join('|');
        if (key === lastKey) return;

        const mapUrl = buildDisplacementMap(w, h, radius, bezel, magnify);
        const defs = ensureSvgDefs();
        if (!mapUrl || !defs) return;

        if (currentFilterId) {
            const existing = document.getElementById(currentFilterId);
            if (existing) existing.remove();
        } else {
            currentFilterId = `lg-refract-${++filterCounter}`;
        }

        const filter = document.createElementNS(SVG_NS, 'filter');
        filter.setAttribute('id', currentFilterId);
        filter.setAttribute('x', '0');
        filter.setAttribute('y', '0');
        filter.setAttribute('width', String(w));
        filter.setAttribute('height', String(h));
        filter.setAttribute('filterUnits', 'userSpaceOnUse');
        filter.setAttribute('color-interpolation-filters', 'sRGB');

        const addNode = (tag: string, attrs: Record<string, string | number>) => {
            const node = document.createElementNS(SVG_NS, tag);
            for (const [k, v] of Object.entries(attrs)) {
                node.setAttribute(k, String(v));
            }
            filter.appendChild(node);
            return node;
        };

        addNode('feImage', {
            href: mapUrl,
            x: 0,
            y: 0,
            width: w,
            height: h,
            preserveAspectRatio: 'none',
            result: 'raw',
        });

        addNode('feGaussianBlur', {
            in: 'raw',
            stdDeviation: Math.max(1.5, bezel * 0.25).toFixed(1),
            result: 'map',
        });

        if (dispersion > 0) {
            const channels = [
                { c: 'r', s: scale, m: '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0' },
                { c: 'g', s: scale * (1 - dispersion), m: '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0' },
                { c: 'b', s: scale * (1 - 2 * dispersion), m: '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0' },
            ];
            for (const ch of channels) {
                addNode('feDisplacementMap', {
                    in: 'SourceGraphic',
                    in2: 'map',
                    scale: ch.s.toFixed(2),
                    xChannelSelector: 'R',
                    yChannelSelector: 'G',
                    result: `d${ch.c}`,
                });
                addNode('feColorMatrix', {
                    in: `d${ch.c}`,
                    type: 'matrix',
                    values: ch.m,
                    result: ch.c,
                });
            }
            addNode('feComposite', {
                in: 'r',
                in2: 'g',
                operator: 'arithmetic',
                k1: 0,
                k2: 1,
                k3: 1,
                k4: 0,
                result: 'rg',
            });
            addNode('feComposite', {
                in: 'rg',
                in2: 'b',
                operator: 'arithmetic',
                k1: 0,
                k2: 1,
                k3: 1,
                k4: 0,
            });
        } else {
            addNode('feDisplacementMap', {
                in: 'SourceGraphic',
                in2: 'map',
                scale,
                xChannelSelector: 'R',
                yChannelSelector: 'G',
            });
        }

        defs.appendChild(filter);
        const filterValue = `url(#${currentFilterId}) blur(${blur}px) saturate(170%)`;
        el.style.setProperty('backdrop-filter', filterValue);
        el.style.setProperty('-webkit-backdrop-filter', filterValue);
        el.classList.add('is-refracting');
        lastKey = key;
    };

    applyRefraction();

    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => applyRefraction()) : null;
    if (ro) ro.observe(el);

    const mq = window.matchMedia('(prefers-reduced-transparency: reduce)');
    const onMqChange = () => applyRefraction();
    if (mq.addEventListener) mq.addEventListener('change', onMqChange);

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(applyRefraction).catch(() => {});
    }

    return () => {
        if (ro) ro.disconnect();
        if (mq.removeEventListener) mq.removeEventListener('change', onMqChange);
        cleanupFilter();
    };
}
