#import <UIKit/UIKit.h>

#import <React/RCTBridgeDelegate.h>
#import <Expo/Expo.h>

@interface AppDelegate : EXAppDelegateWrapper <UIApplicationDelegate, RCTBridgeDelegate>

@property (nonatomic, strong) UIWindow *window;

@end
