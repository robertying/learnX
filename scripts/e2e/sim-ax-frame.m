// Loaded into the app under test on an iOS simulator (DYLD_INSERT_LIBRARIES, set by the patched
// Maestro: scripts/e2e/maestro), so XCUITest sees the whole app on the open iPhone Duo.
//
// There the app runs in landscape on the inner display, whose native mode is portrait. UIKit's
// accessibility gives the app element the display's portrait size (669x951 points) while its
// windows and views report landscape frames (951x669), and the tree XCUITest gets leaves out
// every element right of x = 669: learnX's tab column at the right edge. This gives the app
// element the bounds of the screen its scene is on, when that isn't the main screen. On the main
// screen (any other simulator, the closed Duo) nothing changes.
//
// UIKit's accessibility code adds its accessibilityFrame to UIApplication when it loads, which
// can be after launch, so the method goes on a subclass of the app object instead of
// UIApplication itself.
//
// Built by scripts/e2e/e2e.sh (clang -dynamiclib for the simulator).
#import <UIKit/UIKit.h>
#import <objc/runtime.h>

static UIScreen *otherScreen(void) {
  for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
    if (![scene isKindOfClass:UIWindowScene.class] ||
        scene.activationState == UISceneActivationStateBackground) {
      continue;
    }
    UIScreen *screen = ((UIWindowScene *)scene).screen;
    if (screen != UIScreen.mainScreen) {
      return screen;
    }
  }
  return nil;
}

static void install(void) {
  UIApplication *app = UIApplication.sharedApplication;
  Class base = object_getClass(app);
  Class subclass = objc_allocateClassPair(base, "LearnXSimAXFrameApplication", 0);
  if (subclass == Nil) {
    return;
  }
  SEL frameSelector = @selector(accessibilityFrame);
  class_addMethod(subclass, frameSelector, imp_implementationWithBlock(^CGRect(id self) {
    UIScreen *screen = otherScreen();
    if (screen != nil) {
      return screen.bounds;
    }
    // Looked up on every call: UIKit's accessibility code replaces it when it loads.
    IMP original = class_getMethodImplementation(base, frameSelector);
    return ((CGRect (*)(id, SEL))original)(self, frameSelector);
  }), method_getTypeEncoding(class_getInstanceMethod(base, frameSelector)));
  // The app still says it is a UIApplication.
  class_addMethod(subclass, @selector(class), imp_implementationWithBlock(^Class(id self) {
    return base;
  }), "#@:");
  objc_registerClassPair(subclass);
  object_setClass(app, subclass);
}

__attribute__((constructor)) static void load(void) {
  // UIApplicationMain has made the app object by the time the main queue runs.
  dispatch_async(dispatch_get_main_queue(), ^{
    install();
  });
}
