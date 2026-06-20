package com.moonbillspos.app

import android.content.Context
import android.os.Build
import android.os.Bundle
import android.os.CancellationSignal
import android.os.ParcelFileDescriptor
import android.print.PageRange
import android.print.PrintAttributes
import android.print.PrintDocumentAdapter
import android.print.PrintDocumentInfo
import android.print.PrintJob
import android.print.PrintManager
import android.webkit.WebView
import android.webkit.WebViewClient
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.FileOutputStream
import java.io.OutputStream
import java.net.Socket

@CapacitorPlugin(name = "Printer")
class PrinterPlugin : Plugin() {

    /**
     * printTCP — Opens a raw TCP socket to a WiFi thermal printer (ESC-POS over port 9100).
     * JS call: Printer.printTCP({ printerIp, printerPort, receiptData })
     */
    @PluginMethod
    fun printTCP(call: PluginCall) {
        val ip   = call.getString("printerIp")   ?: return call.reject("printerIp is required")
        val port = call.getInt("printerPort")     ?: 9100
        val data = call.getString("receiptData")  ?: return call.reject("receiptData is required")

        // Network on background thread
        Thread {
            try {
                Socket(ip, port).use { socket ->
                    val out: OutputStream = socket.getOutputStream()
                    out.write(data.toByteArray(Charsets.ISO_8859_1))
                    out.flush()
                }
                call.resolve(JSObject().put("success", true))
            } catch (e: Exception) {
                call.reject("TCP print failed: ${e.message}", e)
            }
        }.start()
    }

    /**
     * printSystem — Sends a print job via Android's native PrintManager (AirPrint-equivalent).
     * JS call: Printer.printSystem({ receiptData }) where receiptData is an HTML string.
     */
    @PluginMethod
    fun printSystem(call: PluginCall) {
        val htmlContent = call.getString("receiptData")
            ?: return call.reject("receiptData (HTML) is required")

        val activity = activity ?: return call.reject("No activity available")

        activity.runOnUiThread {
            try {
                // Create an off-screen WebView to render the HTML
                val webView = WebView(activity)
                webView.webViewClient = object : WebViewClient() {
                    override fun onPageFinished(view: WebView, url: String) {
                        // Trigger system print dialog once HTML is loaded
                        val printManager = activity.getSystemService(Context.PRINT_SERVICE) as PrintManager
                        val jobName = "Cherrys Bakery Receipt"
                        val printAdapter = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                            view.createPrintDocumentAdapter(jobName)
                        } else {
                            @Suppress("DEPRECATION")
                            view.createPrintDocumentAdapter()
                        }
                        val printJob: PrintJob = printManager.print(
                            jobName,
                            printAdapter,
                            PrintAttributes.Builder().build()
                        )
                        call.resolve(JSObject().put("success", true).put("jobId", printJob.id.toString()))
                    }
                }
                webView.loadDataWithBaseURL(null, htmlContent, "text/html", "UTF-8", null)
            } catch (e: Exception) {
                call.reject("System print failed: ${e.message}", e)
            }
        }
    }
}
