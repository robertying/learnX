package io.robertying.learnx;

import android.view.View;

import com.reactnativenavigation.NavigationActivity;

public class MainActivity extends NavigationActivity {
    @Override
    protected void addDefaultSplashLayout() {
        View view = new View(this);
        view.setBackground(getDrawable(R.drawable.splash_screen));
        setContentView(view);
    }
}
