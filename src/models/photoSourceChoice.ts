export type IPhotoSource = "camera" | "photo-library";

export interface IPhotoSourceOption {
  source: IPhotoSource;
  label: string;
}

export type IPhotoSourceChoice =
  | { kind: "direct"; source: IPhotoSource }
  | { kind: "menu"; options: IPhotoSourceOption[] };

const menuOptions: IPhotoSourceOption[] = [
  { source: "camera", label: "Take photo" },
  { source: "photo-library", label: "Choose from library" },
];

// The browser file picker on iPhone already offers camera and library, so the web build opens it straight away.
export function PhotoSourceChoice_for(platform: string): IPhotoSourceChoice {
  return platform === "web" ? { kind: "direct", source: "photo-library" } : { kind: "menu", options: menuOptions };
}
