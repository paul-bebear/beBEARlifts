#import "RCTBebearSignInConfig.h"

@implementation RCTBebearSignInConfig

RCT_EXPORT_MODULE(BebearSignInConfig)

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (facebook::react::ModuleConstants<JS::NativeBebearSignInConfig::Constants>)constantsToExport {
  return [self getConstants];
}

- (facebook::react::ModuleConstants<JS::NativeBebearSignInConfig::Constants>)getConstants {
  NSBundle *bundle = NSBundle.mainBundle;
  NSString *clientId = [bundle objectForInfoDictionaryKey:@"BebearGoogleClientID"];
  NSArray<NSDictionary *> *urlTypes = [bundle objectForInfoDictionaryKey:@"CFBundleURLTypes"];
  std::vector<NSString *> urlSchemes;
  for (NSDictionary *urlType in urlTypes) {
    for (NSString *scheme in urlType[@"CFBundleURLSchemes"]) {
      urlSchemes.push_back(scheme);
    }
  }
  return facebook::react::typedConstants<JS::NativeBebearSignInConfig::Constants>({
    .googleIosClientId = clientId ?: @"",
    .urlSchemes = urlSchemes,
  });
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeBebearSignInConfigSpecJSI>(params);
}

@end
