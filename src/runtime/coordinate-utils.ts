import type { Config, LabelPosition } from '../config'

export interface CoordinateRecord {
  id: string
  latitude: number
  longitude: number
  /** Where the point came from. Manual entries leave this unset. */
  source?: 'map' | 'csv'
}

export interface Appearance {
  showLabels: boolean
  labelSize: number
  labelColor: string
  labelFont: string
  labelBold: boolean
  labelPosition: LabelPosition
  labelOffset: number
}

export const LABEL_FONTS = ['Arial', 'Verdana', 'Tahoma', 'Calibri', 'Courier New']
export const LABEL_POSITIONS: LabelPosition[] = ['left', 'right', 'above', 'below']

export type ValidationError = 'latitude' | 'longitude' | null

export const validateCoordinate = (lat: number, lon: number): ValidationError => {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return 'latitude'
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) return 'longitude'
  return null
}

/** Reads "lat, lon", "lat lon" or "lat;lon" from pasted text. Returns null for anything else. */
export const parseLatLonPair = (text: string): { latitude: string, longitude: string } | null => {
  const match = /^\s*\(?\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*\)?\s*$/.exec(text ?? '')
  return match ? { latitude: match[1], longitude: match[2] } : null
}

/** Accepts a blank or partly typed number as "not a number" rather than 0. */
export const toNumber = (text: string): number => text.trim() === '' ? NaN : Number(text.trim())

export const formatLatLon = (record: { latitude: number, longitude: number }, decimals: number) =>
  `${record.latitude.toFixed(decimals)}, ${record.longitude.toFixed(decimals)}`

export const makeId = (prefix = 'pt') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

/** Maps a label position to TextSymbol alignment and offsets. */
export const labelPlacement = (position: LabelPosition, offset: number) => {
  switch (position) {
    case 'left': return { horizontalAlignment: 'right', verticalAlignment: 'middle', xoffset: -offset, yoffset: 0 }
    case 'above': return { horizontalAlignment: 'center', verticalAlignment: 'bottom', xoffset: 0, yoffset: offset }
    case 'below': return { horizontalAlignment: 'center', verticalAlignment: 'top', xoffset: 0, yoffset: -offset }
    default: return { horizontalAlignment: 'left', verticalAlignment: 'middle', xoffset: offset, yoffset: 0 }
  }
}

/**
 * Builds an Appearance from widget config or a cached v5/v6 appearance.
 * v5 stored labelAlignment + x/y offsets; these are converted to a position + distance.
 */
export const normalizeAppearance = (source: Partial<Config & Appearance> | undefined, fallback?: Appearance): Appearance => {
  const s = source ?? {}
  let position = s.labelPosition
  let offset = s.labelOffset

  if (!position && s.labelAlignment) {
    if (s.labelAlignment === 'right') position = 'left'
    else if (s.labelAlignment === 'center') position = Number(s.labelYOffset) < 0 ? 'below' : 'above'
    else position = 'right'
  }
  if (offset == null && (s.labelXOffset != null || s.labelYOffset != null)) {
    offset = Math.max(Math.abs(Number(s.labelXOffset) || 0), Math.abs(Number(s.labelYOffset) || 0))
  }

  return {
    showLabels: s.showLabels ?? fallback?.showLabels ?? true,
    labelSize: Number(s.labelSize ?? fallback?.labelSize ?? 12),
    labelColor: s.labelColor ?? fallback?.labelColor ?? '#000000',
    labelFont: s.labelFont ?? fallback?.labelFont ?? 'Arial',
    labelBold: s.labelBold ?? fallback?.labelBold ?? true,
    labelPosition: LABEL_POSITIONS.includes(position) ? position : (fallback?.labelPosition ?? 'right'),
    labelOffset: Number.isFinite(Number(offset)) ? Number(offset) : (fallback?.labelOffset ?? 12)
  }
}

const csvEscape = (value: string | number) => {
  const text = String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export const recordsToCsv = (records: CoordinateRecord[]) =>
  ['ID,Latitude,Longitude', ...records.map(r => [r.id, r.latitude, r.longitude].map(csvEscape).join(','))].join('\r\n')

export const parseCsvRows = (text: string): string[][] => {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"'
        i++
      } else {
        quoted = !quoted
      }
    } else if (char === ',' && !quoted) {
      row.push(field)
      field = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      if (row.some(value => value.trim() !== '')) rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }

  row.push(field)
  if (row.some(value => value.trim() !== '')) rows.push(row)
  return rows
}

export type CsvImportResult =
  | { ok: true, records: CoordinateRecord[], skipped: number }
  | { ok: false, error: 'empty' | 'columns' | 'noValid' }

export const csvToRecords = (rawText: string): CsvImportResult => {
  const rows = parseCsvRows(rawText.replace(/^﻿/, ''))
  if (rows.length < 2) return { ok: false, error: 'empty' }

  const headers = rows[0].map(header => header.trim().toLowerCase())
  const latIndex = headers.findIndex(h => ['latitude', 'lat', 'y'].includes(h))
  const lonIndex = headers.findIndex(h => ['longitude', 'lon', 'lng', 'long', 'x'].includes(h))
  const idIndex = headers.findIndex(h => ['id', 'coordinateid', 'coordinate_id'].includes(h))
  if (latIndex < 0 || lonIndex < 0) return { ok: false, error: 'columns' }

  const records: CoordinateRecord[] = []
  let skipped = 0
  rows.slice(1).forEach(columns => {
    const lat = toNumber(String(columns[latIndex] ?? ''))
    const lon = toNumber(String(columns[lonIndex] ?? ''))
    if (validateCoordinate(lat, lon)) {
      skipped++
      return
    }
    const id = (idIndex >= 0 ? String(columns[idIndex] ?? '').trim() : '') || makeId('import')
    records.push({ id, latitude: lat, longitude: lon, source: 'csv' })
  })

  return records.length ? { ok: true, records, skipped } : { ok: false, error: 'noValid' }
}
