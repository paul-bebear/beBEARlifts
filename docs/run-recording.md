# GPS run recording

More → Runs records a run with GPS. The web app and the iPhone app share the screen, the recording model and the run storage. Each platform has its own sensor file.

## Owner setup

- Run `npm run pod-install` after pulling. React Native codegen generates the `LiftosaurLocation` bindings during pod installation.
- Rebuild the iPhone app. An over-the-air JS bundle alone does not add the native module.
- In App Store Connect review notes, write: "Records GPS runs while the phone is locked, started by the user from Runs." `UIBackgroundModes` now includes `location`, and App Review asks about it.

## Flow

```text
More → Runs row, shown when RunSensors_isAvailable()
  ScreenRuns.start()
    RunSensors_requestPermission()
      iOS: CLLocationManager.requestWhenInUseAuthorization
      web: "granted"; the browser asks on the first watchPosition
    RunRecording_permissionText(permission, RunSensors_platform)
      text → Dialog_alert, no run starts
      undefined → RunRecording_start → RunDraftStore → RunRecorder
  RunRecorder while status is "recording"
    RunSensors_watch → RunRecording_addPoint(recording, point, gapRule)
    save the draft when RunRecording_isSaveDue, on a fix and on the 1s tick
```

Metro picks the sensor file by suffix:

- `src/utils/runSensors.ts` is the web build. It wraps `navigator.geolocation` and the screen wake lock.
- `src/utils/runSensors.ios.ts` is the iPhone app. It wraps the `LiftosaurLocation` native module.
- `src/utils/runSensors.native.ts` is Android. It reports no GPS, so Android hides the Runs row.

## Native module

`src/specs/NativeLiftosaurLocation.ts` is the codegen spec. `ios/Liftosaur/RCTLiftosaurLocation.mm` forwards calls to `ios/Liftosaur/LiftosaurLocationImpl.swift`, which owns one `CLLocationManager`.

The manager settings:

- `activityType = .fitness` tunes filtering for walking and running.
- `desiredAccuracy = kCLLocationAccuracyBest` and `distanceFilter = kCLDistanceFilterNone` deliver every fix, about one per second.
- `pausesLocationUpdatesAutomatically = false`. With the default `true`, iOS stops updates at a red light and does not restart them while the app is in the background.
- `allowsBackgroundLocationUpdates = true` during a run. With the `location` background mode in `ios/Liftosaur/Info.plist`, fixes keep arriving while the phone is locked. iOS shows a blue location pill in the status bar.

The manager is created on the main thread. CoreLocation delivers delegate calls on the run loop of the thread that created it, and the TurboModule queue has no run loop.

The delegate is a private `LocationDelegateProxy`. If the public `@objc` class conformed to `CLLocationManagerDelegate`, the generated `Liftosaur-Swift.h` would name that protocol. The `.mm` files that import the header do not import CoreLocation, so the build fails with "no type or protocol named 'CLLocationManagerDelegate'".

Error codes match the web `GeolocationPositionError` codes, so `RunRecording_gpsErrorText` reads both platforms:

- 1 means location is denied.
- 2 means no fix. Every CoreLocation error except `.denied` maps here.
- 3 means a timeout. Only the web sends it.
- 4 means Precise Location was turned off during a run. Only iOS sends it.

`requestPermission` answers "granted", "denied" or "approximate". With approximate location, fixes are often 1 km wide or worse. `RunTrack_judge` drops every fix wider than 25 m, so the run would record nothing. The start is blocked with the Precise Location text instead.

If Precise Location goes off during a run, the error stays on screen. `RunRecording_clearsGpsError` lets only a fix within 25 m clear it, so approximate fixes arriving once per second do not hide it.

"Allow Once" resets to `.notDetermined` once the app stops using location, for example while a run is paused. `startUpdates` asks for permission again in that state, so Resume shows the iOS prompt. Without that, Resume would start updates that never arrive and show no error.

The module is looked up with `TurboModuleRegistry.get`. An over-the-air JS bundle from `src/utils/ota.native.ts` can reach a binary built before this module existed. There the lookup returns null, `RunSensors_isAvailable()` returns false, and the Runs row stays hidden.

## Gap rule

`RunRecording_gapRule` returns "pause" for the web and "split" for iOS.

On the web, locking the phone stops GPS. A fix older than 15 seconds means the runner locked the screen. `RunRecording_pauseStale` pauses the run at the last fix, and the runner taps Resume.

On iOS, fixes keep arriving while the phone is locked. A 15-second gap means lost signal, such as a tunnel. `RunRecording_splitStale` closes the segment at the last fix and opens an empty one. The gap counts as neither distance nor moving time, and the run keeps recording.

```text
RunRecording_onTick(recording, now, "split")      the 1s tick
  stale for 15 s → close the segment at the last fix, open an empty segment at now
  still stale 15 s later → replace the empty segment with a new one at now
RunRecording_onFix(recording, point, "split", now)
  first fix in an empty segment → the segment start moves to point.t
RunRecording_stats(recording, now, "split")       the numbers on screen
  RunTrack_stats(segments, min(now, last fix time))
```

The tick does the split because three paths close the open segment at the current time: the Pause button, the unmount cleanup and `RunRecording_restore`. With the split left to the next fix, a 4-minute underpass followed by Pause would add 4 minutes of moving time and 0 m. Now an open gap holds at most 15 seconds before the tick closes it.

The screen stops the clock at the last fix. Without that, moving time counts on through a tunnel and drops back by the whole gap when the next fix splits it. With fixes about once per second, the clock still updates once per second.

A fix whose timestamp is earlier than the empty segment's start is dropped by the guard in `RunRecording_addPoint`. That loses about one point per gap.

`RunRecording_onFix` and `RunRecording_onTick` return the next recording and a `save` flag. They save when the status or the segment count changes, and otherwise every 10 seconds. `RunRecorder` applies the step and owns only the timer and the store write.

## Story card

`RunShareCard` draws the run on a 360 × 640 card: date, distance, three stats, and a 312 × 270 route box.

```text
RunShareCard
  route = RunRoute_forCard(run.route, hideEnds)     "As recorded" or "Hide 50 m"
  RunMapSnapshot_render(route, 312, 270, 24)
    iOS: LiftosaurMapSnapshot.render → { uri, xs, ys }
         RunRoute_mapDrawing(flat route, xs, ys) → lines, gaps, start, end
    web, Android, no network: undefined → RunRoute_fit draws on plain green
  RunStoryCard → map image under RunRouteSvg
```

- `RunRoute_trimEnds` cuts along the path and splits the segment it lands in, so a 300 m straight loses exactly 50 m. Pause gaps do not count toward the 50 m. A run shorter than 100 m shows no route.
- The trim applies to the card only. The run screen always shows the route as recorded.
- `ios/Liftosaur/LiftosaurMapSnapshotImpl.swift` renders a dark `.mutedStandard` map with no points of interest. It returns each route point's position from `snapshot.point(for:)`, so the route uses MapKit's own projection and lines up with the streets.
- The map rect gets the image's aspect ratio before rendering. MapKit then draws exactly that rect, with the route inside a 24 pt padding. A route under 200 m across is widened to 200 m.
- `RunRouteSvg` draws each pause gap as a dotted line from the end of one segment to the start of the next.
- The export waits for the map image through `onImageLoad`, the same way it waits for a photo.

## Reloads

`RunRecording_restore` brings an unfinished draft back paused, because the gap since the last save is unknown. A new JS runtime wires the module again through `setEventEmitterCallback`. `setEmitters` then calls `stopUpdatesFromPreviousRuntime()`, so GPS left on by the old runtime does not run under a paused draft.

## Not built

- Saving runs to Apple Health as a running workout with a route. `RunRecording_toRun` keeps only a simplified route without timestamps, so the export needs the samples kept after Finish.
- A native journal of fixes that replays them to JS. Today a crash loses at most the 10 seconds since the last draft save.
- Recording runs on the Apple Watch. `recoverPhoneSession()` in `LiftosaurWorkoutMirroringImpl.swift` assumes every recovered session is a lift.

## Debugging map

- Runs row missing on iPhone → the binary has no `LiftosaurLocation`. Run `npm run pod-install` and rebuild.
- Start shows "Location is off for beBEAR" → Settings, beBEAR, Location is Never or Ask Next Time.
- Start shows "Precise Location is off" → Settings, beBEAR, Location, Precise Location.
- Run stops counting when the phone locks → `location` is missing from `UIBackgroundModes`, or `allowsBackgroundLocationUpdates` was not set before `startUpdatingLocation`.
- Blue location pill stays after a run → `stopUpdates` was not called. Check the cleanup that `RunSensors_watch` returns in `runSensors.ios.ts`.
- Distance jumps across a tunnel → the platform uses the "pause" gap rule. Check `RunRecording_gapRule`.
- Moving time runs backward on iOS → `RecordingStats` is not using `RunRecording_stats`.
- Card shows plain green on iPhone → `LiftosaurMapSnapshot` rejected, usually no network for map tiles, or the binary predates the module.
- Route sits off the streets on the card → the drawing came from `RunRoute_fit` instead of the `xs` and `ys` that MapKit returned.
- Resume shows "Waiting for GPS" forever → authorization is `.notDetermined` and `startUpdates` did not ask again.
- `npm run ios` fails with "Failed to get the SHA-1 for … index.js" inside `.claude/worktrees/` → `metro.config.js` blocks that path. Bundle from the main checkout.
