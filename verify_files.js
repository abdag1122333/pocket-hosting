const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'uploads');
console.log('--- DEBUG FILE LISTING ---');
console.log('Scanning directory:', dir);

try {
    if (!fs.existsSync(dir)) {
        console.log('❌ uploads directory does NOT exist!');
    } else {
        const files = fs.readdirSync(dir);
        console.log(`Found ${files.length} files:`);
        files.forEach(f => {
            console.log(` - ${f}`);
            if (fs.statSync(path.join(dir, f)).isDirectory()) {
                console.log(`   (DIR) Contents of ${f}:`, fs.readdirSync(path.join(dir, f)));
            }
        });
    }
} catch (e) {
    console.error('❌ Error scanning files:', e);
}
console.log('--- END DEBUG ---');
