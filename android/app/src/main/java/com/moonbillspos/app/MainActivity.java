package com.moonbillspos.app;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register custom plugins before calling super
        registerPlugin(PrinterPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
