# Handoff: plan the beBEARlifts redesign (planning only)

You are the planning pass for a redesign. Write a plan and nothing else. Do not edit code, do not create branches or PRs, do not apply database changes, do not use the iOS Simulator or the browser pane. Other models (Opus 5.5 and Codex) build from your plan, so the plan must be specific enough to hand off without you.

Keep the cost down. Do not use subagents. Do not read the whole repo. Read the inspiration photos, the files listed under "What exists today", and only the code you need to answer a concrete question.

## Inputs

- **Photos:** 41 inspiration screenshots in `/Users/paulbebear/Downloads/photos inspo/` (JPG and PNG). Look at every one. They include the owner's app today, a friend's app, Cal AI, the notes app "Ami", badge and streak designs, and a bear mascot. Name each photo you rely on by file name in the plan.
- **Owner's notes:** the "Owner's notes" section of this file, transcribed from a voice note. They hold the friend's test feedback and the product direction.
- **The audit:** `REVIEW-2026-10.md`. Its "Product and UX" and "Missing or half-built" sections overlap with this redesign. Reuse its finding codes (for example U2, U16) instead of re-describing them.
- **Rules for the repo:** `CLAUDE.md`. Its prose rules apply to your plan file. Its "Where logic lives" rule applies to every batch you plan.

## What exists today

beBEARlifts is a fork of Liftosaur, an open-source lifting tracker. It runs as an offline-first web app installed on the iPhone Home Screen at lifts.paulbebear.com (Vercel). A native React Native build compiles and is planned for TestFlight through a friend's Apple developer account (`NATIVE_PLAN.md`). Supabase holds email-code sign-in, cloud backup, friends by handle, a workout feed and AI usage caps. AI runs through Vercel AI Gateway (`api/_ai.mjs`, `api/ai/*.mjs`).

Fork features: a Food tab with barcode, photo and text logging; Spotify song tracking per set; a story card after workouts; body composition scans; a per-set effort rating; an AI warmup; a post-workout report; run tracking with GPS; filming a set; an invite link and an AI onboarding chat; friends and a feed.

Files to start from:

- `README.md`, `FORK_ROADMAP.md`, `NATIVE_PLAN.md`
- tab bar: `src/components/footer2.tsx`, `src/navigation/AppNavigator.tsx`
- Home and Progress: `src/components/screenProgressDashboard.tsx` and the Home screen in `src/navigation/screens/NavScreenHome.tsx`
- finish screen: `src/components/screenFinishDay.tsx`
- workout screen: `src/components/workout.tsx`
- first launch: `src/components/onboardingChat.tsx`, `src/models/onboarding.ts`, `src/models/invite.ts`, and the upstream first-run tutorial screens (find them from `docs/features/first-run-and-settings.md`)
- sign-in: `src/components/cloudBackupCard.tsx`, `src/utils/supabaseClient.ts`
- theme tokens: `tailwind.semantic.json`, `tailwind.colors.json`, `src/index.html`

A Claude session is fixing review batch J (invite, onboarding, friends) right now. Plan on top of what batch J will leave: assume its PR lands before any redesign batch starts.

## Owner's notes

Target user: 16 to 23 years old, skinny, wants to put on muscle and weight in a healthy way. No steroid look, just fit and healthy. The user picks what they want from strength, agility and size: one, two or all three. The plan adapts to the goal and to age, with younger users getting a gentler plan.

The mascot is the bear. Remove every dinosaur (Liftosaur's mascot) from the app. The bear is central to the app.

The bear is a pet, like a Tamagotchi. It is a cute version of you. Going to the gym makes it grow. Logging food feeds it. Skipping workouts makes it lazy. Working out more makes it bigger and hungrier, so you feed it. Ads will show a skinny kid next to a baby bear, then the same kid fit next to a big bear.

The friend's test feedback, all of which the owner agrees with:

- **Too many buttons and too confusing.** A grandmother must be able to use it.
- **The first-run walkthrough is too long.** It covers editing the program, exercises, equipment, rounding and "what is a one-rep max". Nobody reads it. The owner and the friend both tapped through it. Cut it hard.
- **"Sign in to add friends" → "Open Settings" does nothing.** That is review finding U1, and batch J fixes it.
- **The calendar shows on both Home and Progress.** Keep it in one place.
- **The middle tab only starts a workout.** It is the most prominent spot. Rethink what goes there.
- **No way out of a workout without quitting the app.**
- **Sign-in must offer Sign in with Apple and Sign in with Google.** Typing an email is too much work. Instagram sign-in would be a nice extra.
- **The tab bar should look like iOS "Liquid Glass".** It should be clean and see-through, like the friend's app.
- **A "+" button opens a menu of quick actions.** The friend's app uses Home, Progress, Profile and a "+". Cal AI's "+" opens a sheet of actions such as scan food, log routine, my products, log symptoms. Do the same for lifting: start a workout, log food, log a run, log weight and so on. The "+" can sit in the middle or on the right.
- **Food logging like the notes app Ami.** You type what you ate in plain text, and it works out calories, protein, carbs and fat. The app already has a "Describe" food mode. Plan how to make that the main way in.
- **Streaks and badges.** There are badge examples in the photos.
- **The handle screen should look better.**
- **The finish screen has too many buttons.** Today it shows the card, add photo, share, review this workout's songs, continue, plus share, text and copy link. The plan:
  - Keep the card.
  - Keep three icon buttons in one row: add photo, share, and a music icon for the songs.
  - Remove the second share block (share, text, copy link).
  - Replace "Continue" with an X at the top.

## Addendum: onboarding and program choice (owner, 2026-10-22)

The owner walked through the app again and calls the onboarding the top problem. It has far too many taps, and people will drop off.

- **Equipment:** one question, "Where do you train?", with three choices: **Gym**, **At home** and **Street workout** (bars, parks, bodyweight). Multi-select. Never ask the user to tick individual pieces of equipment. The app works out the equipment list from those choices.
- **Questions:** experience, then what they want (hypertrophy, strength or both, plus an optional "more agile"), then "Recommend a plan" or "Import my own". Import uses the existing screenshot and history import.
- **Program choice:** remove the "Choose your program" screen and its long list for new users. Recommend at most 3 plans:
  - **3 days a week:** full body, with a short run on one day and recovery or mobility work on another.
  - **4 days a week:** upper and lower.
  - **5 days a week:** a push, pull, legs, upper and lower mix.
- **One family, not three programs:** each plan comes in hypertrophy, strength or both, and in gym, home or street versions. "More agile" adds agility work. Plan this as one parameterised program family (Liftoscript templates), not dozens of separate programs. Say who writes it (Opus, with the `write-program` skill) and how it gets tested with `PlannerMode_commitFullText`.
- **The built-in list:** the 60 upstream built-in programs stay reachable from settings for advanced users, never in onboarding.

## What to deliver

Write `REDESIGN_PLAN.md` at the repo root, following the prose rules (lists, no tables, short sentences). It contains:

1. **Product frame.** The target user, the bear's role, the three goals, and what the app is for, in under 15 lines. List what the redesign removes or hides, not only what it adds.
2. **Information architecture.**
   - **Tabs and the "+":** the new tab bar with every tab named, and what the "+" sheet holds. Say where each existing screen and feature ends up, including the ones that move into a menu or get cut. Cover Food, Music, Runs, Body scans, Reports, Friends, Feed, Settings and Program editing.
   - **Home or Progress:** one place for the calendar.
   - **Leaving a workout:** how the user gets out of a running workout.
3. **First run.**
   - **The flow:** screen by screen, from opening the invite link to the first workout, in 6 screens or fewer.
   - **What it collects:** goal (strength, agility, size), age, height and weight, and experience. Say how each answer changes the program.
   - **The upstream tutorial:** where it goes, and what replaces it (for example one-line tips shown at the moment of use).
4. **The bear.** This is the core mechanic, so be concrete:
   - its stats, for example size, hunger, energy and mood
   - which actions change each stat, by how much, and how fast it decays
   - what "lazy" looks like
   - how growth stages map to real progress
   - where the bear appears in the app
   - what the user does with it each day
   - how it ties to streaks and badges
   - how it shows in the friends feed

   Make it hard to cheat by logging fake workouts, and say how. Say which art the owner must commission or generate (stages, moods, animations) and the file format the app needs. Keep every stat rule a pure function, so Opus can test it.
5. **Sign-in.** Sign in with Apple and Google on Supabase, for the web app installed on the Home Screen and for the native build.
   - **The redirect problem:** an OAuth redirect from a Home Screen web app can open in Safari, and Safari keeps separate storage, so the sign-in lands in the wrong place. Find out how Supabase, Apple and Google behave there, and pick a flow that works. If it only works well natively, say so, and give the web fallback.
   - **What the owner sets up:** Apple Services ID and keys (Apple developer account), the Google Cloud OAuth client, and the Supabase provider settings.
   - **Instagram:** what it would take, and whether it is worth it now.
6. **Visual direction.**
   - **Colours and type:** a short token list (colours, radius, type scale, spacing) that replaces the Liftosaur look, with the bear brand at the centre.
   - **Liquid Glass:** how to get it in the web app (backdrop-filter, and its performance on older iPhones) and natively.
   - **Applying it:** which upstream screens get the new tokens and which keep upstream's look for now. Every restyled upstream file makes merges from upstream harder, so say which ones are worth it.
7. **Screen-by-screen changes** for the screens the notes name: Home, the tab bar, the "+" sheet, the workout screen, the finish screen, Food (Ami-style text logging), the handle screen and Friends. For each, list what is on the screen after the change, in order, and what was removed.
8. **Build batches.** Split the work so Opus 5.5 and Codex can build it. Each batch has:
   - its goal and the findings or notes it covers
   - the files it touches (existing and new)
   - the pure modules and test files it adds
   - whether it needs judgment (Opus) or is fully specified (Codex)
   - its effort in hours
   - which batches it can run beside without touching the same files

   Order the batches so the friends' tests improve soonest: cut buttons and dead ends first, then sign-in, then the bear.
9. **Decisions for the owner.** At most 8 questions, each with your recommended answer and its alternative.

End your reply with the batch list and the owner questions. Do not repeat the plan in the reply.
