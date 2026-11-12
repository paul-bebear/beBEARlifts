import { IFoodCapturePhoto, IFoodCaptureSource } from "../models/foodCapture";
import { ImageResize_toJpegDataUrl } from "./imageResize";

// iPhone Safari drops a file picker opened after an await, so the input is clicked in the same tap that calls this.
export function FoodMealPhoto_pick(source: IFoodCaptureSource): Promise<IFoodCapturePhoto> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";
    input.setAttribute("data-testid", source === "camera" ? "food-photo-camera-input" : "food-photo-library-input");
    if (source === "camera") {
      input.setAttribute("capture", "environment");
    }
    const finish = (photo: IFoodCapturePhoto): void => {
      input.remove();
      resolve(photo);
    };
    input.addEventListener("cancel", () => finish({ kind: "cancelled" }));
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (file == null) {
        finish({ kind: "cancelled" });
        return;
      }
      const dataUrl = await ImageResize_toJpegDataUrl(file).catch(() => undefined);
      finish(
        dataUrl == null
          ? { kind: "error", error: "The photo could not be read. Try another one." }
          : { kind: "photo", dataUrl }
      );
    });
    document.body.appendChild(input);
    input.click();
  });
}
