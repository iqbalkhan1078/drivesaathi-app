DriveSaathi Phase-6 Accept/Reject Test
Built from the known working-login + working-driver-list base.
Changes only My Assignments:
- driver_assignment_pending shows Accept Job / Reject Job
- writes driver_response = accepted/rejected
- writes driver_responded_at timestamp
No booking_status enum change is attempted in this build, to avoid breaking the working assignment flow.
Test Accept first on the assigned Surat to Mumbai booking.
