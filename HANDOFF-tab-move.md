# Handoff: move Program into Progress, add Friends tab

Branch: claude/jolly-einstein-83f4ed. No PR is open yet.

## Done

- Pure routing module `src/models/tabRouting.ts` with `test/tabRouting.test.ts`. In the offline build every program screen goes to the Progress tab, and a reset stacks it on `progressDashboard` so it has a back arrow.
- Pure module `src/models/programCard.ts` with `test/programCard.test.ts`. It builds the Program card text and the error flag. `footer2.tsx` uses `ProgramCard_hasErrors` now.
- Friends tab: `src/components/screenFriends.tsx` (placeholder), `src/navigation/screens/NavScreenFriends.tsx`, `src/components/icons/iconFriends.tsx`, a `friends` tab and stack in `src/navigation/AppNavigator.tsx`, and the `friends` screen in `src/models/screen.ts` and `src/navigation/types.ts`. Offline build only. The upstream build keeps its Program tab.
- Program card at the top of `src/components/screenProgressDashboard.tsx`, offline build only.
- `navigateTo` in `src/navigation/navigationService.ts` and `Thunk_pushToEditProgram` in `src/ducks/thunks.ts` use the routing module.
- `programselect` is registered on the Progress stack in the offline build.
- README tab bar bullet and the "Build your program with your own AI" steps updated.
- `npx tsc --noEmit` is clean. The 12 new mocha tests pass. `npm run build:pwa` succeeded.
- Checked in the built app on 127.0.0.1:4191: the new tab bar, the Friends placeholder, the Program card, the editor opened from the card with a back arrow, the program chooser, and two back taps to the dashboard.

## Left

- Full mocha run. `npm test` stops while loading the server tests (`buffer-equal-constant-time` throws a TypeError). Not checked on master. A per-file run was started and killed before it finished.
- Check the other ways into the program screens in the built app: "Create New Program", the built-in preview, `onerms` from the program info sheet, the next-workout sheet, and no current program from the Home tab.
- Copy the screenshots into the shared notes folder. They are in `~/.claude/projects/-Users-paulbebear-Code-GitHub-beBEARlifts--claude-worktrees-jolly-einstein-83f4ed/247a12e9-406f-4b4f-8511-e455a474f5e7/tool-results/`.
- `src/navigation/AppNavigator.native.tsx` is unchanged. The offline build is web only.
- Squash the WIP commit, open the PR to `master`, and do not merge it.

## Notes

- The worktree needed `npm run build:markdown`, `build:programs` and `build:exercises` before tests could load. Their output is gitignored.
