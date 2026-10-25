#import "RCTLiftosaurLocation.h"
#import <React/RCTBridgeModule.h>
#import <React_RCTAppDelegate/RCTDefaultReactNativeFactoryDelegate.h>
#import "Liftosaur-Swift.h"

static __weak RCTLiftosaurLocation *gCodegenWiredInstance = nil;

@implementation RCTLiftosaurLocation {
  BOOL _eventEmitterWired;
}

RCT_EXPORT_MODULE(LiftosaurLocation)

- (void)setEventEmitterCallback:(EventEmitterCallbackWrapper *)wrapper {
  [super setEventEmitterCallback:wrapper];
  gCodegenWiredInstance = self;
  [self wireEventEmitterIfNeeded];
}

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (void)wireEventEmitterIfNeeded {
  if (_eventEmitterWired) return;
  _eventEmitterWired = YES;
  [[LiftosaurLocationImpl shared]
      setLocationEmitter:^(NSDictionary *event) {
        RCTLiftosaurLocation *target = gCodegenWiredInstance;
        if (target == nil) return;
        [target emitOnLocation:event];
      }
      errorEmitter:^(NSDictionary *event) {
        RCTLiftosaurLocation *target = gCodegenWiredInstance;
        if (target == nil) return;
        [target emitOnLocationError:event];
      }];
}

- (void)requestPermission:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject {
  [[LiftosaurLocationImpl shared] requestPermissionWithCompletion:^(NSString *_Nonnull permission) {
    resolve(permission);
  }];
}

- (void)startUpdates {
  [self wireEventEmitterIfNeeded];
  [[LiftosaurLocationImpl shared] startUpdates];
}

- (void)stopUpdates {
  [[LiftosaurLocationImpl shared] stopUpdates];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeLiftosaurLocationSpecJSI>(params);
}

@end
