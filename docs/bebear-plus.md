# beBEAR+ purchases

beBEAR+ raises the AI limits from 3 a day and 10 a week to 30 and 150. Tracking stays free. On iPhone it sells as monthly, yearly and lifetime through RevenueCat.

Purchases stay off while `RevenueCat_iosApiKey` in `src/utils/revenueCatKey.ts` is empty. `Purchases_isAvailable()` then returns false, and no offer, Settings row or RevenueCat call appears.

## Owner setup

- Sign the Paid Applications Agreement in App Store Connect on Victor's team, `GKY9GR7VHG`. Sandbox purchases do not load before it is active.
- Create one subscription group with `bebear_plus_monthly` and `bebear_plus_yearly`, each with a 3-day free trial as its introductory offer.
- Create `bebear_plus_lifetime` as a non-consumable.
- Create an In-App Purchase key in App Store Connect and give it to RevenueCat.
- In RevenueCat, create the project, the iOS app, the three products, the entitlement `plus` and one offering with the three packages.
- Design the paywall in RevenueCat Paywalls with a close button.
- Set the webhook URL to `https://lifts.paulbebear.com/api/billing/revenuecat` with an Authorization value.
- Set the restore behaviour to "transfer to new App User ID".
- In Vercel, set `REVENUECAT_SECRET_KEY` (the `sk_` key), `REVENUECAT_WEBHOOK_AUTH` (the same Authorization value), and `BILLING_ALLOW_SANDBOX=1` until the app goes on sale. `SUPABASE_SERVICE_ROLE_KEY` is already there.
- Paste the public iOS key (`appl_…`) into `src/utils/revenueCatKey.ts`.
- Install pods with `npm run pod-install`, never a plain `pod install`. The script sets `USE_FRAMEWORKS=static`. A plain run links the pods as static libraries and rewrites `ios/Liftosaur.xcodeproj/project.pbxproj`.

## Data model

Two tables hold the two kinds of grant. Billing writes only `store_entitlements`. Owner codes stay in `account_plans`, so a subscription that ends never removes a code.

```text
account_plans       user_id, plan ('free' | 'plus')            redeem_pro_code writes it
store_entitlements  user_id, active, product_id, expires_at,   store_entitlement_put writes it
                    sandbox, snapshot_at
```

`account_plan_effective(p_user)` reads both and answers `{ plan, grant, canManageSubscription }`.

- `grant` is `code` first, then `lifetime`, then `subscription`.
- `canManageSubscription` is true whenever an active subscription exists, even beside a code. Settings uses it for the Manage subscription row.
- An active row with `expires_at` null is lifetime. An active row whose `expires_at` has passed counts as free.

`ai_usage_take` calls `account_plan_effective`. Expiry is checked on every AI call, so a missed expiry webhook stops plus at the expiry date.

`store_entitlement_put` keeps a write only when its `snapshot_at` is newer than the row's. `snapshot_at` is RevenueCat's `request_date_ms`. The webhook and the app's sync can read RevenueCat at almost the same time, and the newer read is kept whatever order they commit in.

Both functions are callable only by `service_role`. Signed-in users can read their own `store_entitlements` row.

## How a purchase becomes plus

```text
PlusOfferClient_open()                        Settings row
  PlusOffer_reduce: open
    signed out → action sheet: Apple / Google / Not now → SupabaseOAuth_start
    identify → Purchases_identify(userId), then Purchases_whenReadyFor(userId)
    presentPaywall → RevenueCatUI.presentPaywall
      purchased / restored
        markActivating → AccountPlanStore = activating
        sync → POST /api/billing/sync
          /auth/v1/user → user id, anonymous users refused
          GET api.revenuecat.com/v1/subscribers/{id}
          store_entitlement_put, then account_plan_effective
          → { plan, grant, canManageSubscription } → AccountPlanStore

RevenueCat webhook                            renewals, expiries, refunds, transfers
  POST /api/billing/revenuecat
    Billing_webhookAuthorized
    Billing_eventUserIds: app_user_id, original_app_user_id, aliases, transferred_from, transferred_to
    Billing_refresh for each id; any failure answers 503 so RevenueCat retries
```

`Billing_entitlementRow` in `api/_billing.mjs` reads RevenueCat's answer. It accepts 200 and 201, because RevenueCat answers 201 when the GET creates the customer.

- Lifetime has `expires_date` null.
- A billing grace period extends `expires_date` to `grace_period_expires_date`.
- A cancelled subscription stays active until its end date.
- A sandbox purchase counts only while `BILLING_ALLOW_SANDBOX=1`.
- An answer it cannot read writes nothing, so a RevenueCat outage never turns a paying user into a free one.

Without `REVENUECAT_SECRET_KEY`, the sync route skips RevenueCat and answers from `account_plan_effective`. The web app shows code grants this way before RevenueCat is set up.

## The offer flow

`PlusOffer_reduce(flow, event)` in `src/models/plusOffer.ts` owns every offer, purchase and restore. It returns the next step and the effects to run. `src/utils/plusOfferClient.ts` holds the one current flow and runs the effects in order. A failed effect dispatches `failed`, which returns the flow to idle.

```text
idle
  open (settings | restore)  → askingSignIn or identifying
  firstProgram               → waiting (800 ms) → waited: eligible again? → identifying
  capRefused                 → askingCap (free user, day or week limit, not shown today for this account)
identifying → presenting (paywall) or restoring (Purchases_restore)
presenting / restoring → activating → synced → idle
```

- A trigger that arrives while a flow runs is ignored. Two AI-limit refusals at once show one sheet.
- The first-program offer counts as shown only when the paywall opened: purchased, restored or cancelled. A failure leaves it unshown for next time, without a message.
- The AI-limit sheet day is kept per account in `PlusOfferStore.capSheetDays`.
- Restore goes through the same activation as a purchase. "beBEAR+ is back on" shows only after the server says plus.

`NavScreenMain` in `src/navigation/screens/NavScreenHome.tsx` checks `PlusOffer_afterFirstProgram` and calls `PlusOfferClient_offerFirstProgram()`. `AiRequest_post` passes every parsed 429 refusal to `PlusOfferClient_onRefusal`. The AI request returns its error at once and never waits for the sheet.

## Who the app thinks is signed in

`PlanFollowsSignIn_start()` in `src/utils/planFollowsSignIn.ts` runs once from `App.native.tsx` and from the web root `src/components/app.tsx`. It reacts only to a change of `session.userId`, because `CloudStore` also changes on every token refresh and backup.

- On iPhone it calls `Purchases_configure(userId)` the first time and `Purchases_identify(userId)` after that.
- On sign-in it syncs the plan. On sign-out it clears `AccountPlanStore`.
- On foreground it syncs only while the plan is `activating`.

`PurchasesIdentity` in `src/models/purchasesIdentity.ts` queues RevenueCat's `logIn` and `logOut`. One call runs at a time, and the queue catches up with the latest user afterwards. `PurchasesIdentity_waitFor(state, userId)` is the single readiness rule: `ready`, `wait` or `rejected`. A purchase waits for `ready` for the same user id, so a purchase never lands on the previous account.

`AccountPlanStore` in `src/utils/accountPlanClient.ts` is the only plan owner on the phone and the web. `AccountPlanClient_sync()` numbers each request, and only the newest one saves. `AccountPlanClient_markActivating` outdates every request already sent, so a slow answer from app start cannot undo a purchase. `AccountPlan_accept` drops any answer for a user who is no longer signed in.

## Scar tissue

- Upstream's `react-native-iap` listeners in `App.native.tsx` also finish StoreKit transactions. `ForkServices_plan` turns `revenueCat` on only when `storeKit` is off, so the two SDKs never run together.
- `Subscriptions_hasSubscription` still returns true for everyone. beBEAR+ never touches it, so no tracking feature locks again.
- A cancelled native sign-in returns `{ ok: true }` from `SupabaseOAuth_start`. The flow reads `CloudStore` again after sign-in and stops when no session exists.
- RevenueCat's `request_date` has whole seconds. Reading it made two reads in one second tie, and the second was dropped.
- `JsonStore.use()` returns the empty value until the IndexedDB read finishes. The first-program check runs again after the 800 ms wait with freshly loaded stores.

## Debugging map

- The paywall never shows: check `RevenueCat_iosApiKey`, then `Purchases_isAvailable()`, then whether `PlusOfferStore.firstProgramShown` is already true.
- "beBEAR+ could not start": `Purchases_whenReadyFor` returned false. RevenueCat `logIn` failed or took longer than 15 seconds.
- A buyer stays free: call `/api/billing/sync` with their token. Then read their `store_entitlements` row, and compare `snapshot_at` with RevenueCat's customer page.
- A free user keeps plus: check `store_entitlements.expires_at` and `account_plans` for a code grant.
- Webhook retries pile up in RevenueCat: `/api/billing/revenuecat` answered 503. The Vercel log names the failed refresh.
- Tests: `test/billing.test.ts`, `test/accountPlan.test.ts`, `test/purchasesIdentity.test.ts`, `test/plusOffer.test.ts`, `test/forkServices.test.ts`, and `supabase/tests/store_entitlements.sql`. The SQL file runs inside `begin` … `rollback`.
