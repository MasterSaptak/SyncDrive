-- ==============================================================================
-- SyncDrive - Production Database Schema & RLS Migrations (Phase 1 Foundation)
-- Compatible with Supabase PostgreSQL
-- ==============================================================================
-- STORAGE SIZE CONVENTION DOCUMENTATION:
-- Storage sizes in SyncDrive are represented internally strictly as deterministic
-- BIGINT integer byte quantities. No floating-point math is used for byte accounting.
-- Standard Convention: Binary standard (IEC/binary prefix):
--   1 KiB = 1,024 Bytes (2^10)
--   1 MiB = 1,048,576 Bytes (2^20)
--   1 GiB = 1,073,741,824 Bytes (2^30)
--   1 TiB = 1,099,511,627,776 Bytes (2^40)
-- Plans:
--   100 GiB Starter  = 107,374,182,400 Bytes
--   250 GiB Plus     = 268,435,456,000 Bytes
--   500 GiB Pro      = 536,870,912,000 Bytes
--   1 TiB Ultimate   = 1,099,511,627,776 Bytes
-- ==============================================================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. ROLES DEFINITIONS & SYSTEM PERMISSIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roles (
  name TEXT PRIMARY KEY CHECK (name IN ('customer', 'admin', 'super_admin')),
  description TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.roles (name, description, permissions)
VALUES
  ('customer', 'Default SaaS customer with tenant-scoped access to files, quotas and billing', '["files:read", "files:write", "files:share", "billing:view", "billing:submit"]'::jsonb),
  ('admin', 'Platform administrator capable of inspecting storage pools, system audit logs, and reviewing payments', '["admin:pools:read", "admin:payments:review", "admin:audit:read", "admin:users:read"]'::jsonb),
  ('super_admin', 'Full platform superuser with permissions to modify plans, credentials, and grant admin roles', '["*"]'::jsonb)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions;

-- ------------------------------------------------------------------------------
-- 2. USER PROFILES (Linked to auth.users, Architected with Tenant Boundary)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL DEFAULT uuid_generate_v4(), -- Multi-tenant boundary
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'customer' REFERENCES public.roles(name),
  current_plan_id TEXT NOT NULL DEFAULT 'plan_100gb',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------------------------
-- 3. STORAGE PLANS TABLE
-- Plans are retrieved dynamically by the frontend from the backend/database.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plans (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  quota_bytes BIGINT NOT NULL, -- Deterministic integer bytes
  monthly_price INTEGER NOT NULL, -- Base currency units (e.g. 199 INR)
  currency TEXT NOT NULL DEFAULT 'INR',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_popular BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.plans (id, slug, name, quota_bytes, monthly_price, currency, is_active, display_order, description, features, is_popular)
VALUES
  ('plan_100gb', 'starter-100gb', '100 GB Starter', 107374182400, 199, 'INR', true, 1, 'Great for personal documents and everyday secure backup', '["100 GB High-Speed Storage", "Resumable Uploads", "Private Share Links", "Encrypted Transfer"]'::jsonb, false),
  ('plan_250gb', 'plus-250gb', '250 GB Plus', 268435456000, 399, 'INR', true, 2, 'Ideal for photography, digital media, and archives', '["250 GB High-Speed Storage", "Resumable Uploads", "Password Protected Links", "Standard Support"]'::jsonb, true),
  ('plan_500gb', 'pro-500gb', '500 GB Pro', 536870912000, 699, 'INR', true, 3, 'Heavy workflows, large raw assets, and multi-device backups', '["500 GB High-Speed Storage", "Faster Parallel Uploads", "Extended Trash Retention", "Priority Bandwidth"]'::jsonb, false),
  ('plan_1tb', 'elite-1tb', '1 TB Ultimate', 1099511627776, 1199, 'INR', true, 4, 'Maximum cloud capacity for power users and long-term storage', '["1 TB Ultimate Storage", "High-Concurrency Uploads", "Extended Retention", "VIP Priority Support"]'::jsonb, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  quota_bytes = EXCLUDED.quota_bytes,
  monthly_price = EXCLUDED.monthly_price,
  currency = EXCLUDED.currency,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order,
  description = EXCLUDED.description,
  features = EXCLUDED.features;

-- ------------------------------------------------------------------------------
-- 4. SUBSCRIPTIONS & STORAGE ENTITLEMENT
-- Distinguishes subscription status from active storage entitlement.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'past_due', 'cancelled', 'expired', 'suspended')),
  storage_entitlement_bytes BIGINT NOT NULL DEFAULT 107374182400, -- Entitlement in bytes
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subs_tenant ON public.subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subs_user ON public.subscriptions(user_id);

-- ------------------------------------------------------------------------------
-- 5. STORAGE ALLOCATIONS (Additive Quota Blocks: Plan, Addon, Trial)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.storage_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  allocated_bytes BIGINT NOT NULL,
  allocation_type TEXT NOT NULL DEFAULT 'plan_quota' CHECK (allocation_type IN ('plan_quota', 'addon', 'bonus', 'trial')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_allocations_tenant_user ON public.storage_allocations(tenant_id, user_id, is_active);

-- ------------------------------------------------------------------------------
-- 6. STORAGE USAGE (Granular Usage Accounting)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.storage_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_bytes BIGINT NOT NULL DEFAULT 0,
  reserved_bytes BIGINT NOT NULL DEFAULT 0,
  file_count INTEGER NOT NULL DEFAULT 0,
  folder_count INTEGER NOT NULL DEFAULT 0,
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_storage_usage_tenant_user UNIQUE (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_usage_tenant ON public.storage_usage(tenant_id);

-- ------------------------------------------------------------------------------
-- 7. STORAGE PROVIDERS & PHYSICAL STORAGE POOLS
-- Storage provider metadata is strictly isolated on the backend.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.storage_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_type TEXT NOT NULL CHECK (provider_type IN ('google_drive', 'local_memory', 's3_compatible', 'b2', 'azure_blob')),
  name TEXT NOT NULL,
  account_identifier TEXT NOT NULL,
  encrypted_credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'degraded', 'offline')),
  health_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.storage_pools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  provider_id UUID REFERENCES public.storage_providers(id) ON DELETE SET NULL,
  total_capacity_bytes BIGINT NOT NULL,
  used_bytes BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'drain', 'maintenance', 'full')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 8. FOLDERS (Hierarchical Multi-Tenant Storage)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  is_starred BOOLEAN NOT NULL DEFAULT false,
  is_trash BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_folders_tenant_parent ON public.folders(tenant_id, parent_id, is_trash);
CREATE INDEX IF NOT EXISTS idx_folders_trash ON public.folders(tenant_id, is_trash);

-- ------------------------------------------------------------------------------
-- 9. FILES & FILE VERSIONS (Application owns metadata)
-- Internal storage credentials & IDs remain strictly hidden from customers.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  checksum_sha256 TEXT,
  -- Storage provider references (internal only)
  storage_provider_id UUID REFERENCES public.storage_providers(id) ON DELETE SET NULL,
  storage_object_id TEXT NOT NULL DEFAULT '',
  is_starred BOOLEAN NOT NULL DEFAULT false,
  is_trash BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  current_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_files_tenant_folder ON public.files(tenant_id, folder_id, is_trash);
CREATE INDEX IF NOT EXISTS idx_files_tenant_trash ON public.files(tenant_id, is_trash);
CREATE INDEX IF NOT EXISTS idx_files_search_name ON public.files USING gin(to_tsvector('english', name));

CREATE TABLE IF NOT EXISTS public.file_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  size_bytes BIGINT NOT NULL,
  checksum_sha256 TEXT,
  storage_object_id TEXT NOT NULL,
  storage_provider_id UUID REFERENCES public.storage_providers(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_file_version UNIQUE (file_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_file_versions_file ON public.file_versions(file_id);

-- ------------------------------------------------------------------------------
-- 10. UPLOAD RESERVATIONS (Prevents concurrent uploads exceeding quota)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.upload_reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expected_size_bytes BIGINT NOT NULL,
  storage_node_id UUID REFERENCES public.storage_pools(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'committed', 'released', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reservations_user ON public.upload_reservations(user_id, status);

-- ------------------------------------------------------------------------------
-- 11. SHARE LINKS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.share_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_id UUID REFERENCES public.files(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  access_type TEXT NOT NULL DEFAULT 'view' CHECK (access_type IN ('view', 'download', 'edit')),
  password_hash TEXT,
  expires_at TIMESTAMPTZ,
  download_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_share_token ON public.share_links(token);

-- ------------------------------------------------------------------------------
-- 12. AUDIT LOGS (Immutable security tracking)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant_user ON public.audit_logs(tenant_id, user_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 13. PAYMENT RECORDS & SUBMISSIONS (Billing Abstraction Foundation)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  plan_id TEXT NOT NULL REFERENCES public.plans(id),
  gateway TEXT NOT NULL CHECK (gateway IN ('manual_upi', 'razorpay', 'stripe')),
  gateway_transaction_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_records_tenant ON public.payment_records(tenant_id);

CREATE TABLE IF NOT EXISTS public.payment_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.plans(id),
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  method TEXT NOT NULL DEFAULT 'manual_upi',
  reference_id TEXT NOT NULL, -- 12-digit UTR/Ref
  payer_vpa TEXT,
  payee_vpa TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_submissions_user ON public.payment_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_submissions_status ON public.payment_submissions(status);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict customer isolation enforced at the database layer.
-- ==============================================================================

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_submissions ENABLE ROW LEVEL SECURITY;

-- 1. Roles & Plans: Public read for active data
CREATE POLICY "Public read active plans" ON public.plans
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public read roles" ON public.roles
  FOR SELECT TO authenticated USING (true);

-- 2. Profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 3. Subscriptions & Storage Allocations & Usage (Tenant-Scoped)
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT USING (user_id = auth.uid() OR tenant_id = public.get_current_tenant_id());

CREATE POLICY "Users can view own storage allocations" ON public.storage_allocations
  FOR SELECT USING (user_id = auth.uid() OR tenant_id = public.get_current_tenant_id());

CREATE POLICY "Users can view own storage usage" ON public.storage_usage
  FOR SELECT USING (user_id = auth.uid() OR tenant_id = public.get_current_tenant_id());

-- 4. Storage Providers & Pools (Admin only - completely isolated from customers)
CREATE POLICY "Admins can view storage providers" ON public.storage_providers
  FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can view storage pools" ON public.storage_pools
  FOR ALL USING (public.is_admin());

-- 5. Folders (Strict Tenant & User Ownership)
CREATE POLICY "Users can view own folders" ON public.folders
  FOR SELECT USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "Users can insert own folders" ON public.folders
  FOR INSERT WITH CHECK (tenant_id = public.get_current_tenant_id() AND user_id = auth.uid());

CREATE POLICY "Users can update own folders" ON public.folders
  FOR UPDATE USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "Users can delete own folders" ON public.folders
  FOR DELETE USING (tenant_id = public.get_current_tenant_id());

-- 6. Files & File Versions (Strict Tenant & User Ownership)
CREATE POLICY "Users can view own files" ON public.files
  FOR SELECT USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "Users can insert own files" ON public.files
  FOR INSERT WITH CHECK (tenant_id = public.get_current_tenant_id() AND user_id = auth.uid());

CREATE POLICY "Users can update own files" ON public.files
  FOR UPDATE USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "Users can delete own files" ON public.files
  FOR DELETE USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "Users can view own file versions" ON public.file_versions
  FOR SELECT USING (tenant_id = public.get_current_tenant_id());

-- 7. Upload Reservations
CREATE POLICY "Users can manage own reservations" ON public.upload_reservations
  FOR ALL USING (user_id = auth.uid());

-- 8. Share Links
CREATE POLICY "Users can manage own share links" ON public.share_links
  FOR ALL USING (user_id = auth.uid() OR tenant_id = public.get_current_tenant_id());

CREATE POLICY "Public token access for active share links" ON public.share_links
  FOR SELECT USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- 9. Audit Logs
CREATE POLICY "Users can view own audit logs" ON public.audit_logs
  FOR SELECT USING (user_id = auth.uid() OR tenant_id = public.get_current_tenant_id());

-- 10. Payments & Submissions
CREATE POLICY "Users can view own payment records" ON public.payment_records
  FOR SELECT USING (user_id = auth.uid() OR tenant_id = public.get_current_tenant_id());

CREATE POLICY "Users can view own payment submissions" ON public.payment_submissions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert payment submissions" ON public.payment_submissions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admins can review all payment submissions
CREATE POLICY "Admins can view and review all submissions" ON public.payment_submissions
  FOR ALL USING (public.is_admin());
