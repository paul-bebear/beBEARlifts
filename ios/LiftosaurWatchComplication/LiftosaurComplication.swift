import WidgetKit
import SwiftUI

struct LiftosaurComplicationEntry: TimelineEntry {
    let date: Date
    let info: ComplicationInfo?
}

struct LiftosaurComplicationProvider: TimelineProvider {
    func placeholder(in context: Context) -> LiftosaurComplicationEntry {
        LiftosaurComplicationEntry(
            date: Date(),
            info: ComplicationInfo(isOngoing: false, programName: "beBEAR", dayName: "Day 1")
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (LiftosaurComplicationEntry) -> Void) {
        completion(LiftosaurComplicationEntry(date: Date(), info: ComplicationStore.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<LiftosaurComplicationEntry>) -> Void) {
        // Static launcher complication — refreshed explicitly by the watch app when the workout changes.
        let entry = LiftosaurComplicationEntry(date: Date(), info: ComplicationStore.load())
        completion(Timeline(entries: [entry], policy: .never))
    }
}

// The container background well looks right behind circular/rectangular, but in a
// corner slot it renders as a stray gray square, so keep it transparent there.
struct ComplicationBackground: View {
    @Environment(\.widgetFamily) private var family

    var body: some View {
        switch family {
        case .accessoryCircular, .accessoryRectangular:
            AccessoryWidgetBackground()
        default:
            Color.clear
        }
    }
}

struct LiftosaurComplicationView: View {
    @Environment(\.widgetFamily) private var family
    let info: ComplicationInfo?

    private var bear: some View {
        Image("bear")
            .renderingMode(.template)
            .resizable()
            .scaledToFit()
            .widgetAccentable()
    }

    private var brandRow: some View {
        HStack(spacing: 6) {
            bear
                .frame(width: 24, height: 24)
            Text("beBEAR")
                .font(.headline)
            Spacer(minLength: 0)
        }
        .widgetAccentable()
    }

    var body: some View {
        switch family {
        case .accessoryCircular:
            bear
                .padding(8)
        case .accessoryCorner:
            // The corner slot rejects raster images (renders a placeholder square),
            // so use the custom SF Symbol, with the day name as the curved label.
            Image("BearSymbol")
                .resizable()
                .scaledToFit()
                .frame(width: 26, height: 26)
                .widgetAccentable()
                .widgetLabel(info?.dayName ?? "beBEAR")
        case .accessoryInline:
            Label {
                if let info = info {
                    Text(info.dayName)
                } else {
                    Text("beBEAR")
                }
            } icon: {
                // accessoryInline only renders SF Symbols, not raster images,
                // so use the custom-symbol bear here.
                Image("BearSymbol")
            }
        case .accessoryRectangular:
            if let info = info {
                VStack(alignment: .leading, spacing: 1) {
                    HStack(spacing: 3) {
                        bear
                            .frame(width: 16, height: 16)
                        Text(info.isOngoing ? "Ongoing" : "Up Next")
                            .font(.system(.caption2, design: .rounded).weight(.semibold))
                            .lineLimit(1)
                        Spacer(minLength: 0)
                    }
                    .foregroundStyle(.secondary)
                    .widgetAccentable()
                    Text(info.programName)
                        .font(.system(.caption2, design: .rounded))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                    Text(info.dayName)
                        .font(.system(.caption2, design: .rounded).weight(.semibold))
                        .foregroundStyle(.primary)
                        .lineLimit(1)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                brandRow
            }
        default:
            bear
        }
    }
}

struct LiftosaurComplication: Widget {
    let kind: String = "LiftosaurComplication"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LiftosaurComplicationProvider()) { entry in
            LiftosaurComplicationView(info: entry.info)
                .containerBackground(for: .widget) {
                    ComplicationBackground()
                }
        }
        .configurationDisplayName("beBEAR")
        .description("Open beBEAR to start or continue your workout.")
        .supportedFamilies([
            .accessoryCircular,
            .accessoryCorner,
            .accessoryInline,
            .accessoryRectangular,
        ])
    }
}
