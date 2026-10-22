---
id: bebear-3day
name: "beBEAR 3-Day Full Body"
author: beBEAR
url: "https://github.com/paul-bebear/beBEARlifts"
shortDescription: Three full-body days a week for your first months of lifting. Rep ranges, double progression, a short run and a stretch block.
isMultiweek: false
tags: []
frequency: 3
age: "less_than_3_months"
duration: "45-60"
goal: "hypertrophy"
---

Three full-body days: A, B and C. Each day trains legs, a push, a pull and one smaller muscle. Day A ends with 10 easy minutes on a bike, day C with a short stretch block. Hit the top of the rep range on every set and the app adds weight next time.

<!-- more -->

## Origin & Philosophy

beBEAR wrote this plan for lifters in their first months. The beBEAR app builds it from the same generator as the [4-day](/programs/bebear-4day) and [5-day](/programs/bebear-ulppl) plans. The idea is simple: train every muscle 3 times a week with a small number of lifts, and add weight only when you own the reps.

## Who It's For

- New lifters, 0 to 6 months of training.
- Lifters who can train 3 days a week, for about 50 minutes.
- Goal: build muscle and learn the main lifts.
- Works on a bulk or on maintenance. On a cut, expect slower progress.

## Pros & Cons

**Pros**

- Each muscle gets 3 sessions a week, so you practise the main lifts often.
- Every day has 5 lifts, so a session takes about 50 minutes with the run or stretch.
- Double progression adds weight only after you hit 12 reps, so you rarely stall in the first months.
- The run on day A and the stretch block on day C cover easy cardio and mobility without extra days.

**Cons**

- Only one direct arm exercise a week ([{Hammer Curl}] on day C). Arms grow from the rows and presses, but slower.
- The run is logged as [{Cycling}] because the exercise library has no running entry.
- No heavy sets of 5. If your goal is a big squat number, pick the strength goal in the app.

## Program Structure

- Split: full body, A, B, C.
- Periodization: double progression, one week that repeats.
- A common week is Monday, Wednesday, Friday. The app runs the days in order, so any 3 days with a rest day between work.

## Exercise Selection & Rationale

- Day A: [{Squat}], [{Bench Press}], [{Bent Over Row}] and [{Romanian Deadlift, Barbell}] cover legs, push, pull and the hinge. [{Lateral Raise, Cable}] adds width to the shoulders, which presses miss.
- Day B: [{Deadlift}], [{Overhead Press}] and [{Lat Pulldown}] train the same patterns in the vertical direction. [{Lunge, Dumbbell}] trains one leg at a time. [{Triceps Pushdown}] and [{Calf Press on Leg Press}] finish the day.
- Day C: [{Leg Press}] lets you train legs hard a third time without loading the spine. [{Incline Bench Press, Dumbbell}], [{Seated Row}], [{Hip Thrust}] and [{Hammer Curl}] cover upper chest, mid back, glutes and arms.
- The stretch block on day C is a deep squat hold ([{Assisted Squat}]), a slow seated twist ([{Russian Twist}]) and a slow reach ([{Single Leg Deadlift, Bodyweight}]), 2 holds of 45 seconds each.

## Set & Rep Scheme

- Compound lifts: 3 sets of 8 to 12.
- Isolation lifts: 2 sets of 12 to 15.
- Run: one 10-minute set at an easy pace.
- Stretch block: 2 holds of 45 seconds per move.
- Stop each set with 1 or 2 reps left. No sets to failure.

## Progressive Overload

Every lift uses double progression. Start at the bottom of the range. Add reps each session. When every set reaches the top, the app adds weight and you start again at the bottom.

- [{Squat}], [{Deadlift}], [{Romanian Deadlift, Barbell}], [{Leg Press}] and [{Hip Thrust}]: +10lb at 3x12.
- Other compound lifts: +5lb at 3x12.
- Isolation lifts: +2.5lb at 2x15.

Missed the bottom of the range? That's okay. Keep the weight and try again. If you miss it 3 sessions in a row, drop the weight by 10% and build back up.

## How Long to Run It / What Next

Run it for 3 to 6 months. Move to the [4-day plan](/programs/bebear-4day) when sessions feel short and you want more volume per muscle, or when you can train 4 days a week.

## Equipment Needed

A gym with a barbell, dumbbells, a cable station, a leg press, a leg curl and a bike. The beBEAR app builds the same plan for dumbbells only, street workout bars, or no equipment.

## Rest Times

- Compound lifts: 90 seconds.
- Isolation lifts: 60 seconds.

## How to Pick Starting Weights

The starting weights are placeholders. Pick a weight you can lift 8 times with 2 or 3 reps left. Starting light costs you one or two sessions. Starting too heavy stalls you from day one.

## Common Modifications

- No leg press: use [{Goblet Squat}] on day C.
- No cable station: use [{Lateral Raise}] with dumbbells, [{Triceps Extension}] with a dumbbell and [{Bent Over One Arm Row}].
- Short on time: skip the run on day A. It saves 10 minutes.

<!-- faq -->

### Is the beBEAR 3-day plan good for beginners?

Yes. It is written for the first months of lifting. Each lift starts light and gets heavier only when you hit all the reps.

### Can I do the beBEAR 3-day plan on back-to-back days?

You can, but a rest day between sessions works better. Every day trains the whole body, so your legs need about 48 hours to recover.

### Do I have to do the run?

No. It is 10 easy minutes for your heart and lungs. Skip it if you are short on time or do other sport.

### When do I add weight?

When every set of a lift reaches the top of its range. The app adds the weight for you after the workout.

### What if I can't do a lift?

Change it in the program editor to a similar lift you can do. Keep the same sets and reps.

```liftoscript
# Week 1
## Full Body A
build / used: none / 3x8 / 90s / progress: dp(5lb, 8, 12)
iso / used: none / 2x12 / 60s / progress: dp(2.5lb, 12, 15)
run / used: none / 1x1 0lb 600s|0s / warmup: none
mobility / used: none / 2x1 0lb 45s|15s / warmup: none

Squat / ...build / 95lb / progress: dp(10lb, 8, 12)
Bench Press / ...build / 95lb
Bent Over Row / ...build / 75lb
Romanian Deadlift, Barbell / ...build / 95lb / progress: dp(10lb, 8, 12)
Lateral Raise, Cable / ...iso / 10lb
// Bike or treadmill, 10 easy minutes. You should still be able to talk.
Cycling / ...run

## Full Body B
Deadlift / ...build / 135lb / progress: dp(10lb, 8, 12)
Overhead Press / ...build / 65lb
Lat Pulldown / ...build / 70lb
Lunge, Dumbbell / ...build / 20lb
Triceps Pushdown / ...iso / 40lb
Calf Press on Leg Press / ...iso / 90lb

## Full Body C
Leg Press / ...build / 180lb / progress: dp(10lb, 8, 12)
Incline Bench Press, Dumbbell / ...build / 30lb
Seated Row / ...build / 70lb
Hip Thrust / ...build / 95lb / progress: dp(10lb, 8, 12)
Hammer Curl / ...iso / 20lb
// Sit in a deep squat. Hold a door frame for balance.
Assisted Squat / ...mobility
// Slow, no weight. Sit tall and turn your chest side to side.
Russian Twist / ...mobility
// Slow reach to the floor. Feel the back of the leg.
Single Leg Deadlift, Bodyweight / ...mobility
```
