import type { ImmutableObject } from 'jimu-core'

export type LabelPosition = 'right' | 'left' | 'above' | 'below'

export interface Config {
  showLabels?: boolean
  labelSize?: number
  labelColor?: string
  labelFont?: string
  labelBold?: boolean
  /** Where the label sits relative to the point. Supersedes labelAlignment. */
  labelPosition?: LabelPosition
  /** Distance in points between the symbol and the label. */
  labelOffset?: number
  /** @deprecated v5 field, read only to derive labelPosition for older apps. */
  labelAlignment?: 'left' | 'center' | 'right'
  /** @deprecated v5 field, read only to derive labelOffset for older apps. */
  labelXOffset?: number
  /** @deprecated v5 field, read only to derive labelPosition/labelOffset for older apps. */
  labelYOffset?: number
  pointSize?: number
  pointColor?: string
  pointOutlineColor?: string
  pointOutlineWidth?: number
  /** Decimal places shown in the list, labels and clipboard text. */
  decimalPlaces?: number
}

export type IMConfig = ImmutableObject<Config>
