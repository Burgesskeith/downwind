import Capacitor
import WebKit

/// Capacitor bridge subclass that accepts analytics events from JS via
/// `webkit.messageHandlers.WutherAnalytics` (bypasses the hanging plugin proxy).
class WutherBridgeViewController: CAPBridgeViewController, WKScriptMessageHandler {
    private let analyticsHandlerName = "WutherAnalytics"

    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        FirebaseBootstrap.configureIfNeeded()
        bridge?.webView?.configuration.userContentController.add(
            self,
            name: analyticsHandlerName
        )
    }

    deinit {
        bridge?.webView?.configuration.userContentController
            .removeScriptMessageHandler(forName: analyticsHandlerName)
    }

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard message.name == analyticsHandlerName else { return }
        guard
            let body = message.body as? [String: Any],
            let name = body["name"] as? String
        else {
            return
        }

        let params = body["params"] as? [String: Any]
        FirebaseBootstrap.logEvent(name, parameters: params)
    }
}
