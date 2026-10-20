import { useEffect } from "react";
import { IDispatch } from "../ducks/types";
import { Thunk_cloudBackup } from "../ducks/thunks";

export function CloudBackupAfterWorkout(props: { dispatch: IDispatch }): null {
  useEffect(() => {
    props.dispatch(Thunk_cloudBackup(false));
  }, []);
  return null;
}
