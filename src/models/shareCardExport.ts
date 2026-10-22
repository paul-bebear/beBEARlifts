export type IShareExportPhase = "idle" | "preparing" | "capturing" | "prepared" | "sharing" | "ready" | "failed";

export interface IShareExportJob<T> {
  id: number;
  phase: IShareExportPhase;
  pages: string[];
  autoShare: boolean;
  selection: string[];
  frozen?: T;
  images: string[];
  laidOut: string[];
  loaded: string[];
  index: number;
  files: string[];
  error?: string;
}

export type IShareExportEvent<T> =
  | { type: "start"; pages: string[]; frozen: T; images?: string[]; share?: string[] }
  | { type: "layout"; page: string }
  | { type: "imageLoaded"; uri: string }
  | { type: "captured"; jobId: number; file: string }
  | { type: "share"; pages: string[] }
  | { type: "shared"; jobId: number }
  | { type: "refused"; jobId: number }
  | { type: "retry" }
  | { type: "failed"; jobId: number; message: string };

export type IShareExportEffect =
  | { kind: "capture"; page: string; jobId: number }
  | { kind: "share"; files: string[]; jobId: number }
  | { kind: "cleanup"; files: string[] }
  | { kind: "alert"; message: string };

interface IStep<T> {
  job: IShareExportJob<T>;
  effects: IShareExportEffect[];
}

export function ShareCardExport_idle<T>(id: number = 0): IShareExportJob<T> {
  return {
    id,
    phase: "idle",
    pages: [],
    autoShare: false,
    selection: [],
    images: [],
    laidOut: [],
    loaded: [],
    index: 0,
    files: [],
  };
}

const retryMessage = "Could not make the card image. Tap Retry image.";

function isReady<T>(job: IShareExportJob<T>): boolean {
  return job.pages.every((p) => job.laidOut.includes(p)) && job.images.every((uri) => job.loaded.includes(uri));
}

function startCapturing<T>(job: IShareExportJob<T>): IStep<T> {
  if (job.phase !== "preparing" || !isReady(job)) {
    return { job, effects: [] };
  }
  return {
    job: { ...job, phase: "capturing", index: 0 },
    effects: [{ kind: "capture", page: job.pages[0], jobId: job.id }],
  };
}

function cleanupEffects(files: string[]): IShareExportEffect[] {
  return files.length > 0 ? [{ kind: "cleanup", files }] : [];
}

function selectedFiles<T>(job: IShareExportJob<T>): string[] {
  return job.selection.map((page) => job.files[job.pages.indexOf(page)]).filter((file) => file != null);
}

function finish<T>(job: IShareExportJob<T>, extra: IShareExportEffect[] = []): IStep<T> {
  return { job: ShareCardExport_idle<T>(job.id), effects: [...extra, ...cleanupEffects(job.files)] };
}

function begin<T>(job: IShareExportJob<T>, event: IShareExportEvent<T> & { type: "start" }): IShareExportJob<T> {
  return {
    ...ShareCardExport_idle<T>(job.id + 1),
    phase: "preparing",
    pages: event.pages,
    autoShare: event.share != null,
    selection: event.share ?? [],
    frozen: event.frozen,
    images: event.images ?? [],
  };
}

function fail<T>(job: IShareExportJob<T>, message: string): IStep<T> {
  if (job.phase === "idle") {
    return { job, effects: [] };
  }
  if (job.autoShare) {
    return finish(job, [{ kind: "alert", message }]);
  }
  if (job.phase === "sharing") {
    return { job: { ...job, phase: "prepared", selection: [] }, effects: [{ kind: "alert", message }] };
  }
  return { job: { ...job, phase: "failed", files: [], error: retryMessage }, effects: cleanupEffects(job.files) };
}

export function ShareCardExport_next<T>(job: IShareExportJob<T>, event: IShareExportEvent<T>): IStep<T> {
  switch (event.type) {
    case "start": {
      if (event.pages.length === 0) {
        return { job, effects: [] };
      }
      const prepareOnly = event.share == null;
      if (ShareCardExport_isBusy(job) && !prepareOnly) {
        return { job, effects: [] };
      }
      return { job: begin(job, event), effects: cleanupEffects(job.files) };
    }
    case "layout": {
      if (job.phase !== "preparing" || job.laidOut.includes(event.page)) {
        return { job, effects: [] };
      }
      return startCapturing({ ...job, laidOut: [...job.laidOut, event.page] });
    }
    case "imageLoaded": {
      if (job.phase !== "preparing" || !job.images.includes(event.uri) || job.loaded.includes(event.uri)) {
        return { job, effects: [] };
      }
      return startCapturing({ ...job, loaded: [...job.loaded, event.uri] });
    }
    case "captured": {
      if (event.jobId !== job.id || job.phase !== "capturing") {
        return { job, effects: [{ kind: "cleanup", files: [event.file] }] };
      }
      const files = [...job.files, event.file];
      const index = job.index + 1;
      if (index < job.pages.length) {
        return {
          job: { ...job, files, index },
          effects: [{ kind: "capture", page: job.pages[index], jobId: job.id }],
        };
      }
      if (!job.autoShare) {
        return { job: { ...job, files, index, phase: "prepared" }, effects: [] };
      }
      const done = { ...job, files, index, phase: "sharing" as const };
      return { job: done, effects: [{ kind: "share", files: selectedFiles(done), jobId: job.id }] };
    }
    case "share": {
      const pages = event.pages.filter((page) => job.pages.includes(page));
      if (job.phase !== "prepared" || pages.length === 0) {
        return { job, effects: [] };
      }
      const next = { ...job, phase: "sharing" as const, selection: pages };
      return { job: next, effects: [{ kind: "share", files: selectedFiles(next), jobId: job.id }] };
    }
    case "shared": {
      if (event.jobId !== job.id || job.phase !== "sharing") {
        return { job, effects: [] };
      }
      return job.autoShare ? finish(job) : { job: { ...job, phase: "prepared", selection: [] }, effects: [] };
    }
    case "refused":
      return event.jobId === job.id && job.phase === "sharing"
        ? { job: { ...job, phase: "ready" }, effects: [] }
        : { job, effects: [] };
    case "retry": {
      if (job.phase === "ready") {
        return {
          job: { ...job, phase: "sharing" },
          effects: [{ kind: "share", files: selectedFiles(job), jobId: job.id }],
        };
      }
      if (job.phase === "failed" && job.frozen != null) {
        const restart: IShareExportEvent<T> = {
          type: "start",
          pages: job.pages,
          frozen: job.frozen,
          images: job.images,
        };
        return { job: begin(job, restart), effects: [] };
      }
      return { job, effects: [] };
    }
    case "failed":
      return event.jobId === job.id ? fail(job, event.message) : { job, effects: [] };
  }
}

export function ShareCardExport_isBusy<T>(job: IShareExportJob<T>): boolean {
  return job.phase === "preparing" || job.phase === "capturing" || job.phase === "sharing";
}

export function ShareCardExport_needsSurface<T>(job: IShareExportJob<T>): boolean {
  return job.phase === "preparing" || job.phase === "capturing";
}

export function ShareCardExport_buttonTitle<T>(job: IShareExportJob<T>, idleTitle: string): string {
  if (job.phase === "failed") {
    return "Retry image";
  }
  if (job.phase === "ready") {
    return job.selection.length === 1 ? "Share image" : `Share ${job.selection.length} images`;
  }
  return ShareCardExport_isBusy(job) ? "Making images…" : idleTitle;
}
