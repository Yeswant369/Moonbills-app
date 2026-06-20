// ============================================================
// PrinterPlugin+Bridge.m
// Capacitor Objective-C bridge — registers Swift PrinterPlugin methods
// so the JS bridge can call them by name.
// ============================================================

#import <Capacitor/Capacitor.h>

// Map JS method names → Swift method names
CAP_PLUGIN(PrinterPlugin, "Printer",
    CAP_PLUGIN_METHOD(printTCP, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(printSystem, CAPPluginReturnPromise);
)
