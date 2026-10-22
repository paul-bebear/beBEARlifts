import { lb } from "lens-shmens";
import { IThunk } from "../ducks/types";
import { Thunk_applyImport } from "../ducks/thunks";
import { IState, updateState } from "../models/state";
import {
  IOnboardingEvent,
  IOnboardingState,
  Onboarding_inviteToSave,
  Onboarding_selectedCard,
} from "../models/onboarding";
import { InviteClient_save } from "./inviteClient";
import { IOnboardingHistory, OnboardingHistory_build } from "../models/onboardingHistory";
import { ImportFromLiftosaur_convertLiftosaurCsvToHistoryRecords } from "./importFromLiftosaur";
import { IHistoryRecord, IProgram, ISettings } from "../types";
import { OnboardingAnswer_parse } from "../models/onboardingAnswer";
import { OnboardingProgram_prepare } from "../models/onboardingProgram";
import {
  OnboardingAnswers_body,
  OnboardingAnswers_foodTargets,
  OnboardingAnswers_gymEquipment,
  OnboardingAnswers_planInput,
  OnboardingAnswers_programGoal,
} from "../models/onboardingAnswers";
import { BearPlace_equipmentKeys, BearPlace_resolve } from "../models/bearPlace";
import { BearPlan_text } from "../models/bearPlan";
import { Equipment_getCurrentGym } from "../models/equipment";
import { ProgramGoal_set } from "../models/programGoal";
import { ProgramGoalStore } from "./programGoalStore";
import { BearStore } from "./bearStore";
import { AiRequest_post, AiRequest_text } from "./aiRequest";
import { AiConsent_ensure } from "./aiConsentClient";
import { UidFactory_generateUid } from "./generator";
import { FoodLogStore_update } from "./foodLogStore";
import { FoodLog_setGoals, FoodLog_setProfile } from "../models/foodLog";
import { Stats_insertByTimestamp } from "../models/stats";
import { ImageResize_toJpegDataUrl } from "./imageResize";
import { IFoodCapturePhoto } from "../models/foodCapture";
import {
  OnboardingCatalog_build,
  OnboardingCatalog_days,
  OnboardingCatalog_ids,
  OnboardingCatalog_programs,
} from "./onboardingCatalog";

// api/ai/onboard.mjs gives the model 90 s, so the phone waits a little longer before it gives up.
const onboardTimeoutMs = 100_000;

export async function OnboardingCommand_pickImage(
  pick: () => Promise<IFoodCapturePhoto>,
  emit: (event: IOnboardingEvent) => void
): Promise<void> {
  emit({ type: "resizing" });
  try {
    const photo = await pick();
    if (photo.kind === "error") {
      emit({ type: "failed", error: photo.error });
    } else {
      emit({ type: "images", images: photo.kind === "photo" ? [photo.dataUrl] : [] });
    }
  } catch (error) {
    emit({ type: "failed", error: error instanceof Error ? error.message : "The screenshot could not be read." });
  }
}

export async function OnboardingCommand_images(
  files: FileList | null,
  emit: (event: IOnboardingEvent) => void
): Promise<void> {
  if (files == null || files.length === 0) {
    return;
  }
  if (files.length > 6) {
    emit({ type: "failed", error: "Choose up to 6 screenshots." });
    return;
  }
  emit({ type: "resizing" });
  try {
    const images = await Promise.all(Array.from(files).map((f) => ImageResize_toJpegDataUrl(f, 1024)));
    emit({ type: "images", images });
  } catch (error) {
    emit({ type: "failed", error: error instanceof Error ? error.message : "The screenshot could not be read." });
  }
}

// OnboardingProgram_prepare has already rejected a CSV with unreadable rows and asked the AI to repair it.
function readHistory(
  csv: string | undefined,
  settings: ISettings,
  existing: IHistoryRecord[]
): IOnboardingHistory | undefined {
  if (!csv?.trim()) {
    return undefined;
  }
  const parsed = ImportFromLiftosaur_convertLiftosaurCsvToHistoryRecords(csv, settings);
  return OnboardingHistory_build(parsed.historyRecords, parsed.customExercises, existing);
}

export function OnboardingCommand_run(form: IOnboardingState, emit: (event: IOnboardingEvent) => void): IThunk {
  const run = form.run;
  return async (dispatch, getState, env) => {
    try {
      const state = getState();
      const settings = { ...state.storage.settings, units: form.answers.unit };
      const programs = [...(state.programs ?? []), ...OnboardingCatalog_programs()];
      const prepare = (
        answer: Parameters<typeof OnboardingProgram_prepare>[0],
        name?: string
      ): ReturnType<typeof OnboardingProgram_prepare> =>
        OnboardingProgram_prepare(answer, programs, settings, UidFactory_generateUid(8), Date.now(), name);
      if (form.command === "apply") {
        const card = Onboarding_selectedCard(form);
        let program: IProgram;
        let days: number;
        if (card != null) {
          const answer = { liftoscript: BearPlan_text(card.params), note: "", renamed: [] };
          program = prepare(answer, card.name).program;
          days = card.days;
        } else if (form.result != null) {
          program = form.result.program ?? prepare(form.result.answer).program;
          days = form.result.days;
        } else {
          return;
        }
        const now = Date.now();
        const body = OnboardingAnswers_body(form.answers, days, new Date(now).getFullYear());
        const targets = OnboardingAnswers_foodTargets(form.answers, new Date(now).getFullYear());
        await FoodLogStore_update((log) =>
          FoodLog_setProfile(targets == null ? log : FoodLog_setGoals(log, targets.goals), {
            ...log.profile,
            ...(targets?.profile ?? body.profile),
          })
        );
        await ProgramGoalStore.update((log) =>
          log.current != null
            ? log
            : ProgramGoal_set(log, OnboardingAnswers_programGoal(form.answers, now, body.weight))
        );
        const line = form.answers.bearLine;
        if (line != null) {
          await BearStore.update((bear) => ({ ...bear, line }));
        }
        const invite = Onboarding_inviteToSave(form);
        if (invite != null) {
          await InviteClient_save(invite);
        }
        const imported = form.result?.history;
        if (card == null && form.importHistory && imported != null) {
          const fresh = OnboardingHistory_build(imported.records, imported.customExercises, getState().storage.history);
          if (fresh.records.length > 0) {
            await Thunk_applyImport(fresh.records, fresh.customExercises, "liftosaurCsv")(dispatch, getState, env);
          }
        }
        const gymId = Equipment_getCurrentGym(getState().storage.settings).id;
        const equipmentKeys = BearPlace_equipmentKeys(
          BearPlace_resolve(OnboardingAnswers_planInput(form.answers).picks)
        );
        updateState(
          dispatch,
          [
            lb<IState>()
              .p("storage")
              .p("programs")
              .recordModify((p) => [...p, program]),
            lb<IState>().p("storage").p("currentProgramId").record(program.id),
            lb<IState>().p("storage").p("settings").p("units").record(form.answers.unit),
            lb<IState>()
              .p("storage")
              .p("settings")
              .p("gyms")
              .recordModify((gyms) =>
                gyms.map((g) =>
                  g.id === gymId ? { ...g, equipment: OnboardingAnswers_gymEquipment(g.equipment, equipmentKeys) } : g
                )
              ),
            ...(body.weight == null
              ? []
              : [
                  lb<IState>()
                    .p("storage")
                    .p("stats")
                    .p("weight")
                    .p("weight")
                    .recordModify((weights) =>
                      Stats_insertByTimestamp(weights, { vtype: "stat", value: body.weight!, timestamp: now })
                    ),
                ]),
          ],
          "Apply onboarding"
        );
        return;
      }
      if (!(await AiConsent_ensure())) {
        emit({ type: "fallback", run, reason: "AI is turned off in this app." });
        return;
      }
      let previousAnswer: string | undefined;
      let validationError: string | undefined;
      for (let attempt = 0; attempt < 2; attempt++) {
        const result = await AiRequest_post(
          "/api/ai/onboard",
          { answers: form.answers, images: form.images, previousAnswer, validationError },
          onboardTimeoutMs
        );
        if (!result.ok) {
          emit({ type: "fallback", run, reason: result.error });
          return;
        }
        previousAnswer = AiRequest_text(result.body);
        try {
          const answer = OnboardingAnswer_parse(previousAnswer, OnboardingCatalog_ids());
          if (answer.builtin != null && !programs.some((p) => p.id === answer.builtin)) {
            const detail = await env.service.programDetail(answer.builtin);
            programs.push(OnboardingCatalog_build(answer.builtin, detail.planner));
          }
          const prepared = prepare(answer);
          emit({
            type: "ready",
            run,
            result: {
              answer,
              program: prepared.program,
              name: prepared.program.name,
              days: answer.builtin == null ? prepared.days : (OnboardingCatalog_days(answer.builtin) ?? prepared.days),
              history: readHistory(answer.historyCsv, settings, state.storage.history),
            },
          });
          return;
        } catch (error) {
          validationError = error instanceof Error ? error.message : "The answer could not be read.";
        }
      }
      throw new Error(`${validationError} Pick a beBEAR plan, or change the details and try again.`);
    } catch (error) {
      emit({ type: "failed", run, error: error instanceof Error ? error.message : "Setup failed. Try again." });
    }
  };
}
