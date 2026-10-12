# SNG_SPECIFICATION.md — SongBeamer .sng File Format Specification

## 1. Overview
SongBeamer stores song items as plain-text files with the `.sng` extension. A file contains **Header Metadata Tags** followed by **Slide Content Blocks** separated by delimiter tokens.

---

## 2. Character Encoding Handling
Historical `.sng` files present character encoding ambiguity:
* **Legacy Files:** Encoded in Windows-1252 (ANSI) or ISO-8859-1.
* **Modern Files:** Encoded in UTF-8 (often with or without UTF-8 Byte Order Mark `EF BB BF`).

### Strict Detection Algorithm:
1. Check for UTF-8 BOM (`0xEF, 0xBB, 0xBF`). If present, strip BOM and parse as UTF-8.
2. Attempt strict UTF-8 validation. If valid and contains multi-byte UTF-8 sequences, parse as UTF-8.
3. If UTF-8 validation fails (contains invalid UTF-8 byte sequences), decode using `encoding_rs::WINDOWS_1252`.
4. Replace unmappable characters with the Unicode replacement character `\u{FFFD}` without throwing errors.

---

## 3. File Structure

### 3.1 Metadata Header
Metadata lines begin with a `#` character followed by a Key=Value pair:

```text
#Title=Groß ist unser Gott
#Author=Chris Tomlin
#CCLI=4348399
#Format=Vers,Refrain,Vers,Refrain
#Version=3
---
```

#### Common Tags:
| Tag | Type | Description |
| :--- | :--- | :--- |
| `#Title=` | String | Title of the song |
| `#Author=` | String | Lyricist / Composer |
| `#Copyright=` | String | Copyright notice |
| `#CCLI=` | String | CCLI Song Number |
| `#Transpose=` | Integer | Semitone shift (e.g., `-2`, `+3`) |
| `#Speed=` | Integer | Tempo / BPM |
| `#Key=` | String | Musical Key (e.g., `G`, `Em`) |
| `#FontSize=` | Integer | Explicit base font size override |
| `#Format=` | String | Verse order (e.g., `Vers 1,Refrain,Vers 2,Refrain`) |
| `#LangCount=` | Integer | Number of languages present (1 or 2) |
| `#TitleLang2=` | String | Second language title |

---

### 3.2 Slide Separators
Slides within a song are separated by three hyphens on an isolated line:

```text
---
```

Optional slide section indicators appear on their own line immediately following the separator:
* `$$M=Refrain` (or simply `Refrain`)
* `$$M=Vers 1` (or `Vers 1`, `Verse 1`, `Strophe 1`)
* `$$M=Bridge`
* `$$M=Outro`
* `$$M=Pre-Chorus`

---

### 3.3 Chord Notation
Chords in `.sng` are written either inline or in bracketed ChordPro style:
* Bracketed format: `[G]Groß ist unser [C]Herr`
* Legacy superscript format: Chords embedded with specific positioning tags or raw lines above lyrics.

**NOAH Normalization Rule:** The parser must parse both bracketed `[G]` chords and two-line text/chord alignments into a canonical internal `Vec<LyricToken>`:

```rust
pub enum LyricToken {
    Text(String),
    Chord(String),
    ChordAndText { chord: String, text: String },
}
```

---

## 4. Reference Sample File

```text
#Title=Lobe den Herrn, meine Seele
#Author=Norbert Kissel
#Key=D
#Format=Refrain,Vers 1,Refrain,Vers 2
---
$$M=Refrain
[D]Lobe den Herrn, [G]meine Seele,
und [A]alles in mir seinen [D]heiligen Namen.
[D]Lobe den Herrn, [G]meine Seele,
und [A]vergiss nicht, was er dir [D]Gutes getan.
---
$$M=Vers 1
Der dir [Em]alle deine [A]Sünden vergibt
und [F#m]heilet alle deine [Bm]Gebrechen,
der dein [Em]Leben vom Ver[A]derben erlöst,
der dich [G]krönet mit Gnade und [A]Barmherzigkeit.
---
$$M=Vers 2
Der deinen [Em]Mund fröhlich [A]macht,
und du wieder [F#m]jung wirst wie ein [Bm]Adler.
Der Herr [Em]schafft Ge[A]rechtigkeit
und Ge[G]richt allen, die Ge[A]walt leiden.
```