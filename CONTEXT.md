# SyncDrive Project Context

# 1. Project Overview
- **Purpose**: SyncDrive is a secure, high-performance, multi-tenant SaaS cloud storage platform providing file synchronization, cloud backups, and seamless file sharing.
- **Business Goal**: Offer competitive cloud storage tiers (from 100GB to 1TB) with native UPI manual payment capabilities, robust quota tracking, and strict tenant isolation, competing with platforms like Google Drive and Dropbox.
- **Problem being solved**: Consumers and businesses need a reliable, encrypted, and trackable way to store and share digital assets.
- **Target users**: General consumers needing personal backups, creative professionals handling large raw assets, and small businesses requiring shared storage solutions.
- **Current development status**: Actively developed Phase 1 foundation. The core database schema, multi-tenant RLS, plans, authentication flow (including fallback and Google Auth via Supabase), and file operations APIs are implemented.

# 2. Architecture
- **Frontend**: Next.js 15.4.9 (App Router) with React 19, utilizing Tailwind CSS 4 for utility-first styling and Framer Motion for animations.
- **Backend**: Next.js API Routes (Node.js/Edge) providing a RESTful API layer for file management, authentication, and billing.
- **Database**: PostgreSQL (managed by Supabase) structured around a multi-tenant schema with strict Row Level Security (RLS).
- **Storage**: Abstracted storage pools. Currently supports Google Drive as the backend physical storage node, with the application fully owning metadata and hiding physical storage from the customer.
- **Authentication**: Supabase Auth combined with a custom cookie-based JWT session fallback, supporting credential login, Google OAuth, and account switching.
- **APIs**: Internal REST API under `/api/*` for frontend consumption.
- **Deployment**: Hosted via Vercel/Cloud Run (configurable via `APP_URL`), with Supabase handling the persistence layer.
- **External Integrations**: 
  - **Supabase**: PostgreSQL DB and Auth.
  - **Google Drive API**: Used internally as a massive physical storage pool (`GOOGLE_DRIVE_CLIENT_ID`, etc.).
  - **Google Gemini API**: For AI features (via `@google/genai`).

**Data Flow**: The user interacts with the React UI -> Next.js API Routes validate the session via cookies/headers -> Next.js accesses Supabase (with Service Role or Anon Keys) to apply RLS -> File binaries are chunked and streamed to the Google Drive storage node while metadata is saved in PostgreSQL.

# 3. Folder Structure
- `/app`: Next.js App Router entry points. Contains UI routes (`/dashboard`, `/drive`, `/auth`) and the API layer (`/api`). Exists to define routing and server/client boundaries.
- `/components`: Reusable React components (UI elements, modals, layout parts) to keep pages clean and enforce design consistency.
- `/lib`: Core business logic, database initialization (`data-store.ts`, `schema.sql`), supabase clients, and services (`file.service.ts`, `audit.service.ts`). Exists to decouple business rules from React components.
- `/services`: Dedicated service modules (like `auth.ts`) for complex frontend logic interacting with local storage and APIs.
- `/hooks`: Custom React hooks for state and lifecycle abstraction.
- `/types`: TypeScript interfaces/types defining the domain model.
- `/docs`: Technical documentation.
- `/scripts`: Utility scripts for operational tasks like getting drive tokens.

# 4. Technologies
- **Next.js (15.4.9)**: Full-stack React framework providing App Router, API routes, and SSR.
- **React (19.2.1)**: UI library using the latest features like Server Components.
- **Tailwind CSS (4.1.11)**: Utility-first CSS for rapid, maintainable UI styling.
- **Framer Motion (12.23.24)**: Declarative animations.
- **Supabase JS (2.116.0)**: Official client for PostgreSQL and Auth integration.
- **Lightningcss**: High-performance CSS compilation.
- **Lucide React**: Scalable SVG icon system.
- **@google/genai**: Integration for Gemini AI capabilities.

# 5. Environment Variables
- `GEMINI_API_KEY`: Used for AI features. Injected via AI Studio.
- `APP_URL`: The root canonical URL of the deployment. Required for OAuth callbacks and internal API absolute URLs.
- `NEXT_PUBLIC_SUPABASE_URL`: Required for frontend Supabase client initialization.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public anonymous key for Supabase interactions.
- `SUPABASE_SERVICE_ROLE_KEY`: Secret backend key for bypassing RLS during admin/system tasks.
- `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, `GOOGLE_DRIVE_REFRESH_TOKEN`, `GOOGLE_DRIVE_ROOT_FOLDER_ID`: Backend-only credentials to communicate with Google Drive as the physical storage layer.
- `DEFAULT_UPI_ID`: Used for manual payment submissions.

# 6. Database
- **roles**: Maps roles (`customer`, `admin`, `super_admin`) to JSONB permissions.
- **profiles**: Extended user info tied to `auth.users`, enforces `tenant_id` boundaries.
- **plans**: Available storage tiers (e.g., 100GB Starter, 1TB Ultimate).
- **subscriptions**: Links users to plans, tracks entitlement, period dates.
- **storage_allocations**: Additive byte blocks tracking a user's total allowed quota.
- **storage_usage**: High-frequency tracked storage state (used bytes, file count).
- **storage_providers & storage_pools**: Admin-only tables mapping application to physical cloud targets (e.g., Google Drive).
- **folders**: Hierarchical tree for directory structure; enforces RLS per tenant.
- **files**: Metadata for uploaded files (MIME type, size, checksum, pointer to physical `storage_object_id`).
- **file_versions**: Immutable file revisions.
- **upload_reservations**: Pre-upload locks to prevent exceeding quota during concurrent uploads.
- **share_links**: Secure tokens mapped to files/folders for public or password-protected access.
- **audit_logs**: Immutable security tracking for user actions.
- **payment_records & payment_submissions**: Tables for billing history and manual UPI verification workflow.

# 7. Authentication Flow
- **Signup**: User calls `/api/auth/register`, which creates a local `dataStore` mock or Supabase user, sets up initial subscriptions and allocations, and issues a JWT.
- **Signin**: User calls `/api/auth/login`. Flow checks Supabase `signInWithPassword`. If it fails or is offline, checks local fallback mock. Uses cookies (`syncdrive_user_id`, `syncdrive_user_data`) and `localStorage` (`syncdrive_auth_session`).
- **Google OAuth**: Triggered via `authService.loginWithGoogle()` interacting with Supabase browser client.
- **Session**: Hydrated on the frontend via `authService.getCurrentSession()`. Backend verifies via `getAuthenticatedUser()` which checks explicit headers, cookies, and then the Supabase Bearer token.
- **Logout**: Clears local storage and cookies, calls `/api/auth/logout`.
- **Authorization**: Done via Supabase RLS policies (e.g., `tenant_id = public.get_current_tenant_id()`) and API-level role checks.

# 8. API Documentation
- **POST `/api/auth/login`**: Authenticates users, initializes mock states, returns user object and sets HttpOnly equivalent cookies.
- **POST `/api/auth/register`**: Creates new user, assigns default '100 GB Starter' plan.
- **GET `/api/files`**: Retrieves files/folders, accepts search params like `parentId`, `isTrash`, `search`. Computes breadcrumbs.
- **POST `/api/files`**: Creates a folder (if JSON) or handles direct file upload (if `multipart/form-data`).

*(Other APIs inferred from folder structure: `/api/admin`, `/api/audit`, `/api/plans`, `/api/quota`, `/api/share`, `/api/payments` handle standard CRUD operations mapped to their respective names).*

# 9. Components
- **Navbar & Sidebar**: Core navigational shells handling responsive routing and user profile dropdowns.
- **SaaSDriveView**: The main file explorer interface managing folder traversal, file selection, drag-and-drop, and context menus.
- **SettingsView**: Multi-tab interface for profile management, security, and preferences.
- **PlansAndBilling**: Showcases subscription tiers, calculates prorations, and handles the UPI payment submission modal.
- **QuotaMeter**: Visual progress bar computing `usedBytes` / `allocatedBytes` to warn users near limits.
- **Modals (e.g., ApiDocsModal)**: Reusable dialogs for forms and info.

# 10. Pages
- **`/` (Landing)**: Marketing overview, pricing preview.
- **`/login` & `/register`**: Auth entry points.
- **`/drive`**: The core application, wrapping `SaaSDriveView`. Manages root state for files.
- **`/dashboard`**: High-level telemetry for the user (storage used, recent files).
- **`/auth/callback`**: Handles OAuth redirects from Supabase.

# 11. State Management
- **Global State**: Next.js App Router layout state + Local Storage (`SESSION_KEY`) for session persistence across tabs.
- **Local State**: React `useState`/`useReducer` in components like `SaaSDriveView` for selections, active folder, and loading indicators.
- **Caching**: Data caching handled via Next.js `fetch` mechanisms and local variable caching in `dataStore` for mock mode.

# 12. Business Logic
- **Tenant Isolation**: Every database row and API request is intrinsically tied to a `tenant_id`. Users cannot traverse folders outside their tenant.
- **Quota Checking**: Before an upload begins, an `upload_reservation` is created. If `usedBytes + expectedSize > allocatedBytes`, the API returns a 402 Quota Exceeded error.
- **Immutable Audit Logging**: Every critical action (login, file delete, share link generation) writes to `audit_logs` asynchronously.
- **Abstracted Storage**: File metadata is PostgreSQL, but physical bytes live in Google Drive. This decouples the frontend from underlying cloud vendors.

# 13. Important Algorithms
- **Hierarchical Path Resolution (Breadcrumbs)**: Recursive or CTE query on the `folders` table resolving from `parent_id` up to the root to build UI breadcrumbs. Complexity: O(depth).
- **Storage Calculation**: Continuous sum aggregation triggered on file upload/delete to update `storage_usage`.

# 14. Configuration Files
- **`package.json`**: Defines scripts (`dev`, `build`, `test`), TSX runners, and core dependencies.
- **`next.config.ts`**: Controls Next.js compilation, rewrites, and potentially remote image patterns.
- **`tailwind.config` / PostCSS**: Utilizes Tailwind CSS v4 pipeline.
- **`schema.sql`**: The single source of truth for the Supabase Postgres database state.

# 15. Build Process
- **Compilation**: Triggered via `npm run build` utilizing the Next.js compiler (Turbopack/Webpack).
- **Type Checking**: Strict TypeScript compilation.
- **Deployment**: Output goes to `.next`. Typically deployed as serverless functions on Vercel or packaged into a Docker container for Cloud Run.

# 16. Third-party Services
- **Supabase**: Used globally for PostgreSQL hosting and authentication management.
- **Google Drive**: Abstracted physical storage target via OAuth service account/refresh tokens.
- **Gemini (Google AI)**: Utilized for intelligent search and potential file summarization.

# 17. Error Handling
- **Backend**: API routes utilize `try/catch` blocks, standardizing on HTTP status codes (400 Bad Request, 401 Unauthorized, 402 Payment Required, 500 Internal).
- **Frontend**: Component error boundaries, toast notifications for API failures. Auth components throw `ApiError` which are caught and displayed to the user.

# 18. Security
- **Authentication**: JWT validation strictly enforced on API routes via `getAuthenticatedUser()`.
- **Authorization**: Row Level Security (RLS) in PostgreSQL ensures even if API logic fails, DB queries reject unauthorized access.
- **Validation**: Strict payload checks on API POSTs.
- **Secrets**: Handled safely in server environments (never prefixed with `NEXT_PUBLIC_` unless safe).

# 19. Performance
- **Optimizations**: Next.js App Router streaming and Server Components.
- **Database**: Indexes on `tenant_id`, `user_id`, and `is_trash` on large tables like `files` and `folders`. Full-text search index (`gin(to_tsvector)`) on file names.
- **UI**: Framer motion handles animations off the main thread where possible.

# 20. Reusable Utilities
- **`utils.ts` & `formatters.ts`**: Helper functions for byte formatting (`1024` -> `1 KB`), date localization, and `clsx`/`tailwind-merge` class combiners.
- **`api.ts`**: Abstracted fetch wrapper handling common headers and error parsing.

# 21. Constants
- Storage multiples defined internally (e.g., `BYTES_PER_GIB = 1024 * 1024 * 1024`).
- `SESSION_KEY` and `SAVED_ACCOUNTS_KEY` for local storage interaction.

# 22. Types
- `UserProfile`, `FileItem`, `FolderItem`, `AuthSession`: Defined in `/types`. Essential for maintaining strict TypeScript contracts across frontend and backend boundaries.

# 23. Development Workflow
- **Startup**: Run `npm install`, set `.env.local`, then `npm run dev` to start on port 3000.
- **Testing**: `tsx tests/storage-engine.test.ts` for integration tests.
- **Scripts**: `npm run get-drive-token` and `npm run verify-drive` for setting up the Google Drive physical backend.

# 24. Known Issues
- Currently relies on a localized memory `dataStore` mock if Supabase connectivity is flaky during local development.
- The `upload_reservation` expiry cleanup might require a cron job (not evident in real-time execution).

# 25. Future Roadmap
- Integration of Stripe/Razorpay to replace the `manual_upi` mock.
- S3 / Azure Blob implementations in the `storage_providers` abstraction.
- Real-time collaboration sockets using Supabase Realtime for file status updates.

# 26. Developer Decisions
- **Why Google Drive abstraction?** Allows the platform to piggyback on cheap enterprise storage while offering a premium SaaS UI to end consumers.
- **Why RLS + Multi-tenant ID?** Essential for security in a SaaS product; prevents catastrophic horizontal escalation bugs.

# 27. Coding Conventions
- **Naming**: `camelCase` for variables, `PascalCase` for React components.
- **Imports**: Path aliases (`@/lib/...`) exclusively used.
- **Style**: Functional components with hooks; server-actions/API-routes for mutations.

# 28. Dependencies Between Modules
- The UI heavily depends on `lib/api.ts` which proxies to `/api/*`.
- `/api/*` depends entirely on `lib/auth/session.ts` and `lib/services/*` to enforce security before hitting the database.

# 29. Critical Files
- **`lib/db/schema.sql`**: The most critical file. Changing this incorrectly breaks RLS and corrupts tenant isolation.
- **`lib/auth/session.ts`**: The gatekeeper for all backend requests.
- **`services/auth.ts`**: Manages the complex state of frontend sessions, demo accounts, and Supabase OAuth flows.

# 30. AI Continuation Notes
- **Architecture**: Next.js 15 App router with Supabase backend.
- **Invariants**: `tenant_id` must NEVER be mutable. Storage sizes MUST always be represented as deterministic `BIGINT` bytes, never floating point.
- **Must never change**: The logical separation between `public.files` (metadata) and `storage_object_id` (physical file pointer).
- **Common mistakes**: Do not bypass RLS using the service role key unless absolutely necessary (e.g., webhook processing). Always use the anonymous key or passed JWT.
- **Expected style**: React Server Components for data fetching where applicable, explicit `'use client'` directives for interactive components.
- **Refactoring**: Safely refactor UI, but touch `schema.sql` only via proper Supabase migrations to preserve production data.
