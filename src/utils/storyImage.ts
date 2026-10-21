import * as htmlToImage from "html-to-image";
import { RefObject, useEffect, useState } from "react";

export async function StoryImage_render(
  element: HTMLElement,
  size: { width: number; height: number }
): Promise<string> {
  const options = { pixelRatio: 3, ...size };
  // html-to-image inlines images and fonts on the first pass; Safari can omit them without a warm-up render.
  await htmlToImage.toPng(element, options);
  return htmlToImage.toPng(element, options);
}

interface IStoryImage {
  source: object;
  attempt: number;
  width: number;
  height: number;
  dataUrl?: string;
  error?: string;
}

export function useStoryImage(
  ref: RefObject<unknown>,
  source: object,
  size: { width: number; height: number }
): { dataUrl?: string; error?: string; retry: () => void } {
  const [image, setImage] = useState<IStoryImage>();
  const [attempt, setAttempt] = useState(0);
  const { width, height } = size;
  useEffect(() => {
    let active = true;
    if (ref.current != null) {
      StoryImage_render(ref.current as HTMLElement, { width, height }).then(
        (dataUrl) => {
          if (active) {
            setImage({ source, attempt, width, height, dataUrl });
          }
        },
        () => {
          if (active) {
            setImage({
              source,
              attempt,
              width,
              height,
              error: "Could not make the story card image. Tap Retry image.",
            });
          }
        }
      );
    }
    return () => {
      active = false;
    };
  }, [ref, source, attempt, width, height]);
  const current =
    image?.source === source && image.attempt === attempt && image.width === width && image.height === height
      ? image
      : undefined;
  return { dataUrl: current?.dataUrl, error: current?.error, retry: () => setAttempt((value) => value + 1) };
}
