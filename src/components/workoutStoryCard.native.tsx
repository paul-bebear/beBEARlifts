import { IHistoryRecord, ISettings } from "../types";

interface IProps {
  record: IHistoryRecord;
  settings: ISettings;
}

// This fork ships only the web build, where the card is drawn with html-to-image.
export function WorkoutStoryCardSection(_props: IProps): null {
  return null;
}
