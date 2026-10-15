//! Pure TypeScript utilities for Delphi SongBeamer formatting codes, color conversion, and .sng tags.

import {
  type TextStyleFormat,
  type TextAlignment,
  type SongFormatOptions,
  DEFAULT_FORMAT_OPTIONS,
} from '$lib/types/format';

const DELPHI_COLOR_MAP: Record<string, string> = {
  clyellow: '#ffff00',
  clwhite: '#ffffff',
  clblack: '#000000',
  clred: '#ff0000',
  clblue: '#0000ff',
  clsilver: '#c0c0c0',
  cllime: '#00ff00',
  claqua: '#00ffff',
  clfuchsia: '#ff00ff',
  clgray: '#808080',
  clmaroon: '#800000',
  clnavy: '#000080',
  clolive: '#808000',
  clpurple: '#800080',
  clteal: '#008080',
};

/**
 * Converts Delphi color string (name, $00BBGGRR, #RRGGBB) to web hex #rrggbb.
 */
export function delphiColorToHex(delphiColor: string | undefined | null, fallback = '#ffffff'): string {
  if (!delphiColor || typeof delphiColor !== 'string') return fallback;
  const trimmed = delphiColor.trim();
  if (!trimmed) return fallback;

  // 1. Direct web hex (#RRGGBB or #RGB)
  if (trimmed.startsWith('#')) {
    if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
    if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
      return (
        '#' +
        trimmed[1] +
        trimmed[1] +
        trimmed[2] +
        trimmed[2] +
        trimmed[3] +
        trimmed[3]
      ).toLowerCase();
    }
  }

  // 2. Named Delphi color
  const lower = trimmed.toLowerCase();
  if (DELPHI_COLOR_MAP[lower]) {
    return DELPHI_COLOR_MAP[lower];
  }

  // 3. Delphi Hex ($00BBGGRR or $BBGGRR)
  if (trimmed.startsWith('$')) {
    let raw = trimmed.slice(1).replace(/[^0-9a-fA-F]/g, '');
    if (raw.length === 8) {
      raw = raw.slice(2); // discard Delphi leading 0x00 / flags byte
    }
    raw = raw.padStart(6, '0');
    if (raw.length === 6) {
      const bb = raw.slice(0, 2);
      const gg = raw.slice(2, 4);
      const rr = raw.slice(4, 6);
      return `#${rr}${gg}${bb}`.toLowerCase();
    }
  }

  // 4. Raw numeric Delphi color (e.g. 65535 = $00FFFF = Yellow)
  const num = parseInt(trimmed, 10);
  if (!isNaN(num) && /^\d+$/.test(trimmed)) {
    const r = num & 0xff;
    const g = (num >> 8) & 0xff;
    const b = (num >> 16) & 0xff;
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  return fallback;
}

/**
 * Converts web hex #rrggbb to Delphi BGR hex format ($00BBGGRR).
 */
export function hexToDelphiColor(hex: string): string {
  if (!hex || typeof hex !== 'string') return '$FFFFFF';
  const clean = hex.replace(/^#/, '').trim();
  if (clean.length === 6) {
    const rr = parseInt(clean.slice(0, 2), 16);
    const gg = parseInt(clean.slice(2, 4), 16);
    const bb = parseInt(clean.slice(4, 6), 16);
    const val = (bb << 16) | (gg << 8) | rr;
    if (val === 0xffffff) return '$FFFFFF';
    return '$' + val.toString(16).toUpperCase().padStart(6, '0');
  }
  return '$FFFFFF';
}

/**
 * Parses Delphi Format property string (e.g. "Color=$00FFFF,Style=[fsBold,fsItalic],Align=taCenter").
 */
export function parseDelphiFormat(
  formatStr: string | undefined | null,
  defaultAlign: TextAlignment = 'center',
  defaultColor = '#ffffff'
): TextStyleFormat {
  const result: TextStyleFormat = {
    color: defaultColor,
    bold: false,
    italic: false,
    underline: false,
    align: defaultAlign,
  };

  if (!formatStr) return result;

  const parts: string[] = [];
  let current = '';
  let inBracket = false;
  for (let i = 0; i < formatStr.length; i++) {
    const ch = formatStr[i];
    if (ch === '[') inBracket = true;
    else if (ch === ']') inBracket = false;
    if (ch === ',' && !inBracket) {
      if (current.trim()) parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  for (const part of parts) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim().toLowerCase();
    const val = part.slice(eqIdx + 1).trim();

    if (key === 'color') {
      result.color = delphiColorToHex(val, defaultColor);
    } else if (key === 'style') {
      const styles = val.replace(/^\[|\]$/g, '').split(',').map((s) => s.trim().toLowerCase());
      result.bold = styles.includes('fsbold');
      result.italic = styles.includes('fsitalic');
      result.underline = styles.includes('fsunderline');
    } else if (key === 'align') {
      const low = val.toLowerCase();
      if (low.includes('left') || low.includes('taleftjustify')) {
        result.align = 'left';
      } else if (low.includes('right') || low.includes('tarightjustify')) {
        result.align = 'right';
      } else {
        result.align = 'center';
      }
    }
  }

  return result;
}

/**
 * Serializes TextStyleFormat into Delphi Format property string.
 */
export function serializeDelphiFormat(fmt: TextStyleFormat): string {
  const parts: string[] = [];
  parts.push(`Color=${hexToDelphiColor(fmt.color)}`);

  const styles: string[] = [];
  if (fmt.bold) styles.push('fsBold');
  if (fmt.italic) styles.push('fsItalic');
  if (fmt.underline) styles.push('fsUnderline');
  parts.push(`Style=[${styles.join(',')}]`);

  if (fmt.align) {
    if (fmt.align === 'left') parts.push('Align=taLeftJustify');
    else if (fmt.align === 'right') parts.push('Align=taRightJustify');
    else parts.push('Align=taCenter');
  }

  return parts.join(',');
}

/**
 * Extracts SongFormatOptions from raw song custom_tags dictionary.
 */
export function parseSongFormatOptions(tags: Record<string, string>): SongFormatOptions {
  const opts: SongFormatOptions = {
    ...DEFAULT_FORMAT_OPTIONS,
    titleFormat: { ...DEFAULT_FORMAT_OPTIONS.titleFormat },
    lang1Format: { ...DEFAULT_FORMAT_OPTIONS.lang1Format },
    lang2Format: { ...DEFAULT_FORMAT_OPTIONS.lang2Format },
    lang3Format: { ...DEFAULT_FORMAT_OPTIONS.lang3Format },
    lang4Format: { ...DEFAULT_FORMAT_OPTIONS.lang4Format },
  };

  // Find tags case-insensitively
  const findTag = (name: string): string | undefined => {
    const low = name.toLowerCase();
    for (const [k, v] of Object.entries(tags)) {
      if (k.toLowerCase() === low) return v;
    }
    return undefined;
  };

  const font = findTag('font');
  if (font) opts.fontFamily = font;

  const fontLang2 = findTag('fontlang2');
  if (fontLang2) opts.fontFamilyLang2 = fontLang2;

  const fontSizeStr = findTag('fontsize');
  if (fontSizeStr) {
    const parsed = parseInt(fontSizeStr, 10);
    if (!isNaN(parsed) && parsed >= 0) opts.fontSize = parsed;
  }

  const titleFmt = findTag('titleformat');
  if (titleFmt) {
    opts.titleFormat = parseDelphiFormat(titleFmt, 'center', DEFAULT_FORMAT_OPTIONS.titleFormat.color);
  }

  const lang1Fmt = findTag('format');
  if (lang1Fmt) {
    opts.lang1Format = parseDelphiFormat(lang1Fmt, 'center', DEFAULT_FORMAT_OPTIONS.lang1Format.color);
  }

  const lang2Fmt = findTag('formatlang2');
  if (lang2Fmt) {
    opts.lang2Format = parseDelphiFormat(lang2Fmt, 'center', DEFAULT_FORMAT_OPTIONS.lang2Format.color);
  }

  const lang3Fmt = findTag('formatlang3');
  if (lang3Fmt) {
    opts.lang3Format = parseDelphiFormat(lang3Fmt, 'center', DEFAULT_FORMAT_OPTIONS.lang3Format.color);
  }

  const lang4Fmt = findTag('formatlang4');
  if (lang4Fmt) {
    opts.lang4Format = parseDelphiFormat(lang4Fmt, 'center', DEFAULT_FORMAT_OPTIONS.lang4Format.color);
  }

  const chordCol = findTag('chordcolor');
  if (chordCol) opts.chordColor = delphiColorToHex(chordCol, opts.chordColor);

  const copyCol = findTag('copyrightcolor');
  if (copyCol) opts.copyrightColor = delphiColorToHex(copyCol, opts.copyrightColor);

  const tpLeft = findTag('tpleftcolor');
  if (tpLeft) opts.tpLeftColor = delphiColorToHex(tpLeft, opts.tpLeftColor);

  const tpRight = findTag('tprightcolor');
  if (tpRight) opts.tpRightColor = delphiColorToHex(tpRight, opts.tpRightColor);

  const outlineCol = findTag('outlinecolor');
  if (outlineCol) opts.outlineColor = delphiColorToHex(outlineCol, opts.outlineColor);

  const outlineVal = findTag('outline') ?? findTag('textstyleoutline');
  if (outlineVal !== undefined) {
    opts.outline = outlineVal === '1' || outlineVal.toLowerCase() === 'true';
  }

  const shadowCol = findTag('shadowcolor');
  if (shadowCol) opts.shadowColor = delphiColorToHex(shadowCol, opts.shadowColor);

  const shadowVal = findTag('shadow') ?? findTag('textstyleshadow');
  if (shadowVal !== undefined) {
    opts.shadow = shadowVal === '1' || shadowVal.toLowerCase() === 'true';
  }

  const ownProfile = findTag('useownbackgroundprofile');
  if (ownProfile !== undefined) {
    opts.useOwnBackgroundProfile = ownProfile === '1' || ownProfile.toLowerCase() === 'true';
  }

  const preLine = findTag('formatpreline');
  if (preLine !== undefined) opts.formatPreLine = preLine;

  const prePage = findTag('formatprepage');
  if (prePage !== undefined) opts.formatPrePage = prePage;

  return opts;
}

/**
 * Serializes SongFormatOptions into dictionary of .sng tags.
 */
export function serializeSongFormatOptions(opts: SongFormatOptions): Record<string, string> {
  const tags: Record<string, string> = {};

  if (opts.fontFamily && opts.fontFamily !== 'Arial') {
    tags['Font'] = opts.fontFamily;
  }
  if (opts.fontFamilyLang2) {
    tags['FontLang2'] = opts.fontFamilyLang2;
  }
  if (opts.fontSize > 0) {
    tags['FontSize'] = opts.fontSize.toString();
  }

  tags['TitleFormat'] = serializeDelphiFormat(opts.titleFormat);
  tags['Format'] = serializeDelphiFormat(opts.lang1Format);

  if (opts.lang2Format) {
    tags['FormatLang2'] = serializeDelphiFormat(opts.lang2Format);
  }
  if (opts.lang3Format) {
    tags['FormatLang3'] = serializeDelphiFormat(opts.lang3Format);
  }
  if (opts.lang4Format) {
    tags['FormatLang4'] = serializeDelphiFormat(opts.lang4Format);
  }

  if (opts.chordColor && opts.chordColor !== DEFAULT_FORMAT_OPTIONS.chordColor) {
    tags['ChordColor'] = hexToDelphiColor(opts.chordColor);
  }
  if (opts.copyrightColor && opts.copyrightColor !== DEFAULT_FORMAT_OPTIONS.copyrightColor) {
    tags['CopyrightColor'] = hexToDelphiColor(opts.copyrightColor);
  }
  if (opts.outlineColor && opts.outlineColor !== DEFAULT_FORMAT_OPTIONS.outlineColor) {
    tags['OutlineColor'] = hexToDelphiColor(opts.outlineColor);
  }
  if (opts.shadowColor && opts.shadowColor !== DEFAULT_FORMAT_OPTIONS.shadowColor) {
    tags['ShadowColor'] = hexToDelphiColor(opts.shadowColor);
  }

  if (opts.useOwnBackgroundProfile) {
    tags['UseOwnBackgroundProfile'] = '1';
  }
  if (opts.formatPreLine) {
    tags['FormatPreLine'] = opts.formatPreLine;
  }
  if (opts.formatPrePage) {
    tags['FormatPrePage'] = opts.formatPrePage;
  }

  return tags;
}
