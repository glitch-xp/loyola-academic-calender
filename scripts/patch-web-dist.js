const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '..', 'dist');
const oldAssetsDir = path.join(distDir, 'assets', 'node_modules');
const newAssetsDir = path.join(distDir, 'assets', 'vendor');
const TEXT_EXTS = new Set(['.js', '.html', '.css', '.json', '.map']);

/**
 * Move exported assets out of `dist/assets/node_modules` because Wrangler's
 * Cloudflare Pages uploader skips any directory named `node_modules`.
 */
function relocateNodeModulesAssets() {
    if (!fs.existsSync(oldAssetsDir)) {
        return false;
    }

    fs.rmSync(newAssetsDir, { recursive: true, force: true });
    fs.cpSync(oldAssetsDir, newAssetsDir, { recursive: true });
    fs.rmSync(oldAssetsDir, { recursive: true, force: true });
    return true;
}

function rewriteAssetReferences(dir) {
    let updatedFiles = 0;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            updatedFiles += rewriteAssetReferences(fullPath);
            continue;
        }
        if (!TEXT_EXTS.has(path.extname(entry.name))) {
            continue;
        }
        const content = fs.readFileSync(fullPath, 'utf8');
        if (!content.includes('/assets/node_modules/')) {
            continue;
        }
        fs.writeFileSync(
            fullPath,
            content.replaceAll('/assets/node_modules/', '/assets/vendor/'),
            'utf8'
        );
        updatedFiles += 1;
    }
    return updatedFiles;
}

if (!fs.existsSync(distDir)) {
    console.error(`dist directory not found at ${distDir}`);
    process.exit(1);
}

const moved = relocateNodeModulesAssets();
const updatedFiles = rewriteAssetReferences(distDir);
console.log(
    `[patch-web-dist] relocated=${moved}, rewrittenFiles=${updatedFiles}`
);
