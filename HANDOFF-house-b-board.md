# Handoff: piece B, the whiteboard

You are the Sonnet build session for the whiteboard. `HOUSE_HOME_PLAN.md` at the repo root is the plan. Read its section The whiteboard before the first edit. Read `CLAUDE.md` for the repo rules. Piece A has merged; branch from master.

## What you build

The goal moves onto the whiteboard as two lines, and the board's writing uses a marker font. The font is the one the owner picked in the plan's open questions, Kalam or Permanent Marker.

The module and its test first.

- `src/models/bearBoard.ts`. `IBearBoardTarget` becomes `"plus" | "goal" | "bear"`. `IBearBoardLine["id"]` gains `"goal"` and `"goalSince"`. `IBearBoardInput` takes `goal?: IProgramGoal` in place of `goalStartedAt`, and `BearBoard_lines` passes `goal?.startedAt` to `DailyChecklist_build` as before. New `BearBoard_goalLines(goal, units, now)` returns the two lines: "Goal: build muscle" from `ProgramGoal_kindLabel`, and "since October 21 at 73 kg" from `startedAt` and `ProgramGoal_formatWeight(startWeight, units)`. The month is the full English name. The year is added when it is not the year of `now`: "since October 21, 2025 at 73 kg". Without a start weight the second line is "since October 21". Without a goal the first line is "Goal: tap to set one" and there is no second line. `BearBoard_lines` returns the three to-do lines, the goal lines, then the weight, level and lifted lines.
- `test/bearBoard.test.ts` covers a goal with a start weight, a goal without one, a goal from last year, and no goal, and checks the order of the eight lines.

The views after that.

- `src/components/bearSceneParts.tsx`. `BoardLine` draws its text with `TextRaw` from `src/components/primitives/text.tsx` and an explicit `fontFamily`. With Kalam: `"Kalam-Bold"` for `plus` lines and `"Kalam-Regular"` for the rest. With Permanent Marker: `"PermanentMarker-Regular"` for all. The check mark is two `View` strokes in `markerInk`, rotated 45 and negative 45 degrees, not the "✓" glyph, because the marker fonts have none. `boardTargets` becomes `["plus", "goal", "bear"]`, so the goal lines are their own `Pressable` group with `testID="bear-board-goal"`. The line height stays `size * 1.45`.
- `src/components/screenHome.tsx`. `openBoardTarget` sends `"goal"` to `dispatch(Thunk_pushScreen("goalWizard", { mode: "goal" }, { tab: "graphs" }))`. The `BearBoard_lines` call passes `goal: goalLog.current`.

The font files.

- Download from Google Fonts. Kalam: `Kalam-Regular.ttf` and `Kalam-Bold.ttf`, OFL 1.1. Permanent Marker: `PermanentMarker-Regular.ttf`, Apache 2.0.
- Kalam carries Devanagari and is about 400 KB a weight. Subset it: `pip install fonttools`, then `pyftsubset Kalam-Bold.ttf --unicodes="U+0020-007E,U+00A0-00FF,U+2013,U+2014,U+2022,U+00B7,U+2212" --output-file=Kalam-Bold.ttf`. Check the PostScript name survives with `fc-scan --format '%{postscriptname}\n' Kalam-Bold.ttf`; it must read `Kalam-Bold`, because iOS loads the font by that name.
- Copy each file to `assets/fonts`, `ios/Fonts` and `android/app/src/main/assets/fonts`. Add the file names to `UIAppFonts` in `ios/Liftosaur/Info.plist`. Put the licence text next to the files in `assets/fonts` as `Kalam-OFL.txt` or `PermanentMarker-LICENSE.txt`.
- The web build loads fonts from `assets/fonts` through the existing `@font-face` rules; find them with `grep -rn "Poppins-Bold" src/*.css webpack* 2>/dev/null` and add the new family the same way.

## What you do not decide

The owner picked the font and the eight lines. The ink colour stays `#1F3A5F`. Do not touch the frame, the pills or the phone sheet.

## Done means

- `npm test` and `npm run lint` are green.
- On the owner's iPhone: the board shows eight lines in the marker font, the goal lines read "Goal: build muscle" and "since October 21 at 73 kg" with the owner's own date and weight, a tap on them opens Change goal, the check mark on a done line is a drawn tick, and the to-do lines are bolder than the rest.
- The PR body carries that list as the owner's phone checklist, plus what is not covered. Fonts need a native build, so say that the web preview shows the font only if the web `@font-face` step is done.

## Conventions

- Do not run the iOS Simulator or the browser pane. The owner tests on the phone.
- The PR title ends with `[skip deploy]`. Do not merge.
- Commit messages name what the user sees. No AI attribution lines.

Next action: add the four cases to `test/bearBoard.test.ts`, then write `BearBoard_goalLines`.
