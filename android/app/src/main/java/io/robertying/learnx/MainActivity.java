package io.robertying.learnx;

import android.view.View;
import android.content.Intent;
import android.content.res.Configuration;

import com.reactnativenavigation.NavigationActivity;

public class MainActivity extends NavigationActivity {
    @Override
    protected void addDefaultSplashLayout() {
        View view = new View(this);

        int currentNightMode = getApplicationContext().getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
        switch (currentNightMode) {
            case Configuration.UI_MODE_NIGHT_NO:
                view.setBackground(getDrawable(R.drawable.splash_screen));
                break;
            case Configuration.UI_MODE_NIGHT_YES:
                view.setBackground(getDrawable(R.drawable.splash_screen_night));
                break;
        }

        setContentView(view);
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        Intent intent = new Intent("onConfigurationChanged");
        intent.putExtra("newConfig", newConfig);
        sendBroadcast(intent);
    }
}
