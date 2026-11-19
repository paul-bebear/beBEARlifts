# Phase 1 findings: Money

Slice `money` of `docs/cleanup/manifest.txt`. Read-only review of `master` at d5df8641. Reader model: Opus. An Opus checker that did not write them tried to disprove every high and medium finding.

Counts: 0 high, 3 medium, 7 low. 0 dropped by the checker.
Coverage: 49 paths opened. Every manifest file in this slice was opened.

Each finding has a code. "Seen" means the code path was read end to end or a test proved it. "Suspect" means the code points that way but nothing ran it. Effort is hours with tests.

## Medium

- **M1. Delete account does not warn a subscriber who also redeemed a code**
  - Severity: medium. Seen. Kind: bug. Still open from the 26 October audit: P2.
  - File and line: `src/models/accountDeletion.ts:27-34`
  - Scenario: A user redeems a pro code, then also subscribes in the App Store. account_plan_effective answers grant code and canManageSubscription true. AccountDeletion_subscriptionNote checks grant === subscription only, so it returns undefined. The user deletes the account with no warning and Apple keeps billing.
  - Fix: In AccountDeletion_subscriptionNote, test plan.canManage instead of plan.grant === subscription. Add the code-plus-subscription case to test/accountDeletion.test.ts.
  - Effort: 0.25 hours.
  - Checker: keep. account_plan_effective ranks code ahead of subscription, and AccountDeletion_subscriptionNote checks only grant === 'subscription', so a user who has both a code and a live subscription gets no cancel warning even though canManage is true.
- **M2. A purchase answered as free stays free on the phone until a cold start**
  - Severity: medium. Suspect. Kind: bug.
  - File and line: `src/utils/accountPlanClient.ts:45-54, src/utils/planFollowsSignIn.ts:28-32, src/models/plusOffer.ts:202-214`
  - Scenario: The user buys beBEAR+. The sync runs before RevenueCat shows the entitlement and answers free. AccountPlanClient_sync saves known free over the activating state. afterSync shows 'turns on in a moment. Reopen the app'. The AppState listener resyncs only while the status is activating, so bringing the app back does nothing. Week Insights and muscle views stay locked until the app is killed and started again.
  - Fix: In AccountPlanClient_sync, keep the activating state when the answer is free and the current state is activating. Let PlanFollowsSignIn_start resync on foreground while activating, with a limit such as 5 tries. Move that rule into src/models/accountPlan.ts with a mocha test.
  - Effort: 1.5 hours.
  - Checker: suspect. The code path is real: AccountPlan_accept replaces activating with known free, and the AppState listener resyncs only while the status is activating. Whether RevenueCat can still answer free right after the SDK reports the purchase depends on timing, and the code cannot show that.
- **M3. Any signed-in user can call RevenueCat through /api/billing/sync with no limit**
  - Severity: medium. Suspect. Kind: security.
  - File and line: `api/billing/sync.mjs:11-42, api/_billing.mjs:141-170`
  - Scenario: A signed-in user posts to /api/billing/sync in a loop. Each call makes one RevenueCat GET with the shared secret key, one store_entitlement_put and one account_plan_effective. RevenueCat rate-limits per project key. Once the limit is reached, the webhook and every other user's sync get errors, so new purchases do not turn on.
  - Fix: Skip the RevenueCat read in the sync route when store_entitlements.snapshot_at for that user is under 30 seconds old, and answer Billing_readPlan instead. Or count sync calls per user per minute in a table, as redeem_pro_code does.
  - Effort: 1.5 hours.
  - Checker: suspect. api/billing/sync.mjs has no per-user throttle and makes a RevenueCat GET with the shared secret key on every call. Whether a loop from one user hits a project-wide RevenueCat limit, or a Vercel firewall stops it first, depends on dashboard settings the code does not show.

## Low

- **M4. A sandbox lifetime purchase shows as a subscription**
  - Severity: low. Seen. Kind: bug.
  - File and line: `api/_billing.mjs:87-96, supabase/migrations/20261025000000_store_entitlements.sql:65-80`
  - Scenario: An App Review or TestFlight tester buys bebear_plus_lifetime with sandbox money. Billing_entitlementRow gives the row expiresAt = snapshot + 7 days. account_plan_effective counts lifetime only when expires_at is null, so it answers grant subscription and canManageSubscription true. Settings shows 'Manage subscription'. Delete account shows 'Your beBEAR+ subscription keeps renewing'. Apple's manage sheet then lists no subscription.
  - Fix: Store the product kind beside the row: add a lifetime flag to store_entitlements, set it in Billing_entitlementRow from expires == null, and make account_plan_effective read lifetime from that flag. Add cases to test/billing.test.ts and supabase/tests/store_entitlements.sql.
  - Effort: 1.5 hours.
  - Checker: keep. Billing_entitlementRow sets expiresAt to snapshot + 7 days for any sandbox purchase, so account_plan_effective sees a non-null expires_at and reports a sandbox lifetime as grant subscription with canManageSubscription true; this only reaches sandbox testers and App Review, never a paying user.
- **M5. Every AI call takes one app-wide lock and scans all usage history**
  - Severity: low. Seen. Kind: waste.
  - File and line: `supabase/migrations/20261027000000_ai_allowance_limits.sql:49-61`
  - Scenario: ai_usage_take takes pg_advisory_xact_lock(hashtext('public.ai_usage_take'), 0), so all users' AI calls run one at a time. While holding it, it sums ai_usage and ai_usage_kinds by day. Both primary keys start with user_id, so a filter on day alone reads every row ever written. The tables grow by one row per user per kind per day and are never pruned.
  - Fix: Add an index on day to ai_usage and ai_usage_kinds, or keep a one-row-per-day total table that ai_usage_take updates. Delete rows older than 8 days from a scheduled job.
  - Effort: 1 hours.
- **M6. AI cap numbers and refusal texts live in the server and in three app files**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/models/aiCaps.ts:6-12, src/models/accountPlan.ts:19-23, src/models/plusAccess.ts:33-38, api/_auth.mjs:22-28, api/_auth.mjs:41-63, api/_auth.mjs:104-127`
  - Scenario: The owner sets AI_PLUS_DAILY_CAP to 40 in Vercel. The server allows 40. AiCaps_plus, the AccountPlan offerRow ('30 AI uses a day') and the plusAccess ai feature ('150 AI uses a week', 'instead of 3') still say 30, 150 and 3. The refusal reasons are also out of step: the server sends share and reportDay, and IAiCapsRefusal knows only report and global, so AiCaps_parse drops them.
  - Fix: Have /api/billing/sync return the caps from AiAuth_caps and store them with the plan. Build the three texts from that answer in src/models/aiCaps.ts. Add share and reportDay to IAiCapsRefusal.
  - Effort: 1.5 hours.
- **M7. Two functions decide the beBEAR+ account row**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/models/accountPlan.ts:73-92, src/models/plusAccess.ts:108-112`
  - Scenario: AccountPlan_settingsRow builds the Settings row from the plan, with activating, manage, code and lifetime cases. PlusAccess_accountRow builds the screenAccount row from a boolean and knows none of those cases. An activating purchase shows 'Purchase done. Activating…' in Settings and 'Free plan' on the account screen.
  - Fix: Delete PlusAccess_accountRow. Have screenAccount.tsx call AccountPlan_settingsRow and move its 'View' label into that function's result.
  - Effort: 0.5 hours.
- **M8. Prices are a fixed US dollar string**
  - Severity: low. Seen. Kind: bug.
  - File and line: `src/models/plusAccess.ts:82`
  - Scenario: A user in Germany opens the beBEAR+ screen. PlusAccess_prices shows '$6.99 a month, $39.99 a year, or $79.99 once for life.' The RevenueCat paywall then shows euro prices from StoreKit. If the owner changes a price in App Store Connect, the screen stays wrong.
  - Fix: Read the offering prices with Purchases.getOfferings in src/utils/purchases.native.ts and pass them to screenSubscription.tsx. Keep the fixed string only as the web fallback.
  - Effort: 1.5 hours.
- **M9. The plan sync order and the sign-in follower have no test**
  - Severity: low. Seen. Kind: test.
  - File and line: `src/utils/accountPlanClient.ts:15-58, src/utils/planFollowsSignIn.ts:6-37`
  - Scenario: The rule 'only the newest request may save' is a module counter latestSync inside accountPlanClient.ts. The first-run configure versus identify choice and the dedupe on lastUserId live in planFollowsSignIn.ts. No test file imports either module, so a change that lets a slow app-start answer undo a purchase passes CI.
  - Fix: Move both rules into pure functions in src/models/accountPlan.ts that take the state and return the next state and effects. Test them in test/accountPlan.test.ts.
  - Effort: 2 hours.
- **M10. plusSheet.tsx and appStoreSettings.tsx are named for something else**
  - Severity: low. Seen. Kind: name.
  - File and line: `src/components/plusSheet.tsx:63, src/components/appStoreSettings.tsx:14`
  - Scenario: In this fork 'plus' means beBEAR+ (plusAccess, plusOffer, PlusOfferClient). PlusSheetModal is the '+' quick-action sheet for food, weight, run and workout, so a reader looking for paid code opens it. AppStoreSettings holds the AI permission and the blocked-users list, with nothing about the App Store.
  - Fix: Rename plusSheet.tsx to quickActionsSheet.tsx and PlusSheetModal to QuickActionsSheetModal. Rename appStoreSettings.tsx to aiAndBlockSettings.tsx. Update the imports in AppNavigator.tsx, AppNavigator.native.tsx and screenSettings.tsx.
  - Effort: 0.5 hours.

## Findings from the 26 October audit

- M1: fixed. Fixed in 1fad4acf and 20261027000000_ai_allowance_limits.sql. Line 3 drops ai_usage_take(). Lines 80-89 cap reports at 10 a day. Lines 59-64 refuse one user past 50 calls and a tenth of the total. supabase/tests/ai_usage_caps.sql covers all three. One user alone can no longer reach 600. About 12 signed-in accounts posting capped calls with their own p_caps can still reach it.
- M2: fixed. 20261027000000_ai_allowance_limits.sql:6-14 moves the ceiling to the ai_settings row. Lines 53-56 let beBEAR+ users skip it. Lines 99-101 set ceilingWarn at 80 percent, and api/_auth.mjs AiAuth_ceilingNotice logs it.
- M3: fixed. api/_billing.mjs:91-95 ends every sandbox grant 7 days after snapshotAt. 20261027000000_ai_allowance_limits.sql:123-125 gives stored sandbox lifetime rows the same end. Tests at test/billing.test.ts:134-157. A side effect is new finding 'A sandbox lifetime purchase shows as a subscription'.
- M4: fixed. 20261027000001_pro_code_attempt_limit.sql:31-50 counts wrong codes in pro_code_attempts and refuses after 10 a day. supabase/tests/abuse_limits.sql:46-65 covers it.
- P2: partly fixed. 50a2e63f adds AccountDeletion_subscriptionNote and the Manage subscription button in cloudBackupCard.tsx:206-222. api/account/delete.mjs:80-93 deletes the RevenueCat customer. The note checks grant === subscription, so a user with a code and a subscription gets no warning. Listed again in findings.

## Checked with no finding

- Billing_webhookAuthorized compares the header in constant time and refuses all when REVENUECAT_WEBHOOK_AUTH is empty.
- The webhook trusts only user ids from the body and re-reads each one from RevenueCat, so a forged body changes nothing.
- Billing_eventUserIds covers TRANSFER from and to, drops anonymous RevenueCat ids and repeats.
- store_entitlement_put keeps the newer snapshot whatever order the webhook and sync commit in, and returns false for a deleted user.
- store_entitlement_put and account_plan_effective are granted to service_role only, and the tests prove authenticated is refused.
- Sync refuses anonymous Supabase users and asks RevenueCat by the signed-in id, never by a phone value.
- redeem_pro_code returns a 400 body without raising, so the attempt counter commits.
- PurchasesIdentity runs one RevenueCat logIn at a time and is never ready for the old user after a failed switch.
- PlusOffer_reduce ignores events that do not fit the current step, and a second trigger while busy does nothing.
- AccountPlan_accept drops an answer for a user who is no longer signed in.
- StoreBuild_showsProCodes hides the code field only in App Store installs.
- RevenueCat_iosApiKey is the public appl_ key; no sk_ key is in the repo.
- All 76 mocha cases in the eight related test files pass.
