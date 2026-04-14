import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface ThemeDef {
  key: string;
  label: string;
  dark: boolean;
  preview: { bg: string; surface: string; accent: string; };
  vars: Record<string, string>;
}

@Injectable({ providedIn: 'root' })
export class ThemeService {

  readonly themes: ThemeDef[] = [
    {
      key: 'dark', label: 'Dark', dark: true,
      preview: { bg: '#0a0b0e', surface: '#111318', accent: '#3b82f6' },
      vars: {
        '--bg': '#0a0b0e', '--surface': '#111318', '--surface2': '#181c24',
        '--border': '#1e2330', '--border2': '#252c3c',
        '--text': '#e8ecf4', '--text2': '#8b93a8', '--text3': '#4b5568',
      }
    },
    {
      key: 'light', label: 'Light', dark: false,
      preview: { bg: '#f4f6fa', surface: '#ffffff', accent: '#3b82f6' },
      vars: {
        '--bg': '#f4f6fa', '--surface': '#ffffff', '--surface2': '#f0f2f7',
        '--border': '#e2e8f0', '--border2': '#cbd5e1',
        '--text': '#1a202c', '--text2': '#64748b', '--text3': '#94a3b8',
      }
    },
    {
      key: 'midnight', label: 'Midnight', dark: true,
      preview: { bg: '#080c18', surface: '#0d1228', accent: '#818cf8' },
      vars: {
        '--bg': '#080c18', '--surface': '#0d1228', '--surface2': '#131a35',
        '--border': '#1e2a4a', '--border2': '#28366a',
        '--text': '#e2e8f0', '--text2': '#7c88a8', '--text3': '#3d4a6b',
      }
    },
    {
      key: 'ocean', label: 'Ocean', dark: true,
      preview: { bg: '#051520', surface: '#072030', accent: '#06b6d4' },
      vars: {
        '--bg': '#051520', '--surface': '#072030', '--surface2': '#0b2d45',
        '--border': '#0f3d5c', '--border2': '#154f78',
        '--text': '#e0f2fe', '--text2': '#7ab8d8', '--text3': '#2d6e90',
      }
    },
    {
      key: 'forest', label: 'Forest', dark: true,
      preview: { bg: '#060e09', surface: '#0c1a10', accent: '#22c55e' },
      vars: {
        '--bg': '#060e09', '--surface': '#0c1a10', '--surface2': '#112518',
        '--border': '#183520', '--border2': '#1f4529',
        '--text': '#dcfce7', '--text2': '#6baa80', '--text3': '#2d5c3a',
      }
    },
    {
      key: 'crimson', label: 'Crimson', dark: true,
      preview: { bg: '#0f0608', surface: '#1a0c0e', accent: '#f43f5e' },
      vars: {
        '--bg': '#0f0608', '--surface': '#1a0c0e', '--surface2': '#251016',
        '--border': '#38141c', '--border2': '#4d1824',
        '--text': '#ffe4e6', '--text2': '#b06070', '--text3': '#6b2535',
      }
    },
    {
      key: 'slate', label: 'Slate', dark: false,
      preview: { bg: '#f1f5f9', surface: '#ffffff', accent: '#6366f1' },
      vars: {
        '--bg': '#f1f5f9', '--surface': '#ffffff', '--surface2': '#e8edf5',
        '--border': '#d1d9e6', '--border2': '#b8c4d8',
        '--text': '#0f172a', '--text2': '#475569', '--text3': '#94a3b8',
      }
    },
    {
      key: 'dracula', label: 'Dracula', dark: true,
      preview: { bg: '#1e1e2e', surface: '#27273a', accent: '#bd93f9' },
      vars: {
        '--bg': '#1e1e2e', '--surface': '#27273a', '--surface2': '#313145',
        '--border': '#44475a', '--border2': '#555770',
        '--text': '#f8f8f2', '--text2': '#8b8ba8', '--text3': '#55556e',
      }
    },
  ];

  // Default accent colours per theme
  private themeAccents: Record<string, { accent: string; accent2: string; accent3: string }> = {
    dark:     { accent: '#3b82f6', accent2: '#6366f1', accent3: '#0ea5e9' },
    light:    { accent: '#3b82f6', accent2: '#6366f1', accent3: '#0ea5e9' },
    midnight: { accent: '#818cf8', accent2: '#a78bfa', accent3: '#60a5fa' },
    ocean:    { accent: '#06b6d4', accent2: '#0ea5e9', accent3: '#22d3ee' },
    forest:   { accent: '#22c55e', accent2: '#10b981', accent3: '#4ade80' },
    crimson:  { accent: '#f43f5e', accent2: '#fb7185', accent3: '#e11d48' },
    slate:    { accent: '#6366f1', accent2: '#8b5cf6', accent3: '#3b82f6' },
    dracula:  { accent: '#bd93f9', accent2: '#ff79c6', accent3: '#8be9fd' },
  };

  constructor(private api: ApiService) {}

  /** Load settings from backend and apply theme. */
  loadAndApply(): void {
    this.api.get<any>('/admin/settings').subscribe({
      next: (res: any) => {
        const settings: any[] = Array.isArray(res) ? res : (res?.data || []);
        if (!settings.length) return;
        const map: Record<string, string> = {};
        settings.forEach((s: any) => map[s.key] = s.value);
        this.applySettings(map);
      },
      error: () => {}
    });
  }

  /** Apply a settings map to CSS variables immediately */
  applySettings(map: Record<string, string>): void {
    const root      = document.documentElement;
    const themeKey  = map['theme'] || 'dark';
    const themeDef  = this.themes.find(t => t.key === themeKey) || this.themes[0];

    // Apply base vars from the theme
    Object.entries(themeDef.vars).forEach(([k, v]) => root.style.setProperty(k, v));

    // Apply accent colours — use custom primary_color if set, else theme defaults
    const defaults = this.themeAccents[themeKey] || this.themeAccents['dark'];
    const accent   = map['primary_color'] || defaults.accent;
    root.style.setProperty('--accent',  accent);
    root.style.setProperty('--accent2', defaults.accent2);
    root.style.setProperty('--accent3', defaults.accent3);
  }

  /** Live preview — called as user picks colour */
  previewColor(key: string, value: string): void {
    if (key === 'primary_color') {
      document.documentElement.style.setProperty('--accent', value);
    }
  }

  /** Live preview — called as user switches theme */
  previewTheme(themeKey: string): void {
    const themeDef = this.themes.find(t => t.key === themeKey);
    if (!themeDef) return;
    const root = document.documentElement;
    Object.entries(themeDef.vars).forEach(([k, v]) => root.style.setProperty(k, v));
    const defaults = this.themeAccents[themeKey] || this.themeAccents['dark'];
    root.style.setProperty('--accent',  defaults.accent);
    root.style.setProperty('--accent2', defaults.accent2);
    root.style.setProperty('--accent3', defaults.accent3);
  }
}
