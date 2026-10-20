# Implementation Plan - Complete Removal of AI Support & Integration of Tawk.to Live Human Support

## User Requirements Addressed
1. **Complete Removal of AI Support**: Strip out the old AI Support Center screen, conversational AI support assistants, mock history, FAQ generation logic, and canned AI responses.
2. **Tawk.to as Sole Support System**: Implement Tawk.to (`https://embed.tawk.to/6ad6e53b59640134c789eb9b/default`) as the exclusive support mechanism.
3. **On-Demand Lifecycle**: Ensure Tawk.to is completely hidden by default (no floating bubble, launcher, or widgets anywhere on startup, dashboard, wallet, trading, settings, etc.).
4. **Direct Support View Embedding**: When the user clicks Support (from main navigation or Settings / Help Center), open the dedicated Support view pane and initialize/embed the Tawk.to live chat interface directly inside the pane. When clicking Back or navigating away, close the support view and hide the widget completely.

---

## Architecture & Component Design

```
[ Main Navigation / Settings / Help Center ]
                     │
         (Click "Support" / "Live Chat")
                     ▼
             [ SupportView ] 
    ┌─────────────────────────────────┐
    │  Embedded Tawk.to Chat Pane     │
    │  (Loaded on demand, hidden      │
    │   everywhere else by default)   │
    └─────────────────────────────────┘
                     │
          (Click "Back" / Nav away)
                     ▼
        [ Widget Hidden / Closed ]
```

---

## Detailed Changes

1. **Clean Up `SupportView.tsx`**:
   - Remove all AI chat state, Gemini/local API calls, markdown message history, image uploads for AI, canned responses, and feedback buttons.
   - Replace with a clean container that injects/initializes the Tawk.to script (`https://embed.tawk.to/6ad6e53b59640134c789eb9b/default`) when active, maximizes the Tawk chat window, and ensures full viewport responsiveness across mobile and desktop.
   - Provide a clean header with a "Back" button to return to the previous screen (Dashboard/Portfolio/etc.).

2. **Global Widget Script Control (`TawkWidgetScript.tsx`)**:
   - Ensure `Tawk_API.onLoad` calls `hideWidget()` on startup so no floating bubble appears across any screen by default.

3. **Navigation & Shortcuts**:
   - Ensure main navigation, Settings view, and Help Center view point directly to the Support view tab (`setActiveTab('support')`) which displays the embedded Tawk.to live chat.
