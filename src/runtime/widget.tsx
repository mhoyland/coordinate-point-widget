import { React, hooks, classNames, type AllWidgetProps, WidgetState } from 'jimu-core'
import { JimuMapViewComponent, type JimuMapView } from 'jimu-arcgis'
import {
  Button, ButtonGroup, Dropdown, DropdownButton, DropdownItem, DropdownMenu, NumericInput, Option, Select, Switch, TextInput
} from 'jimu-ui'
import { ColorPicker } from 'jimu-ui/basic/color-picker'
import { SymbolSelector, JimuSymbolType } from 'jimu-ui/advanced/map'
import { PlusOutlined } from 'jimu-icons/outlined/editor/plus'
import { EditOutlined } from 'jimu-icons/outlined/editor/edit'
import { TrashOutlined } from 'jimu-icons/outlined/editor/trash'
import { ImportOutlined } from 'jimu-icons/outlined/editor/import'
import { ExportOutlined } from 'jimu-icons/outlined/editor/export'
import { CopyOutlined } from 'jimu-icons/outlined/editor/copy'
import { CloseOutlined } from 'jimu-icons/outlined/editor/close'
import { BoldOutlined } from 'jimu-icons/outlined/editor/bold'
import { ZoomInOutlined } from 'jimu-icons/outlined/editor/zoom-in'
import { SelectZoomToOutlined } from 'jimu-icons/outlined/gis/select-zoom-to'
import { LocateOutlined } from 'jimu-icons/outlined/application/locate'
import { PinOutlined } from 'jimu-icons/outlined/application/pin'
import { CheckOutlined } from 'jimu-icons/outlined/application/check'
import { MoreHorizontalOutlined } from 'jimu-icons/outlined/application/more-horizontal'
import { DownOutlined } from 'jimu-icons/outlined/directional/down'
import { UpOutlined } from 'jimu-icons/outlined/directional/up'
import { ErrorOutlined } from 'jimu-icons/outlined/suggested/error'
import GraphicsLayer from 'esri/layers/GraphicsLayer'
import Graphic from 'esri/Graphic'
import Point from 'esri/geometry/Point'
import SpatialReference from 'esri/geometry/SpatialReference'
import SimpleMarkerSymbol from 'esri/symbols/SimpleMarkerSymbol'
import TextSymbol from 'esri/symbols/TextSymbol'
import * as webMercatorUtils from 'esri/geometry/support/webMercatorUtils'
import type { IMConfig, LabelPosition } from '../config'
import {
  type Appearance, type CoordinateRecord, LABEL_FONTS, LABEL_POSITIONS, csvToRecords, formatLatLon, labelPlacement, makeId,
  normalizeAppearance, parseLatLonPair, recordsToCsv, toNumber, validateCoordinate
} from './coordinate-utils'
import { widgetStyle } from './style'
import defaultMessages from './translations/default'

interface CacheModel {
  records: CoordinateRecord[]
  appearance: Partial<Appearance>
  pointSymbolJson?: any
}

interface CoordinateAddRequest {
  requestId: string
  latitude: number
  longitude: number
}

interface Toast {
  text: string
  kind: 'success' | 'error'
  undo?: () => void
}

const POINT_LAYER_ID = 'coordinate-point-widget-points'
const LABEL_LAYER_ID = 'coordinate-point-widget-labels'
// Cache keys are unchanged from v5 so existing saved points load.
const CACHE_PREFIX = 'coordinate-point-widget-v5-'
const LEGACY_CACHE_PREFIX = 'coordinate-point-widget-v4-'
const WGS84 = new SpatialReference({ wkid: 4326 })
const ZOOM_TO_POINT_LEVEL = 14
const POSITION_KEYS: Record<LabelPosition, string> = {
  left: 'cpPositionLeft', right: 'cpPositionRight', above: 'cpPositionAbove', below: 'cpPositionBelow'
}

const GraphicCompat = Graphic as typeof Graphic & { fromJSON: (json: any) => Graphic }

const toWgs84Point = (record: { latitude: number, longitude: number }) =>
  new Point({ latitude: record.latitude, longitude: record.longitude, spatialReference: { wkid: 4326 } })

const pointToLatLon = (point: __esri.Point): { latitude: number, longitude: number } => {
  if (!point) return { latitude: NaN, longitude: NaN }
  if (Number.isFinite(point.latitude) && Number.isFinite(point.longitude)) {
    return { latitude: point.latitude, longitude: point.longitude }
  }
  if (webMercatorUtils.canProject(point, WGS84)) {
    const projected = webMercatorUtils.project(point, WGS84) as __esri.Point
    if (projected) return { latitude: projected.y, longitude: projected.x }
  }
  return { latitude: NaN, longitude: NaN }
}

const Widget = (props: AllWidgetProps<IMConfig>) => {
  const translate = hooks.useTranslation(defaultMessages)
  const config = props.config
  const decimals = Math.min(10, Math.max(0, Number(config?.decimalPlaces ?? 6)))
  const configAppearance = React.useMemo(() => normalizeAppearance(config?.asMutable?.() ?? (config as any)), [config])

  const defaultPointSymbol = React.useMemo(() => new SimpleMarkerSymbol({
    style: 'circle',
    size: config?.pointSize ?? 10,
    color: config?.pointColor ?? '#007ac2',
    outline: { color: config?.pointOutlineColor ?? '#ffffff', width: config?.pointOutlineWidth ?? 2 }
  }), [config?.pointSize, config?.pointColor, config?.pointOutlineColor, config?.pointOutlineWidth])

  const [jimuMapView, setJimuMapView] = React.useState<JimuMapView>(null)
  const [records, setRecords] = React.useState<CoordinateRecord[]>([])
  const [appearance, setAppearance] = React.useState<Appearance>(configAppearance)
  const [pointSymbol, setPointSymbol] = React.useState<any>(defaultPointSymbol)
  const [latitude, setLatitude] = React.useState('')
  const [longitude, setLongitude] = React.useState('')
  const [entryError, setEntryError] = React.useState<'latitude' | 'longitude' | null>(null)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editLat, setEditLat] = React.useState('')
  const [editLon, setEditLon] = React.useState('')
  const [newId, setNewId] = React.useState<string | null>(null)
  const [picking, setPicking] = React.useState(false)
  const [appearanceOpen, setAppearanceOpen] = React.useState(false)
  const [dragActive, setDragActive] = React.useState(false)
  const [toast, setToast] = React.useState<Toast | null>(null)

  const cacheKey = `${CACHE_PREFIX}${props.id}`
  const legacyCacheKey = `${LEGACY_CACHE_PREFIX}${props.id}`
  const cacheLoadedRef = React.useRef(false)
  const recordsRef = React.useRef(records)
  recordsRef.current = records
  const toastTimerRef = React.useRef<number>(null)
  const dragDepthRef = React.useRef(0)
  const latInputRef = React.useRef<HTMLInputElement>(null)
  const importInputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLUListElement>(null)
  const lastAddRequestRef = React.useRef<string | null>(null)

  const hasMap = props.useMapWidgetIds?.length === 1
  const view = jimuMapView?.view

  // ---------- feedback ----------
  const showToast = React.useCallback((next: Toast) => {
    window.clearTimeout(toastTimerRef.current)
    setToast(next)
    toastTimerRef.current = window.setTimeout(() => { setToast(null) }, next.undo ? 5000 : 2600)
  }, [])
  React.useEffect(() => () => { window.clearTimeout(toastTimerRef.current) }, [])

  // ---------- cache ----------
  const symbolFromJson = React.useCallback((json: any) => {
    if (!json) return defaultPointSymbol
    try {
      return GraphicCompat.fromJSON({ geometry: { x: 0, y: 0, spatialReference: { wkid: 4326 } }, symbol: json }).symbol ?? defaultPointSymbol
    } catch {
      return defaultPointSymbol
    }
  }, [defaultPointSymbol])

  React.useEffect(() => {
    try {
      const cached = localStorage.getItem(cacheKey) ?? localStorage.getItem(legacyCacheKey)
      if (!cached) return
      const parsed = JSON.parse(cached) as Partial<CacheModel>
      if (Array.isArray(parsed.records)) {
        setRecords(parsed.records
          .filter((r: any) => r && typeof r.id === 'string' && !validateCoordinate(Number(r.latitude), Number(r.longitude)))
          .map((r: any) => ({
            id: r.id,
            latitude: Number(r.latitude),
            longitude: Number(r.longitude),
            ...(r.source === 'map' || r.source === 'csv' ? { source: r.source } : {})
          })))
      }
      if (parsed.appearance) setAppearance(normalizeAppearance(parsed.appearance as any, configAppearance))
      if (parsed.pointSymbolJson) setPointSymbol(symbolFromJson(parsed.pointSymbolJson))
    } catch (err) {
      console.warn('Coordinate Point: cached data could not be read.', err)
    } finally {
      cacheLoadedRef.current = true
    }
    // Load once per widget instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, legacyCacheKey])

  React.useEffect(() => {
    if (!cacheLoadedRef.current) return
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ records, appearance, pointSymbolJson: pointSymbol?.toJSON?.() }))
    } catch (err) {
      console.warn('Coordinate Point: could not save to browser storage.', err)
    }
  }, [records, appearance, pointSymbol, cacheKey])

  // ---------- map layers ----------
  const ensureLayers = React.useCallback((jmv: JimuMapView | null) => {
    const map = jmv?.view?.map
    if (!map) return null
    let pointLayer = map.findLayerById(POINT_LAYER_ID) as GraphicsLayer
    if (!pointLayer) {
      pointLayer = new GraphicsLayer({ id: POINT_LAYER_ID, title: 'Coordinate Points', listMode: 'show' })
      map.add(pointLayer)
    }
    let labelLayer = map.findLayerById(LABEL_LAYER_ID) as GraphicsLayer
    if (!labelLayer) {
      labelLayer = new GraphicsLayer({ id: LABEL_LAYER_ID, title: 'Coordinate Labels', listMode: 'show' })
      map.add(labelLayer)
    }
    return { pointLayer, labelLayer }
  }, [])

  React.useEffect(() => {
    const layers = ensureLayers(jimuMapView)
    if (!layers) return
    const placement = labelPlacement(appearance.labelPosition, appearance.labelOffset)
    layers.pointLayer.removeAll()
    layers.labelLayer.removeAll()

    records.forEach(record => {
      const geometry = toWgs84Point(record)
      const attributes = { coordinateId: record.id, latitude: record.latitude, longitude: record.longitude }
      layers.pointLayer.add(new Graphic({ geometry, symbol: pointSymbol, attributes }))
      layers.labelLayer.add(new Graphic({
        geometry,
        attributes,
        visible: appearance.showLabels,
        symbol: new TextSymbol({
          text: formatLatLon(record, decimals),
          color: appearance.labelColor,
          haloColor: '#ffffff',
          haloSize: 2,
          font: { size: appearance.labelSize, family: appearance.labelFont, weight: appearance.labelBold ? 'bold' : 'normal' },
          ...(placement as any)
        })
      }))
    })
  }, [jimuMapView, records, appearance, pointSymbol, decimals, ensureLayers])

  const onActiveViewChange = (jmv: JimuMapView) => {
    setJimuMapView(jmv)
    ensureLayers(jmv)
  }

  // ---------- record operations ----------
  const addRecord = React.useCallback((lat: number, lon: number, source?: CoordinateRecord['source']) => {
    const id = makeId(source === 'map' ? 'context' : 'pt')
    setRecords(current => [...current, { id, latitude: lat, longitude: lon, ...(source ? { source } : {}) }])
    setNewId(id)
    showToast({
      kind: 'success',
      text: translate(source === 'map' ? 'cpAddedFromMap' : 'cpAdded', { coord: formatLatLon({ latitude: lat, longitude: lon }, decimals) })
    })
    window.requestAnimationFrame(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }) })
  }, [decimals, showToast, translate])

  const addRecordRef = React.useRef(addRecord)
  addRecordRef.current = addRecord

  const submitEntry = () => {
    const lat = toNumber(latitude)
    const lon = toNumber(longitude)
    const error = validateCoordinate(lat, lon)
    setEntryError(error)
    if (error) return
    addRecord(lat, lon)
    setLatitude('')
    setLongitude('')
    latInputRef.current?.focus()
  }

  const startEdit = (record: CoordinateRecord) => {
    setEditingId(record.id)
    setEditLat(record.latitude.toFixed(decimals))
    setEditLon(record.longitude.toFixed(decimals))
  }

  const cancelEdit = () => { setEditingId(null) }

  const saveEdit = () => {
    const original = recordsRef.current.find(r => r.id === editingId)
    // The boxes show rounded values; an untouched box keeps the full-precision original.
    const lat = original && editLat === original.latitude.toFixed(decimals) ? original.latitude : toNumber(editLat)
    const lon = original && editLon === original.longitude.toFixed(decimals) ? original.longitude : toNumber(editLon)
    const error = validateCoordinate(lat, lon)
    if (error) {
      showToast({ kind: 'error', text: translate(error === 'latitude' ? 'cpErrorLatitude' : 'cpErrorLongitude') })
      return
    }
    setRecords(current => current.map(r => r.id === editingId ? { ...r, latitude: lat, longitude: lon } : r))
    setEditingId(null)
    showToast({ kind: 'success', text: translate('cpUpdated') })
  }

  const restore = (snapshot: CoordinateRecord[]) => () => {
    setRecords(snapshot)
    setToast(null)
  }

  const removeRecord = (record: CoordinateRecord) => {
    const snapshot = recordsRef.current
    setRecords(current => current.filter(r => r.id !== record.id))
    if (editingId === record.id) setEditingId(null)
    showToast({ kind: 'success', text: translate('cpRemoved'), undo: restore(snapshot) })
  }

  const clearAll = () => {
    const snapshot = recordsRef.current
    if (!snapshot.length) return
    setRecords([])
    setEditingId(null)
    showToast({ kind: 'success', text: translate('cpCleared'), undo: restore(snapshot) })
  }

  // ---------- map interaction ----------
  const zoomToRecord = (record: CoordinateRecord) => {
    if (!view) return
    void view.goTo({ target: toWgs84Point(record), zoom: Math.max(view.zoom ?? 0, ZOOM_TO_POINT_LEVEL) })
  }

  const zoomToAll = () => {
    if (!view || !records.length) return
    if (records.length === 1) zoomToRecord(records[0])
    else void view.goTo(records.map(toWgs84Point))
  }

  React.useEffect(() => {
    if (!picking || !view) return
    const container = view.container as HTMLElement
    const previousCursor = container?.style.cursor
    if (container) container.style.cursor = 'crosshair'

    const handle = view.on('click', (event: __esri.ViewClickEvent) => {
      event.stopPropagation()
      const { latitude: lat, longitude: lon } = pointToLatLon(event.mapPoint)
      if (validateCoordinate(lat, lon)) {
        showToast({ kind: 'error', text: translate('cpErrorFromMap') })
        return
      }
      addRecordRef.current(lat, lon, 'map')
    })
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setPicking(false) }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      handle.remove()
      document.removeEventListener('keydown', onKeyDown)
      if (container) container.style.cursor = previousCursor
    }
  }, [picking, view, showToast, translate])

  // Stop picking when the widget is closed in a Widget Controller.
  React.useEffect(() => {
    if (props.state === WidgetState.Closed) setPicking(false)
  }, [props.state])

  // Receive a point from Map Context Menu. The request is written to this widget's
  // mutable state before Experience Builder opens it; requestId prevents re-processing.
  const addRequest = (props as any).mutableStateProps?.coordinateAddRequest as CoordinateAddRequest | undefined
  React.useEffect(() => {
    if (!addRequest?.requestId || lastAddRequestRef.current === addRequest.requestId) return
    lastAddRequestRef.current = addRequest.requestId
    const lat = Number(addRequest.latitude)
    const lon = Number(addRequest.longitude)
    if (validateCoordinate(lat, lon)) {
      showToast({ kind: 'error', text: translate('cpErrorFromMap') })
      return
    }
    addRecordRef.current(lat, lon, 'map')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addRequest?.requestId])

  // ---------- CSV ----------
  const importFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = csvToRecords(String(reader.result ?? ''))
      if (result.ok === false) {
        const key = { empty: 'cpErrorCsvEmpty', columns: 'cpErrorCsvColumns', noValid: 'cpErrorCsvNoValid' }[result.error]
        showToast({ kind: 'error', text: translate(key) })
        return
      }
      setRecords(current => [...current, ...result.records])
      showToast({
        kind: 'success',
        text: result.skipped
          ? translate('cpImportedSkipped', { count: result.records.length, skipped: result.skipped })
          : translate('cpImported', { count: result.records.length })
      })
    }
    reader.onerror = () => { showToast({ kind: 'error', text: translate('cpErrorCsvRead') }) }
    reader.readAsText(file)
  }

  const onImportChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) importFile(file)
  }

  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([recordsToCsv(records)], { type: 'text/csv;charset=utf-8;' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'coordinates.csv'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    showToast({ kind: 'success', text: translate('cpExported', { count: records.length }) })
  }

  const copyAll = async () => {
    const text = records.map(r => formatLatLon(r, decimals)).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      showToast({ kind: 'success', text: translate('cpCopied', { count: records.length }) })
    } catch {
      showToast({ kind: 'error', text: translate('cpErrorCopy') })
    }
  }

  const hasFiles = (event: React.DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes('Files')
  const dropHandlers = {
    onDragEnter: (event: React.DragEvent) => {
      if (!hasFiles(event)) return
      dragDepthRef.current++
      setDragActive(true)
    },
    onDragOver: (event: React.DragEvent) => {
      if (!hasFiles(event)) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'
    },
    onDragLeave: (event: React.DragEvent) => {
      if (!hasFiles(event)) return
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
      if (dragDepthRef.current === 0) setDragActive(false)
    },
    onDrop: (event: React.DragEvent) => {
      if (!hasFiles(event)) return
      event.preventDefault()
      dragDepthRef.current = 0
      setDragActive(false)
      const file = Array.from(event.dataTransfer.files).find(f => /\.csv$/i.test(f.name) || f.type.includes('csv')) ?? event.dataTransfer.files[0]
      if (file) importFile(file)
    }
  }

  // ---------- paste ----------
  const onPastePair = (setLat: (v: string) => void, setLon: (v: string) => void, announce: boolean) =>
    (event: React.ClipboardEvent<HTMLInputElement>) => {
      const pair = parseLatLonPair(event.clipboardData.getData('text'))
      if (!pair) return
      event.preventDefault()
      setLat(pair.latitude)
      setLon(pair.longitude)
      setEntryError(null)
      if (announce) showToast({ kind: 'success', text: translate('cpFilledFromPaste') })
    }

  // ---------- appearance ----------
  const updateAppearance = <K extends keyof Appearance>(key: K, value: Appearance[K]) => {
    setAppearance(current => ({ ...current, [key]: value }))
  }

  const resetAppearance = () => {
    setAppearance(configAppearance)
    setPointSymbol(defaultPointSymbol)
  }

  const symbolColor: string = pointSymbol?.color?.toCss?.(true) ?? 'var(--sys-color-primary-main)'
  const symbolOutline: string = pointSymbol?.outline?.color?.toCss?.(true) ?? '#ffffff'
  const symbolSizePx = Math.min(28, Math.max(6, Number(pointSymbol?.size ?? 10) * 4 / 3))
  const sampleText = formatLatLon(records[0] ?? { latitude: -33.8568, longitude: 151.2153 }, decimals)

  const previewLabelStyle = (): React.CSSProperties => {
    const gap = appearance.labelOffset * 4 / 3
    const base: React.CSSProperties = {
      fontFamily: appearance.labelFont,
      fontSize: `${appearance.labelSize * 4 / 3}px`,
      fontWeight: appearance.labelBold ? 700 : 400,
      color: appearance.labelColor
    }
    switch (appearance.labelPosition) {
      case 'left': return { ...base, right: gap, transform: 'translateY(-50%)' }
      case 'above': return { ...base, bottom: gap, transform: 'translateX(-50%)' }
      case 'below': return { ...base, top: gap, transform: 'translateX(-50%)' }
      default: return { ...base, left: gap, transform: 'translateY(-50%)' }
    }
  }

  // ---------- render ----------
  const renderItem = (record: CoordinateRecord, index: number) => {
    const n = index + 1
    if (editingId === record.id) {
      const onKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') saveEdit()
        if (event.key === 'Escape') cancelEdit()
      }
      return (
        <li key={record.id} className='cp-item is-editing'>
          <span className='cp-chip' style={{ background: symbolColor }} aria-hidden='true'>{n}</span>
          <div className='cp-edit'>
            <label className='cp-edit-row' htmlFor={`cp-edit-lat-${props.id}`}>
              <span>{translate('cpLatShort')}</span>
              <TextInput id={`cp-edit-lat-${props.id}`} size='sm' className='cp-mono' value={editLat} autoFocus
                inputMode='decimal' aria-label={translate('cpLatitude')}
                onChange={e => { setEditLat(e.target.value) }} onKeyDown={onKeyDown} onPaste={onPastePair(setEditLat, setEditLon, false)} />
            </label>
            <label className='cp-edit-row' htmlFor={`cp-edit-lon-${props.id}`}>
              <span>{translate('cpLonShort')}</span>
              <TextInput id={`cp-edit-lon-${props.id}`} size='sm' className='cp-mono' value={editLon}
                inputMode='decimal' aria-label={translate('cpLongitude')}
                onChange={e => { setEditLon(e.target.value) }} onKeyDown={onKeyDown} onPaste={onPastePair(setEditLat, setEditLon, false)} />
            </label>
            <div className='cp-edit-actions'>
              <Button size='sm' type='tertiary' onClick={cancelEdit}>{translate('cpCancel')}</Button>
              <Button size='sm' type='primary' onClick={saveEdit}>{translate('cpSave')}</Button>
            </div>
          </div>
        </li>
      )
    }

    const text = formatLatLon(record, decimals)
    return (
      <li key={record.id} className={classNames('cp-item', { 'is-new': record.id === newId })}>
        <span className='cp-chip' style={{ background: symbolColor }} aria-hidden='true'>{n}</span>
        <span className='cp-coord cp-mono' title={text}>{text}</span>
        <span className='cp-actions'>
          <Button size='sm' type='tertiary' icon disabled={!view} title={translate('cpZoomTo', { n })}
            aria-label={translate('cpZoomTo', { n })} onClick={() => { zoomToRecord(record) }}>
            <ZoomInOutlined />
          </Button>
          <Button size='sm' type='tertiary' icon title={translate('cpEdit', { n })}
            aria-label={translate('cpEdit', { n })} onClick={() => { startEdit(record) }}>
            <EditOutlined />
          </Button>
          <Button size='sm' type='tertiary' icon title={translate('cpRemove', { n })}
            aria-label={translate('cpRemove', { n })} onClick={() => { removeRecord(record) }}>
            <TrashOutlined />
          </Button>
        </span>
      </li>
    )
  }

  const errorText = !entryError
    ? ''
    : (latitude.trim() === '' || longitude.trim() === '')
        ? translate('cpErrorEmpty')
        : translate(entryError === 'latitude' ? 'cpErrorLatitude' : 'cpErrorLongitude')
  const labelsDisabled = !appearance.showLabels

  return (
    <div css={widgetStyle} className='jimu-widget widget-coordinate-point' {...dropHandlers}>
      {hasMap && <JimuMapViewComponent useMapWidgetId={props.useMapWidgetIds[0]} onActiveViewChange={onActiveViewChange} />}

      {/* ---- entry ---- */}
      <div className='cp-entry'>
        <div className='cp-entry-row'>
          <div className='cp-field'>
            <label htmlFor={`cp-lat-${props.id}`}>{translate('cpLatitude')}</label>
            <TextInput
              id={`cp-lat-${props.id}`}
              ref={latInputRef}
              value={latitude}
              placeholder='-34.123456'
              inputMode='decimal'
              autoComplete='off'
              aria-invalid={entryError === 'latitude'}
              aria-describedby={entryError ? `cp-err-${props.id}` : undefined}
              onChange={e => { setLatitude(e.target.value); setEntryError(null) }}
              onKeyDown={e => { if (e.key === 'Enter') submitEntry() }}
              onPaste={onPastePair(setLatitude, setLongitude, true)}
            />
          </div>
          <div className='cp-field'>
            <label htmlFor={`cp-lon-${props.id}`}>{translate('cpLongitude')}</label>
            <TextInput
              id={`cp-lon-${props.id}`}
              value={longitude}
              placeholder='150.987654'
              inputMode='decimal'
              autoComplete='off'
              aria-invalid={entryError === 'longitude'}
              aria-describedby={entryError ? `cp-err-${props.id}` : undefined}
              onChange={e => { setLongitude(e.target.value); setEntryError(null) }}
              onKeyDown={e => { if (e.key === 'Enter') submitEntry() }}
              onPaste={onPastePair(setLatitude, setLongitude, true)}
            />
          </div>
          <Button
            className='cp-square'
            icon
            type={picking ? 'primary' : 'default'}
            disabled={!view}
            aria-pressed={picking}
            title={translate(picking ? 'cpStopPicking' : 'cpPickOnMap')}
            aria-label={translate(picking ? 'cpStopPicking' : 'cpPickOnMap')}
            onClick={() => { setPicking(p => !p) }}
          >
            <LocateOutlined />
          </Button>
          <Button className='cp-square' icon type='primary' title={translate('cpAddCoordinate')} aria-label={translate('cpAddCoordinate')} onClick={submitEntry}>
            <PlusOutlined />
          </Button>
        </div>
        {errorText
          ? <div className='cp-error' id={`cp-err-${props.id}`} role='alert'>{errorText}</div>
          : (
            <div className={classNames('cp-hint', { 'is-picking': picking })}>
              {picking ? <LocateOutlined size={12} /> : <CopyOutlined size={12} />}
              {translate(picking ? 'cpPickingHint' : 'cpPasteHint')}
            </div>
            )}
      </div>

      {!hasMap && <div className='cp-notice'>{translate('cpNoMap')}</div>}

      {/* ---- list ---- */}
      <div className='cp-list-head'>
        <h3 id={`cp-list-${props.id}`}>{translate('cpCoordinates')}</h3>
        <span className='cp-count'>{records.length}</span>
        <span className='cp-spacer' />
        <Button size='sm' type='tertiary' icon disabled={!view || !records.length}
          title={translate('cpZoomToAll')} aria-label={translate('cpZoomToAll')} onClick={zoomToAll}>
          <SelectZoomToOutlined />
        </Button>
        <Dropdown activeIcon={false} aria-label={translate('cpMoreActions')}>
          <DropdownButton size='sm' type='tertiary' icon arrow={false} title={translate('cpMoreActions')} aria-label={translate('cpMoreActions')}>
            <MoreHorizontalOutlined />
          </DropdownButton>
          <DropdownMenu alignment='end'>
            <DropdownItem onClick={() => importInputRef.current?.click()}>
              <ImportOutlined className='mr-2' />{translate('cpImportCsv')}
            </DropdownItem>
            <DropdownItem disabled={!records.length} onClick={exportCsv}>
              <ExportOutlined className='mr-2' />{translate('cpExportCsv')}
            </DropdownItem>
            <DropdownItem disabled={!records.length} onClick={() => { void copyAll() }}>
              <CopyOutlined className='mr-2' />{translate('cpCopyAll')}
            </DropdownItem>
            <DropdownItem divider />
            <DropdownItem disabled={!records.length} onClick={clearAll} className='text-danger'>
              <TrashOutlined className='mr-2' />{translate('cpClearAll')}
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
        <input ref={importInputRef} type='file' accept='.csv,text/csv' hidden onChange={onImportChange} />
      </div>

      {records.length
        ? <ul className='cp-list' ref={listRef} aria-labelledby={`cp-list-${props.id}`}>{records.map(renderItem)}</ul>
        : (
          <div className='cp-list'>
            <div className='cp-empty'>
              <PinOutlined size={24} />
              <strong>{translate('cpEmptyTitle')}</strong>
              <span>{translate('cpEmptyBody')}</span>
            </div>
          </div>
          )}

      {/* ---- appearance ---- */}
      <div className='cp-appearance'>
        <button
          type='button'
          className='cp-appearance-toggle'
          aria-expanded={appearanceOpen}
          aria-controls={`cp-appearance-${props.id}`}
          onClick={() => { setAppearanceOpen(o => !o) }}
        >
          <span className='cp-appearance-title'>{translate('cpAppearance')}</span>
          {!appearanceOpen && (
            <span className='cp-mini-preview' aria-hidden='true'>
              <span className='cp-dot' style={{ background: symbolColor }} />
              {appearance.showLabels && <span style={{ color: 'inherit', fontWeight: appearance.labelBold ? 600 : 400 }}>{sampleText}</span>}
            </span>
          )}
          <span className='cp-chevron'>{appearanceOpen ? <DownOutlined size={12} /> : <UpOutlined size={12} />}</span>
        </button>

        {appearanceOpen && (
          <div className='cp-appearance-body' id={`cp-appearance-${props.id}`}>
            <div className='cp-map-preview cp-full' aria-hidden='true'>
              <div className='cp-map-preview-anchor'>
                <span className='cp-map-preview-point' style={{
                  width: symbolSizePx,
                  height: symbolSizePx,
                  background: symbolColor,
                  borderColor: symbolOutline,
                  borderWidth: Math.min(4, Number(pointSymbol?.outline?.width ?? 2))
                }} />
                {appearance.showLabels && <span className='cp-map-preview-label' style={previewLabelStyle()}>{sampleText}</span>}
              </div>
            </div>

            <div className='cp-field'>
              <label>{translate('cpPointSymbol')}</label>
              <div className='cp-symbol-selector'>
                <SymbolSelector
                  symbol={pointSymbol}
                  jimuSymbolType={JimuSymbolType.Point}
                  btnSize='sm'
                  onPointSymbolChanged={(symbol: any) => { setPointSymbol(symbol) }}
                />
              </div>
            </div>
            <div className='cp-field'>
              <label htmlFor={`cp-showlabels-${props.id}`}>{translate('cpShowLabels')}</label>
              <div className='cp-inline' style={{ height: 26 }}>
                <Switch id={`cp-showlabels-${props.id}`} checked={appearance.showLabels}
                  onChange={e => { updateAppearance('showLabels', e.target.checked) }} />
              </div>
            </div>

            <div className='cp-field'>
              <label>{translate('cpLabelFont')}</label>
              <div className='cp-inline'>
                <Select size='sm' disabled={labelsDisabled} value={appearance.labelFont} aria-label={translate('cpLabelFont')}
                  onChange={e => { updateAppearance('labelFont', e.target.value) }}>
                  {LABEL_FONTS.map(font => <Option key={font} value={font}>{font}</Option>)}
                </Select>
                <Button size='sm' icon type={appearance.labelBold ? 'primary' : 'default'} disabled={labelsDisabled}
                  aria-pressed={appearance.labelBold} title={translate('cpBold')} aria-label={translate('cpBold')}
                  onClick={() => { updateAppearance('labelBold', !appearance.labelBold) }}>
                  <BoldOutlined />
                </Button>
              </div>
            </div>
            <div className='cp-field'>
              <label>{translate('cpLabelSize')} / {translate('cpLabelColor')}</label>
              <div className='cp-inline'>
                <NumericInput size='sm' min={6} max={48} disabled={labelsDisabled} value={appearance.labelSize} aria-label={translate('cpLabelSize')}
                  style={{ width: 72 }} onChange={v => { if (Number.isFinite(v)) updateAppearance('labelSize', v) }} />
                <ColorPicker color={appearance.labelColor} disabled={labelsDisabled} aria-label={translate('cpLabelColor')}
                  onChange={color => { updateAppearance('labelColor', color) }} />
              </div>
            </div>

            <div className='cp-field cp-full'>
              <label>{translate('cpLabelPosition')}</label>
              <div className='cp-inline'>
                <ButtonGroup size='sm' className='flex-grow-1' role='radiogroup' aria-label={translate('cpLabelPosition')}>
                  {LABEL_POSITIONS.map(position => (
                    <Button key={position} className='flex-grow-1' disabled={labelsDisabled}
                      type={appearance.labelPosition === position ? 'primary' : 'default'}
                      role='radio' aria-checked={appearance.labelPosition === position}
                      onClick={() => { updateAppearance('labelPosition', position) }}>
                      {translate(POSITION_KEYS[position])}
                    </Button>
                  ))}
                </ButtonGroup>
                <NumericInput size='sm' min={0} max={100} disabled={labelsDisabled} value={appearance.labelOffset}
                  title={translate('cpLabelOffset')} aria-label={translate('cpLabelOffset')} style={{ width: 64 }}
                  onChange={v => { if (Number.isFinite(v)) updateAppearance('labelOffset', v) }} />
              </div>
            </div>

            <div className='cp-full d-flex justify-content-end'>
              <Button size='sm' type='tertiary' onClick={resetAppearance}>{translate('cpResetAppearance')}</Button>
            </div>
          </div>
        )}
        <div className='cp-footer'>{translate('cpFooter')}</div>
      </div>

      {/* ---- overlays ---- */}
      <div aria-live='polite' role='status'>
        {toast && (
          <div className={classNames('cp-toast', { 'is-error': toast.kind === 'error' })}>
            <span className='cp-toast-icon'>{toast.kind === 'error' ? <ErrorOutlined /> : <CheckOutlined />}</span>
            <span className='cp-toast-text'>{toast.text}</span>
            {toast.undo && <Button size='sm' type='tertiary' onClick={toast.undo}>{translate('cpUndo')}</Button>}
            <Button size='sm' type='tertiary' icon aria-label={translate('cpDismiss')} onClick={() => { setToast(null) }}>
              <CloseOutlined size={12} />
            </Button>
          </div>
        )}
      </div>

      {dragActive && (
        <div className='cp-drop'>
          <ImportOutlined size={28} />
          {translate('cpDropCsv')}
        </div>
      )}
    </div>
  )
}

export default Widget
