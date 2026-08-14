import Foundation

/// Shared Firebase helpers using the ObjC runtime so the App target does not
/// need a direct Swift import of Firebase modules (those live in CapApp-SPM).
enum FirebaseBootstrap {
    static func configureIfNeeded() {
        guard let firebaseAppClass = NSClassFromString("FIRApp") else { return }

        let defaultAppSelector = NSSelectorFromString("defaultApp")
        if let defaultAppMethod = class_getClassMethod(firebaseAppClass, defaultAppSelector) {
            typealias DefaultAppFn = @convention(c) (AnyClass?, Selector) -> AnyObject?
            let defaultApp = unsafeBitCast(
                method_getImplementation(defaultAppMethod),
                to: DefaultAppFn.self
            )(firebaseAppClass, defaultAppSelector)
            if defaultApp != nil {
                return
            }
        }

        let configureSelector = NSSelectorFromString("configure")
        guard let configureMethod = class_getClassMethod(firebaseAppClass, configureSelector) else {
            return
        }

        typealias ConfigureFn = @convention(c) (AnyClass?, Selector) -> Void
        unsafeBitCast(method_getImplementation(configureMethod), to: ConfigureFn.self)(
            firebaseAppClass,
            configureSelector
        )
    }

    static func logEvent(_ name: String, parameters: [String: Any]? = nil) {
        configureIfNeeded()

        guard
            let analyticsClass = NSClassFromString("FIRAnalytics"),
            let method = class_getClassMethod(
                analyticsClass,
                NSSelectorFromString("logEventWithName:parameters:")
            )
        else {
            return
        }

        typealias LogEventFn = @convention(c) (AnyClass?, Selector, NSString, NSDictionary?) -> Void
        let impl = unsafeBitCast(method_getImplementation(method), to: LogEventFn.self)
        let selector = NSSelectorFromString("logEventWithName:parameters:")

        DispatchQueue.main.async {
            impl(
                analyticsClass,
                selector,
                name as NSString,
                parameters as NSDictionary?
            )
        }
    }
}
