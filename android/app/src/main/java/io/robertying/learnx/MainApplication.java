package io.robertying.learnx;

import android.app.Application;

import cl.json.RNSharePackage;
import cl.json.ShareApplication;
import com.RNFetchBlob.RNFetchBlobPackage;
import com.facebook.react.ReactApplication;
import com.transistorsoft.rnbackgroundfetch.RNBackgroundFetchPackage;
import com.learnium.RNDeviceInfo.RNDeviceInfo;
import com.reactnativecommunity.asyncstorage.AsyncStoragePackage;
import ca.jaysoo.extradimensions.ExtraDimensionsPackage;
import com.wix.interactable.Interactable;
import com.microsoft.codepush.react.CodePush;
import com.cmcewen.blurview.BlurViewPackage;
import com.BV.LinearGradient.LinearGradientPackage;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainReactPackage;
import com.facebook.soloader.SoLoader;
import com.oblador.vectoricons.VectorIconsPackage;
import com.reactnativecommunity.webview.RNCWebViewPackage;
import com.swmansion.gesturehandler.react.RNGestureHandlerPackage;
import com.swmansion.reanimated.ReanimatedPackage;

import io.robertying.learnx.generated.BasePackageList;
import org.unimodules.adapters.react.ModuleRegistryAdapter;
import org.unimodules.adapters.react.ReactModuleRegistryProvider;
import org.unimodules.core.interfaces.SingletonModule;

import java.util.Arrays;
import java.util.List;

public class MainApplication extends Application implements ShareApplication, ReactApplication {

    private final ReactModuleRegistryProvider mModuleRegistryProvider = new ReactModuleRegistryProvider(new BasePackageList().getPackageList(), Arrays.<SingletonModule>asList());

    private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {

        @Override
        protected String getJSBundleFile() {
            return CodePush.getJSBundleFile();
        }

        @Override
        public boolean getUseDeveloperSupport() {
            return BuildConfig.DEBUG;
        }

        @Override
        protected List<ReactPackage> getPackages() {
            return Arrays.<ReactPackage>asList(
                    new MainReactPackage(),
                    new RNBackgroundFetchPackage(),
                    new CodePush(getString(R.string.codepush_key), MainApplication.this, BuildConfig.DEBUG),
                    new RNDeviceInfo(),
                    new AsyncStoragePackage(),
                    new ExtraDimensionsPackage(),
                    new Interactable(),
                    new BlurViewPackage(),
                    new LinearGradientPackage(),
                    new RNFetchBlobPackage(),
                    new RNSharePackage(),
                    new RNCWebViewPackage(),
                    new VectorIconsPackage(),
                    new ReanimatedPackage(),
                    new RNGestureHandlerPackage(),
                    new ModuleRegistryAdapter(mModuleRegistryProvider)
            );
        }

        @Override
        protected String getJSMainModuleName() {
            return "index";
        }
    };

    @Override
    public String getFileProviderAuthority() {
        return BuildConfig.APPLICATION_ID + ".provider";
    }

    @Override
    public ReactNativeHost getReactNativeHost() {
        return mReactNativeHost;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        SoLoader.init(this, /* native exopackage */ false);
    }

}
