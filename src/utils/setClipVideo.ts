import {
  ISetClip,
  ISetClipTarget,
  SetClips_put,
  SetClips_thumbnail,
  SetClips_thumbnailWidth,
} from "../models/setClips";
import { SetClipStore } from "./setClipStore";
import { FileShare_download, FileShare_share, IFileShareNavigator } from "./fileShare";

export async function SetClipVideo_share(
  file: File,
  nav: IFileShareNavigator
): Promise<ISetClip["savedVia"] | undefined> {
  const result = await FileShare_share([file], nav);
  if (result === "refused") {
    throw new Error("The share sheet was refused");
  }
  return result === "shared" ? "share" : result === "unavailable" ? "download" : undefined;
}

function SetClipVideo_frame(file: File): Promise<Pick<ISetClip, "duration" | "thumbnail">> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let duration: number | undefined;
    const finish = (thumbnail?: string): void => {
      clearTimeout(timeout);
      video.onloadedmetadata = null;
      video.onloadeddata = null;
      video.onseeked = null;
      video.onerror = null;
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      resolve({ duration, thumbnail });
    };
    const timeout = setTimeout(() => finish(), 5000);
    const grab = (): void => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = SetClips_thumbnailWidth;
        canvas.height = Math.max(1, Math.min(320, Math.round((canvas.width * video.videoHeight) / video.videoWidth)));
        const context = canvas.getContext("2d");
        if (context == null) {
          finish();
          return;
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        let thumbnail: string | undefined;
        for (const quality of [0.7, 0.5, 0.3, 0.1]) {
          thumbnail = SetClips_thumbnail(canvas.toDataURL("image/jpeg", quality));
          if (thumbnail != null) {
            break;
          }
        }
        finish(thumbnail);
      } catch {
        finish();
      }
    };
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.onloadedmetadata = () => {
      duration = Number.isFinite(video.duration) && video.duration >= 0 ? video.duration : undefined;
    };
    video.onloadeddata = () => {
      if (duration != null && duration > 0) {
        video.currentTime = Math.min(0.1, duration / 2);
      } else {
        grab();
      }
    };
    video.onseeked = grab;
    video.onerror = () => finish();
    video.src = url;
    video.load();
  });
}

export interface ISetClipVideoEffects {
  share: (file: File) => Promise<ISetClip["savedVia"] | undefined>;
  download: (file: File) => void;
  frame: (file: File) => Promise<Pick<ISetClip, "duration" | "thumbnail">>;
  put: (clip: ISetClip) => Promise<void>;
  now: () => number;
}

const browserEffects: ISetClipVideoEffects = {
  share: (file) => SetClipVideo_share(file, navigator),
  download: FileShare_download,
  frame: SetClipVideo_frame,
  put: (clip) => SetClipStore.update((log) => SetClips_put(log, clip)),
  now: () => Date.now(),
};

export async function SetClipVideo_save(
  file: File,
  target: ISetClipTarget,
  effects: ISetClipVideoEffects = browserEffects
): Promise<void> {
  const savedVia = await effects.share(file);
  if (savedVia == null) {
    return;
  }
  if (savedVia === "download") {
    effects.download(file);
  }
  const clip: ISetClip = {
    workoutId: target.workoutId,
    exerciseId: target.exerciseId,
    setId: target.setId,
    timestamp: effects.now(),
    size: file.size,
    savedVia,
  };
  await effects.put(clip);
  const metadata = await effects.frame(file).catch(() => ({}));
  await effects.put({ ...clip, ...metadata });
}
