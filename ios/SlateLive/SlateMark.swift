import SwiftUI

// 3.113.0 (DJ): Slate's axe-hammer mark, the one beside the page titles in the app (src/body.html, svg.brand),
// drawn from the same 24×24 paths: the hammer tilted 35°, its head filled, and the two sparkles. Used small, in the
// app's green, on headers only (the Tonight's slate widget, the Board's Dynamic Island), never next to a score.
struct SlateMark: View {
    var color: Color = SlateLook.accent
    var size: CGFloat = 14

    var body: some View {
        ZStack {
            MarkPart(part: .handle).stroke(color.opacity(0.55), style: stroke(2.2))
            MarkPart(part: .grip).stroke(color, style: stroke(1.7))
            MarkPart(part: .head).fill(color)
            MarkPart(part: .head).stroke(color, style: stroke(2.1 * 0.88))
            MarkPart(part: .spark1).fill(color)
            MarkPart(part: .spark2).fill(color.opacity(0.8))
        }
        .frame(width: size, height: size)
        .accessibilityHidden(true)
    }

    private func stroke(_ w: CGFloat) -> StrokeStyle {
        StrokeStyle(lineWidth: w * size / 24, lineCap: .round, lineJoin: .round)
    }
}

private struct MarkPart: Shape {
    enum Part { case handle, grip, head, spark1, spark2 }
    let part: Part

    func path(in r: CGRect) -> Path {
        let s = min(r.width, r.height) / 24
        let place = CGAffineTransform(scaleX: s, y: s).concatenating(CGAffineTransform(translationX: r.minX, y: r.minY))
        // the group: rotate 35° about the middle, then nudge left a little (SVG: translate(-1.8 .3) rotate(35 12 12))
        let group = CGAffineTransform(translationX: -12, y: -12)
            .concatenating(CGAffineTransform(rotationAngle: 35 * .pi / 180))
            .concatenating(CGAffineTransform(translationX: 12, y: 12))
            .concatenating(CGAffineTransform(translationX: -1.8, y: 0.3))
        var p = Path()
        switch part {
        case .handle:
            p.move(to: CGPoint(x: 11, y: 3.9)); p.addLine(to: CGPoint(x: 11, y: 21.3))
            return p.applying(group.concatenating(place))
        case .grip:
            p.move(to: CGPoint(x: 9.7, y: 18.3)); p.addLine(to: CGPoint(x: 12.3, y: 18.3))
            return p.applying(group.concatenating(place))
        case .head:
            p.move(to: CGPoint(x: 6.8, y: 5.6)); p.addLine(to: CGPoint(x: 9.2, y: 5.6)); p.addLine(to: CGPoint(x: 9.2, y: 6.0))
            p.addLine(to: CGPoint(x: 13, y: 6.0)); p.addLine(to: CGPoint(x: 17.8, y: 4.3))
            p.addQuadCurve(to: CGPoint(x: 17.8, y: 10.5), control: CGPoint(x: 19.5, y: 7.4))
            p.addLine(to: CGPoint(x: 13, y: 8.8)); p.addLine(to: CGPoint(x: 9.2, y: 8.8)); p.addLine(to: CGPoint(x: 9.2, y: 9.2))
            p.addLine(to: CGPoint(x: 6.8, y: 9.2)); p.addQuadCurve(to: CGPoint(x: 6.0, y: 8.4), control: CGPoint(x: 6.0, y: 9.2))
            p.addLine(to: CGPoint(x: 6.0, y: 6.4)); p.addQuadCurve(to: CGPoint(x: 6.8, y: 5.6), control: CGPoint(x: 6.0, y: 5.6))
            p.closeSubpath()
            let head = CGAffineTransform(translationX: -11, y: -7.4)
                .concatenating(CGAffineTransform(scaleX: 0.88, y: 0.88))
                .concatenating(CGAffineTransform(translationX: 11, y: 7.4))
            return p.applying(head.concatenating(group).concatenating(place))
        case .spark1:
            star(&p, [(21, 3.6), (21.62, 5.38), (23.4, 6), (21.62, 6.62), (21, 8.4), (20.38, 6.62), (18.6, 6), (20.38, 5.38)])
            return p.applying(place)
        case .spark2:
            star(&p, [(17.3, 2.3), (17.6, 3.2), (18.5, 3.5), (17.6, 3.8), (17.3, 4.7), (17, 3.8), (16.1, 3.5), (17, 3.2)])
            return p.applying(place)
        }
    }

    private func star(_ p: inout Path, _ pts: [(CGFloat, CGFloat)]) {
        p.addLines(pts.map { CGPoint(x: $0.0, y: $0.1) }); p.closeSubpath()
    }
}
