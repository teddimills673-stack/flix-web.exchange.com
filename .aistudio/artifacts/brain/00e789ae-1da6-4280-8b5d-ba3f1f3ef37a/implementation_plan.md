# Implementation Plan - Owner-Only X-RWA Cross-Device Synchronization & Versioning

## User Requirements Addressed
1. **Centralized Cloud Backend Synchronization**: Ensure `.xrwa-config.json` serves as the authoritative cloud source of truth, synchronizing configuration across all owner devices instantly.
2. **5-Second Live Polling**: Implement automatic polling every 5 seconds in `FeesSystemView` and `AppProvider` to pull the latest configuration from the server, ensuring real-time cross-device updates without manual refresh.
3. **Server-Side Timestamp Versioning & Concurrency Control**: Add `updatedAt` timestamps and version tracking in `POST /api/admin/xrwa` to reject stale or conflicting writes from older versions.
4. **Power Save Verification**: Ensure Power Save performs a genuine backend write, validates owner privileges, handles errors robustly, and only displays success upon backend confirmation.

---

## Technical Architecture & Changes

1. **Backend API (`app/api/admin/xrwa/route.ts`)**:
   - **GET**: Returns the stored `.xrwa-config.json` including `updatedAt` and `updatedBy`.
   - **POST**: Validates incoming configuration, checks incoming `updatedAt` against existing stored timestamp (preventing older writes from overwriting newer saves), writes to `.xrwa-config.json`, and returns success confirmation.

2. **Frontend State & Polling (`components/FeesSystemView.tsx` & `lib/store.tsx`)**:
   - Add a 5-second polling `useEffect` in `FeesSystemView` when unlocked (and in `AppProvider` globally) to fetch `/api/admin/xrwa` and update local configuration state if a newer server timestamp is detected.
   - Refine `handlePowerSave` to send the current timestamp and verify server response before indicating success (Red Power Save state).
