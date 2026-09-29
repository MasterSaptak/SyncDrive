import { BillingGateway } from '@/types';
import { BillingProvider } from './BillingProvider';
import { ManualUpiBillingProvider } from './providers/ManualUpiBillingProvider';
import { RazorpayBillingProvider } from './providers/RazorpayBillingProvider';
import { StripeBillingProvider } from './providers/StripeBillingProvider';

export class BillingManager {
  private static instance: BillingManager;
  private providers: Map<BillingGateway, BillingProvider> = new Map();

  private constructor() {
    this.registerProvider(new ManualUpiBillingProvider());
    this.registerProvider(new RazorpayBillingProvider());
    this.registerProvider(new StripeBillingProvider());
  }

  public static getInstance(): BillingManager {
    if (!BillingManager.instance) {
      BillingManager.instance = new BillingManager();
    }
    return BillingManager.instance;
  }

  public registerProvider(provider: BillingProvider): void {
    this.providers.set(provider.gateway, provider);
  }

  public getProvider(gateway: BillingGateway = 'manual_upi'): BillingProvider {
    const provider = this.providers.get(gateway);
    if (!provider) {
      throw new Error(`Unsupported billing gateway: ${gateway}`);
    }
    return provider;
  }
}

export const billingManager = BillingManager.getInstance();
