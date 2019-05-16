#import <UIKit/UIKit.h>
#import <UMReactNativeAdapter/UMModuleRegistryAdapter.h>
#import <React/RCTBridgeDelegate.h>

@interface AppDelegate : UIResponder <UIApplicationDelegate, RCTBridgeDelegate>

@property(nonatomic, strong) UMModuleRegistryAdapter *moduleRegistryAdapter;
@property(nonatomic, strong) UIWindow *window;

@end
