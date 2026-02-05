import { PANEL_CONFIG } from './constants';

export type PanelId = keyof typeof PANEL_CONFIG;
export type PanelState = { width: number; collapsed: boolean };
export type Layout = Record<PanelId, PanelState>;
