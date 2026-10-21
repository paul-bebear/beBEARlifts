import { lb } from "lens-shmens";
import { IThunk } from "../ducks/types";
import { Thunk_importCsvData } from "../ducks/thunks";
import { IState, updateState } from "../models/state";
import { IOnboardingEvent, IOnboardingState } from "../models/onboarding";
import { OnboardingAnswer_parse } from "../models/onboardingAnswer";
import { OnboardingPicker_pick } from "../models/onboardingPicker";
import { OnboardingProgram_prepare } from "../models/onboardingProgram";
import { OnboardingAnswers_body } from "../models/onboardingAnswers";
import { AiRequest_post, AiRequest_text } from "./aiRequest";
import { AiConsent_ensure } from "./aiConsentClient";
import { UidFactory_generateUid } from "./generator";
import { FoodLogStore_update } from "./foodLogStore";
import { FoodLog_setProfile } from "../models/foodLog";
import { Stats_insertByTimestamp } from "../models/stats";
import { ImageResize_toJpegDataUrl } from "./imageResize";
import {
  OnboardingCatalog_build,
  OnboardingCatalog_days,
  OnboardingCatalog_ids,
  OnboardingCatalog_programs,
} from "./onboardingCatalog";

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

export function OnboardingCommand_run(form: IOnboardingState, emit: (event: IOnboardingEvent) => void): IThunk {
  return async (dispatch, getState, env) => {
    try {
      const state = getState();
      const settings = { ...state.storage.settings, units: form.answers.unit };
      const programs = [...(state.programs ?? []), ...OnboardingCatalog_programs()];
      const prepare = (
        answer: Parameters<typeof OnboardingProgram_prepare>[0]
      ): ReturnType<typeof OnboardingProgram_prepare> =>
        OnboardingProgram_prepare(answer, programs, settings, UidFactory_generateUid(8), Date.now());
      const fallback = (reason?: string): void => {
        const picked = OnboardingPicker_pick(form.answers);
        if (reason != null) {
          picked.note = `${reason} ${picked.note}`;
        }
        if (form.images.length > 0 || form.answers.plan.trim() !== "") {
          picked.note += " Screenshots and custom plan details need AI. This built-in plan does not import them.";
        }
        const answer = OnboardingAnswer_parse(picked, OnboardingCatalog_ids());
        const prepared = prepare(answer);
        emit({
          type: "ready",
          result: {
            answer,
            program: prepared.program,
            name: prepared.program.name,
            days: OnboardingCatalog_days(answer.builtin!) ?? prepared.days,
          },
        });
      };
      if (form.command === "apply" && form.result != null) {
        const program = form.result.program ?? prepare(form.result.answer).program;
        const body = OnboardingAnswers_body(form.answers, new Date().getFullYear());
        await FoodLogStore_update((log) => FoodLog_setProfile(log, { ...log.profile, ...body.profile }));
        if (form.result.answer.historyCsv?.trim()) {
          await Thunk_importCsvData(form.result.answer.historyCsv, "apply")(dispatch, getState, env);
        }
        updateState(
          dispatch,
          [
            lb<IState>()
              .p("storage")
              .p("programs")
              .recordModify((p) => [...p, program]),
            lb<IState>().p("storage").p("currentProgramId").record(program.id),
            lb<IState>().p("storage").p("settings").p("units").record(form.answers.unit),
            ...(body.weight == null
              ? []
              : [
                  lb<IState>()
                    .p("storage")
                    .p("stats")
                    .p("weight")
                    .p("weight")
                    .recordModify((weights) =>
                      Stats_insertByTimestamp(weights, { vtype: "stat", value: body.weight!, timestamp: Date.now() })
                    ),
                ]),
          ],
          "Apply onboarding"
        );
        return;
      }
      if (form.command === "fallback" || !(await AiConsent_ensure())) {
        fallback();
        return;
      }
      let previousAnswer: string | undefined;
      let validationError: string | undefined;
      for (let attempt = 0; attempt < 2; attempt++) {
        const result = await AiRequest_post("/api/ai/onboard", {
          answers: form.answers,
          images: form.images,
          previousAnswer,
          validationError,
        });
        if (!result.ok) {
          fallback(result.error);
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
            result: {
              answer,
              program: prepared.program,
              name: prepared.program.name,
              days: answer.builtin == null ? prepared.days : (OnboardingCatalog_days(answer.builtin) ?? prepared.days),
            },
          });
          return;
        } catch (error) {
          validationError = error instanceof Error ? error.message : "The answer could not be read.";
        }
      }
      throw new Error(`${validationError} Use a built-in plan or edit your answers and try again.`);
    } catch (error) {
      emit({ type: "failed", error: error instanceof Error ? error.message : "Setup failed. Try again." });
    }
  };
}
