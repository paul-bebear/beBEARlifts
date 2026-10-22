import { useCallback, useEffect, useRef, useState } from "react";
import {
  IShareExportEffect,
  IShareExportEvent,
  IShareExportJob,
  ShareCardExport_buttonTitle,
  ShareCardExport_idle,
  ShareCardExport_isBusy,
  ShareCardExport_needsSurface,
  ShareCardExport_next,
} from "../../models/shareCardExport";
import { ShareCardImage_capture, ShareCardImage_cleanup, ShareCardImage_share } from "../../utils/shareCardImage";
import { Dialog_alert } from "../../utils/dialog";

export interface IShareCardExport<T> {
  job: IShareExportJob<T>;
  isBusy: boolean;
  needsSurface: boolean;
  title: (idleTitle: string) => string;
  prepare: (pages: string[], frozen: T, images?: string[]) => void;
  share: (pages: string[], frozen: T, images?: string[]) => void;
  setRef: (page: string, view: unknown) => void;
  onLayout: (page: string) => void;
  onImageLoad: (uri: string) => void;
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export function useShareCardExport<T>(baseName: string): IShareCardExport<T> {
  const [job, setJob] = useState<IShareExportJob<T>>(ShareCardExport_idle<T>());
  const jobRef = useRef(job);
  const views = useRef(new Map<string, unknown>());

  const dispatch = useCallback(
    (event: IShareExportEvent<T>): void => {
      const step = ShareCardExport_next(jobRef.current, event);
      jobRef.current = step.job;
      setJob(step.job);
      step.effects.forEach((effect) => run(effect));
    },
    [baseName]
  );

  const run = (effect: IShareExportEffect): void => {
    switch (effect.kind) {
      case "capture": {
        const jobId = effect.jobId;
        nextFrame()
          .then(() => ShareCardImage_capture(views.current.get(effect.page)))
          .then((file) => dispatch({ type: "captured", jobId, file }))
          .catch(() => dispatch({ type: "failed", jobId, message: "Couldn't make the image. Try again." }));
        return;
      }
      case "share": {
        const jobId = effect.jobId;
        ShareCardImage_share(effect.files, baseName)
          .then((result) => dispatch(result === "refused" ? { type: "refused", jobId } : { type: "shared", jobId }))
          .catch(() => dispatch({ type: "failed", jobId, message: "Couldn't share the image. Try again." }));
        return;
      }
      case "cleanup":
        ShareCardImage_cleanup(effect.files).catch(() => undefined);
        return;
      case "alert":
        Dialog_alert(effect.message);
        return;
    }
  };

  useEffect(() => {
    return () => {
      ShareCardImage_cleanup(jobRef.current.files).catch(() => undefined);
    };
  }, []);

  return {
    job,
    isBusy: ShareCardExport_isBusy(job),
    needsSurface: ShareCardExport_needsSurface(job),
    title: (idleTitle) => ShareCardExport_buttonTitle(job, idleTitle),
    prepare: (pages, frozen, images) => dispatch({ type: "start", pages, frozen, images }),
    share: (pages, frozen, images) => {
      const phase = jobRef.current.phase;
      if (phase === "prepared") {
        dispatch({ type: "share", pages });
      } else if (phase === "ready" || phase === "failed") {
        dispatch({ type: "retry" });
      } else {
        dispatch({ type: "start", pages, frozen, images, share: pages });
      }
    },
    setRef: (page, view) => {
      views.current.set(page, view);
    },
    onLayout: (page) => dispatch({ type: "layout", page }),
    onImageLoad: (uri) => dispatch({ type: "imageLoaded", uri }),
  };
}
