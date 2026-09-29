import http from 'http';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

function loadEnvLocal(): { [key: string]: string } {
  const envPath = path.resolve(process.cwd(), '.env.local');
  const env: { [key: string]: string } = {};
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        env[key] = val;
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
  return env;
}

function updateEnvLocal(key: string, value: string) {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, `${key}="${value}"\n`);
    return;
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    fs.writeFileSync(envPath, content.replace(regex, `${key}="${value}"`));
  } else {
    fs.writeFileSync(envPath, `${content.trim()}\n${key}="${value}"\n`);
  }
}

async function main() {
  loadEnvLocal();

  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;

  console.log('\n========================================================');
  console.log('  🔑 SYNCDRIVE: GOOGLE DRIVE REFRESH TOKEN GENERATOR    ');
  console.log('========================================================\n');

  if (!clientId || !clientSecret || clientId.trim() === '' || clientSecret.trim() === '') {
    console.error('❌ Error: GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET must be set in .env.local first.');
    console.log('\nSteps:');
    console.log('1. Go to Google Cloud Console (https://console.cloud.google.com).');
    console.log('2. Enable "Google Drive API" under APIs & Services.');
    console.log('3. Under Credentials, create an OAuth 2.0 Client ID (Web Application).');
    console.log('4. Add this Authorized Redirect URI:');
    console.log('   👉 http://localhost:3333/oauth2callback');
    console.log('5. Paste GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET in .env.local.');
    console.log('6. Re-run: npm run get-drive-token\n');
    process.exit(1);
  }

  const port = 3333;
  const redirectUri = `http://localhost:${port}/oauth2callback`;
  const scope = 'https://www.googleapis.com/auth/drive';

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scope,
      access_type: 'offline',
      prompt: 'consent',
    }).toString();

  const server = http.createServer(async (req, res) => {
    try {
      const reqUrl = new URL(req.url || '', `http://localhost:${port}`);
      if (reqUrl.pathname === '/oauth2callback') {
        const code = reqUrl.searchParams.get('code');
        const error = reqUrl.searchParams.get('error');

        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`<h1>Authentication Failed</h1><p>${error}</p>`);
          console.error(`\n❌ Authorization failed from Google: ${error}`);
          server.close();
          process.exit(1);
        }

        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<h1>Missing Code</h1>');
          return;
        }

        // Exchange code for tokens
        console.log('\nExchanging authorization code for tokens...');
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          }).toString(),
        });

        const tokenData = await tokenRes.json();

        if (!tokenRes.ok || !tokenData.refresh_token) {
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end(`<h1>Token Exchange Failed</h1><p>${JSON.stringify(tokenData)}</p>`);
          console.error('\n❌ Token exchange response error:', tokenData);
          server.close();
          process.exit(1);
        }

        const refreshToken = tokenData.refresh_token;

        // Auto-save to .env.local
        updateEnvLocal('GOOGLE_DRIVE_REFRESH_TOKEN', refreshToken);

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 60px auto; padding: 30px; border: 1px solid #10b981; border-radius: 12px; background: #ecfdf5; color: #065f46;">
            <h1 style="margin-top:0;">🎉 Google Drive Connected!</h1>
            <p>Your offline <code>refresh_token</code> has been successfully received and automatically saved to your <strong>.env.local</strong> file.</p>
            <p>You can now close this tab and return to your terminal.</p>
          </div>
        `);

        console.log('\n========================================================');
        console.log('  🎉 SUCCESS: REFRESH TOKEN RECEIVED AND SAVED!         ');
        console.log('========================================================');
        console.log(`\nGOOGLE_DRIVE_REFRESH_TOKEN="${refreshToken}"`);
        console.log('\n✅ Successfully auto-updated .env.local!');
        console.log('👉 Next step: Run "npm run verify-drive" to test your storage connection.\n');

        setTimeout(() => {
          server.close();
          process.exit(0);
        }, 1000);
      }
    } catch (err: any) {
      console.error('Server error handling request:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  });

  server.listen(port, () => {
    console.log('Waiting for authorization on port ' + port + '...\n');
    console.log('👉 Open this URL in your browser to authorize SyncDrive:\n');
    console.log(authUrl + '\n');

    // Attempt to open browser automatically
    const startCmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    exec(`${startCmd} "${authUrl}"`, () => {});
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
