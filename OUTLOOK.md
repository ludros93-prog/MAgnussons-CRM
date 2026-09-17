# Outlook / Microsoft 365 — implementation and activation

This integration reads a seller's mailbox and primary calendar through delegated Microsoft Graph access. Outlook is the reported client; Microsoft 365 / Exchange Online hosting remains to be confirmed by Magnussons IT. No account is connected until the environment is configured and each seller consents.

## Delivered scope

- Site sign-in remains dispatch-owned. The trusted, stable `oai-authenticated-user-id` is the integration ownership key. Outlook consent grants access to resources; it does not replace CRM authentication.
- Confidential authorization code flow with PKCE S256, random state, ten-minute single-use server state, HttpOnly Secure SameSite=Lax browser binding, fixed callback and tenant.
- Refresh and access tokens, and temporary PKCE verifiers, encrypted with AES-GCM and the Site user ID as authenticated associated data. No tokens returned to the browser or logged.
- One Microsoft account per Site user, unique Microsoft account across users. Disconnect before switching accounts. Exchange tokens only with the configured tenant; access only Graph v1.0 public endpoints.
- Reads Inbox and Sent Items over the last 30 days and the primary calendar from 30 days ago through 90 days ahead. Up to 10 pages of 50 objects per source. Explicit partial-sync notice if a source exceeds the cap.
- Exact email matching against live customer primary email and customer-plan contacts. No domain guessing. Drafts and non-normal sensitivity are skipped. Unmatched content is not retained.
- Matched items are initially private to the mailbox owner, with suggested customer link. Seller can explicitly bind customer/optional deal and publish a copy to the shared customer timeline. Each own item can be made private again. Team sees only shared copies. Demo workspace never shows real Outlook data.
- Stable provider IDs and per-user hash keys prevent duplicates on repeated sync. Existing deliberate sharing and links survive ordinary provider updates. Changed and cancelled appointments update, and an event absent from a completely read calendar window is marked unavailable. Absence is not represented as proof of cancellation.
- Synces on opening the live workspace (when last sync is older than five minutes), every five minutes while visible, and on demand. No worker cron, webhooks or closed-browser background processing in this version.
- No mail sending, calendar writes, invitations, attachments, contact import, shared mailbox access, archive folder history, automatic sales-stage changes or completed-meeting inference.
- Disconnect removes tokens, pending consent state and private cached items. Explicitly shared copies remain, with source details. User can make their retained shared copies private afterward. Provider-side revocation is a separate action in Microsoft.

## Activation with Magnussons IT

1. Confirm Microsoft 365 / Exchange Online, actual organization tenant and permitted pilot accounts. Outlook alone does not establish mailbox hosting.
2. Register a single-tenant confidential **Web** application in Microsoft Entra for Magnussons CRM.
3. Register this exact HTTPS redirect URI:
   `https://magnussons-crm.rosen123.chatgpt.site/api/outlook/callback`
4. Delegated Graph scopes: `User.Read`, `Mail.Read`, `Calendars.Read`; request `offline_access` for refresh tokens. No application-wide mailbox permissions and no `Mail.Send`/write scopes.
5. Configure runtime values using the deployment secret controls, never client code, Git or customer notes:
   - `MS_TENANT_ID`: the verified tenant GUID.
   - `MS_CLIENT_ID`: application/client GUID (not the Entra object ID).
   - `MS_CLIENT_SECRET`: confidential application secret value, with managed expiry/rotation.
   - `OUTLOOK_TOKEN_KEY`: 32 cryptographically random bytes encoded as base64url; keep a protected recovery copy. Losing/rotating it without migrating ciphertext requires every account to reconnect.
6. Pilot seller signs into the CRM, opens **Min arbetsyta → Anslutningar → Anslut mitt Outlook** and completes Microsoft consent. Tenant consent rules may require administrator approval.
7. Populate customer contact emails; test inbox/sent directions, calendar occurrences, updates/cancellations, private sensitivity and exact customer/deal association with selected accounts before broader rollout.
8. Verify the actual Microsoft handshake and refresh, platform identity/headers, callback navigation through Site auth, runtime public Graph access, token rotation and restore, error handling and personal-data lifecycle before production use.

IT owns Microsoft registration/consent; the CRM operator owns runtime secret provisioning. Do not request any user's Outlook password or ask for secrets in chat. No Microsoft registration, consent or secrets were supplied during implementation, so live-account behavior remains unverified.

## Persistence and testing

Schema-only Drizzle migration `0001` adds connections, single-use consent state and external timeline items. Existing CRM schema and payloads remain unchanged. A revision/lease guards concurrent sync and disconnection; content writes require the same connection revision. Partial reads are clearly reported and must not be interpreted as complete history.

`node tests/outlook.mjs` also runs the existing CRM regression checks. Microsoft replies are mocked. Assertions cover missing configuration, server identity, token encryption and user-bound decryption, PKCE/state single use, data matching/privacy, user visibility, sharing authorization, stable IDs, changed/cancelled/removed events, preserving explicit sharing, provider URL allowlisting, CSRF and disconnect semantics. No live consent or visual browser test has been performed.

## Known next steps

Production hardening remains: live Microsoft pilot, monitoring/alerting, scheduled/delta background synchronization, pagination/retention and restore verification, finer-grained CRM membership/permissions, an immutable actor audit for sharing, full data removal and a retained-copy policy. Sharing currently grants visibility to every visitor authorized for the Site, including explicitly invited reviewers.

## Primary references checked 2026-09-14

- Microsoft delegated authorization and registration: https://learn.microsoft.com/en-us/graph/auth-v2-user
- Authorization code / PKCE: https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow
- Reading mail and paging: https://learn.microsoft.com/en-us/graph/api/user-list-messages?view=graph-rest-1.0
- Primary calendar view: https://learn.microsoft.com/en-us/graph/api/calendar-list-calendarview?view=graph-rest-1.0
