package com.moonbillspos.app;

import android.content.Context;
import android.os.Build;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintJob;
import android.print.PrintManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;
import java.net.Socket;

@CapacitorPlugin(name = "Printer")
public class PrinterPlugin extends Plugin {

    /**
     * printTCP — Opens a raw TCP socket to a WiFi thermal printer (ESC-POS over port 9100).
     * JS call: Printer.printTCP({ printerIp, printerPort, receiptData })
     */
    @PluginMethod
    public void printTCP(final PluginCall call) {
        final String ip   = call.getString("printerIp");
        final Integer port = call.getInt("printerPort");
        final String data = call.getString("receiptData");

        if (ip == null || ip.isEmpty()) {
            call.reject("printerIp is required");
            return;
        }
        if (data == null || data.isEmpty()) {
            call.reject("receiptData is required");
            return;
        }

        final int printerPort = (port != null) ? port : 9100;

        // Network must happen off the main thread
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    Socket socket = new Socket(ip, printerPort);
                    try {
                        OutputStream out = socket.getOutputStream();
                        out.write(data.getBytes("ISO-8859-1"));
                        out.flush();
                    } finally {
                        socket.close();
                    }
                    JSObject result = new JSObject();
                    result.put("success", true);
                    call.resolve(result);
                } catch (Exception e) {
                    call.reject("TCP print failed: " + e.getMessage(), e);
                }
            }
        }).start();
    }

    /**
     * printSystem — Sends a print job via Android's native PrintManager.
     * JS call: Printer.printSystem({ receiptData }) where receiptData is an HTML string.
     */
    @PluginMethod
    public void printSystem(final PluginCall call) {
        final String htmlContent = call.getString("receiptData");

        if (htmlContent == null || htmlContent.isEmpty()) {
            call.reject("receiptData (HTML) is required");
            return;
        }

        getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    // Off-screen WebView to render HTML before printing
                    final WebView webView = new WebView(getActivity());
                    webView.setWebViewClient(new WebViewClient() {
                        @Override
                        public void onPageFinished(WebView view, String url) {
                            PrintManager printManager =
                                    (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);

                            final String jobName = "Cherrys Bakery Receipt";
                            PrintDocumentAdapter printAdapter;

                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                                printAdapter = view.createPrintDocumentAdapter(jobName);
                            } else {
                                //noinspection deprecation
                                printAdapter = view.createPrintDocumentAdapter();
                            }

                            PrintJob printJob = printManager.print(
                                    jobName,
                                    printAdapter,
                                    new PrintAttributes.Builder().build()
                            );

                            JSObject result = new JSObject();
                            result.put("success", true);
                            result.put("jobId", printJob.getId().toString());
                            call.resolve(result);
                        }
                    });
                    webView.loadDataWithBaseURL(null, htmlContent, "text/html", "UTF-8", null);
                } catch (Exception e) {
                    call.reject("System print failed: " + e.getMessage(), e);
                }
            }
        });
    }
}
