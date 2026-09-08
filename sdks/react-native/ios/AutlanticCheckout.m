#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(AutlanticCheckout, NSObject)

RCT_EXTERN_METHOD(present:(NSString *)checkoutUrl
                  returnUrlScheme:(NSString *)returnUrlScheme
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end
