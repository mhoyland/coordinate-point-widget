import { React, Immutable, hooks } from 'jimu-core'
import type { AllWidgetSettingProps } from 'jimu-for-builder'
import { NumericInput, Option, Select, Switch } from 'jimu-ui'
import { ColorPicker } from 'jimu-ui/basic/color-picker'
import { MapWidgetSelector, SettingRow, SettingSection } from 'jimu-ui/advanced/setting-components'
import type { Config, IMConfig, LabelPosition } from '../config'
import { LABEL_FONTS, LABEL_POSITIONS, normalizeAppearance } from '../runtime/coordinate-utils'
import defaultMessages from './translations/default'

const POSITION_KEYS: Record<LabelPosition, string> = {
  left: 'cpsPositionLeft', right: 'cpsPositionRight', above: 'cpsPositionAbove', below: 'cpsPositionBelow'
}

export default function Setting (props: AllWidgetSettingProps<IMConfig>) {
  const translate = hooks.useTranslation(defaultMessages)
  const config = (props.config?.asMutable?.({ deep: true }) ?? {}) as Config
  // Older apps saved labelAlignment + offsets; show them as position + distance.
  const label = normalizeAppearance(config)

  const update = (patch: Partial<Config>) => {
    props.onSettingChange({ id: props.id, config: Immutable({ ...config, ...patch }) as IMConfig })
  }

  const updateLabel = (patch: Partial<Config>) => {
    update({ labelPosition: label.labelPosition, labelOffset: label.labelOffset, ...patch })
  }

  return (
    <div className='widget-setting-coordinate-point'>
      <SettingSection title={translate('cpsMap')}>
        <SettingRow>
          <MapWidgetSelector
            useMapWidgetIds={props.useMapWidgetIds}
            onSelect={(useMapWidgetIds: string[]) => { props.onSettingChange({ id: props.id, useMapWidgetIds }) }}
          />
        </SettingRow>
        <SettingRow>
          <div className='text-break' style={{ fontSize: '0.75rem', color: 'var(--sys-color-surface-paper-hint)' }}>
            {translate('cpsMapHint')}
          </div>
        </SettingRow>
      </SettingSection>

      <SettingSection title={translate('cpsDisplay')}>
        <SettingRow label={translate('cpsDecimalPlaces')}>
          <NumericInput size='sm' min={0} max={10} style={{ width: 72 }} value={config.decimalPlaces ?? 6}
            aria-label={translate('cpsDecimalPlaces')}
            onChange={v => { update({ decimalPlaces: Math.min(10, Math.max(0, Number(v) || 0)) }) }} />
        </SettingRow>
      </SettingSection>

      <SettingSection title={translate('cpsDefaultPoint')}>
        <SettingRow label={translate('cpsPointColor')}>
          <ColorPicker color={config.pointColor ?? '#007ac2'} aria-label={translate('cpsPointColor')}
            onChange={pointColor => { update({ pointColor }) }} />
        </SettingRow>
        <SettingRow label={translate('cpsPointSize')}>
          <NumericInput size='sm' min={4} max={48} style={{ width: 72 }} value={config.pointSize ?? 10}
            aria-label={translate('cpsPointSize')} onChange={v => { if (Number.isFinite(v)) update({ pointSize: v }) }} />
        </SettingRow>
        <SettingRow label={translate('cpsOutlineColor')}>
          <ColorPicker color={config.pointOutlineColor ?? '#ffffff'} aria-label={translate('cpsOutlineColor')}
            onChange={pointOutlineColor => { update({ pointOutlineColor }) }} />
        </SettingRow>
        <SettingRow label={translate('cpsOutlineWidth')}>
          <NumericInput size='sm' min={0} max={10} style={{ width: 72 }} value={config.pointOutlineWidth ?? 2}
            aria-label={translate('cpsOutlineWidth')} onChange={v => { if (Number.isFinite(v)) update({ pointOutlineWidth: v }) }} />
        </SettingRow>
      </SettingSection>

      <SettingSection title={translate('cpsDefaultLabel')}>
        <SettingRow label={translate('cpsShowLabels')}>
          <Switch checked={label.showLabels} aria-label={translate('cpsShowLabels')}
            onChange={e => { update({ showLabels: e.target.checked }) }} />
        </SettingRow>
        <SettingRow label={translate('cpsLabelFont')}>
          <Select size='sm' style={{ width: 130 }} value={label.labelFont} aria-label={translate('cpsLabelFont')}
            onChange={e => { update({ labelFont: e.target.value }) }}>
            {LABEL_FONTS.map(font => <Option key={font} value={font}>{font}</Option>)}
          </Select>
        </SettingRow>
        <SettingRow label={translate('cpsLabelSize')}>
          <NumericInput size='sm' min={6} max={48} style={{ width: 72 }} value={label.labelSize}
            aria-label={translate('cpsLabelSize')} onChange={v => { if (Number.isFinite(v)) update({ labelSize: v }) }} />
        </SettingRow>
        <SettingRow label={translate('cpsLabelColor')}>
          <ColorPicker color={label.labelColor} aria-label={translate('cpsLabelColor')}
            onChange={labelColor => { update({ labelColor }) }} />
        </SettingRow>
        <SettingRow label={translate('cpsBold')}>
          <Switch checked={label.labelBold} aria-label={translate('cpsBold')}
            onChange={e => { update({ labelBold: e.target.checked }) }} />
        </SettingRow>
        <SettingRow label={translate('cpsLabelPosition')}>
          <Select size='sm' style={{ width: 130 }} value={label.labelPosition} aria-label={translate('cpsLabelPosition')}
            onChange={e => { updateLabel({ labelPosition: e.target.value as LabelPosition }) }}>
            {LABEL_POSITIONS.map(p => <Option key={p} value={p}>{translate(POSITION_KEYS[p])}</Option>)}
          </Select>
        </SettingRow>
        <SettingRow label={translate('cpsLabelOffset')}>
          <NumericInput size='sm' min={0} max={100} style={{ width: 72 }} value={label.labelOffset}
            aria-label={translate('cpsLabelOffset')} onChange={v => { if (Number.isFinite(v)) updateLabel({ labelOffset: v }) }} />
        </SettingRow>
        <SettingRow>
          <div className='text-break' style={{ fontSize: '0.75rem', color: 'var(--sys-color-surface-paper-hint)' }}>
            {translate('cpsDefaultsHint')}
          </div>
        </SettingRow>
      </SettingSection>
    </div>
  )
}
