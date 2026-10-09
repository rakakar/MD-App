import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = MainViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

/**
 * **No system blur over the app bar.**
 *
 * From iOS 26 a scroll view draws a "scroll edge effect", a frosted
 * dissolve, wherever its content runs under a system bar. The web view is a
 * scroll view and the page is `viewport-fit=cover`, so the app bar's top
 * strip sits under the status bar and gets frosted. The tab bar at the
 * bottom sits under the home indicator and gets the same effect. On iOS 27 this
 * reads as the bar itself being out of focus.
 *
 * CSS cannot reach it. The bars already carry no backdrop-filter (see
 * Header.tsx and `.reader-chrome`), and this blur is UIKit's, drawn over the web
 * view rather than inside it. Both bars are opaque and paint their own
 * background to the edge, so the effect has nothing to make legible. Hiding it
 * gives the bars a solid edge without moving the web view out from under the
 * status bar, so the reader can still paint its paper to the top of the screen.
 *
 * Set once here and never toggled. Switching the style at runtime is
 * reported to leave the blur stuck on WKWebView.
 */
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        // The API exists only in the iOS 26 SDK. The compiler guard keeps an
        // older Xcode building, and the availability check keeps older iOS running.
        #if compiler(>=6.2)
        if #available(iOS 26.0, *), let scrollView = webView?.scrollView {
            scrollView.topEdgeEffect.isHidden = true
            scrollView.bottomEdgeEffect.isHidden = true
        }
        #endif
    }
}
