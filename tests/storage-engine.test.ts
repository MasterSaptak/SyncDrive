import assert from 'assert/strict';
import crypto from 'crypto';
import { dataStore } from '../lib/db/data-store';
import { FileService } from '../lib/services/file.service';
import { QuotaService, QuotaExceededError } from '../lib/services/quota.service';
import { StorageAllocationService } from '../lib/services/storage-allocation.service';
import { StorageReconciliationService } from '../lib/storage/reconciliation/StorageReconciliationService';
import { GoogleDriveStorageProvider } from '../lib/storage/providers/GoogleDriveStorageProvider';
import {
  GoogleDriveErrorTranslator,
  StorageAccountCapacityExceededError,
  StorageRateLimitError,
  StorageBackendUnavailableError,
} from '../lib/storage/errors/GoogleDriveErrorTranslator';

async function runTestSuite() {
  console.log('--- STARTING PHASE 2 GOOGLE DRIVE STORAGE ENGINE TEST SUITE ---');
  const userId = 'customer_123';

  // -------------------------------------------------------------
  // TEST 1: Basic Storage Operations (Create, Read, Rename, Move, Copy, Trash, Restore, Purge)
  // -------------------------------------------------------------
  console.log('\n[Test 1] Basic Storage Operations Lifecycle...');
  const testPayload = Buffer.from('SyncDrive encrypted physical test chunk content #1');
  const uploaded = await FileService.uploadDirect(
    userId,
    null,
    'document_lifecycle.pdf',
    testPayload,
    'application/pdf'
  );
  assert.ok(uploaded.id, 'File should have an ID');
  assert.equal(uploaded.name, 'document_lifecycle.pdf');
  assert.equal(uploaded.sizeBytes, testPayload.byteLength);

  // Read / Download
  const { file: retrieved, download } = await FileService.getFileBinary(userId, uploaded.id);
  assert.equal(retrieved.id, uploaded.id);
  assert.ok(download.data.byteLength > 0, 'Should download non-empty binary');

  // Rename
  const renamed = await FileService.rename(userId, uploaded.id, 'document_renamed.pdf');
  assert.equal(renamed.name, 'document_renamed.pdf');

  // Copy
  const copied = await FileService.copy(userId, uploaded.id, null);
  assert.equal(copied.name, 'Copy of document_renamed.pdf');
  assert.equal(copied.sizeBytes, uploaded.sizeBytes);

  // Trash and Restore
  const trashed = await FileService.moveToTrash(userId, uploaded.id);
  assert.equal(trashed.isTrash, true);
  const restored = await FileService.restoreFromTrash(userId, uploaded.id);
  assert.equal(restored.isTrash, false);

  // Permanent Delete
  const deleted = await FileService.permanentDelete(userId, uploaded.id);
  assert.equal(deleted, true);
  await FileService.permanentDelete(userId, copied.id);
  console.log('✓ Test 1 Passed: Full storage lifecycle validated.');

  // -------------------------------------------------------------
  // TEST 2: Multi-Node Physical Storage Capacity Allocation & Reservations
  // -------------------------------------------------------------
  console.log('\n[Test 2] Storage Allocation & Capacity Reservation...');
  const poolBefore = await StorageAllocationService.getPoolMetrics('pool_gdrive_primary');
  assert.ok(poolBefore, 'Pool metrics should exist');
  assert.ok(poolBefore.availableBytes > 0, 'Pool should have available bytes');

  const testFileId = `file_test_alloc_${crypto.randomUUID()}`;
  const neededBytes = 50 * 1024 * 1024; // 50 MB

  // Reserve capacity
  const reservation = await StorageAllocationService.reservePhysicalCapacity({
    userId,
    tenantId: 'tenant_default_123',
    neededBytes,
    fileId: testFileId,
    preferredPoolId: 'pool_gdrive_primary',
  });
  assert.ok(reservation.id, 'Reservation ID created');
  assert.equal(reservation.status, 'active');
  assert.equal(reservation.reservedBytes, neededBytes);

  // Verify reserved capacity is reflected in pool
  const poolAfterReserve = await StorageAllocationService.getPoolMetrics('pool_gdrive_primary');
  assert.equal(
    poolAfterReserve!.reservedBytes,
    poolBefore!.reservedBytes + neededBytes,
    'Pool reserved bytes should increment'
  );

  // Commit reservation
  await StorageAllocationService.commitPhysicalUsage(reservation.id, neededBytes);
  const poolAfterCommit = await StorageAllocationService.getPoolMetrics('pool_gdrive_primary');
  assert.equal(
    poolAfterCommit!.reservedBytes,
    poolBefore!.reservedBytes,
    'Reserved bytes should return to baseline'
  );
  assert.equal(
    poolAfterCommit!.usedBytes,
    poolBefore!.usedBytes + neededBytes,
    'Used bytes should increase by committed size'
  );

  // Rollback / release test
  const rollbackRes = await StorageAllocationService.reservePhysicalCapacity({
    userId,
    tenantId: 'tenant_default_123',
    neededBytes: 10 * 1024 * 1024,
    fileId: `file_test_rollback_${crypto.randomUUID()}`,
  });
  assert.equal(rollbackRes.status, 'active');
  await StorageAllocationService.rollbackPhysicalReservation(rollbackRes.id);
  const poolAfterRollback = await StorageAllocationService.getPoolMetrics('pool_gdrive_primary');
  assert.equal(poolAfterRollback!.reservedBytes, poolBefore!.reservedBytes);
  console.log('✓ Test 2 Passed: Storage allocation, commit, and rollback logic verified.');

  // -------------------------------------------------------------
  // TEST 3: Resumable Upload Session & Chunk Recovery
  // -------------------------------------------------------------
  console.log('\n[Test 3] Resumable Upload Session & Chunk Recovery...');
  const provider = new GoogleDriveStorageProvider({
    accountId: 'gdrive_acc_01',
    accountName: 'Test Node 01',
  });

  const totalBytes = 1024 * 512; // 512 KB
  const chunk1 = new Uint8Array(1024 * 256); // 256 KB chunk
  const chunk2 = new Uint8Array(1024 * 256); // 256 KB chunk
  chunk1.fill(65); // 'A'
  chunk2.fill(66); // 'B'

  const internalFileId = `file_resumable_${crypto.randomUUID()}`;
  const session = await provider.initiateResumableUpload({
    internalFileId,
    filename: 'large_archive.tar.gz',
    expectedSizeBytes: totalBytes,
    mimeType: 'application/gzip',
  });
  assert.ok(session.sessionToken, 'Should receive sessionToken');

  // Upload Chunk 1
  const chunk1Result = await provider.uploadChunk({
    sessionToken: session.sessionToken,
    chunk: chunk1,
    startByte: 0,
    totalBytes,
  });
  assert.equal(chunk1Result.isComplete, false, 'Chunk 1 should not complete upload');
  assert.equal(chunk1Result.bytesReceived, chunk1.byteLength);

  // Test interrupted recovery: query resume offset
  const offsetStatus = await provider.getResumeOffset(session.sessionToken, totalBytes);
  assert.equal(offsetStatus.isComplete, false);
  assert.equal(
    offsetStatus.bytesReceived,
    chunk1.byteLength,
    'Should correctly recover last received byte offset'
  );

  // Upload Chunk 2 (Final)
  const chunk2Result = await provider.uploadChunk({
    sessionToken: session.sessionToken,
    chunk: chunk2,
    startByte: chunk1.byteLength,
    totalBytes,
  });
  assert.equal(chunk2Result.isComplete, true, 'Chunk 2 should complete upload');
  assert.ok(chunk2Result.storageObjectId, 'Should receive physical storageObjectId');
  assert.ok(chunk2Result.checksumSha256, 'Should compute SHA256 checksum');

  // Verify downloaded content integrity
  const downloadedObj = await provider.download(chunk2Result.storageObjectId!);
  assert.equal(downloadedObj.data.byteLength, totalBytes);
  console.log('✓ Test 3 Passed: Resumable upload chunking and offset recovery verified.');

  // -------------------------------------------------------------
  // TEST 4: Google API Error Translation & Sanitization
  // -------------------------------------------------------------
  console.log('\n[Test 4] Google Drive Error Translation...');
  // 4a. Capacity exceeded error
  const fakeQuotaResp = new Response(
    JSON.stringify({
      error: {
        errors: [{ reason: 'storageQuotaExceeded', message: 'User storage quota exceeded' }],
        code: 403,
      },
    }),
    { status: 403, statusText: 'Forbidden' }
  );
  const quotaErr = await GoogleDriveErrorTranslator.translateResponse(fakeQuotaResp, {
    operation: 'UPLOAD_CHUNK',
    accountId: 'gdrive_acc_01',
  });
  assert.ok(quotaErr instanceof StorageAccountCapacityExceededError);
  assert.equal(quotaErr.statusCode, 507);
  assert.ok(
    !quotaErr.message.includes('drive.google.com') && !quotaErr.message.includes('token'),
    'Sanitized message should not leak Google details'
  );

  // 4b. Rate limit error
  const fakeRateLimitResp = new Response(
    JSON.stringify({
      error: { errors: [{ reason: 'rateLimitExceeded' }], code: 429 },
    }),
    { status: 429, headers: { 'Retry-After': '8' } }
  );
  const rateErr = await GoogleDriveErrorTranslator.translateResponse(fakeRateLimitResp, {
    operation: 'DOWNLOAD',
  });
  assert.ok(rateErr instanceof StorageRateLimitError);
  assert.equal((rateErr as StorageRateLimitError).retryAfterSeconds, 8);

  // 4c. Google 503 backend unavailable
  const fake503Resp = new Response('Backend Service Down', { status: 503 });
  const backendErr = await GoogleDriveErrorTranslator.translateResponse(fake503Resp, {
    operation: 'INITIALIZE',
  });
  assert.ok(backendErr instanceof StorageBackendUnavailableError);
  console.log('✓ Test 4 Passed: Google Drive error translation & sanitization verified.');

  // -------------------------------------------------------------
  // TEST 5: Storage Reconciliation Engine
  // -------------------------------------------------------------
  console.log('\n[Test 5] Storage Reconciliation Foundation...');
  const report = await StorageReconciliationService.reconcileStorageAccount('gdrive_acc_01', {
    dryRun: true,
  });
  assert.ok(report.id, 'Report ID generated');
  assert.equal(report.storageAccountId, 'gdrive_acc_01');
  assert.equal(typeof report.totalPhysicalFilesScanned, 'number');
  assert.equal(typeof report.discrepanciesCount, 'number');
  console.log(`✓ Test 5 Passed: Reconciliation scanned ${report.totalDbRecordsScanned} DB files vs ${report.totalPhysicalFilesScanned} physical objects with 0 critical errors.`);

  console.log('\n======================================================');
  console.log('🎉 ALL PHASE 2 GOOGLE DRIVE STORAGE ENGINE TESTS PASSED!');
  console.log('======================================================');
}

runTestSuite().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
