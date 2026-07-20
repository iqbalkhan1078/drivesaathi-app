# DriveSaathi Phase-2 — Supabase-ready MVP

## What is included
- Customer/Employer and Driver sign-up/login UI
- Supabase authentication integration
- Central PostgreSQL schema
- Driver profiles
- Driver booking requests
- Employer job posts
- Driver job applications
- Row Level Security starter policies
- Support number: 8866528178

## Setup
1. Create a Supabase project.
2. Open Supabase SQL Editor and run `supabase_schema.sql`.
3. In Project Settings/API, copy the Project URL and anon/publishable key.
4. Put them in `config.js`.
5. Serve this folder over localhost:
   `python -m http.server 8000`
6. Open `http://localhost:8000`.

## Security / production checklist
- Do NOT use the service_role key in browser/mobile code.
- Create a private Storage bucket and strict policies before accepting KYC/licence files.
- Admin privileges should be enforced server-side/custom claims, not a browser-editable field.
- Add phone OTP only after selecting/configuring an SMS provider and reviewing costs.
- Add privacy policy, terms, consent, retention/deletion process, grievance/contact flow.
- Verify claims such as "police verified" only through a real authorized process.
- Before Play Store release, package/test the app, add production icons/screens, privacy declarations, crash/error handling and account deletion flow.
