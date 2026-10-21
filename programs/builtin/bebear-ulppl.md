---
id: bebear-ulppl
name: "beBEAR 5-Day Upper/Lower/Push/Pull/Lower"
author: beBEAR
url: "https://github.com/paul-bebear/beBEARlifts"
shortDescription: Five days a week. Upper, quad-focused lower, push, pull, glute-focused lower, all in rep ranges with double progression.
isMultiweek: false
tags: []
frequency: 5
age: "3_to_12_months"
duration: "45-60"
goal: "hypertrophy"
---

A five-day hypertrophy split: Upper, Lower 1 (quad focus), Push, Pull, Lower 2 (glute focus). Every lift has a rep range. Hit the top of the range on all sets and the weight goes up next time.

<!-- more -->

## Program Structure

The week runs Upper, Lower 1, rest, Push, Pull, Lower 2, rest. A common layout is Monday, Tuesday, Thursday, Friday and Saturday. The app runs the days in order, so any 5 training days work.

- Upper: chest, back and shoulders, with one press and one row of each type.
- Lower 1: quad focus. [{Squat}] leads, then [{Romanian Deadlift}], lunges and [{Leg Extension}]. It ends with a calf and core superset.
- Push: incline and flat pressing, cable flyes, lateral raises and two triceps extensions.
- Pull: [{Pull Up}], a lat-focused cable row, rear delts, then biceps.
- Lower 2: glute focus. [{Deadlift}] leads, then [{Bulgarian Split Squat}], [{Hip Thrust}] and [{Seated Leg Curl}]. It ends with an abductor and calf superset.

Each muscle gets trained 2 times a week. Chest and back get hit on Upper plus Push or Pull. Legs get two separate days with a different focus each.

## Set & Rep Scheme

- Heavy compounds ([{Squat}], [{Deadlift}], [{Pull Up}]): 3 sets of 6-10.
- Other compounds and most accessories: 8-12.
- Isolation and cable work: 10-15.
- Lateral raises: 10-20, because the side delts respond well to high reps and light weight.

Leave 1-2 reps in the tank on most sets. Go closer to failure on the last set of isolation work.

## Progressive Overload

Every exercise uses double progression. Start at the bottom of the range. Add reps each session. When every set reaches the top of the range, the app adds weight and you drop back to the bottom.

- Barbell [{Squat}], [{Deadlift}], [{Romanian Deadlift}] and [{Hip Thrust}]: +10lb.
- Everything else: +5lb.
- [{Pull Up}] starts at bodyweight. Once you get 3x10, add 5lb on a belt, or keep adding reps if weighted pull-ups are not an option.

Missed the bottom of the range? That's okay. Keep the weight and try again next session. If you miss it 3 sessions in a row, drop the weight by 10% and build back up.

## Rest Times

- Heavy compounds: 3 minutes.
- Other compounds: 2 minutes.
- Isolation work: 90 seconds.
- Supersets: go straight from the first exercise to the second, then rest 90 seconds.

## How to Pick Starting Weights

The starting weights are placeholders. Change them in the first week. Pick a weight you can lift for the bottom of the range with 2-3 reps left. Starting light costs one or two sessions. Starting too heavy stalls you from day one.

## Common Modifications

- No cable station: swap [{Cable Crossover}] and [{Chest Fly, Cable}] for [{Chest Fly}] with dumbbells, and [{Lateral Raise, Cable}] for [{Lateral Raise}].
- No hip abductor machine: use [{Hip Abductor, Band}].
- Short on time: drop the last isolation exercise of each day. That cuts about 8 minutes.

<!-- faq -->

### How many days a week is this split?

Five. Upper, Lower 1, Push, Pull and Lower 2, with two rest days. Put the rest days where they fit your week.

### What does double progression mean?

You work inside a rep range. Add reps until every set hits the top, then add weight and start again at the bottom.

### Can I do this split while cutting?

Yes. Keep the rep ranges and accept that progress slows down. If you lose reps for several weeks, drop one set from each isolation exercise.

### What are LU Raises?

A dumbbell raise that starts as a lateral raise and finishes overhead. The app logs it as a Lateral Raise. Use a light weight, about half of your normal lateral raise.

```liftoscript
# Week 1
## Upper
heavy / used: none / 3x6 / 180s / progress: dp(10lb, 6, 10)
mid / used: none / 3x8 / 120s / progress: dp(5lb, 8, 12)
iso / used: none / 3x10 / 90s / progress: dp(5lb, 10, 15)

Bench Press, Dumbbell / ...mid / 35lb
Incline Row / ...mid / 30lb
Shoulder Press / ...mid / 2x8 / 25lb
Lat Pulldown / ...mid / 90lb
Cable Crossover / ...iso / 2x10 / 20lb
Lateral Raise, Cable / ...iso / 10lb / progress: dp(5lb, 10, 20)

## Lower 1
Squat / ...heavy / 115lb
Romanian Deadlift, Barbell / ...mid / 95lb / progress: dp(10lb, 8, 12)
Lunge, Dumbbell / ...mid / 25lb
Leg Extension / ...iso / 70lb
Calf Press on Leg Press / ...iso / 90lb / 0s / superset: A
Dead Bug / 3x5-10 / 90s / superset: A

## Push
Incline Bench Press, Dumbbell / ...mid / 35lb
Chest Fly, Cable / ...iso / 2x10 / 20lb
Bench Press / ...mid / 95lb
Lateral Raise / ...iso / 10lb / progress: dp(5lb, 10, 20)
Triceps Extension / ...iso / 2x10 / 25lb
Triceps Extension, Cable / ...iso / 2x10 / 20lb

## Pull
Pull Up / ...heavy / 0lb / progress: dp(5lb, 6, 10)
Seated Row / ...iso / 90lb
Reverse Fly, Leverage Machine / ...iso / 50lb
Preacher Curl / ...mid / 2x8 / 20lb
Hammer Curl / ...mid / 2x8 / 25lb
Face Pull / ...iso / 2x10 / 40lb

## Lower 2
Deadlift / ...heavy / 135lb
Bulgarian Split Squat / ...mid / 25lb
Hip Thrust / ...iso / 135lb / progress: dp(10lb, 10, 15)
Seated Leg Curl / ...iso / 70lb
Hip Abductor / ...iso / 70lb / 0s / superset: A
Seated Calf Raise, Leverage Machine / ...mid / 70lb / 90s / superset: A
```
