import fs from 'fs';
import path from 'path';

// Helper to manually load .env.local if not already injected
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
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
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnvLocal();

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

async function verifyGoogleDrive() {
  console.log('\n========================================================');
  console.log('  🔍 SYNCDRIVE: GOOGLE DRIVE STORAGE CONNECTION TESTER  ');
  console.log('========================================================\n');

  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

  // 1. Check if env vars exist
  console.log('1. Checking Environment Variables in .env.local:');
  const checks = [
    { name: 'GOOGLE_DRIVE_CLIENT_ID', value: clientId },
    { name: 'GOOGLE_DRIVE_CLIENT_SECRET', value: clientSecret },
    { name: 'GOOGLE_DRIVE_REFRESH_TOKEN', value: refreshToken },
  ];

  let missing = false;
  for (const c of checks) {
    if (!c.value || c.value.trim() === '' || c.value.includes('MY_') || c.value.includes('placeholder')) {
      console.log(`   ❌ ${c.name}: MISSING or NOT CONFIGURED`);
      missing = true;
    } else {
      const masked = c.value.length > 8 ? `${c.value.slice(0, 4)}...${c.value.slice(-4)}` : '****';
      console.log(`   ✅ ${c.name}: ${masked}`);
    }
  }

  if (rootFolderId) {
    console.log(`   ℹ️  GOOGLE_DRIVE_ROOT_FOLDER_ID: ${rootFolderId}`);
  } else {
    console.log(`   ℹ️  GOOGLE_DRIVE_ROOT_FOLDER_ID: Not specified (will auto-create "SyncDrive_SaaS_Storage")`);
  }

  if (missing) {
    console.log('\n❌ ERROR: Missing required Google Drive credentials in .env.local.');
    console.log('Please configure GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, and GOOGLE_DRIVE_REFRESH_TOKEN.');
    process.exit(1);
  }

  // 2. Test OAuth Access Token generation
  console.log('\n2. Authenticating with Google OAuth 2.0 (token refresh)...');
  let accessToken = '';
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        refresh_token: refreshToken!,
        grant_type: 'refresh_token',
      }).toString(),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error('   ❌ OAuth Token Refresh Failed:');
      console.error(`      Status: ${tokenRes.status} ${tokenRes.statusText}`);
      console.error(`      Error: ${tokenData.error} - ${tokenData.error_description || ''}`);
      process.exit(1);
    }

    accessToken = tokenData.access_token;
    console.log('   ✅ Successfully acquired Bearer Access Token (expires in ' + (tokenData.expires_in || 3600) + 's)');
  } catch (err: any) {
    console.error('   ❌ Network error contacting Google OAuth endpoint:', err.message);
    process.exit(1);
  }

  // 3. Pull Google Drive account and storage quota details
  console.log('\n3. Pulling Google Drive Account & Storage Quota...');
  try {
    const aboutRes = await fetch(
      'https://www.googleapis.com/drive/v3/about?fields=user,storageQuota',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const aboutData = await aboutRes.json();
    if (!aboutRes.ok) {
      console.error('   ❌ Failed to pull Google Drive quota: HTTP ' + aboutRes.status);
      console.error(JSON.stringify(aboutData, null, 2));
      process.exit(1);
    }

    const user = aboutData.user || {};
    const quota = aboutData.storageQuota || {};

    const limit = Number(quota.limit || 0);
    const usage = Number(quota.usage || 0);
    const usageInDrive = Number(quota.usageInDrive || 0);
    const usageInTrash = Number(quota.usageInDriveTrash || 0);
    const available = limit > 0 ? Math.max(0, limit - usage) : 0;

    console.log(`   ✅ Account Name:  ${user.displayName || 'N/A'}`);
    console.log(`   ✅ Account Email: ${user.emailAddress || 'N/A'}`);
    console.log(`   -------------------------------------------------`);
    if (limit > 0) {
      const pct = ((usage / limit) * 100).toFixed(1);
      console.log(`   📊 Total Quota:     ${formatBytes(limit)}`);
      console.log(`   📊 Total Used:      ${formatBytes(usage)} (${pct}%)`);
      console.log(`   📊 Drive Files:     ${formatBytes(usageInDrive)}`);
      console.log(`   📊 Drive Trash:     ${formatBytes(usageInTrash)}`);
      console.log(`   📊 Free/Available:  ${formatBytes(available)}`);
    } else {
      console.log(`   📊 Total Quota:     Unlimited (Google Workspace Tier)`);
      console.log(`   📊 Total Used:      ${formatBytes(usage)}`);
    }
  } catch (err: any) {
    console.error('   ❌ Error querying Google Drive about endpoint:', err.message);
    process.exit(1);
  }

  // 4. Verify or create Root Folder
  console.log('\n4. Verifying Root Storage Folder on Google Drive...');
  try {
    if (rootFolderId && rootFolderId !== 'root') {
      const folderRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${rootFolderId}?fields=id,name,mimeType,trashed`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (folderRes.ok) {
        const folder = await folderRes.json();
        console.log(`   ✅ Dedicated root folder found: "${folder.name}" (ID: ${folder.id})`);
      } else {
        console.warn(`   ⚠️ Specified root folder ID "${rootFolderId}" was not found or inaccessible. Falling back to default.`);
      }
    } else {
      const appFolderName = 'SyncDrive_SaaS_Storage';
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
          `name = '${appFolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
        )}&fields=files(id,name)`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        console.log(`   ✅ Found existing root folder: "${appFolderName}" (ID: ${searchData.files[0].id})`);
      } else {
        console.log(`   ℹ️ Root folder "${appFolderName}" will be created automatically on first file upload.`);
      }
    }
  } catch (err: any) {
    console.warn('   ⚠️ Root folder check had an issue:', err.message);
  }

  console.log('\n========================================================');
  console.log('  🎉 SUCCESS: GOOGLE DRIVE STORAGE IS CONNECTED & READY! ');
  console.log('========================================================\n');
}

verifyGoogleDrive();
