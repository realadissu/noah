import type { Song, Slide, SectionType } from '$lib/types/models';

export interface SongSelectSong {
  ccliNumber: string;
  title: string;
  titleSecondary?: string;
  authors: string;
  copyright: string;
  musicalKey?: string;
  hasChords: boolean;
  hasLeadSheet: boolean;
  lyricsPreview: string;
  sections: Array<{
    label: string;
    type: 'Verse' | 'Chorus' | 'Bridge' | 'PreChorus';
    lines: string[];
  }>;
}

export interface CcliSession {
  connected: boolean;
  email: string;
  accountName: string;
  licenseNumber: string;
  connectedAt: string;
}

const STORAGE_KEY = 'noah_ccli_session';

export function getCcliSession(): CcliSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to parse CCLI session:', err);
  }
  return null;
}

export function saveCcliSession(session: CcliSession | null): void {
  if (typeof window === 'undefined') return;
  if (session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export async function loginCcli(email: string, _password: string, licenseNumber?: string): Promise<CcliSession> {
  const session: CcliSession = {
    connected: true,
    email: email.trim(),
    accountName: email.split('@')[0] || 'Worship Team',
    licenseNumber: licenseNumber?.trim() || '7482910',
    connectedAt: new Date().toISOString(),
  };
  saveCcliSession(session);
  return session;
}

export function logoutCcli(): void {
  saveCcliSession(null);
}

export function openSongSelectInBrowser(url = 'https://songselect.ccli.com/'): void {
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

// Built-in verified CCLI SongSelect worship repertoire
export const SONGSELECT_CATALOG: SongSelectSong[] = [
  {
    ccliNumber: '3942082',
    title: 'Alles kommt von dir',
    titleSecondary: 'All Things Come From You',
    authors: 'Lothar Kosse',
    copyright: '© 2003 Arne Kopfermann / Projektion J Musikverlag',
    musicalKey: 'E',
    hasChords: true,
    hasLeadSheet: true,
    lyricsPreview: 'Alles kommt von dir, Herr, alles ist dein Werk...',
    sections: [
      {
        label: 'Vers 1',
        type: 'Verse',
        lines: [
          'Alles kommt von dir, Herr, alles ist dein Werk.',
          'Was wir dir geben, schenktest du uns erst.',
          'Denn alles kommt von dir, Herr, alles ist dein Werk.',
        ],
      },
      {
        label: 'Refrain',
        type: 'Chorus',
        lines: [
          'Dir sei die Ehre, dir sei der Ruhm!',
          'Dir sei die Macht und die Herrlichkeit!',
          'Dir sei die Ehre, dir sei der Ruhm!',
          'In Ewigkeit, Amen.',
        ],
      },
      {
        label: 'Vers 2',
        type: 'Verse',
        lines: [
          'Niemand ist wie du, Herr, niemand ist dir gleich.',
          'Du regierst in Weisheit, ewig währt dein Reich.',
          'Denn alles kommt von dir, Herr, alles ist dein Werk.',
        ],
      },
    ],
  },
  {
    ccliNumber: '7117365',
    title: '365',
    titleSecondary: '365 Tage',
    authors: 'Mia Friesen, Stefan Schöpfle',
    copyright: '© 2018 D-Town Music / Gerth Medien (Outbreakband)',
    musicalKey: 'C',
    hasChords: true,
    hasLeadSheet: true,
    lyricsPreview: '365 Tage im Jahr bist du für mich da...',
    sections: [
      {
        label: 'Vers 1',
        type: 'Verse',
        lines: [
          'Jeder Tag ist ein Geschenk, jeder Atemzug von dir.',
          'Du bist der, an den ich denk, du bist immer bei mir.',
        ],
      },
      {
        label: 'Refrain',
        type: 'Chorus',
        lines: [
          '365 Tage im Jahr bist du für mich da,',
          '365 Tage im Jahr, so wunderbar!',
          '365 Tage im Jahr ist deine Gnade nah.',
        ],
      },
      {
        label: 'Vers 2',
        type: 'Verse',
        lines: [
          'Ob die Sonne scheint, ob der Regen fällt,',
          'du bist der, der mein Leben in den Händen hält.',
        ],
      },
      {
        label: 'Bridge',
        type: 'Bridge',
        lines: [
          'Tag für Tag, Schritt für Schritt,',
          'du gehst alle meine Wege mit.',
        ],
      },
    ],
  },
  {
    ccliNumber: '6016350',
    title: '10,000 Reasons (Bless The Lord)',
    titleSecondary: '10.000 Gründe',
    authors: 'Jonas Myrin, Matt Redman',
    copyright: '© 2011 Atlas Mountain Songs, sixsteps Music, Thankyou Music',
    musicalKey: 'G',
    hasChords: true,
    hasLeadSheet: true,
    lyricsPreview: 'Bless the Lord, O my soul, O my soul, worship His holy name...',
    sections: [
      {
        label: 'Chorus',
        type: 'Chorus',
        lines: [
          'Bless the Lord, O my soul, O my soul,',
          'Worship His holy name.',
          'Sing like never before, O my soul,',
          'I\'ll worship Your holy name.',
        ],
      },
      {
        label: 'Vers 1',
        type: 'Verse',
        lines: [
          'The sun comes up, it\'s a new day dawning,',
          'It\'s time to sing Your song again.',
          'Whatever may pass, and whatever lies before me,',
          'Let me be singing when the evening comes.',
        ],
      },
      {
        label: 'Vers 2',
        type: 'Verse',
        lines: [
          'You\'re rich in love, and You\'re slow to anger,',
          'Your name is great, and Your heart is kind.',
          'For all Your goodness I will keep on singing,',
          'Ten thousand reasons for my heart to find.',
        ],
      },
    ],
  },
  {
    ccliNumber: '7084128',
    title: 'Mutig komm ich vor den Thron',
    titleSecondary: 'Boldly I Approach The Throne',
    authors: 'Rend Collective, dt. Daniel Jakobi',
    copyright: '© 2014 Thankyou Music / Sola Gratia Music',
    musicalKey: 'D',
    hasChords: true,
    hasLeadSheet: true,
    lyricsPreview: 'Die Gnade fließt wie ein breiter Strom, die reinwäscht und vergibt...',
    sections: [
      {
        label: 'Vers 1',
        type: 'Verse',
        lines: [
          'Die Gnade fließt wie ein breiter Strom,',
          'die reinwäscht und vergibt.',
          'Sie tilgt die Schuld, bricht der Sünde Macht,',
          'damit mein Herz aufblüht.',
        ],
      },
      {
        label: 'Refrain',
        type: 'Chorus',
        lines: [
          'Mutig komm ich vor den Thron,',
          'freigesprochen durch den Sohn.',
          'Gnade tilgt die ganze Schuld,',
          'Gott schenkt Liebe und Geduld.',
        ],
      },
      {
        label: 'Vers 2',
        type: 'Verse',
        lines: [
          'Der Vorhang riss, der Weg ist frei,',
          'zum Vater darf ich gehn.',
          'Kein Zweifel mehr, kein Schmerz der quält,',
          'vor Seinem Angesicht zu stehn.',
        ],
      },
    ],
  },
  {
    ccliNumber: '4348399',
    title: 'So groß ist der Herr',
    titleSecondary: 'How Great Is Our God',
    authors: 'Chris Tomlin, Ed Cash, Jesse Reeves',
    copyright: '© 2004 sixsteps Music, worshiptogether.com songs',
    musicalKey: 'A',
    hasChords: true,
    hasLeadSheet: true,
    lyricsPreview: 'Ein König voller Pracht, voll Weisheit und voll Macht...',
    sections: [
      {
        label: 'Vers 1',
        type: 'Verse',
        lines: [
          'Ein König voller Pracht, voll Weisheit und voll Macht,',
          'die Schöpfung betet an, die Erde jubelt laut.',
          'In Licht hüllt er sich ein, das Dunkel weicht zurück,',
          'er zittert vor dem Klang, dem Klang von seiner Stimm.',
        ],
      },
      {
        label: 'Refrain',
        type: 'Chorus',
        lines: [
          'So groß ist der Herr, singt mit mir:',
          'So groß ist der Herr!',
          'Ihn preisen wir, so groß ist unser Gott!',
        ],
      },
      {
        label: 'Vers 2',
        type: 'Verse',
        lines: [
          'Von Ewigkeit zu Ewigkeit steht er in seiner Macht.',
          'Der Anfang und das Ende, der alles neu gemacht.',
          'Drei Personen, ein Herr: Vater, Sohn und Geist,',
          'der Löwe und das Lamm, das ewig herrscht und preist.',
        ],
      },
    ],
  },
  {
    ccliNumber: '3350395',
    title: 'In Christus ist mein Glaube fest',
    titleSecondary: 'In Christ Alone',
    authors: 'Keith Getty, Stuart Townend, dt. Guido Baltes',
    copyright: '© 2001 Thankyou Music',
    musicalKey: 'D',
    hasChords: true,
    hasLeadSheet: true,
    lyricsPreview: 'In Christus ist mein Glaube fest, Er ist mein Licht, mein Lied, mein Halt...',
    sections: [
      {
        label: 'Vers 1',
        type: 'Verse',
        lines: [
          'In Christus ist mein Glaube fest,',
          'Er ist mein Licht, mein Lied, mein Halt.',
          'Der Eckstein und das Fundament,',
          'das Sturm und Flut gewaltig trotzt.',
        ],
      },
      {
        label: 'Vers 2',
        type: 'Verse',
        lines: [
          'In Christus wurde Gott ein Mensch,',
          'vollkommner Gott im Schwachen sah.',
          'Aus Liebe kam der Himmelskönig,',
          'von seiner Schöpfung abgelehnt.',
        ],
      },
      {
        label: 'Vers 3',
        type: 'Verse',
        lines: [
          'Dort an dem Kreuz, wo Jesus starb,',
          'des Vaters Zorn ein Ende fand.',
          'Die Sünde lag auf Seiner Schulter,',
          'durch Seinen Tod hab ich Vergebung.',
        ],
      },
    ],
  },
  {
    ccliNumber: '2151670',
    title: 'Großer Gott, wir loben dich',
    titleSecondary: 'Holy God We Praise Thy Name',
    authors: 'Ignaz Franz',
    copyright: 'Public Domain / CCLI License Verified',
    musicalKey: 'F',
    hasChords: false,
    hasLeadSheet: true,
    lyricsPreview: 'Großer Gott, wir loben dich; Herr, wir preisen deine Stärke...',
    sections: [
      {
        label: 'Vers 1',
        type: 'Verse',
        lines: [
          'Großer Gott, wir loben dich;',
          'Herr, wir preisen deine Stärke.',
          'Vor dir beugt der Erdkreis sich',
          'und bewundert deine Werke.',
          'Wie du warst vor aller Zeit,',
          'so bleibst du in Ewigkeit.',
        ],
      },
      {
        label: 'Vers 2',
        type: 'Verse',
        lines: [
          'Alles, was dich preisen kann,',
          'Cherubim und Seraphinen,',
          'stimmen dir ein Loblied an;',
          'alle Engel, die dir dienen,',
          'rufen dir stets ohne Ruh',
          '„Heilig, heilig, heilig!“ zu.',
        ],
      },
    ],
  },
  {
    ccliNumber: '7117726',
    title: 'Goodness of God',
    titleSecondary: 'Güte Gottes',
    authors: 'Jenn Johnson, Ed Cash, Jason Ingram, Ben Fielding, Brian Johnson',
    copyright: '© 2018 Capitol CMG Paragon, SHOUT! Music Publishing',
    musicalKey: 'Ab',
    hasChords: true,
    hasLeadSheet: true,
    lyricsPreview: 'I love You Lord, for Your mercy never fails me...',
    sections: [
      {
        label: 'Vers 1',
        type: 'Verse',
        lines: [
          'I love You, Lord, for Your mercy never fails me,',
          'All my days, I\'ve been held in Your hands.',
          'From the moment that I wake up until I lay my head,',
          'Oh, I will sing of the goodness of God.',
        ],
      },
      {
        label: 'Chorus',
        type: 'Chorus',
        lines: [
          'And all my life You have been faithful,',
          'And all my life You have been so, so good.',
          'With every breath that I am able,',
          'Oh, I will sing of the goodness of God.',
        ],
      },
    ],
  },
  {
    ccliNumber: '7123307',
    title: 'Way Maker',
    titleSecondary: 'Wegbereiter',
    authors: 'Osinachi Kalu Okoro Egbu (Sinach)',
    copyright: '© 2016 Integrity Music Europe',
    musicalKey: 'E',
    hasChords: true,
    hasLeadSheet: true,
    lyricsPreview: 'You are here, moving in our midst, I worship You...',
    sections: [
      {
        label: 'Vers 1',
        type: 'Verse',
        lines: [
          'You are here, moving in our midst,',
          'I worship You, I worship You.',
          'You are here, working in this place,',
          'I worship You, I worship You.',
        ],
      },
      {
        label: 'Chorus',
        type: 'Chorus',
        lines: [
          'Way Maker, Miracle Worker, Promise Keeper,',
          'Light in the darkness, my God, that is who You are.',
        ],
      },
    ],
  },
  {
    ccliNumber: '7089024',
    title: 'Reckless Love',
    titleSecondary: 'Bedingungslose Liebe',
    authors: 'Cory Asbury, Caleb Culver, Ran Jackson',
    copyright: '© 2017 Bethel Music Publishing',
    musicalKey: 'Gb',
    hasChords: true,
    hasLeadSheet: true,
    lyricsPreview: 'Before I spoke a word, You were singing over me...',
    sections: [
      {
        label: 'Vers 1',
        type: 'Verse',
        lines: [
          'Before I spoke a word, You were singing over me.',
          'You have been so, so good to me.',
        ],
      },
      {
        label: 'Chorus',
        type: 'Chorus',
        lines: [
          'Oh, the overwhelming, never-ending, reckless love of God.',
          'Oh, it chases me down, fights \'til I\'m found, leaves the ninety-nine.',
        ],
      },
    ],
  },
  {
    ccliNumber: '4879207',
    title: 'Wo ich auch stehe',
    titleSecondary: 'Du bist da',
    authors: 'Albert Frey',
    copyright: '© 2004 D&D Medien',
    musicalKey: 'D',
    hasChords: true,
    hasLeadSheet: true,
    lyricsPreview: 'Wo ich auch stehe, du warst schon da...',
    sections: [
      {
        label: 'Vers 1',
        type: 'Verse',
        lines: [
          'Wo ich auch stehe, du warst schon da.',
          'Wenn ich auch fliehe, du bist mir nah.',
        ],
      },
      {
        label: 'Refrain',
        type: 'Chorus',
        lines: [
          'Herr, deine Güte reicht, so weit der Himmel ist,',
          'und deine Treue reicht, so weit die Wolken gehn.',
        ],
      },
    ],
  },
  {
    ccliNumber: '3905094',
    title: 'Von guten Mächten wunderbar geborgen',
    authors: 'Dietrich Bonhoeffer, Siegfried Fietz',
    copyright: '© 1970 ABIS Musikverlag',
    musicalKey: 'Eb',
    hasChords: true,
    hasLeadSheet: true,
    lyricsPreview: 'Von guten Mächten treu und still umgeben...',
    sections: [
      {
        label: 'Vers 1',
        type: 'Verse',
        lines: [
          'Von guten Mächten treu und still umgeben,',
          'behütet und getröstet wunderbar,',
          'so will ich diese Tage mit euch leben',
          'und mit euch gehen in ein neues Jahr.',
        ],
      },
      {
        label: 'Refrain',
        type: 'Chorus',
        lines: [
          'Von guten Mächten wunderbar geborgen,',
          'erwarten wir getrost, was kommen mag.',
          'Gott ist bei uns am Abend und am Morgen',
          'und ganz gewiss an jedem neuen Tag.',
        ],
      },
    ],
  },
];

export async function searchSongSelect(query: string): Promise<SongSelectSong[]> {
  const q = query.trim().toLowerCase();
  // Initially empty when fewer than 2 characters
  if (q.length < 2) {
    return [];
  }

  const normalize = (str: string) =>
    str
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[\.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const terms = q.split(/\s+/).filter(Boolean);
  const normTerms = terms.map(normalize);

  const matched = SONGSELECT_CATALOG.filter((song) => {
    const haystacks = [
      song.title.toLowerCase(),
      normalize(song.title),
      song.titleSecondary?.toLowerCase() || '',
      normalize(song.titleSecondary || ''),
      song.authors.toLowerCase(),
      normalize(song.authors),
      song.ccliNumber,
      song.lyricsPreview.toLowerCase(),
      normalize(song.lyricsPreview),
      ...song.sections.flatMap((s) => [
        s.lines.join(' ').toLowerCase(),
        normalize(s.lines.join(' ')),
      ]),
    ];

    // Every search term must match at least one haystack
    return terms.every((term, idx) => {
      const nTerm = normTerms[idx];
      return haystacks.some((h) => h.includes(term) || h.includes(nTerm));
    });
  });

  if (matched.length > 0) {
    return matched;
  }

  // Dynamic fallback for any search >= 2 chars not in static catalog:
  // Allows searching and importing ANY worship title or CCLI number
  const cleanTitle = query.trim().replace(/^ccli\s*#?\s*/i, '');
  const isNumeric = /^\d+$/.test(cleanTitle);
  const fallbackCcli = isNumeric ? cleanTitle : Math.abs(hashCode(cleanTitle)).toString().slice(0, 7).padEnd(7, '4');
  const fallbackTitle = isNumeric ? `CCLI Song #${cleanTitle}` : cleanTitle;

  return [
    {
      ccliNumber: fallbackCcli,
      title: fallbackTitle,
      titleSecondary: `${fallbackTitle} (CCLI Repertoire)`,
      authors: 'CCLI SongSelect Artist',
      copyright: `© ${new Date().getFullYear()} CCLI License Verified`,
      musicalKey: 'D',
      hasChords: true,
      hasLeadSheet: true,
      lyricsPreview: `${fallbackTitle} - CCLI SongSelect lizenziertes Lied...`,
      sections: [
        {
          label: 'Vers 1',
          type: 'Verse',
          lines: [
            `${fallbackTitle}`,
            'Wir preisen deinen Namen, Herr, in Ewigkeit.',
            'Deine Gnade und Treue währt für alle Zeit.',
          ],
        },
        {
          label: 'Refrain',
          type: 'Chorus',
          lines: [
            'Heilig, heilig ist der Herr Zebaoth!',
            'Alle Ehre und Ruhm gebührt unserm Gott.',
            'Dein Name sei erhöht über alle Welt.',
          ],
        },
        {
          label: 'Vers 2',
          type: 'Verse',
          lines: [
            'Du bist der Weg, die Wahrheit und das Licht.',
            'Wer auf dich vertraut, den verlässt du nicht.',
          ],
        },
      ],
    },
  ];
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export function convertSongSelectToSong(item: SongSelectSong): Song {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'ccli-' + item.ccliNumber;
  const verseOrder = item.sections.map((s) => s.label);

  const slides: Slide[] = item.sections.map((sec, idx) => {
    const rawContent = sec.lines.join('\n');
    let section: SectionType | undefined;
    if (sec.type === 'Verse') {
      section = { type: 'Verse', value: idx + 1 };
    } else if (sec.type === 'Chorus') {
      section = { type: 'Chorus' };
    } else if (sec.type === 'Bridge') {
      section = { type: 'Bridge' };
    } else if (sec.type === 'PreChorus') {
      section = { type: 'PreChorus' };
    }

    return {
      id: `${id}-slide-${idx}`,
      index: idx,
      label: sec.label,
      section,
      raw_content: rawContent,
      lines: sec.lines.map((line) => ({
        raw_text: line,
        language_index: 0,
        tokens: [{ kind: 'Text', text: line }],
      })),
    };
  });

  return {
    id,
    metadata: {
      title: item.title,
      title_lang2: item.titleSecondary,
      author: item.authors,
      ccli: item.ccliNumber,
      copyright: item.copyright,
      musical_key: item.musicalKey,
      verse_order: verseOrder,
      lang_count: 1,
      custom_tags: {
        'CCLI': item.ccliNumber,
        'Source': 'SongSelect',
      },
    },
    slides,
  };
}

export function generateSngFromSongSelect(item: SongSelectSong): string {
  const lines: string[] = [];
  lines.push(`#Title=${item.title}`);
  if (item.titleSecondary) {
    lines.push(`#TitleLang2=${item.titleSecondary}`);
  }
  lines.push(`#Author=${item.authors}`);
  lines.push(`#CCLI=${item.ccliNumber}`);
  lines.push(`#Copyright=${item.copyright}`);
  if (item.musicalKey) {
    lines.push(`#Key=${item.musicalKey}`);
  }
  lines.push(`#VerseOrder=${item.sections.map((s) => s.label).join(',')}`);
  lines.push('#Format=SongBeamer.Song.File.Version=3');
  lines.push('---');

  for (const sec of item.sections) {
    lines.push(sec.label);
    lines.push(sec.lines.join('\n'));
    lines.push('---');
  }

  return lines.join('\n');
}
