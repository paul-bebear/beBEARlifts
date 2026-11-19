# Phase 1 findings

Status: phase 1 of 5 done. These files are the input for phase 2, which merges them into `REVIEW-2026-11.md`.

Written 2026-11-18 against `master` at d5df8641. Read-only: no app code changed.

## How this was made

- `docs/cleanup/manifest.txt` lists the 650 code files we added or edited since the fork point `a7a402c2`. That is 465 added files and 185 edited files of Anton's. `scripts/cleanup-manifest-check.ts` fails if a file is missing or listed twice.
- 21 readers ran at the same time. 19 read one slice each. Two read across all slices: security and duplicates.
- Opus read money, accounts, backup, security and duplicates. Sonnet read the rest.
- An Opus checker that did not write the findings tried to disprove every high and medium finding. It kept all 38. It moved some to "suspect" and lowered some severities.
- Every manifest file was opened by its reader. No file was left unread.
- Inputs: `knip` found 7 unused files and 190 unused exports in our files. `jscpd --min-tokens 30` found 162 copied blocks. Both reports are summarised in `deadweight.md` and `duplicates.md`.

## Counts

269 findings: 2 high, 36 medium, 231 low.

```
slice                   high  medium  low
money                      0       3    7
accounts                   1       3   11
backup                     0       2   10
food-add                   0       4   17
food-diary                 0       3   11
bear                       0       2   12
journal                    0       0   12
progress                   0       0   12
workout                    0       3   11
share                      0       1   18
onboarding                 0       2   11
friends                    0       3    8
iphone                     0       0    9
shell                      0       0   11
deadweight                 0       0   10
edits-app                  0       1    8
edits-components-a-n       0       0    7
edits-components-o-z       0       1   15
edits-logic                0       3    5
security                   1       3    6
duplicates                 0       2   20
```

Some findings appear twice because two readers reached the same code. Phase 2 merges them.

- `accounts.md` A1 and `security.md` S1 are the same delete-account gap.
- `accounts.md` A4 and `food-add.md` F1 are the same open food routes.
- `accounts.md` A2 and `security.md` S4 both say the privacy texts promise more than the code does.

## The ten findings that harm a user most

1. **Deleting an account leaves the progress photos on our server.** The delete step skips the photos folder. Supabase may then refuse to delete the user at all, so the user sees "Could not delete the account" every time. No progress photo is in live storage today, so nobody is affected yet. See A1 and S1.
2. **Importing the wrong file can erase the whole food log.** The food log import takes any JSON file. One confirm tap can then replace all food, meals, recipes and targets. See G1.
3. **The workout export says "backed up" but leaves out food, notes, runs and the bear.** A user who trusts it loses those after a lost phone. See L3.
4. **One damaged store stops every automatic backup, with no message.** Backups then stop for good. A lost phone loses everything since that day. See B1.
5. **A subscriber who deletes the account is not told the subscription keeps billing.** This happens when the user also redeemed a code. See M1.
6. **Someone who just paid may see beBEAR+ stay locked until a cold start of the app.** Suspect: it depends on when RevenueCat answers. See M2.
7. **The privacy policy and the AI consent text promise that photos stay on the phone or are not kept.** Photos and body numbers now go to the cloud backup and to the AI provider. Many users are teenagers. See S4 and A2.
8. **A meal shared with friends can never be taken back.** The friend keeps seeing the photo. See N1.
9. **A slow AI answer can attach to a different meal photo.** The meal is then logged with numbers from another plate. See F4.
10. **A failed or cut-off AI answer still uses up one of the 3 lifetime AI setups.** The user cannot get it back. See O1.

## Files

- One file per slice in this folder, named after the slice in `docs/cleanup/manifest.txt`.
- Each file lists its findings by severity, the state of the 26 October findings for that slice, what was checked with no finding, and anything the checker dropped.

## Next action

Open `security.md` and read S1 to S4. They are the first fixes for phase 3.
