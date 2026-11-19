export interface IWebFilePickOptions {
  capture?: "environment" | "user";
  testId?: string;
}

// iPhone Safari drops a file picker opened after an await, so call this in the same tap, and keep the input in the page until it answers.
export function WebFilePick_image(options: IWebFilePickOptions): Promise<File | undefined> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";
    if (options.testId != null) {
      input.setAttribute("data-testid", options.testId);
    }
    if (options.capture != null) {
      input.setAttribute("capture", options.capture);
    }
    const finish = (file: File | undefined): void => {
      input.remove();
      resolve(file);
    };
    input.addEventListener("cancel", () => finish(undefined));
    input.addEventListener("change", () => finish(input.files?.[0]));
    document.body.appendChild(input);
    input.click();
  });
}
