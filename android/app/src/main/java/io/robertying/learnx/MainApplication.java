package io.robertying.learnx;

import com.facebook.react.PackageList;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.reactnativenavigation.NavigationApplication;
import com.reactnativenavigation.react.NavigationPackage;
import com.reactnativenavigation.react.NavigationReactNativeHost;
import com.reactnativenavigation.react.ReactGateway;

import org.unimodules.adapters.react.ModuleRegistryAdapter;
import org.unimodules.adapters.react.ReactModuleRegistryProvider;
import org.unimodules.core.interfaces.SingletonModule;

import java.util.Arrays;
import java.util.List;

import cl.json.ShareApplication;
import io.robertying.learnx.generated.BasePackageList;

public class MainApplication extends NavigationApplication implements ShareApplication {

    private final ReactModuleRegistryProvider mModuleRegistryProvider = new ReactModuleRegistryProvider(new BasePackageList().getPackageList(), Arrays.<SingletonModule>asList());

    @Override
    protected ReactGateway createReactGateway() {

        ReactNativeHost host = new NavigationReactNativeHost(this, isDebug(), createAdditionalReactPackages()) {
            @Override
            protected String getJSMainModuleName() {
                return "index";
            }

            @Override
            protected List<ReactPackage> getPackages() {
                @SuppressWarnings("UnnecessaryLocalVariable")
                List<ReactPackage> packages = new PackageList(this).getPackages();
                packages.add(new ModuleRegistryAdapter(mModuleRegistryProvider));
                packages.add(new NavigationPackage(this));
                return packages;
            }
        };

        return new ReactGateway(this, isDebug(), host);
    }

    @Override
    public boolean isDebug() {
        return BuildConfig.DEBUG;
    }

    @Override
    public List<ReactPackage> createAdditionalReactPackages() {
        return Arrays.<ReactPackage>asList();
    }

    @Override
    public String getFileProviderAuthority() {
        return BuildConfig.APPLICATION_ID + ".provider";
    }

}
