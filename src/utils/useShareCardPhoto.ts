import { useCallback, useState } from "react";
import { IPhotoSource } from "../models/photoSourceChoice";
import { Dialog_alert } from "./dialog";
import { ProgressPhotoPick_pick } from "./progressPhotoPick";

export interface IShareCardPhoto {
  photo: string | undefined;
  pickPhoto: (source: IPhotoSource) => Promise<void>;
}

export function useShareCardPhoto(failureMessage: string): IShareCardPhoto {
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const pickPhoto = useCallback(
    async (source: IPhotoSource): Promise<void> => {
      try {
        setPhoto(await ProgressPhotoPick_pick(source));
      } catch {
        Dialog_alert(failureMessage);
      }
    },
    [failureMessage]
  );
  return { photo, pickPhoto };
}
