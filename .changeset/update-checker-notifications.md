---
'@nuvin/nuvin-cli': minor
---

Add notification-based update system with lifecycle callbacks

The update checker now runs after app startup and communicates via notifications:
- Update checks run 2 seconds after app starts (non-blocking)
- Shows notifications for update availability, start, and completion
- Added UpdateCheckOptions interface with lifecycle callbacks
- Improved UX by not blocking app startup for update checks
