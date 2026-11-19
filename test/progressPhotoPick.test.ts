import "mocha";
import { expect } from "chai";
import { ProgressPhotoPick_pick } from "../src/utils/progressPhotoPick";
import { ProgressPhotos_maxSide } from "../src/models/progressPhotos";

const holder = globalThis as unknown as Record<string, unknown>;
type IListener = () => void;

interface IFakeCanvas {
  width: number;
  height: number;
  drawn?: [number, number];
  getContext(): { drawImage(_image: unknown, _x: number, _y: number, w: number, h: number): void };
  toDataURL(type: string, quality: number): string;
}

function installDom(
  pick: (input: { attrs: Record<string, string>; files?: unknown[]; fire: Record<string, IListener> }) => void
): { inputs: Array<{ attrs: Record<string, string> }>; canvases: IFakeCanvas[] } {
  const created = { inputs: [] as Array<{ attrs: Record<string, string> }>, canvases: [] as IFakeCanvas[] };
  holder.document = {
    body: { appendChild: () => undefined },
    createElement: (tag: string) => {
      if (tag === "canvas") {
        const canvas: IFakeCanvas = {
          width: 0,
          height: 0,
          getContext: () => ({
            drawImage: (_image, _x, _y, w, h) => {
              canvas.drawn = [w, h];
            },
          }),
          toDataURL: (type, quality) => `data:${type};q=${quality};${canvas.width}x${canvas.height}`,
        };
        created.canvases.push(canvas);
        return canvas;
      }
      const input = {
        attrs: {} as Record<string, string>,
        files: undefined as unknown[] | undefined,
        fire: {} as Record<string, IListener>,
        style: {},
      };
      created.inputs.push(input);
      return Object.assign(input, {
        setAttribute: (name: string, value: string) => {
          input.attrs[name] = value;
        },
        addEventListener: (name: string, fn: IListener) => {
          input.fire[name] = fn;
        },
        remove: () => undefined,
        click: () => pick(input),
      });
    },
  };
  return created;
}

describe("ProgressPhotoPick_pick on the web", () => {
  afterEach(() => {
    delete holder.document;
    delete holder.Image;
  });
  it("opens the front camera for source camera and no capture for the library", async () => {
    const created = installDom((input) => input.fire.cancel());
    await ProgressPhotoPick_pick("camera");
    await ProgressPhotoPick_pick("photo-library");
    expect(created.inputs[0].attrs.capture).to.equal("user");
    expect(created.inputs[1].attrs.capture).to.equal(undefined);
  });
  it("returns undefined when the user cancels", async () => {
    installDom((input) => input.fire.cancel());
    expect(await ProgressPhotoPick_pick("photo-library")).to.equal(undefined);
  });
  it("scales a large photo down to the progress photo side and returns a JPEG data URL", async () => {
    const created = installDom((input) => {
      input.files = [new Blob(["x"], { type: "image/jpeg" })];
      input.fire.change();
    });
    holder.Image = class {
      public naturalWidth = 2160;
      public naturalHeight = 1080;
      public onload?: () => void;
      public set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    };
    const url = await ProgressPhotoPick_pick("photo-library");
    expect(ProgressPhotos_maxSide).to.equal(1080);
    expect(created.canvases[0].drawn).to.deep.equal([1080, 540]);
    expect(url).to.equal("data:image/jpeg;q=0.8;1080x540");
  });
});
