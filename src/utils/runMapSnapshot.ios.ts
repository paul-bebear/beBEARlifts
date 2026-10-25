import NativeLiftosaurMapSnapshot from "../specs/NativeLiftosaurMapSnapshot";
import { ILatLon, IRouteMap, RunRoute_flatten, RunRoute_mapDrawing } from "../models/runRoute";

// Without network MapKit has no tiles and rejects, so the card keeps the route on plain green.
export async function RunMapSnapshot_render(
  route: ILatLon[][],
  width: number,
  height: number,
  padding: number
): Promise<IRouteMap | undefined> {
  const flat = RunRoute_flatten(route);
  if (NativeLiftosaurMapSnapshot == null || flat.lats.length === 0) {
    return undefined;
  }
  try {
    const result = await NativeLiftosaurMapSnapshot.render({
      lats: flat.lats,
      lons: flat.lons,
      width,
      height,
      padding,
    });
    const drawing = RunRoute_mapDrawing(flat, result.xs, result.ys);
    return drawing != null ? { uri: result.uri, drawing } : undefined;
  } catch {
    return undefined;
  }
}
