#import "RNObservatoryMetadata.h"

@implementation RNObservatoryMetadata

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (NSDictionary *)constantsToExport
{
  NSBundle *bundle = [NSBundle mainBundle];
  NSString *appId = bundle.bundleIdentifier ?: @"";
  NSString *version = [bundle objectForInfoDictionaryKey:@"CFBundleShortVersionString"] ?: @"";
  NSString *buildNumber = [bundle objectForInfoDictionaryKey:@"CFBundleVersion"] ?: @"";

  return @{
    @"appId": appId,
    @"bundleIdentifier": appId,
    @"version": version,
    @"buildNumber": buildNumber,
  };
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(getConstantsSync)
{
  return [self constantsToExport];
}

@end
