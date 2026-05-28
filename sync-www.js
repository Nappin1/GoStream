/**
 * sync-www.js
 * Copies web source files into the www/ folder before cap sync.
 * Run: node sync-www.js
 */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const www = path.join(root, 'www');

// Files and folders to copy into www/
const items = ['index.html', 'css', 'js', 'html', 'images'];

function copyRecursive(src, dest) {
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach(child => {
            copyRecursive(path.join(src, child), path.join(dest, child));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

if (!fs.existsSync(www)) fs.mkdirSync(www, { recursive: true });

items.forEach(item => {
    const src = path.join(root, item);
    const dest = path.join(www, item);
    if (fs.existsSync(src)) {
        copyRecursive(src, dest);
        console.log(`Copied: ${item}`);
    }
});

console.log('www/ is up to date.');
