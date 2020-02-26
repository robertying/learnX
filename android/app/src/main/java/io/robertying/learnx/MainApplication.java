package io.robertying.learnx;

import com.facebook.react.PackageList;

import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.reactnativenavigation.NavigationApplication;
import com.reactnativenavigation.react.NavigationReactNativeHost;

import cl.json.ShareApplication;

import org.unimodules.adapters.react.ModuleRegistryAdapter;
import org.unimodules.adapters.react.ReactModuleRegistryProvider;
import org.unimodules.core.interfaces.SingletonModule;

import java.util.Arrays;
import java.util.List;

import io.robertying.learnx.generated.BasePackageList;

public class MainApplication extends NavigationApplication implements ShareApplication {

    private final ReactModuleRegistryProvider mModuleRegistryProvider = new ReactModuleRegistryProvider(new BasePackageList().getPackageList(), Arrays.<SingletonModule>asList());

    private final ReactNativeHost mReactNativeHost =
            new NavigationReactNativeHost(this) {
                @Override
                protected String getJSMainModuleName() {
                    return "index";
                }

                @Override
                public boolean getUseDeveloperSupport() {
                    return BuildConfig.DEBUG;
                }

                @Override
                public List<ReactPackage> getPackages() {
                    @SuppressWarnings("UnnecessaryLocalVariable")
                    List<ReactPackage> packages = new PackageList(this).getPackages();
                    List<ReactPackage> unimodules = Arrays.<ReactPackage>asList(
                            new ModuleRegistryAdapter(mModuleRegistryProvider)
                    );
                    packages.addAll(unimodules);
                    return packages;
                }
            };

    @Override
    public ReactNativeHost getReactNativeHost() {
        return mReactNativeHost;
    }

    @Override
    public String getFileProviderAuthority() {
        return BuildConfig.APPLICATION_ID + ".provider";
    }

}
