#import <React/RCTBridgeDelegate.h>
#import <UMReactNativeAdapter/UMModuleRegistryAdapter.h>
#import <UMCore/UMAppDelegateWrapper.h>
#import <UIKit/UIKit.h>

@interface AppDelegate : UMAppDelegateWrapper <RCTBridgeDelegate>

@property (nonatomic, strong) UMModuleRegistryAdapter *moduleRegistryAdapter;
@property (nonatomic, strong) UIWindow *window;

@end
