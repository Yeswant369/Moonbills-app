import Foundation
import Capacitor
import UIKit

// ============================================================
// PrinterPlugin — Capacitor plugin for Cherrys Bakery POS
// Supports: TCP/ESC-POS printing + AirPrint via UIPrintInteractionController
// ============================================================

@objc(PrinterPlugin)
public class PrinterPlugin: CAPPlugin {

    // ─────────────────────────────────────────────────────────
    // MARK: printTCP
    // Opens a raw POSIX TCP socket, writes ESC-POS bytes, closes.
    // JS: Printer.printTCP({ printerIp, printerPort, receiptData })
    // ─────────────────────────────────────────────────────────
    @objc func printTCP(_ call: CAPPluginCall) {
        guard let ip   = call.getString("printerIp")   else { call.reject("printerIp is required"); return }
        guard let data = call.getString("receiptData")  else { call.reject("receiptData is required"); return }
        let port = call.getInt("printerPort") ?? 9100

        // Network must happen off the main thread
        DispatchQueue.global(qos: .userInitiated).async {
            guard let bytes = data.data(using: .isoLatin1) else {
                call.reject("Failed to encode receiptData as ISO-8859-1")
                return
            }

            // Resolve hostname → IP
            var serveraddr = sockaddr_in()
            serveraddr.sin_family = sa_family_t(AF_INET)
            serveraddr.sin_port   = in_port_t(UInt16(port).bigEndian)

            guard inet_pton(AF_INET, ip, &serveraddr.sin_addr) == 1 else {
                call.reject("Invalid printer IP: \(ip)")
                return
            }

            let sockfd = socket(AF_INET, SOCK_STREAM, 0)
            guard sockfd >= 0 else {
                call.reject("Failed to create socket")
                return
            }

            let connectResult = withUnsafePointer(to: &serveraddr) {
                $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
                    connect(sockfd, $0, socklen_t(MemoryLayout<sockaddr_in>.size))
                }
            }

            guard connectResult == 0 else {
                close(sockfd)
                call.reject("Could not connect to \(ip):\(port) — errno \(errno)")
                return
            }

            bytes.withUnsafeBytes { rawBuffer in
                if let base = rawBuffer.baseAddress {
                    send(sockfd, base, bytes.count, 0)
                }
            }
            close(sockfd)

            call.resolve(["success": true])
        }
    }

    // ─────────────────────────────────────────────────────────
    // MARK: printSystem (AirPrint)
    // Uses UIPrintInteractionController to show the native AirPrint
    // dialog with formatted receipt HTML.
    // JS: Printer.printSystem({ receiptData }) — receiptData = HTML string
    // ─────────────────────────────────────────────────────────
    @objc func printSystem(_ call: CAPPluginCall) {
        guard let html = call.getString("receiptData") else {
            call.reject("receiptData (HTML) is required")
            return
        }

        DispatchQueue.main.async {
            let printController = UIPrintInteractionController.shared

            // Print info
            let printInfo = UIPrintInfo(dictionary: nil)
            printInfo.outputType  = .general
            printInfo.jobName     = "Cherrys Bakery Receipt"
            printInfo.duplex      = .none
            printController.printInfo = printInfo

            // Formatter
            let formatter = UIMarkupTextPrintFormatter(markupText: html)
            formatter.contentInsets = UIEdgeInsets(top: 36, left: 36, bottom: 36, right: 36)
            printController.printFormatter = formatter

            // Show dialog
            guard let vc = self.bridge?.viewController else {
                call.reject("No view controller available")
                return
            }

            if UIDevice.current.userInterfaceIdiom == .pad {
                // iPad: present as popover
                printController.present(from: vc.view.frame, in: vc.view, animated: true) { _, completed, error in
                    if let error = error {
                        call.reject("AirPrint failed: \(error.localizedDescription)")
                    } else {
                        call.resolve(["success": true, "completed": completed])
                    }
                }
            } else {
                // iPhone: modal sheet
                printController.present(animated: true) { _, completed, error in
                    if let error = error {
                        call.reject("AirPrint failed: \(error.localizedDescription)")
                    } else {
                        call.resolve(["success": true, "completed": completed])
                    }
                }
            }
        }
    }
}
