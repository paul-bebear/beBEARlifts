import * as htmlToImage from "html-to-image";

export async function RunStoryImage_render(element: HTMLElement): Promise<string> {
  const options = { pixelRatio: 3, width: 360, height: 640 };
  await htmlToImage.toPng(element, options);
  await htmlToImage.toPng(element, options);
  return htmlToImage.toPng(element, options);
}
