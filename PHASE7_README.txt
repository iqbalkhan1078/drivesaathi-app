Phase 7 test build from verified working Accept/Reject build.
Adds:
- Driver Accepted display
- Start Trip button after acceptance
- 4-digit Start OTP generation
- OTP verification
- trip_started_at + start_otp_verified
IMPORTANT: requires bookings columns start_otp text, start_otp_verified boolean, trip_started_at timestamptz.
Run supplied SQL before testing if columns do not exist.
