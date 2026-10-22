---
id: bebear-4day
name: "beBEAR 4-Day Upper/Lower"
author: beBEAR
url: "https://github.com/paul-bebear/beBEARlifts"
shortDescription: Four days a week, upper and lower body twice each. Rep ranges and double progression, about 45 minutes a session.
isMultiweek: false
tags: []
frequency: 4
age: "3_to_12_months"
duration: "45-60"
goal: "hypertrophy"
---

An upper/lower split: Upper A, Lower A, Upper B, Lower B. Each muscle gets two sessions a week, with a different set of lifts each time. Hit the top of the rep range on every set and the app adds weight next time.

<!-- more -->

## Origin & Philosophy

beBEAR wrote this plan for lifters with a few months of training. The beBEAR app builds it from the same generator as the [3-day](/programs/bebear-3day) and [5-day](/programs/bebear-ulppl) plans. Splitting upper and lower body gives each muscle more sets per session than a full-body plan, at the same session length.

## Who It's For

- Lifters with 3 to 12 months of training.
- Lifters who can train 4 days a week, for about 45 minutes.
- Goal: build muscle.
- Works on a bulk or on maintenance. On a cut, expect slower progress.

## Pros & Cons

**Pros**

- Each muscle gets 2 sessions a week with two different lifts, so the week covers more angles.
- Direct arm work twice a week: a curl and a triceps lift on each upper day.
- Sessions take 44 to 52 minutes.

**Cons**

- Upper days have 7 lifts. On a busy gym day, waiting for equipment can push them past an hour.
- [{Pull Up}] starts at bodyweight. If you cannot do 6 reps yet, swap it for [{Lat Pulldown}] until you can.

## Program Structure

- Split: upper/lower, twice a week.
- Periodization: double progression, one week that repeats.
- A common week is Monday, Tuesday, Thursday, Friday. The app runs the days in order, so any 4 days work.

## Exercise Selection & Rationale

- Upper A: [{Bench Press}], [{Bent Over Row}], [{Overhead Press}] and [{Lat Pulldown}] give one push and one pull in each direction. [{Lateral Raise, Cable}], [{Preacher Curl}] and [{Triceps Pushdown}] finish the day.
- Lower A: [{Squat}] leads, then [{Romanian Deadlift, Barbell}] for the hamstrings, [{Lunge, Dumbbell}] for one leg at a time, [{Seated Leg Curl}], calves and [{Cable Crunch}].
- Upper B: [{Incline Bench Press, Dumbbell}], [{Pull Up}] and [{Seated Row}] train the upper chest, lats and mid back. [{Chest Fly, Cable}], [{Reverse Fly, Leverage Machine}], [{Hammer Curl}] and [{Triceps Extension}] add volume.
- Lower B: [{Deadlift}] leads, then [{Bulgarian Split Squat}], [{Hip Thrust}], [{Leg Extension}], [{Hip Abductor}] and calves.

## Set & Rep Scheme

- Compound lifts: 3 sets of 8 to 12.
- Isolation lifts: 2 sets of 12 to 15.
- [{Pull Up}]: 3 sets, starting at 6 reps and adding 1 rep a session up to 12.
- Stop each set with 1 or 2 reps left.

## Progressive Overload

Every lift uses double progression. Start at the bottom of the range. Add reps each session. When every set reaches the top, the app adds weight and you start again at the bottom.

- [{Squat}], [{Deadlift}], [{Romanian Deadlift, Barbell}] and [{Hip Thrust}]: +10lb at 3x12.
- Other compound lifts: +5lb at 3x12.
- Isolation lifts: +2.5lb at 2x15.
- [{Pull Up}]: +1 rep per set each time you hit all sets. At 3x12, add a weight belt or a backpack and log its weight.

Missed the bottom of the range? That's okay. Keep the weight and try again. If you miss it 3 sessions in a row, drop the weight by 10% and build back up.

## How Long to Run It / What Next

Run it for 6 to 12 months. Move to the [5-day plan](/programs/bebear-ulppl) when you can train 5 days a week and recover well.

## Equipment Needed

A gym with a barbell, dumbbells, a cable station, a leg extension, a leg curl, a hip abductor and a pull-up bar. The beBEAR app builds the same plan for dumbbells only, street workout bars, or no equipment.

## Rest Times

- Compound lifts: 90 seconds.
- Isolation lifts and [{Pull Up}]: 60 seconds.

## How to Pick Starting Weights

The starting weights are placeholders. Pick a weight you can lift 8 times with 2 or 3 reps left. Starting light costs you one or two sessions. Starting too heavy stalls you from day one.

## Common Modifications

- No machines for the legs: use [{Single Leg Deadlift}] for the leg curl and [{Step up}] for the leg extension.
- No hip abductor machine: use [{Side Lying Clam}].
- Short on time: drop the last isolation lift of each day. It saves about 5 minutes.

<!-- faq -->

### Is the beBEAR 4-day plan good after a beginner plan?

Yes. It is the next step after the [3-day plan](/programs/bebear-3day). It adds sets per muscle without making sessions longer.

### Which days should I train on the beBEAR 4-day plan?

Any 4 days. Monday, Tuesday, Thursday and Friday is common. The app runs the days in order.

### I can't do a pull-up yet. What now?

Swap Pull Up for Lat Pulldown in the program editor. Switch back once you can do 3 sets of 6.

### When do I add weight?

When every set of a lift reaches the top of its range. The app adds the weight for you after the workout.

### Can I add more arm work?

Yes. Add one set to the curl and the triceps lift on each upper day. That adds about 3 minutes.

```liftoscript
# Week 1
## Upper A
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
Lateral Raise, Cable / ...iso / 10lb
Preacher Curl / ...iso / 20lb
Triceps Pushdown / ...iso / 40lb

## Lower A
Squat / ...build / 95lb / progress: dp(10lb, 8, 12)
Romanian Deadlift, Barbell / ...build / 95lb / progress: dp(10lb, 8, 12)
Lunge, Dumbbell / ...build / 20lb
Seated Leg Curl / ...iso / 60lb
Calf Press on Leg Press / ...iso / 90lb
Cable Crunch / ...iso / 40lb

## Upper B
Incline Bench Press, Dumbbell / ...build / 30lb
// Hit 3x12? Add a backpack with books and log its weight.
Pull Up / ...bw
Seated Row / ...build / 70lb
Chest Fly, Cable / ...iso / 15lb
Reverse Fly, Leverage Machine / ...iso / 50lb
Hammer Curl / ...iso / 20lb
Triceps Extension / ...iso / 20lb

## Lower B
Deadlift / ...build / 135lb / progress: dp(10lb, 8, 12)
Bulgarian Split Squat / ...build / 20lb
Hip Thrust / ...build / 95lb / progress: dp(10lb, 8, 12)
Leg Extension / ...iso / 60lb
Hip Abductor / ...iso / 60lb
Calf Press on Leg Press / ...iso / 90lb
```
