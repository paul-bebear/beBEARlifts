# Price comparison copy

Copy that compares three paid fitness apps to beBEAR. Both landing pages use it in their price section, and the lines below work for posts, stories and reels.

Prices checked on the US App Store on 25 October 2026.

## The numbers

- Strava subscription: $11.99 a month or $79.99 a year.
- Liftoff Pro: $12.99 a month or $79.99 a year. Liftoff also shows $39.99 a year to some people.
- Cal AI Unlimited: $9.99 a month or $29.99 a year. Cal AI tests its prices, so some people see $19.99 or $49.99 a year.
- All three on monthly plans: $34.97 a month, which is $419.64 a year.
- All three on yearly plans: $189.97 a year.
- beBEAR: logging lifts, food and runs is free.
- beBEAR+: $6.99 a month, $39.99 a year, or $79.99 once for life. These are the prices in draft PR 136. Purchases are not live yet.
- Monthly, you keep $27.98 a month. beBEAR+ costs one fifth of the three apps ($34.97 against $6.99).
- Yearly, you keep $149.98 a year. beBEAR+ costs a bit less than one fifth ($189.97 against $39.99).
- Lifetime beBEAR+ costs $79.99, the same as one year of Strava or one year of Liftoff Pro.

## The split

Decided 2026-10-25: anything that logs is free. Anything that analyzes, uses AI or connects to another tool is beBEAR+.

The app does not enforce this yet. `FORK_UNLOCKS_PREMIUM = true` in `src/utils/subscriptions.ts` unlocks every Premium feature for every user, and beBEAR+ only raises the AI limit. Until the app gates insights and the API, the page describes the planned plan, and the fine print says so.

## What beBEAR+ adds

- 150 AI uses a week (30 a day) instead of 10 (3 a day). They cover the meal photo, describe a meal, the nutrition label, the body-scan printout and the AI warm-up. These are the `meal`, `describe`, `label` and `bodyscan` tasks in `api/food/photo.mjs` and `api/ai/warmup.mjs`.
- Week Insights: volume, sets, PRs and sets per muscle for each week. It is the week card on Home.
- Muscle views: which muscles a program or a day trains.
- Trend lines on graphs: the moving-average setting.
- API and MCP: API keys under Me → API Keys, so Claude or ChatGPT can read your workouts and programs.
- Early access to new features. Run it as a TestFlight group for beBEAR+ users, or the promise is empty.

## Free for everyone

Liftoff's Pro screen lists chart history, body measurements, workout plans and an AI calorie tracker as Pro benefits. beBEAR gives the first three free, and the calorie tracker free up to 10 uses a week.

- Log lifts, food and GPS runs.
- Barcode scan for packaged food. It does not use the AI limit.
- Ready plans for gym, home or street workout.
- Plates calculator and rest timer alerts, with the Live Activity on iPhone.
- Apple Watch app.
- Graphs for every lift and for body weight, with all your history. Trend lines are beBEAR+.
- Body measurements, import and export.
- Friends feed, Spotify and the bear with its levels and badges.
- 10 AI uses a week, and an AI report after every workout. `api/ai/report.mjs` allows one report per workout for every account.

## Ideas for a longer beBEAR+ list

These came up in the 2026-10-21 plan. None is built, so none goes on the page yet.

- Playlists made for the workout.
- A computer dashboard.
- Whoop and Oura recovery.

## Headlines

Page A, the bear pitch:

- Three apps cost $35 a month. Your bear costs $7.
- One bear. Not three subscriptions.

Page B, the tracker pitch:

- Stop paying for three apps.
- Lifts, food and runs. One app. $6.99.

## Short ad lines

- Strava + Liftoff Pro + Cal AI = $34.97 a month. beBEAR+ = $6.99.
- $190 a year for three fitness apps. Or $40 for one bear.
- Log lifts. Snap meals. Record runs. One app, and the tracking is free.
- Pay $79.99 once. That is one year of Strava. beBEAR+ is yours for life.
- Spend the $150 you save on protein.

## Fine print

Put this under every comparison, in a post caption or on the page:

> Prices are US App Store list prices on 25 October 2026. They change over time and by country. beBEAR+ prices are the planned launch prices. Each app has features beBEAR does not have. Strava, Liftoff and Cal AI are trademarks of their owners and are not connected to beBEAR.

## Rules that keep the claims true

- Compare paid plans to paid plans. Strava, Liftoff and Cal AI all let you log for free, so never say they charge to track.
- Never say beBEAR does everything Strava does. beBEAR records GPS runs. It has no segments, route builder or club leaderboards.
- Never say "unlimited" AI. Free accounts get 10 AI uses a week (3 a day). beBEAR+ gets 150 a week (30 a day). Those are the defaults in `AiAuth_caps` in `api/_auth.mjs`. Change the copy if the caps change.
- Use names as plain text and no competitor logos. A true comparison can name a rival. A logo suggests a partnership.
- Check the prices again before each campaign. Cal AI changes its price often.
- Liftoff Pro has its own AI food scan, so a reader can say "drop Cal AI". The two-app answer still holds: Strava plus Liftoff Pro is $24.98 a month or $159.98 a year, against $6.99 or $39.99.
- iPhone run recording is on the branch `claude/ios-app-log-run-913d57` and not on master yet. Merge it before the iPhone launch, or take "runs" out of the copy.

## Sources

- [Strava on the US App Store](https://apps.apple.com/us/app/strava-run-bike-walk/id426826309)
- [Liftoff on the US App Store](https://apps.apple.com/us/app/liftoff-ranked-gym-workouts/id6448081563)
- [Cal AI on the US App Store](https://apps.apple.com/us/app/cal-ai-calorie-tracker/id6480417616)
- [Cal AI price variants](https://www.eesel.ai/blog/cal-ai-pricing)
- [Liftoff Pro plans](https://saylift.app/alternatives/is-liftoff-free)
