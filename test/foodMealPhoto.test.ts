import "mocha";
import { expect } from "chai";
import { FoodMealPhoto_pick } from "../src/utils/foodMealPhoto";

type IListener = () => void;
interface IFakeInput {
  attrs: Record<string, string>;
  files?: unknown[];
  listeners: Record<string, IListener>;
  setAttribute(name: string, value: string): void;
  addEventListener(name: string, fn: IListener): void;
  remove(): void;
  click(): void;
  style: Record<string, string>;
}

const holder = globalThis as unknown as Record<string, unknown>;

function installDom(onClick: (input: IFakeInput) => void): IFakeInput[] {
  const inputs: IFakeInput[] = [];
  holder.document = {
    body: { appendChild: () => undefined },
    createElement: () => {
      const input: IFakeInput = {
        attrs: {},
        listeners: {},
        style: {},
        setAttribute: (name, value) => {
          input.attrs[name] = value;
        },
        addEventListener: (name, fn) => {
          input.listeners[name] = fn;
        },
        remove: () => undefined,
        click: () => onClick(input),
      };
      inputs.push(input);
      return input;
    },
  };
  return inputs;
}

describe("FoodMealPhoto_pick on the web", () => {
  afterEach(() => {
    delete holder.document;
  });
  it("opens the camera input with the back camera and a camera test id", async () => {
    const inputs = installDom((input) => input.listeners.cancel());
    expect(await FoodMealPhoto_pick("camera")).to.deep.equal({ kind: "cancelled" });
    expect(inputs[0].attrs.capture).to.equal("environment");
    expect(inputs[0].attrs["data-testid"]).to.equal("food-photo-camera-input");
  });
  it("opens the library input without capture", async () => {
    const inputs = installDom((input) => input.listeners.cancel());
    await FoodMealPhoto_pick("photo-library");
    expect(inputs[0].attrs.capture).to.equal(undefined);
    expect(inputs[0].attrs["data-testid"]).to.equal("food-photo-library-input");
  });
  it("is cancelled when the change event carries no file", async () => {
    installDom((input) => input.listeners.change());
    expect(await FoodMealPhoto_pick("photo-library")).to.deep.equal({ kind: "cancelled" });
  });
  it("answers with an error when the picked file cannot be read as an image", async () => {
    installDom((input) => {
      input.files = [{ name: "meal.jpg" }];
      input.listeners.change();
    });
    const result = await FoodMealPhoto_pick("photo-library");
    expect(result).to.deep.equal({ kind: "error", error: "The photo could not be read. Try another one." });
  });
});
