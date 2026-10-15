//! TypeScript models for Song formatting and Delphi style parity.

export type TextAlignment = 'left' | 'center' | 'right';

export interface TextStyleFormat {
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align?: TextAlignment;
}

export interface SongFormatOptions {
  fontFamily: string;
  fontFamilyLang2: string;
  fontSize: number; // 0 = automatic
  titleFormat: TextStyleFormat;
  lang1Format: TextStyleFormat;
  lang2Format: TextStyleFormat;
  lang3Format: TextStyleFormat;
  lang4Format: TextStyleFormat;
  chordColor: string;
  copyrightColor: string;
  tpLeftColor: string;
  tpRightColor: string;
  outline: boolean;
  outlineColor: string;
  shadow: boolean;
  shadowColor: string;
  useOwnBackgroundProfile: boolean;
  formatPreLine: string;
  formatPrePage: string;
}

export const DEFAULT_FORMAT_OPTIONS: SongFormatOptions = {
  fontFamily: 'Arial',
  fontFamilyLang2: '',
  fontSize: 0,
  titleFormat: {
    color: '#ffff00',
    bold: true,
    italic: false,
    underline: false,
    align: 'center',
  },
  lang1Format: {
    color: '#ffffff',
    bold: true,
    italic: false,
    underline: false,
    align: 'center',
  },
  lang2Format: {
    color: '#ffff00',
    bold: true,
    italic: false,
    underline: false,
    align: 'center',
  },
  lang3Format: {
    color: '#ffffff',
    bold: false,
    italic: false,
    underline: false,
  },
  lang4Format: {
    color: '#ffffff',
    bold: false,
    italic: false,
    underline: false,
  },
  chordColor: '#ff0000',
  copyrightColor: '#ffff00',
  tpLeftColor: '#ffffff',
  tpRightColor: '#c0c0c0',
  outline: true,
  outlineColor: '#000000',
  shadow: true,
  shadowColor: '#000000',
  useOwnBackgroundProfile: false,
  formatPreLine: '',
  formatPrePage: '',
};
