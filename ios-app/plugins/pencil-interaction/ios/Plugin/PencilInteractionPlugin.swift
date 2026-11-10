import Foundation
import UIKit
import Capacitor

/// Sends Apple Pencil double-taps (all Pencils that support it) and squeezes (Apple Pencil Pro, iPadOS 17.5+)
/// to the web app as "tap" and "squeeze" events. The action the user picked in
/// iPad Settings > Apple Pencil comes with each event, so the app can follow it.
@objc(PencilInteractionPlugin)
public class PencilInteractionPlugin: CAPPlugin, CAPBridgedPlugin, UIPencilInteractionDelegate {
    public let identifier = "PencilInteractionPlugin"
    public let jsName = "PencilInteraction"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getPreferences", returnType: CAPPluginReturnPromise)
    ]

    private var interaction: UIPencilInteraction?

    override public func load() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self, let view = self.bridge?.webView else { return }
            let pencil = UIPencilInteraction()
            pencil.delegate = self
            view.addInteraction(pencil)
            self.interaction = pencil
        }
    }

    @objc func getPreferences(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            var result: [String: Any] = [
                "tapAction": Self.actionName(UIPencilInteraction.preferredTapAction),
                "prefersPencilOnlyDrawing": UIPencilInteraction.prefersPencilOnlyDrawing
            ]
            if #available(iOS 17.5, *) {
                result["squeezeAction"] = Self.actionName(UIPencilInteraction.preferredSqueezeAction)
            }
            call.resolve(result)
        }
    }

    static func actionName(_ action: UIPencilPreferredAction) -> String {
        if action == .ignore { return "ignore" }
        if action == .switchEraser { return "switchEraser" }
        if action == .switchPrevious { return "switchPrevious" }
        if action == .showColorPalette { return "showColorPalette" }
        if #available(iOS 16.0, *), action == .showInkAttributes { return "showInkAttributes" }
        if #available(iOS 17.5, *) {
            if action == .showContextualPalette { return "showContextualPalette" }
            if action == .runSystemShortcut { return "runSystemShortcut" }
        }
        return "unknown"
    }

    // iPadOS 12.1 to 17.4
    public func pencilInteractionDidTap(_ interaction: UIPencilInteraction) {
        notifyListeners("tap", data: ["action": Self.actionName(UIPencilInteraction.preferredTapAction)])
    }

    // iPadOS 17.5 and later: the tap comes with where the Pencil is hovering, if it is.
    @available(iOS 17.5, *)
    public func pencilInteraction(_ interaction: UIPencilInteraction, didReceiveTap tap: UIPencilInteraction.Tap) {
        var data: [String: Any] = ["action": Self.actionName(UIPencilInteraction.preferredTapAction)]
        if let pose = tap.hoverPose {
            data["x"] = pose.location.x
            data["y"] = pose.location.y
        }
        notifyListeners("tap", data: data)
    }

    @available(iOS 17.5, *)
    public func pencilInteraction(_ interaction: UIPencilInteraction, didReceiveSqueeze squeeze: UIPencilInteraction.Squeeze) {
        let phase: String
        switch squeeze.phase {
        case .began: phase = "began"
        case .changed: phase = "changed"
        case .ended: phase = "ended"
        case .cancelled: phase = "cancelled"
        @unknown default: phase = "unknown"
        }
        var data: [String: Any] = ["phase": phase, "action": Self.actionName(UIPencilInteraction.preferredSqueezeAction)]
        if let pose = squeeze.hoverPose {
            data["x"] = pose.location.x
            data["y"] = pose.location.y
        }
        notifyListeners("squeeze", data: data)
    }
}
