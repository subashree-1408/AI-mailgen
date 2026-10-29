const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

let modified = false;

if (!process.env.DATABASE_URL && !envContent.includes('DATABASE_URL=')) {
  console.log('[Build Setup] Setting default DATABASE_URL="file:./dev.db" in server/.env');
  envContent += '\nDATABASE_URL="file:./dev.db"\n';
  modified = true;
}

if (!process.env.JWT_SECRET && !envContent.includes('JWT_SECRET=')) {
  envContent += '\nJWT_SECRET="mailpilot_prod_secret_8273641829374"\n';
  modified = true;
}

if (!process.env.TOKEN_ENCRYPTION_KEY && !envContent.includes('TOKEN_ENCRYPTION_KEY=')) {
  envContent += '\nTOKEN_ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"\n';
  modified = true;
}

if (modified) {
  fs.writeFileSync(envPath, envContent, 'utf8');
}
