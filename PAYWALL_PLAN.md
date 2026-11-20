# beBEAR+ soft paywall plan

Status: plan only, nothing built. Release is blocked on Anton Astashov's reply. Written 2026-10-22 against master at e6462967.

## Blocker: Anton's permission

On 2026-10-21 the owner asked Liftosaur's author, Anton Astashov, if beBEAR may ship on the App Store with his premium features unlocked. There is no reply yet. No billing ships until he answers.

- Steps 2 to 7 of the build can be written and merged before he answers. With no RevenueCat key in the build, `AiAllowance_state` returns `billingOff`, and no paywall, trial screen or purchase button appears.
- Step 1 (store products) and step 8 (the sandbox purchase on the iPhone) wait for his answer, because both need beBEAR's App Store listing to be final.
- If he says no, the upstream premium features (plates calculator, graphs, rest timer notifications, week insights, Apple Watch app, muscle breakdown) move behind beBEAR+ too. Then `FORK_UNLOCKS_PREMIUM` in `src/utils/subscriptions.ts` becomes `false`, and `Subscriptions_hasSubscription` reads the RevenueCat `plus` entitlement. That is a separate plan.

## What the user gets

- Lift tracking and food tracking stay free forever. No screen ever blocks them.
- Free AI allowance: 4 uses a day and 12 a week, counted over the workout report, meal scan, Describe and AI warmup. That covers a report, a meal scan and a question or two each day. The owner set these numbers on 2026-10-22. They replace the 3 a day and 10 a week in `AiAuth_caps` in `api/_auth.mjs` and in `REDESIGN_PLAN.md`.
- The workout report keeps its own rule too: at most one per finished workout.
- Outside the allowance, for everyone: 3 AI program imports per account for life.
- beBEAR+: $4.99 a month or $39.99 a year. It raises the caps to 30 a day and 150 a week, the existing `AI_PLUS_DAILY_CAP` and `AI_PLUS_WEEKLY_CAP`.
- A free week of beBEAR+ that starts with one tap. No card and no Apple ID prompt, because the app unlocks it on our server. One free week per account, ever.
- Owner codes from `pro_codes` keep working. A code gives beBEAR+ with no end date.

## The paywall app: RevenueCat

The owner picked RevenueCat on 2026-10-22. One SDK covers iOS and Android purchases, and RevenueCat checks the receipts on its own servers. It sends a webhook on every change and runs paywall A/B tests (Experiments).

- SDK: `react-native-purchases` for purchases and `react-native-purchases-ui` for the paywall screens. The paywall screens are designed in the RevenueCat dashboard, so the app ships no hand-built purchase screen.
- App user ID: the Supabase user id. The app calls `Purchases.logIn(userId)` after sign-in and `Purchases.logOut()` on sign-out. AI already needs sign-in, so every buyer has a Supabase account.
- Entitlement: `plus`. Products: `bebear.plus.monthly` and `bebear.plus.yearly` in one subscription group, "beBEAR+".
- Offering: `default`, holding both products. Experiments compare two offerings.
- No Apple introductory offer on either product at launch. Our free week is the only trial, so nobody gets two.
- Self-hosted AGPL builds have no RevenueCat key. They get `billingOff` and keep every free feature.

### What RevenueCat replaces, and what stays

The upstream purchase code was written for Liftosaur's own App Store account and Liftosaur's server. beBEAR+ uses none of it. The files stay untouched, so merges from upstream stay clean.

- Not used for beBEAR+: `IapAdapter` in `src/utils/iap.native.ts`, the `react-native-iap` wrapper.
- Not used: `IapHelpers_getSkus` in `src/utils/iapHelpers.ts`. Its `com.liftosaur.subscription.*` SKUs belong to Liftosaur's App Store account.
- Not used: `APPLE_KEY_IDENTIFIER` and the promo-offer signing. That key is Liftosaur's.
- Not used: `Subscriptions_setAppleReceipt`, `Subscriptions_setGooglePurchaseToken` and the `Subscriptions_verify*` calls in `src/utils/subscriptions.ts`. They send receipts to Liftosaur's server. RevenueCat does receipt checks, renewals, grace periods, restore and plan switches.
- Not used: `SubscriptionPlan_derive` in `src/utils/subscriptionPlan.ts`. It already returns `freeaccess` for every user while `Subscriptions_isUnlockedByFork` is true.
- Stays: `Subscriptions_isUnlockedByFork` returns `true`. Upstream premium stays unlocked until Anton answers. The beBEAR+ gate is separate and never reads `Subscriptions_hasSubscription`.
- Stays: `ForkServices_plan` in `src/utils/forkServices.ts` keeps `storeKit: false` while premium is unlocked. So `react-native-iap` never calls `initConnection`, and RevenueCat is the only code that finishes StoreKit transactions. Two libraries finishing the same transactions would drop purchases.
- Added: a `revenueCat: !offline` flag in `ForkServices_plan`, with a case in `test/forkServices.test.ts`.
- Stays: `account_plans` from `supabase/migrations/20261022034321_ai_caps_and_plans.sql`. It remains the server's only answer to "which caps apply". RevenueCat writes into it through our webhook. The AI routes never call RevenueCat.

## Counting: the free allowance and the free week

`supabase/migrations/20261020221250_ai_usage.sql` made `ai_usage`, one row per user per UTC day. Only the old zero-argument `ai_usage_take()` writes it now, for app builds made before batch R7. The paywall adds nothing to it. `ai_usage` stays only so its rows count toward the global daily ceiling. A later migration drops it once no old build calls the zero-argument function.

The free allowance already has a counter: `ai_usage_kinds`, from the R7 migration. `ai_usage_take(p_kind, p_ref, p_caps)` counts one `capped` call per day row and checks the day and 7-day sums against the caps for the user's plan. The free week is a time window, not a count, so it changes which caps apply and adds no counter.

New migration `supabase/migrations/<date>_bebear_plus.sql`:

- `account_plans` gains `plus_source text` (`code` or `store`), `plus_until timestamptz` (null means no end, for codes), `store_product text` and `billing_synced_at timestamptz`. Existing `plus` rows get `plus_source = 'code'`.
- New table `ai_trials`: `user_id` primary key, `started_at`, `ends_at`. One row per account, never deleted, with a select policy for the owner of the row.
- New function `start_ai_trial()`, security definer, for signed-in non-anonymous users. It inserts the row with `ends_at = now() + 7 days` and returns `ends_at`. It refuses when the row exists or the account has beBEAR+.
- New function `billing_apply(p_user, p_plus, p_until, p_product, p_synced_at)`, executable by `service_role` only. It ignores a call older than `billing_synced_at`. It never downgrades a row whose `plus_source` is `code`.
- The `report` kind keeps its one-per-workout check through `ai_report_refs`. It now also counts toward the day and week caps. The day and 7-day sums add the `capped` and `report` rows, and a report is refused when either sum is at its cap.
- `ai_usage_take` resolves the plan in this order: an unexpired `plus` row, then a trial with `ends_at > now()`, else `free`. It returns `plan` as `plus` during the trial, so `AiAuth_decideUsage` picks the plus caps with no change. The returned JSON gains `source` (`code`, `store`, `trial` or null), `trialEndsAt`, `trialUsed` and `plusUntil`.
- A fresh free window after any plus period. When a trial or subscription ends, the 7-day `capped` sum counts only days after the end day. Without this, a user who made 40 calls in the last trial week would start free life with "used, more in 7 days".
- The global ceiling of 600 calls a day moves into `p_caps` as `globalDay`, read from a new Vercel variable `AI_GLOBAL_DAILY_CAP`. Paying users count toward it, so the owner must raise it without a migration.

Sign-up stays open, so one person can make several accounts for several free weeks. The global ceiling bounds the cost of that. No further check in version one.

### From the free week to a subscription

1. The user taps "Start my free week". The app calls `start_ai_trial()` through `src/utils/supabaseClient.ts`. The AI caps rise at once.
2. Two days before `ends_at`, the app shows the "trial ending" sheet once, with the RevenueCat paywall. A local notification on day 6 says "Your free week ends tomorrow".
3. The user picks monthly or yearly. RevenueCat shows the App Store sheet, and the Apple ID confirmation happens only here.
4. On success the app calls `api/billing/sync.mjs`. That route asks RevenueCat's REST API for the subscriber and calls `billing_apply`. The plus caps carry on with no gap. A purchase made during the free week starts billing at once. The unused trial days are lost, and the trial-ending sheet says so.
5. The RevenueCat webhook to `api/billing/revenuecat.mjs` does the same sync for every later event: renewal, plan switch, cancellation, billing problem, expiry, refund. The webhook reads no event fields. It refetches the subscriber, so out-of-order events cannot leave a wrong state.

The sync route exists because a webhook can arrive seconds late. Without it the first AI call after paying could answer 429.

## What the user sees

### Where the screen goes in onboarding

`REDESIGN_PLAN.md` plans six first-run screens: Safari install guide, "Meet your bear" with sign-in, "Where do you train?", "About you", "What do you want?", "Your plan". The paywall screen is a seventh, "Your bear's AI coach". It appears after the user taps Start on a plan card, once the program is saved, and before Home.

- In `src/models/onboarding.ts`, `IOnboardingStep` gains `plus`. The `start` event moves to `plus` instead of finishing, when `AiAllowance_state` is not `billingOff` and the trial is unused. Otherwise onboarding ends as today.
- The import path (the `import` and `done` steps) reaches `plus` the same way after its program is saved.
- New component `src/components/onboardingPlus.tsx`, our own screen, since its button starts a trial and RevenueCat paywall buttons only buy.

Screen text, one line each:

- "Tracking your lifts and food is free. Always."
- "You get 4 AI uses a day, 12 a week."
- "That's your workout report, a meal scan and a question or two."
- "Want more? beBEAR+ gives you up to 30 a day."
- "Try it free for 7 days. No card needed."
- Honey button: "Start my free week". Text link: "Not now".
- Signed out: the button reads "Sign in to start my free week" and shows the Apple, Google and email-code buttons from `src/components/onboardingWelcome.tsx`.

"Not now" lands on Home. The free week stays available, and the first limit sheet offers it again.

### When a free user hits the limit

`api/_auth.mjs` already answers 429 with `reason` `day` or `week`, and `AiCaps_message` in `src/models/aiCaps.ts` already writes "Your 4 AI uses for today are used. More tomorrow." from the caps in the 429 body. The 429 body gains `trialUsed`.

- Trial unused: a bottom sheet with that message, then "Try beBEAR+ free for 7 days" and "Not now".
- Trial used: the same message, then the RevenueCat paywall with the `default` offering.
- beBEAR+ user at 30 a day: the message only, no sheet.
- Global ceiling reached: the existing message, no sheet.
- The food log, the workout and every tracking screen keep working. Only the AI button that was tapped shows the sheet.

### When the free week ends

On the first app open after `ends_at`, one sheet appears once:

- "Your free week is over."
- "You keep 4 AI uses a day and 12 a week. Tracking stays free."
- The RevenueCat paywall below, with "Not now".

The bear does not change. Nothing is locked. The free window starts fresh the next UTC day.

### When a subscriber cancels

The user cancels in the App Store subscription settings. The app opens them with `Purchases.showManageSubscriptions()` from Settings → Cloud backup.

- After cancelling: beBEAR+ stays until the end of the paid period. Settings shows "beBEAR+ ends on 12 Nov" instead of "renews on 12 Nov". No sheet.
- Billing problem: Apple's grace period keeps beBEAR+ while Apple retries the card, if grace is on in App Store Connect. Settings shows "Payment problem. Update it in the App Store."
- At expiry: the webhook sets the row back to free. On the next open, one sheet says "beBEAR+ ended. You keep 4 AI uses a day." with the paywall and "Not now".
- Refund: RevenueCat reports the entitlement gone, and the next sync sets the row to free the same way.
- "Restore purchases" sits on every RevenueCat paywall, as Apple requires.

## Pure modules that own the logic

Per the "Where logic lives" rule in `CLAUDE.md`, the views only render and run effects.

- `src/models/aiAllowance.ts` with `test/aiAllowance.test.ts`. It owns every allowance and trial decision on the client.
  - `AiAllowance_state(account, now, billingOn)` returns `billingOff`, `free` (with `trialAvailable`), `trial` (with `daysLeft`) or `plus` (with `source`, `until`, `renews`).
  - `AiAllowance_nextSheet(state, seen, now)` returns `trialEnding`, `trialEnded`, `plusEnded` or none. `seen` is a plain object of shown sheet ids, saved by the caller, so each sheet appears once.
  - `AiAllowance_limitAction(refusal, state)` returns `offerTrial`, `paywall` or `messageOnly`.
  - `AiAllowance_freeWindowStart(today, trialEndsAt, plusUntil)` mirrors the SQL fresh-window rule. Its test cases are the cases the migration review checks against.
  - The text for the sheets and the Settings line lives here, next to `AiCaps_message`.
- `api/_billing.mjs` with `test/billing.test.ts`. `Billing_planFromSubscriber(subscriber, now)` turns RevenueCat's subscriber JSON into the arguments for `billing_apply`. `Billing_webhookAuthorized(header, secret)` checks the webhook header. Both routes import them, the same way `api/_auth.mjs` serves `test/aiAuth.test.ts`.
- `src/models/onboarding.ts` gains the `plus` step. `test/onboarding.test.ts` covers start, import and `billingOff`.

## Build steps

About 28 hours of work, plus Apple's waiting time.

1. Store and RevenueCat setup. Owner. 2 hours if the App Store Paid Apps agreement and tax forms are active, plus 1 to 3 days of Apple's waiting if they are not. App Store Connect subscription group and the two products, the same in Play Console, the RevenueCat project, entitlement `plus`, offering `default`, webhook URL and auth header. Vercel variables: `REVENUECAT_SECRET_KEY`, `REVENUECAT_WEBHOOK_AUTH`, `SUPABASE_SERVICE_ROLE_KEY`, `AI_GLOBAL_DAILY_CAP`, and `AI_DAILY_CAP=4`, `AI_WEEKLY_CAP=12`. Waits on Anton.
2. The migration. 3 hours if `20261022034321_ai_caps_and_plans.sql` is applied on project `qvqwvuuwfueccrmzwyct`, 5 hours if R7 still has to be applied first. Files: `supabase/migrations/<date>_bebear_plus.sql`.
3. The pure modules and their tests. 4 hours. Files: `src/models/aiAllowance.ts`, `test/aiAllowance.test.ts`, `api/_billing.mjs`, `test/billing.test.ts`. Runs beside step 2.
4. The API. 3 hours after steps 2 and 3. Files: new `api/billing/revenuecat.mjs` and `api/billing/sync.mjs`, `api/_auth.mjs` (`trialUsed`, `globalDay`, defaults of 4 and 12 in `AiAuth_caps`, and `AiAuth_decideUsage` checking the day and week caps for `report` after the one-per-workout check), `test/aiAuth.test.ts`.
5. The native SDK. 4 hours if the current `react-native-purchases` supports React Native 0.84 and `pod install` runs clean, 1 day if a version pin or a Fabric fix is needed. Files: `package.json`, `ios/Podfile.lock`, new `src/utils/revenueCat.native.ts` and a `src/utils/revenueCat.ts` stub that returns billing off on web, `src/utils/forkServices.ts`, `test/forkServices.test.ts`, the logIn and logOut calls where the Supabase session changes in `src/utils/supabaseClient.ts`.
6. The onboarding screen. 4 hours after steps 3 and 5, and after batch O2's six-screen flow is on master. Files: `src/models/onboarding.ts`, `src/components/onboardingPlus.tsx`, `src/components/onboardingChat.tsx` and `onboardingChat.native.tsx`, `test/onboarding.test.ts`.
7. The sheets and the Settings line. 5 hours after steps 3 to 5. Files: new `src/components/aiAllowanceSheet.tsx`, `src/utils/aiRequest.ts` (open the sheet on a 429), `src/components/cloudBackupCard.tsx` (the beBEAR+ line, Manage, Restore), the day-6 local notification.
8. Sandbox purchase on the owner's iPhone. 2 hours once a TestFlight build with steps 1 to 7 exists. Buy monthly, switch to yearly, cancel, restore, and check `account_plans` after each. Waits on Anton.
9. The first Experiment. 1 hour in the RevenueCat dashboard, after launch.

Later, not in this plan:

- Web purchases through RevenueCat Web Billing with Stripe and `@revenuecat/purchases-js`. About 6 hours if a Stripe account exists. It is needed only if the PWA takes paying users before the App Store app ships. Until then, the web paywall says "Subscribe in the beBEAR iPhone app" and offers codes.
- A lifetime supporter purchase as a non-consumable product in the same offering.

## First A/B tests

Both run as RevenueCat Experiments between two offerings. At launch traffic, each test needs weeks. Each test stops at 300 users per side or 6 weeks, whichever comes first. If neither side leads by 30 percent or more, the current default stays.

- Test 1, which plan is preselected on the paywall: yearly or monthly. The deciding number is revenue per user who saw the paywall, 30 days after the view. Yearly at $39.99 brings more money up front, monthly at $4.99 may convert more people. Run first.
- Test 2, when the free week starts: at the onboarding tap, or at the first AI use after onboarding. Our onboarding screen reads the choice from the offering's metadata field (`trialStart`), so RevenueCat splits the users and our screen follows. The deciding number is the share of users who pay within 14 days of the trial end. A week that starts at the first AI use may convert better, because fewer weeks end unused. Run after test 1.

## Owner decisions

Decided on 2026-10-22.

- Free users get 4 AI uses a day and 12 a week. The workout report counts toward them.
- beBEAR+ keeps a fair-use cap of 30 a day and 150 a week, because every call costs money.
- The beBEAR+ copy can say "up to 30 a day", or "Unlimited AI*" with "*Fair use: up to 30 a day". The footnote must sit on the same screen as the word "Unlimited", so App Review sees the limit. The default copy in this plan is "up to 30 a day".

## Next action

Open App Store Connect → Business → Agreements, and check that the Paid Apps agreement shows Active.
