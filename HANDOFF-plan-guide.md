# Handoff: built-in program guide

Branch `handoff-plan-guide`. Read `AGENTS.md` first and follow its rules: the prose rules, no hard wrap, no AI attribution lines in commits. Do no simulator or browser testing. Open a PR against `master` when done.

## Goal

The user and future testers need one page that says which of the 60 built-in programs to recommend to whom. Today the only list is inside `llms/program_builder_prompt.md`, written for an AI.

## What to build

1. **`llms/programs_guide.md`**, for humans.
   - **Start:** a short "how to pick" path. The order of questions is experience, then days per week, then minutes per session, then goal, then equipment. Each answer narrows the list to 1 to 3 programs, named exactly.
   - **Then one entry per program**, grouped by level (new lifter, 3 to 12 months, over a year). Each entry has:
     - name, days per week, minutes, goal and equipment, all taken from the program's frontmatter
     - one line on who it suits
     - one line on who should not pick it
     - the main lifts
   - **Sources:** the frontmatter of every file in `programs/builtin/*.md` (`name`, `frequency`, `duration`, `goal`, `age`, `shortDescription`, `tags`) and the program text below it.
   - Never invent facts. If the frontmatter or text does not say something, leave it out.
2. **A test**, `test/programsGuide.test.ts`, in the style of `test/programBuilderPrompt.test.ts`. It checks that every `name` in `programs/builtin` appears in the guide as a heading, and that no heading names a program that does not exist.
3. **A README line** in the "Build your program with your own AI" section, pointing to the guide.

## Done means

The new test passes with `TS_NODE_TRANSPILE_ONLY=1 npx mocha -r ts-node/register test/programsGuide.test.ts`, and the PR is open.
