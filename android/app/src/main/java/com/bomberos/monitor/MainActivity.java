package com.bomberos.monitor;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(WearNotificationPlugin.class);
        registerPlugin(AppUpdatePlugin.class);
    }
}
