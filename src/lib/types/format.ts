//! TypeScript models for Song formatting, styling inheritance, and Delphi style parity.

export type TextAlignment = 'left' | 'center' | 'right';

export interface TextStyleFormat {
  color?: string; // empty or undefined = default / unassigned
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: TextAlignment;
}

export interface SongFormatOptions {
  useOwnBackgroundProfile: boolean; // "Song-spezifische Anpassungen aktivieren"
  fontFamily: string; // empty = inherited default
  fontFamilyLang2: string; // empty = like language 1
  fontSize: number; // 0 = automatic
  titleFormat: TextStyleFormat;
  lang1Format: TextStyleFormat;
  lang2Format: TextStyleFormat;
  lang3Format: TextStyleFormat;
  lang4Format: TextStyleFormat;
  chordColor: string; // empty = inherited default
  copyrightColor: string; // empty = inherited default
  outline: boolean;
  outlineColor: string;
  shadow: boolean;
  shadowColor: string;
}

export const DEFAULT_PRESENTATION_COLORS = {
  title: '#ffff00',
  lang1: '#ffffff',
  lang2: '#fcd34d',
  lang3: '#93c5fd',
  lang4: '#86efac',
  chord: '#f87171',
  copyright: '#9ca3af',
} as const;

export const DEFAULT_FORMAT_OPTIONS: SongFormatOptions = {
  useOwnBackgroundProfile: false,
  fontFamily: '',
  fontFamilyLang2: '',
  fontSize: 0,
  titleFormat: {
    color: '', // empty = unassigned (inherits default)
    bold: true,
    italic: false,
    underline: false,
    align: 'center',
  },
  lang1Format: {
    color: '', // empty = unassigned (inherits default)
    bold: true,
    italic: false,
    underline: false,
    align: 'center',
  },
  lang2Format: {
    color: '', // empty = unassigned (inherits default)
    bold: true,
    italic: false,
    underline: false,
    align: 'center',
  },
  lang3Format: {
    color: '', // empty = unassigned (inherits default)
    bold: false,
    italic: false,
    underline: false,
    align: 'center',
  },
  lang4Format: {
    color: '', // empty = unassigned (inherits default)
    bold: false,
    italic: false,
    underline: false,
    align: 'center',
  },
  chordColor: '',
  copyrightColor: '',
  outline: true,
  outlineColor: '#000000',
  shadow: true,
  shadowColor: '#000000',
};
