import type { IExerciseDemoTips } from "./exerciseDemos";

export const ExerciseDemoTips_byKey: Readonly<Record<string, IExerciseDemoTips>> = {
  squat_barbell: {
    cues: [
      "Brace your belly before you go down.",
      "Push your knees out over your toes.",
      "Stand up by pushing the floor away, chest up.",
    ],
    mistakes: ["Knees caving in on the way up.", "Heels lifting off the floor.", "Stopping well above parallel."],
  },
  benchpress_barbell: {
    cues: [
      "Squeeze your shoulder blades together and keep them pinned.",
      "Lower the bar to your lower chest, elbows about 45 degrees from your body.",
      "Keep your feet flat and press the bar up and slightly back.",
    ],
    mistakes: [
      "Bouncing the bar off your chest.",
      "Elbows flared straight out to the sides.",
      "Lifting your butt off the bench.",
    ],
  },
  deadlift_barbell: {
    cues: [
      "Bar over the middle of your foot, shins close to it.",
      "Pull the slack out of the bar and brace before it leaves the floor.",
      "Push the floor away and keep the bar against your legs.",
    ],
    mistakes: ["Rounding your lower back.", "Hips shooting up before the bar moves.", "Leaning back hard at the top."],
  },
  romaniandeadlift_barbell: {
    cues: [
      "Start standing. Soften your knees, then push your hips back.",
      "Slide the bar down your thighs with a flat back.",
      "Stop at a strong hamstring stretch, then squeeze your glutes to stand.",
    ],
    mistakes: [
      "Bending the knees until it turns into a squat.",
      "Letting the bar drift away from your legs.",
      "Rounding your back to reach lower.",
    ],
  },
  overheadpress_barbell: {
    cues: [
      "Grip just outside your shoulders, elbows a little in front of the bar.",
      "Squeeze your glutes and belly so your body stays straight.",
      "Move your head back, press straight up, then push your head through.",
    ],
    mistakes: [
      "Leaning far back to push the bar.",
      "Pressing the bar out in front of your face.",
      "Locking out with a loose core.",
    ],
  },
  bentoverrow_barbell: {
    cues: [
      "Hinge until your torso is about 45 degrees, back flat.",
      "Pull the bar to your lower ribs, elbows back.",
      "Lower it under control to straight arms.",
    ],
    mistakes: ["Standing up taller every rep.", "Jerking the weight with your hips.", "Shrugging the bar up."],
  },
  pullup_bodyweight: {
    cues: [
      "Start from a dead hang, shoulders pulled down away from your ears.",
      "Drive your elbows down to your sides until your chin clears the bar.",
      "Lower all the way down every rep.",
    ],
    mistakes: [
      "Half reps that never reach straight arms.",
      "Kicking or swinging to get up.",
      "Craning your neck to get the chin over.",
    ],
  },
  latpulldown_cable: {
    cues: [
      "Lock your thighs under the pad and sit tall.",
      "Pull the bar to your upper chest, elbows down and back.",
      "Let it rise slowly until your arms are straight.",
    ],
    mistakes: [
      "Leaning far back and rowing the weight.",
      "Pulling the bar behind your neck.",
      "Letting the stack yank your arms up.",
    ],
  },
  inclinebenchpress_dumbbell: {
    cues: [
      "Set the bench low, about 30 degrees.",
      "Lower the dumbbells beside your upper chest, elbows a bit tucked.",
      "Press up and slightly in without clanking them together.",
    ],
    mistakes: [
      "A bench so steep it turns into a shoulder press.",
      "Dropping the dumbbells fast at the bottom.",
      "Arching your back off the bench.",
    ],
  },
  seatedrow_cable: {
    cues: [
      "Sit tall with a slight bend in your knees.",
      "Pull the handle to your belly and squeeze your shoulder blades.",
      "Let your arms go long without rounding forward.",
    ],
    mistakes: ["Rocking your torso back and forth.", "Shrugging your shoulders up.", "Pulling only with your arms."],
  },
  chestfly_cable: {
    cues: [
      "Keep a small, fixed bend in your elbows.",
      "Open your arms wide until you feel a stretch in your chest.",
      "Bring your hands together over your chest like hugging a barrel.",
    ],
    mistakes: [
      "Bending the elbows more until it becomes a press.",
      "Going so heavy you lose the stretch.",
      "Letting the cables pull your shoulders forward.",
    ],
  },
  lateralraise_cable: {
    cues: [
      "Stand side-on to the low pulley with a slight bend in the elbow.",
      "Raise your arm out to the side up to shoulder height.",
      "Lower slowly and keep tension on the cable.",
    ],
    mistakes: [
      "Swinging your body to lift the weight.",
      "Shrugging your shoulder up.",
      "Raising the arm above shoulder height.",
    ],
  },
  lunge_dumbbell: {
    cues: [
      "Take a long step forward and keep your torso tall.",
      "Lower until both knees bend to about 90 degrees.",
      "Push through your front heel to step back.",
    ],
    mistakes: [
      "Front knee caving inward.",
      "A step so short the front heel lifts.",
      "Slamming the back knee into the floor.",
    ],
  },
  legextension_leveragemachine: {
    cues: [
      "Line up your knees with the machine's pivot.",
      "Straighten your legs fully and squeeze your thighs for a second.",
      "Lower slowly so the stack never slams.",
    ],
    mistakes: ["Kicking the weight up fast.", "Lifting your hips off the seat.", "Half reps."],
  },
  calfpressonlegpress_leveragemachine: {
    cues: [
      "Put the balls of your feet on the low edge of the platform, heels off.",
      "Keep your knees straight but not locked.",
      "Push up onto your toes as high as you can, then let your heels stretch back.",
    ],
    mistakes: [
      "Letting your feet slide down off the platform.",
      "Bouncing at the bottom.",
      "Bending the knees to move more weight.",
    ],
  },
  cablecrunch_cable: {
    cues: [
      "Kneel facing the stack with the rope beside your head.",
      "Curl your chest toward your knees by rounding your back.",
      "Keep your hips still so your abs do the work.",
    ],
    mistakes: [
      "Sitting back on your heels to pull the weight.",
      "Pulling with your arms.",
      "Going so heavy you can't round your back.",
    ],
  },
  tricepspushdown_cable: {
    cues: [
      "Pin your elbows to your sides.",
      "Push the bar down until your arms are straight.",
      "Let it rise to about chest height while your elbows stay put.",
    ],
    mistakes: [
      "Elbows drifting forward and back.",
      "Leaning over the bar to push with your bodyweight.",
      "Stopping short of straight arms.",
    ],
  },
  tricepsextension_dumbbell: {
    cues: [
      "Hold one dumbbell in both hands above your head.",
      "Lower it behind your head by bending only your elbows.",
      "Keep your elbows pointing up and press back to straight arms.",
    ],
    mistakes: ["Elbows flaring wide.", "Arching your lower back.", "Swinging the upper arms instead of the elbows."],
  },
  reversefly_leveragemachine: {
    cues: [
      "Sit facing the pad with the handles at shoulder height.",
      "Sweep your arms back in a wide arc with a small bend in the elbows.",
      "Squeeze the back of your shoulders, then return slowly.",
    ],
    mistakes: [
      "Shrugging your shoulders up.",
      "Bending the elbows until it becomes a row.",
      "Throwing the weight back with momentum.",
    ],
  },
  preachercurl_dumbbell: {
    cues: [
      "Rest the back of your arm flat on the pad.",
      "Curl the dumbbell up without lifting your elbow.",
      "Lower all the way down slowly.",
    ],
    mistakes: [
      "Dropping fast at the bottom, which strains the elbow.",
      "Lifting the elbow off the pad.",
      "Leaning back to finish the rep.",
    ],
  },
  hammercurl_dumbbell: {
    cues: [
      "Keep your palms facing each other the whole time.",
      "Keep your elbows at your sides.",
      "Curl up, squeeze, and lower slowly.",
    ],
    mistakes: ["Swinging the dumbbells with your back.", "Elbows moving forward.", "Rushing the way down."],
  },
  standingrowreardeltwithrope_cable: {
    cues: [
      "Set the pulley at about shoulder height and hold the rope ends.",
      "Pull the rope toward your face with your elbows high and wide.",
      "Squeeze the back of your shoulders, then reach forward again.",
    ],
    mistakes: ["Elbows dropping into a low row.", "Leaning back to move the weight.", "Shrugging toward your ears."],
  },
  bulgariansplitsquat_dumbbell: {
    cues: [
      "Rear foot on the bench, front foot far enough forward.",
      "Lower straight down until your back knee nearly touches the floor.",
      "Push through your front heel to stand.",
    ],
    mistakes: ["Front foot so close the heel lifts.", "Front knee caving in.", "Pushing with the back leg."],
  },
  hipthrust_barbell: {
    cues: [
      "Upper back on the bench edge, padded bar in the crease of your hips.",
      "Feet flat, shins straight up and down at the top.",
      "Drive your hips up, squeeze your glutes, keep your chin tucked.",
    ],
    mistakes: [
      "Arching your lower back at the top.",
      "Feet so far out your hamstrings take over.",
      "Rushing past the top squeeze.",
    ],
  },
  seatedlegcurl_leveragemachine: {
    cues: [
      "Line up your knees with the machine's pivot and lock the thigh pad.",
      "Curl your heels under the seat as far as you can.",
      "Return slowly to almost straight legs.",
    ],
    mistakes: ["Lifting your hips off the seat.", "Letting the weight snap back.", "Short reps at the bottom."],
  },
  hipabductor_leveragemachine: {
    cues: [
      "Sit tall with your back against the pad.",
      "Push your knees out against the pads as wide as you can.",
      "Hold a moment, then close slowly.",
    ],
    mistakes: ["Letting the weight slam back.", "Rocking your torso forward and back.", "Tiny reps near the start."],
  },
};
