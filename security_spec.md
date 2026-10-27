# Security Specification (Phase 0 — Payload-First Security TDD)

## 1. Data Invariants
1. **Identity Ownership Invariant**: Every document in `/products/{productId}`, `/inventory/{itemId}`, `/orders/{orderId}`, and `/backups/{backupId}` must contain an `ownerId` string matching `request.auth.uid` of a verified user (`request.auth.token.email_verified == true`).
2. **Path & Resource ID Hardening**: All document IDs (`productId`, `itemId`, `orderId`, `backupId`) must match `^[a-zA-Z0-9_\-]+$` and be at most 64 characters.
3. **Strict Key Allowlisting**: Every document write must strictly match the required and allowed keys defined in `firebase-blueprint.json` (`hasAll` and `hasOnly`) to block shadow fields.
4. **Action-Based Partial Updates & Immortality**: Updates must preserve `id`, `ownerId`, and `createdAt`, validate the complete modified payload through `isValid[Entity](incoming())`, and restrict mutated keys via `affectedKeys().hasOnly(...)`.
5. **Terminal State Locking**: Once a `PosOrder` reaches `status == 'completed'` or `status == 'cancelled'`, non-admin users cannot mutate its state further.
6. **Query Enforcement (`allow list`)**: Every `list` query must filter by `resource.data.ownerId == request.auth.uid` so clients cannot scrape cross-tenant store records.

## 2. The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Write**: `auth = null` attempting to create `/orders/ord_01`.
2. **Unverified Email Spoof**: `auth = { uid: 'u1', token: { email: 'phatla1456@gmail.com', email_verified: false } }` attempting admin read/write.
3. **Cross-Tenant Identity Spoofing**: `auth.uid = 'u1'` creating `/products/prd_01` with `ownerId: 'u2'`.
4. **Shadow Field Injection (Create)**: Creating `/inventory/inv_01` with an extra key `"isSuperAdmin": true`.
5. **Shadow Field Injection (Update)**: Updating `/inventory/inv_01` with an unauthorized key `"secretNote": "hacked"`.
6. **ID Poisoning Attack**: Creating `/products/bad$id!@#` with non-alphanumeric path characters.
7. **Denial-of-Wallet Oversized String**: Creating `/orders/ord_01` where `itemSummary.size() > 500`.
8. **Value Poisoning on Update**: Updating `quantity` in `/inventory/inv_01` with a string `"9999"` instead of a non-negative number.
9. **Immortal Field Mutation**: Updating `createdAt` or `ownerId` on an existing `/products/prd_01` document.
10. **Terminal State Re-opening**: Updating `/orders/ord_01` when `existing().status == 'completed'` to `'preparing'` as a non-admin.
11. **Blanket List Query Scraping**: Listing `/orders` without constraining `resource.data.ownerId == request.auth.uid`.
12. **Negative Financial Manipulation**: Creating `/orders/ord_01` with `total: -500000`.
