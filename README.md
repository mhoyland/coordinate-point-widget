# Coordinate Point

Add, edit and manage WGS84 coordinate points on a map in ArcGIS Experience Builder (Developer Edition 1.21).

## Installation

ArcGIS Experience Builder Developer Edition 1.21.

1. Copy this folder to `client/your-extensions/widgets/coordinate-point`.
2. Restart the client dev server (`npm start` in `client/`).
3. Add the widget to an experience in the builder.

## Layout

1. **Entry bar:** Latitude and Longitude boxes, a *Pick on map* toggle and an *Add* button.
   Paste `lat, lon` (or `lat lon`) into either box to fill both. Press Enter to add.
2. **Coordinates list:** numbered rows whose chip colour matches the point symbol. Zoom to, edit (in the row)
   and remove appear on hover or keyboard focus, and are always visible on touch devices.
   - Header buttons: **Zoom to all**, and a **⋯ menu** with Import CSV, Export CSV, Copy all to clipboard, and Clear all.
   - Drop a CSV file anywhere on the widget to import it.
   - Remove and Clear all can be undone from the confirmation message.
3. **Appearance** (collapsed by default, with a one-line preview): point symbol (Draw-style `SymbolSelector`), show
   labels, font, bold, size, colour, label position (left / right / above / below), distance, and a map-style preview.
   *Reset to defaults* returns to the values set in the widget settings.

## Settings

| Setting | Default |
|---|---|
| Map | — (required to draw points) |
| Decimal places | 6 |
| Default point symbol | circle, `#007ac2`, 10 pt, white 2 pt outline |
| Default label | shown, Arial 12 bold, black, right of the point, 12 pt away |

The settings are the starting styles. Changes users make in the widget are saved in their browser and take
priority until they choose *Reset to defaults*.

## Map behaviour

- Points and labels go in two graphics layers, **Coordinate Points** and **Coordinate Labels**, both listed in the Layer List.
- The map never zooms automatically. Use *Zoom to* or *Zoom to all*.
- *Pick on map* stays on until you select it again, press Esc, or close the widget. Map pop-ups are suppressed
  while picking.

## CSV

Export columns: `ID,Latitude,Longitude`

Import accepts `Latitude`/`Lat`/`Y`, `Longitude`/`Lon`/`Lng`/`Long`/`X`, and optional `ID`/`CoordinateID`/`Coordinate_ID`.
Invalid rows are skipped and counted.

## Map Context Menu hand-off

The widget reads `props.mutableStateProps.coordinateAddRequest` written by the **[Map Context Menu](https://github.com/mhoyland/map-context-menu-widget)** widget's
*Add to Coordinate Point* action, and adds the point to the list. Each request carries a unique `requestId`, so
re-renders never add it twice, and the same location can still be added again later.

## Storage and compatibility

- Points, appearance and point symbol are cached in `localStorage` under `coordinate-point-widget-v5-<widgetId>`
  (the v4 key is still read as a fallback). Existing v5 caches load unchanged.
- v5 label settings (`labelAlignment`, `labelXOffset`, `labelYOffset`) are converted to `labelPosition` and
  `labelOffset` when read, in both saved app config and the browser cache.

## Accessibility

All controls have labels; list actions are keyboard reachable; the label-position control is a radio group;
status messages are announced through an `aria-live` region; validation errors are linked to their input.

## Licence

[MIT](LICENSE)
