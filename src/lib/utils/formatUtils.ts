//! Pure TypeScript utilities for Delphi SongBeamer formatting codes, color conversion, and .sng tags.

import {
  type TextStyleFormat,
  type TextAlignment,
  type SongFormatOptions,
  DEFAULT_FORMAT_OPTIONS,
  DEFAULT_PRESENTATION_COLORS,
} from '$lib/types/format';
import type { LyricLine } from '$lib/types/models';

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
    const rawDigits = trimmed.slice(1);
    if (!/^[0-9a-fA-F]{1,8}$/.test(rawDigits)) {
      return fallback;
    }
    let raw = rawDigits;
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
  defaultColor = ''
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
  if (fmt.color) {
    parts.push(`Color=${hexToDelphiColor(fmt.color)}`);
  }

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

  const findTag = (name: string): string | undefined => {
    const low = name.toLowerCase();
    for (const [k, v] of Object.entries(tags)) {
      if (k.toLowerCase() === low) return v;
    }
    return undefined;
  };

  const ownProfile = findTag('useownbackgroundprofile');
  const hasFormattingTags =
    findTag('font') ||
    findTag('fontlang2') ||
    findTag('fontsize') ||
    findTag('format') ||
    findTag('titleformat') ||
    findTag('chordcolor');

  // Opt-in check: active if explicitly set or if custom formatting tags exist
  opts.useOwnBackgroundProfile =
    ownProfile !== undefined
      ? ownProfile === '1' || ownProfile.toLowerCase() === 'true'
      : !!hasFormattingTags;

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
    opts.titleFormat = parseDelphiFormat(titleFmt, 'center', '');
  }

  const lang1Fmt = findTag('format');
  if (lang1Fmt) {
    opts.lang1Format = parseDelphiFormat(lang1Fmt, 'center', '');
  }

  const lang2Fmt = findTag('formatlang2');
  if (lang2Fmt) {
    opts.lang2Format = parseDelphiFormat(lang2Fmt, 'center', '');
  }

  const lang3Fmt = findTag('formatlang3');
  if (lang3Fmt) {
    opts.lang3Format = parseDelphiFormat(lang3Fmt, 'center', '');
  }

  const lang4Fmt = findTag('formatlang4');
  if (lang4Fmt) {
    opts.lang4Format = parseDelphiFormat(lang4Fmt, 'center', '');
  }

  const chordCol = findTag('chordcolor');
  if (chordCol) opts.chordColor = delphiColorToHex(chordCol, '');

  const copyCol = findTag('copyrightcolor');
  if (copyCol) opts.copyrightColor = delphiColorToHex(copyCol, '');

  const outlineCol = findTag('outlinecolor');
  if (outlineCol) opts.outlineColor = delphiColorToHex(outlineCol, '#000000');

  const outlineVal = findTag('outline') ?? findTag('textstyleoutline');
  if (outlineVal !== undefined) {
    opts.outline = outlineVal === '1' || outlineVal.toLowerCase() === 'true';
  }

  const shadowCol = findTag('shadowcolor');
  if (shadowCol) opts.shadowColor = delphiColorToHex(shadowCol, '#000000');

  const shadowVal = findTag('shadow') ?? findTag('textstyleshadow');
  if (shadowVal !== undefined) {
    opts.shadow = shadowVal === '1' || shadowVal.toLowerCase() === 'true';
  }

  return opts;
}

/**
 * Serializes SongFormatOptions into dictionary of .sng tags.
 * STRICTLY ONLY writes tags when useOwnBackgroundProfile is explicitly enabled!
 */
export function serializeSongFormatOptions(opts: SongFormatOptions): Record<string, string> {
  const tags: Record<string, string> = {};

  if (!opts.useOwnBackgroundProfile) {
    // Song inherits default profile: do not write any custom formatting tags
    return tags;
  }

  tags['UseOwnBackgroundProfile'] = '1';

  if (opts.fontFamily && opts.fontFamily.trim().length > 0) {
    tags['Font'] = opts.fontFamily.trim();
  }
  if (opts.fontFamilyLang2 && opts.fontFamilyLang2.trim().length > 0) {
    tags['FontLang2'] = opts.fontFamilyLang2.trim();
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

  if (opts.chordColor) {
    tags['ChordColor'] = hexToDelphiColor(opts.chordColor);
  }
  if (opts.copyrightColor) {
    tags['CopyrightColor'] = hexToDelphiColor(opts.copyrightColor);
  }
  if (opts.outlineColor) {
    tags['OutlineColor'] = hexToDelphiColor(opts.outlineColor);
  }
  if (opts.shadowColor) {
    tags['ShadowColor'] = hexToDelphiColor(opts.shadowColor);
  }

  return tags;
}

/**
 * Computes live CSS text styling for a slide lyric line based on SongFormatOptions.
 * Used for 100% WYSIWYG parity in both SlideDeck and BeamerView.
 */
export function getLineRenderStyle(
  line: LyricLine,
  formatOpts: SongFormatOptions | null | undefined
): {
  textStyle: string;
  chordStyle: string;
  textAlign: string;
} {
  // If no format options or custom adaptations are not enabled, return standard presentation defaults
  if (!formatOpts || !formatOpts.useOwnBackgroundProfile) {
    return {
      textStyle: 'color: #ffffff; font-weight: bold; text-shadow: 0 4px 12px rgba(0,0,0,0.95);',
      chordStyle: 'color: #f87171; font-weight: bold;',
      textAlign: 'center',
    };
  }

  // Determine language format for this line
  const langIdx = line.language_index ?? 0;
  let fmt: TextStyleFormat = formatOpts.lang1Format;
  let defaultColor = DEFAULT_PRESENTATION_COLORS.lang1;

  if (langIdx === 1 && formatOpts.lang2Format) {
    fmt = formatOpts.lang2Format;
    defaultColor = DEFAULT_PRESENTATION_COLORS.lang2;
  } else if (langIdx === 2 && formatOpts.lang3Format) {
    fmt = formatOpts.lang3Format;
    defaultColor = DEFAULT_PRESENTATION_COLORS.lang3;
  } else if (langIdx >= 3 && formatOpts.lang4Format) {
    fmt = formatOpts.lang4Format;
    defaultColor = DEFAULT_PRESENTATION_COLORS.lang4;
  }

  const fontFam =
    langIdx > 0 && formatOpts.fontFamilyLang2
      ? formatOpts.fontFamilyLang2
      : formatOpts.fontFamily || 'inherit';

  const color = fmt.color && fmt.color.trim().length > 0 ? fmt.color : defaultColor;
  const weight = fmt.bold !== false ? 'bold' : 'normal';
  const fontStyle = fmt.italic ? 'italic' : 'normal';
  const textDecor = fmt.underline ? 'underline' : 'none';
  const align = fmt.align || 'center';

  // Build shadow / outline style
  const shadows: string[] = [];
  if (formatOpts.outline && formatOpts.outlineColor) {
    const oc = formatOpts.outlineColor;
    shadows.push(`-1px -1px 0 ${oc}`, `1px -1px 0 ${oc}`, `-1px 1px 0 ${oc}`, `1px 1px 0 ${oc}`);
  }
  if (formatOpts.shadow && formatOpts.shadowColor) {
    shadows.push(`0 4px 14px ${formatOpts.shadowColor}`);
  }
  const textShadow = shadows.length > 0 ? `text-shadow: ${shadows.join(', ')};` : '';

  const textStyle = `color: ${color}; font-family: '${fontFam}', sans-serif; font-weight: ${weight}; font-style: ${fontStyle}; text-decoration: ${textDecor}; text-align: ${align}; ${textShadow}`;
  const chordColor =
    formatOpts.chordColor && formatOpts.chordColor.trim().length > 0
      ? formatOpts.chordColor
      : DEFAULT_PRESENTATION_COLORS.chord;
  const chordStyle = `color: ${chordColor}; font-weight: bold;`;

  return {
    textStyle,
    chordStyle,
    textAlign: align,
  };
}
