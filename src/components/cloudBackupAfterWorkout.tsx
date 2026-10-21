import { useEffect } from "react";
import { IDispatch } from "../ducks/types";
import { Thunk_cloudBackup } from "../ducks/cloudBackupThunks";

export function CloudBackupAfterWorkout(props: { dispatch: IDispatch }): null {
  useEffect(() => {
    props.dispatch(Thunk_cloudBackup("auto"));
  }, []);
  return null;
}
