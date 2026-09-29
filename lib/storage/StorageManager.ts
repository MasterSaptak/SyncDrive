import { StorageProvider } from './StorageProvider';
import { GoogleDriveStorageProvider } from './providers/GoogleDriveStorageProvider';
import { LocalMemoryStorageProvider } from './providers/LocalMemoryStorageProvider';
import { dataStore } from '@/lib/db/data-store';

class StorageManager {
  private static instance: StorageManager;
  private primaryProvider: StorageProvider | null = null;
  private accountProviders: Map<string, StorageProvider> = new Map();
  private sessionAccountMap: Map<string, string> = new Map();

  private constructor() {}

  public static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  /**
   * Records mapping from resumable sessionToken to specific physical storageAccountId.
   */
  public recordSessionAccount(sessionToken: string, storageAccountId: string): void {
    this.sessionAccountMap.set(sessionToken, storageAccountId);
  }

  /**
   * Resolves the correct StorageProvider instance for an in-flight upload session.
   */
  public async getProviderForSession(sessionToken: string): Promise<StorageProvider> {
    const accountId = this.sessionAccountMap.get(sessionToken);
    if (accountId) {
      return this.getProviderForAccount(accountId);
    }

    // Scan registered account providers
    for (const provider of this.accountProviders.values()) {
      if (provider.hasSession && provider.hasSession(sessionToken)) {
        return provider;
      }
    }

    // Default to primary provider
    return this.getProvider();
  }

  /**
   * Retrieves or instantiates the StorageProvider configured for a specific internal storage account.
   * Isolates physical credentials and Google Drive nodes so each node operates independently.
   */
  public async getProviderForAccount(storageAccountId?: string): Promise<StorageProvider> {
    if (!storageAccountId) {
      return this.getProvider();
    }

    if (this.accountProviders.has(storageAccountId)) {
      return this.accountProviders.get(storageAccountId)!;
    }

    const account = dataStore.storageAccounts.get(storageAccountId);
    if (!account) {
      return this.getProvider();
    }

    if (account.provider === 'google_drive') {
      const gdrive = new GoogleDriveStorageProvider({
        accountId: account.id,
        accountName: account.name,
        clientId: account.credentials?.clientId || process.env.GOOGLE_DRIVE_CLIENT_ID,
        clientSecret: account.credentials?.clientSecret || process.env.GOOGLE_DRIVE_CLIENT_SECRET,
        refreshToken: account.credentials?.refreshToken || process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
        rootFolderId: account.rootFolderId || account.credentials?.rootFolderId || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
      });

      await gdrive.initialize();
      this.accountProviders.set(storageAccountId, gdrive);
      return gdrive;
    }

    const localProvider = new LocalMemoryStorageProvider();
    await localProvider.initialize();
    this.accountProviders.set(storageAccountId, localProvider);
    return localProvider;
  }

  /**
   * Default / Primary provider fallback.
   */
  public async getProvider(): Promise<StorageProvider> {
    if (this.primaryProvider) {
      return this.primaryProvider;
    }

    // Check if primary account exists in dataStore
    const primaryAccount = dataStore.storageAccounts.get('gdrive_acc_01');
    if (primaryAccount) {
      const provider = await this.getProviderForAccount(primaryAccount.id);
      this.primaryProvider = provider;
      return this.primaryProvider;
    }

    const gdriveProvider = new GoogleDriveStorageProvider({
      accountId: 'gdrive_acc_01',
      accountName: 'Google Drive Primary Node',
    });
    
    await gdriveProvider.initialize();
    this.primaryProvider = gdriveProvider;
    return this.primaryProvider;
  }
}

export const storageManager = StorageManager.getInstance();
