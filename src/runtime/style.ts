import { css } from 'jimu-core'

export const widgetStyle = css`
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-size: 0.8125rem;
  /* Set explicitly: templates such as Tab give the page white text for their coloured background. */
  color: var(--sys-color-surface-paper-text);

  .cp-mono {
    font-family: ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', monospace;
    font-variant-numeric: tabular-nums;
  }

  /* ---- entry ---- */
  .cp-entry {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    gap: var(--sys-spacing-2);
    padding: var(--sys-spacing-3);
    border-bottom: 1px solid var(--sys-color-divider-secondary);
    background: var(--sys-color-surface-background);
  }
  .cp-entry-row {
    display: flex;
    align-items: flex-end;
    gap: var(--sys-spacing-2);
  }
  .cp-field {
    flex: 1 1 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .cp-field label {
    margin: 0;
    font-size: 0.75rem;
    color: var(--sys-color-surface-paper-hint);
  }
  .cp-field input {
    font-family: ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', monospace;
  }
  /* Inputs and the square buttons share one height so they line up. */
  .cp-entry-row .cp-field > :not(label) {
    height: 32px;
  }
  .cp-entry-row .cp-field input {
    height: 100%;
  }
  /* Doubled class beats jimu-ui's own button padding and icon spacing so the icon sits dead centre. */
  .cp-square.cp-square {
    flex: 0 0 auto;
    width: 32px;
    min-width: 32px;
    height: 32px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .cp-square.cp-square .jimu-icon {
    margin: 0;
  }
  .cp-hint {
    display: flex;
    align-items: center;
    gap: var(--sys-spacing-1);
    font-size: 0.75rem;
    color: var(--sys-color-surface-paper-hint);
  }
  .cp-hint.is-picking {
    color: var(--sys-color-primary-main);
    font-weight: 500;
  }
  .cp-error {
    font-size: 0.75rem;
    color: var(--sys-color-error-main);
  }

  /* ---- list ---- */
  .cp-list-head {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: var(--sys-spacing-2);
    padding: var(--sys-spacing-2) var(--sys-spacing-2) var(--sys-spacing-1) var(--sys-spacing-3);
  }
  .cp-list-head h3 {
    margin: 0;
    font-size: 0.8125rem;
    font-weight: 600;
  }
  .cp-count {
    min-width: 20px;
    padding: 0 6px;
    border: 1px solid var(--sys-color-divider-secondary);
    border-radius: 99px;
    font-size: 0.75rem;
    font-weight: 600;
    line-height: 18px;
    text-align: center;
    color: var(--sys-color-surface-paper-hint);
  }
  .cp-spacer { flex: 1; }
  .cp-list {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
    margin: 0;
    padding: 0 var(--sys-spacing-1) var(--sys-spacing-2);
    list-style: none;
  }
  .cp-item {
    display: flex;
    align-items: center;
    gap: var(--sys-spacing-2);
    min-height: 36px;
    padding: 2px var(--sys-spacing-1) 2px var(--sys-spacing-2);
    border-radius: var(--sys-shape-shape1);
  }
  .cp-item:hover,
  .cp-item:focus-within {
    background: var(--sys-color-action-hover);
  }
  .cp-item.is-editing {
    align-items: flex-start;
    margin: var(--sys-spacing-1) 0;
    padding: var(--sys-spacing-2);
    background: var(--sys-color-surface-paper);
    box-shadow: inset 0 0 0 1px var(--sys-color-primary-main);
  }
  .cp-item.is-editing .cp-chip {
    margin-top: 3px;
  }
  .cp-edit {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--sys-spacing-2);
  }
  .cp-edit-row {
    display: flex;
    align-items: center;
    gap: var(--sys-spacing-2);
    margin: 0;
  }
  .cp-edit-row > span {
    flex: 0 0 28px;
    font-size: 0.75rem;
    color: var(--sys-color-surface-paper-hint);
  }
  .cp-edit-row > :not(span) {
    flex: 1 1 auto;
    min-width: 0;
  }
  .cp-edit-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--sys-spacing-2);
  }
  .cp-item.is-new {
    animation: cp-flash 1.2s ease-out;
  }
  @keyframes cp-flash {
    from { background: var(--sys-color-action-pressed); }
  }
  .cp-chip {
    flex: 0 0 auto;
    min-width: 22px;
    height: 22px;
    padding: 0 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 99px;
    color: #fff;
    font-size: 0.6875rem;
    font-weight: 600;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12);
  }
  .cp-coord {
    flex: 1 1 auto;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  /* Row actions are hidden until the row is hovered or receives keyboard focus; always shown on touch screens. */
  .cp-actions {
    flex: 0 0 auto;
    display: flex;
    gap: 2px;
    opacity: 0;
    transition: opacity 120ms ease;
  }
  .cp-item:hover .cp-actions,
  .cp-item:focus-within .cp-actions {
    opacity: 1;
  }
  @media (hover: none) {
    .cp-actions { opacity: 1; }
  }
  .cp-item.is-editing:hover {
    background: var(--sys-color-surface-paper);
  }
  .cp-empty {
    margin: var(--sys-spacing-8) var(--sys-spacing-5);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--sys-spacing-2);
    text-align: center;
    color: var(--sys-color-surface-paper-hint);
  }
  .cp-empty strong {
    color: var(--sys-color-surface-paper-text);
    font-weight: 600;
  }
  .cp-notice {
    margin: var(--sys-spacing-2) var(--sys-spacing-3) 0;
    padding: var(--sys-spacing-2);
    border-radius: var(--sys-shape-shape1);
    background: var(--sys-color-warning-light);
    color: var(--sys-color-warning-text);
    font-size: 0.75rem;
  }

  /* ---- appearance ---- */
  .cp-appearance {
    flex: 0 0 auto;
    max-height: 60%;
    display: flex;
    flex-direction: column;
    border-top: 1px solid var(--sys-color-divider-secondary);
  }
  .cp-appearance-toggle {
    width: 100%;
    display: flex;
    align-items: center;
    gap: var(--sys-spacing-3);
    padding: var(--sys-spacing-2) var(--sys-spacing-3);
    border: 0;
    background: transparent;
    color: inherit;
    text-align: start;
    cursor: pointer;
  }
  .cp-appearance-toggle:hover {
    background: var(--sys-color-action-hover);
  }
  .cp-appearance-toggle:focus-visible {
    outline: 2px solid var(--sys-color-primary-main);
    outline-offset: -2px;
  }
  .cp-appearance-title {
    font-weight: 600;
  }
  .cp-mini-preview {
    min-width: 0;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
    color: var(--sys-color-surface-paper-hint);
    white-space: nowrap;
    overflow: hidden;
  }
  .cp-dot {
    flex: 0 0 auto;
    width: 11px;
    height: 11px;
    border-radius: 50%;
    border: 2px solid #fff;
    box-shadow: 0 0 0 1px var(--sys-color-divider-primary);
  }
  .cp-chevron {
    margin-inline-start: auto;
    color: var(--sys-color-surface-paper-hint);
  }
  .cp-appearance-body {
    overflow: auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--sys-spacing-3);
    padding: var(--sys-spacing-1) var(--sys-spacing-3) var(--sys-spacing-3);
  }
  .cp-full { grid-column: 1 / -1; }
  .cp-inline {
    display: flex;
    align-items: center;
    gap: var(--sys-spacing-2);
  }
  .cp-map-preview {
    position: relative;
    height: 84px;
    border-radius: var(--sys-shape-shape1);
    border: 1px solid var(--sys-color-divider-secondary);
    overflow: hidden;
    background:
      linear-gradient(0deg, transparent 49%, rgba(127, 127, 127, 0.15) 50%, transparent 51%) 0 0 / 24px 24px,
      linear-gradient(90deg, transparent 49%, rgba(127, 127, 127, 0.15) 50%, transparent 51%) 0 0 / 24px 24px,
      #e9eef2;
  }
  .cp-map-preview-anchor {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 0;
    height: 0;
  }
  .cp-map-preview-point {
    position: absolute;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    border-style: solid;
  }
  .cp-map-preview-label {
    position: absolute;
    white-space: nowrap;
    text-shadow: 0 0 2px #fff, 0 0 2px #fff, 0 0 2px #fff;
  }
  .cp-symbol-selector {
    display: flex;
    align-items: center;
  }
  .cp-footer {
    flex: 0 0 auto;
    padding: var(--sys-spacing-1) var(--sys-spacing-3) var(--sys-spacing-2);
    font-size: 0.6875rem;
    color: var(--sys-color-surface-paper-hint);
  }

  /* ---- overlays ---- */
  .cp-toast {
    position: absolute;
    left: var(--sys-spacing-3);
    right: var(--sys-spacing-3);
    bottom: var(--sys-spacing-3);
    z-index: 2;
    display: flex;
    align-items: center;
    gap: var(--sys-spacing-2);
    padding: var(--sys-spacing-2) var(--sys-spacing-2) var(--sys-spacing-2) var(--sys-spacing-3);
    border-radius: var(--sys-shape-shape2);
    background: var(--sys-color-surface-overlay);
    color: var(--sys-color-surface-overlay-text);
    border: 1px solid var(--sys-color-divider-secondary);
    box-shadow: var(--sys-shadow-shadow2);
    animation: cp-toast-in 160ms ease-out;
  }
  .cp-toast.is-error .cp-toast-icon { color: var(--sys-color-error-main); }
  .cp-toast-icon { color: var(--sys-color-success-main); flex: 0 0 auto; }
  .cp-toast-text { flex: 1; min-width: 0; }
  @keyframes cp-toast-in {
    from { opacity: 0; transform: translateY(6px); }
  }
  .cp-drop {
    position: absolute;
    inset: var(--sys-spacing-2);
    z-index: 3;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--sys-spacing-2);
    border: 2px dashed var(--sys-color-primary-main);
    border-radius: var(--sys-shape-shape2);
    background: var(--sys-color-surface-paper);
    color: var(--sys-color-primary-main);
    font-weight: 600;
    opacity: 0.96;
    pointer-events: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .cp-item.is-new, .cp-toast { animation: none; }
  }
`
