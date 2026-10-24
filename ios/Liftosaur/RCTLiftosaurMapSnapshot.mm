#import "RCTLiftosaurMapSnapshot.h"
#import <React/RCTBridgeModule.h>
#import <React_RCTAppDelegate/RCTDefaultReactNativeFactoryDelegate.h>
#import "Liftosaur-Swift.h"

static NSArray<NSNumber *> *numbersFrom(const facebook::react::LazyVector<double> &values) {
  NSMutableArray<NSNumber *> *numbers = [NSMutableArray arrayWithCapacity:values.size()];
  for (size_t i = 0; i < values.size(); i++) {
    [numbers addObject:@(values[i])];
  }
  return numbers;
}

@implementation RCTLiftosaurMapSnapshot

RCT_EXPORT_MODULE(LiftosaurMapSnapshot)

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (void)render:(JS::NativeLiftosaurMapSnapshot::LiftosaurMapSnapshotRequest &)request
       resolve:(RCTPromiseResolveBlock)resolve
        reject:(RCTPromiseRejectBlock)reject {
  [[LiftosaurMapSnapshotImpl shared] renderWithLats:numbersFrom(request.lats())
                                               lons:numbersFrom(request.lons())
                                              width:request.width()
                                             height:request.height()
                                            padding:request.padding()
                                         completion:^(NSDictionary *_Nullable result, NSString *_Nullable error) {
    if (result != nil) {
      resolve(result);
    } else {
      reject(@"map_snapshot", error ?: @"No map image", nil);
    }
  }];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeLiftosaurMapSnapshotSpecJSI>(params);
}

@end
