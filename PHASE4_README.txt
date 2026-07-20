DriveSaathi Phase-4 test build
Adds UI/workflow scaffolding for Admin booking control, quotes, payment status and service lifecycle.
IMPORTANT:
1. Run PHASE4_ADMIN_PAYMENT_MIGRATION.sql once in Supabase before using payment fields.
2. Admin authorization/RLS must be configured before production use.
3. Real online payments are intentionally disabled until merchant KYC and secure gateway/server integration.
4. Never collect/store card number, CVV, OTP or UPI PIN directly.
Test on a temporary Netlify deployment first.
