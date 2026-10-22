---
id: bebear-ulppl
name: "beBEAR 5-Day Upper/Lower/Push/Pull/Lower"
author: beBEAR
url: "https://github.com/paul-bebear/beBEARlifts"
shortDescription: Five days a week. Upper, quad-focused lower, push, pull, glute-focused lower, all in rep ranges with double progression.
isMultiweek: false
tags: []
frequency: 5
age: "more_than_year"
duration: "45-60"
goal: "hypertrophy"
---

A five-day hypertrophy split: Upper, Lower 1 (quad focus), Push, Pull, Lower 2 (glute focus). Every lift has a rep range. Hit the top of the range on all sets and the weight goes up next time.

<!-- more -->

## Origin & Philosophy

beBEAR wrote this plan for lifters with a year or more of training. The beBEAR app builds it from the same generator as the [3-day](/programs/bebear-3day) and [4-day](/programs/bebear-4day) plans. Five shorter sessions let each muscle get two hard sessions a week while no single day runs long.

## Who It's For

- Lifters with a year or more of training.
- Lifters who can train 5 days a week, for about 45 minutes.
- Goal: build muscle.
- Works on a bulk or on maintenance. On a cut, drop one set from each isolation lift if you lose reps for several weeks.

## Pros & Cons

**Pros**

- Each muscle gets 2 sessions a week. Legs get two separate days with a different focus each.
- Sessions take 38 to 44 minutes, because each day has only 6 lifts.
- Direct arm work on Push and Pull: two triceps lifts and two curls.

**Cons**

- Five days a week is a real time commitment. Missing a day shifts the whole week.
- [{Bench Press}], [{Chest Fly, Cable}] and [{Lateral Raise, Cable}] appear on both Upper and Push, so chest and side delts get more work than back.

## Program Structure

- Split: upper, lower, push, pull, lower.
- Periodization: double progression, one week that repeats.
- The week runs Upper, Lower 1, rest, Push, Pull, Lower 2, rest. A common layout is Monday, Tuesday, Thursday, Friday and Saturday. The app runs the days in order, so any 5 training days work.

## Exercise Selection & Rationale

- Upper: [{Bench Press}], [{Bent Over Row}], [{Overhead Press}] and [{Lat Pulldown}] give one push and one pull in each direction. [{Chest Fly, Cable}] and [{Lateral Raise, Cable}] finish the day.
- Lower 1: quad focus. [{Squat}] leads, then [{Romanian Deadlift, Barbell}], [{Lunge, Dumbbell}] and [{Leg Extension}]. Calves and [{Cable Crunch}] finish the day.
- Push: [{Incline Bench Press, Dumbbell}] and [{Bench Press}], then flyes, lateral raises, [{Triceps Pushdown}] and [{Triceps Extension}].
- Pull: [{Pull Up}], [{Seated Row}], [{Reverse Fly, Leverage Machine}], [{Preacher Curl}], [{Hammer Curl}] and [{Standing Row Rear Delt With Rope}] for the rear delts.
- Lower 2: glute focus. [{Deadlift}] leads, then [{Bulgarian Split Squat}], [{Hip Thrust}], [{Seated Leg Curl}], [{Hip Abductor}] and calves.

## Set & Rep Scheme

- Compound lifts: 3 sets of 8 to 12.
- Isolation lifts: 2 sets of 12 to 15.
- [{Pull Up}]: 3 sets, starting at 6 reps and adding 1 rep a session up to 12.
- Leave 1 or 2 reps in the tank on most sets. Go closer to failure on the last set of isolation work.

## Progressive Overload

Every lift uses double progression. Start at the bottom of the range. Add reps each session. When every set reaches the top, the app adds weight and you drop back to the bottom.

- Barbell [{Squat}], [{Deadlift}], [{Romanian Deadlift, Barbell}] and [{Hip Thrust}]: +10lb.
- Other compound lifts: +5lb.
- Isolation lifts: +2.5lb.
- [{Pull Up}] starts at bodyweight. Once you get 3x12, add weight on a belt or a backpack and log it.

Missed the bottom of the range? That's okay. Keep the weight and try again next session. If you miss it 3 sessions in a row, drop the weight by 10% and build back up.

## How Long to Run It / What Next

Run it as long as you keep adding reps or weight. When most lifts stall for a month, take an easy week at 60% of your weights, then start again.

## Equipment Needed

A gym with a barbell, dumbbells, a cable station, a leg extension, a leg curl, a hip abductor, a rear delt machine and a pull-up bar. The beBEAR app builds the same plan for dumbbells only, street workout bars, or no equipment.

## Rest Times

- Compound lifts: 90 seconds.
- Isolation lifts and [{Pull Up}]: 60 seconds.

## How to Pick Starting Weights

The starting weights are placeholders. Change them in the first week. Pick a weight you can lift for the bottom of the range with 2 or 3 reps left. Starting light costs one or two sessions. Starting too heavy stalls you from day one.

## Common Modifications

- No cable station: swap [{Chest Fly, Cable}] for [{Chest Fly}] with dumbbells, and [{Lateral Raise, Cable}] for [{Lateral Raise}].
- No hip abductor machine: use [{Side Lying Clam}].
- Short on time: drop the last isolation lift of each day. That cuts about 5 minutes.

<!-- faq -->

### How many days a week is the beBEAR 5-day split?

Five. Upper, Lower 1, Push, Pull and Lower 2, with two rest days. Put the rest days where they fit your week.

### What does double progression mean?

You work inside a rep range. Add reps until every set hits the top, then add weight and start again at the bottom.

### Can I do the beBEAR 5-day split while cutting?

Yes. Keep the rep ranges and accept that progress slows down. If you lose reps for several weeks, drop one set from each isolation lift.

### I can't do a pull-up yet. What now?

Swap Pull Up for Lat Pulldown in the program editor. Switch back once you can do 3 sets of 6.

```liftoscript
# Week 1
## Upper
build / used: none / 3x8 / 90s / progress: dp(5lb, 8, 12)
iso / used: none / 2x12 / 60s / progress: dp(2.5lb, 12, 15)
bw / used: none / 3x6 / 0lb / 60s / warmup: none / progress: custom() {~
  if (completedReps >= reps && reps[1] < 12) {
    reps += 1
  }
~}

Bench Press / ...build / 95lb
Bent Over Row / ...build / 75lb
Overhead Press / ...build / 65lb
Lat Pulldown / ...build / 70lb
Chest Fly, Cable / ...iso / 15lb
Lateral Raise, Cable / ...iso / 10lb

## Lower 1
Squat / ...build / 95lb / progress: dp(10lb, 8, 12)
Romanian Deadlift, Barbell / ...build / 95lb / progress: dp(10lb, 8, 12)
Lunge, Dumbbell / ...build / 20lb
Leg Extension / ...iso / 60lb
Calf Press on Leg Press / ...iso / 90lb
Cable Crunch / ...iso / 40lb

## Push
Incline Bench Press, Dumbbell / ...build / 30lb
Bench Press / ...build / 95lb
Chest Fly, Cable / ...iso / 15lb
Lateral Raise, Cable / ...iso / 10lb
Triceps Pushdown / ...iso / 40lb
Triceps Extension / ...iso / 20lb

## Pull
// Hit 3x12? Add a backpack with books and log its weight.
Pull Up / ...bw
Seated Row / ...build / 70lb
Reverse Fly, Leverage Machine / ...iso / 50lb
Preacher Curl / ...iso / 20lb
Hammer Curl / ...iso / 20lb
Standing Row Rear Delt With Rope / ...iso / 30lb

## Lower 2
Deadlift / ...build / 135lb / progress: dp(10lb, 8, 12)
Bulgarian Split Squat / ...build / 20lb
Hip Thrust / ...build / 95lb / progress: dp(10lb, 8, 12)
Seated Leg Curl / ...iso / 60lb
Hip Abductor / ...iso / 60lb
Calf Press on Leg Press / ...iso / 90lb
```
