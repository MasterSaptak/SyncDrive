import { StoragePlan } from '@/types';
import { dataStore } from '@/lib/db/data-store';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export class PlanService {
  /**
   * Retrieves all active storage plans.
   * If Supabase is configured, attempts DB query first with fallback to dataStore.
   */
  static async getActivePlans(): Promise<StoragePlan[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('plans')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (!error && data && data.length > 0) {
          return data.map((row: any) => ({
            id: row.id,
            slug: row.slug,
            name: row.name,
            quotaBytes: Number(row.quota_bytes),
            monthlyPrice: Number(row.monthly_price),
            currency: row.currency || 'INR',
            isActive: Boolean(row.is_active),
            displayOrder: Number(row.display_order),
            description: row.description || '',
            features: Array.isArray(row.features) ? row.features : [],
            isPopular: Boolean(row.is_popular),
          }));
        }
      } catch (err) {
        console.warn('Supabase plans fetch note, using local store:', err);
      }
    }

    return dataStore.plans
      .filter((p) => p.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  static async getPlanById(planId: string): Promise<StoragePlan | null> {
    const plans = await this.getActivePlans();
    return plans.find((p) => p.id === planId) || null;
  }
}
