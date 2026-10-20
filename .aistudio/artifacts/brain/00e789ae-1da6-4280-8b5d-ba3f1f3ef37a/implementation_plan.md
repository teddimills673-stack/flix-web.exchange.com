# Implementation Plan - Permanent Owner Profile Picture

## User Requirements Addressed
1. **Permanent Owner Profile Picture**: Store the uploaded image (`EDB678EC-5AA0-42C9-9D28-808F9AF8548A.png`) as the official permanent profile picture for `oflixexchange@gmail.com`.
2. **Permanent Storage & Cross-Device Sync**: Persist the image in robust state storage and localStorage so it survives logout, refresh, browser cache clearing, and device changes.
3. **Owner-Only Protection**: Restrict profile picture modifications strictly to the authenticated owner (`oflixexchange@gmail.com`).
4. **POWER SAVE Integration**: Ensure when POWER SAVE is active (red), the owner profile picture and institutional settings are permanently committed and synchronized.

## Proposed Changes
1. **Asset Management**: Place the uploaded image in public assets or convert it to a persistent base64 data URL stored in persistent application state and localStorage for `oflixexchange@gmail.com`.
2. **Store & Backend Upgrades (`lib/store.tsx`)**:
   - Hardcode / default the owner profile picture for `oflixexchange@gmail.com` to the uploaded image asset.
   - Ensure `setOwnerProfilePic` or X-RWA POWER SAVE saves the profile picture permanently.
   - Prevent default avatar fallback when loading owner profile.
3. **UI Components (`components/XRWADashboard.tsx`, `components/Header.tsx`, `components/SettingsView.tsx`, etc.)**:
   - Render the permanent owner profile picture across all user avatars when logged in as `oflixexchange@gmail.com`.
