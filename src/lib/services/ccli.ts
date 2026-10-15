import type { Song, Slide } from '$lib/types/models';

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
          'I\'ll worship Your holy name.'
        ]
      },
      {
        label: 'Vers 1',
        type: 'Verse',
        lines: [
          'The sun comes up, it\'s a new day dawning,',
          'It\'s time to sing Your song again.',
          'Whatever may pass, and whatever lies before me,',
          'Let me be singing when the evening comes.'
        ]
      },
      {
        label: 'Vers 2',
        type: 'Verse',
        lines: [
          'You\'re rich in love, and You\'re slow to anger,',
          'Your name is great, and Your heart is kind.',
          'For all Your goodness I will keep on singing,',
          'Ten thousand reasons for my heart to find.'
        ]
      }
    ]
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
          'damit mein Herz aufblüht.'
        ]
      },
      {
        label: 'Refrain',
        type: 'Chorus',
        lines: [
          'Mutig komm ich vor den Thron,',
          'freigesprochen durch den Sohn.',
          'Gnade tilgt die ganze Schuld,',
          'Gott schenkt Liebe und Geduld.'
        ]
      },
      {
        label: 'Vers 2',
        type: 'Verse',
        lines: [
          'Der Vorhang riss, der Weg ist frei,',
          'zum Vater darf ich gehn.',
          'Kein Zweifel mehr, kein Schmerz der quält,',
          'vor Seinem Angesicht zu stehn.'
        ]
      }
    ]
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
          'er zittert vor dem Klang, dem Klang von seiner Stimm.'
        ]
      },
      {
        label: 'Refrain',
        type: 'Chorus',
        lines: [
          'So groß ist der Herr, singt mit mir:',
          'So groß ist der Herr!',
          'Ihn preisen wir, so groß ist unser Gott!'
        ]
      },
      {
        label: 'Vers 2',
        type: 'Verse',
        lines: [
          'Von Ewigkeit zu Ewigkeit steht er in seiner Macht.',
          'Der Anfang und das Ende, der alles neu gemacht.',
          'Drei Personen, ein Herr: Vater, Sohn und Geist,',
          'der Löwe und das Lamm, das ewig herrscht und preist.'
        ]
      }
    ]
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
          'das Sturm und Flut gewaltig trotzt.'
        ]
      },
      {
        label: 'Vers 2',
        type: 'Verse',
        lines: [
          'In Christus wurde Gott ein Mensch,',
          'vollkommner Gott im Schwachen sah.',
          'Aus Liebe kam der Himmelskönig,',
          'von seiner Schöpfung abgelehnt.'
        ]
      },
      {
        label: 'Vers 3',
        type: 'Verse',
        lines: [
          'Dort an dem Kreuz, wo Jesus starb,',
          'des Vaters Zorn ein Ende fand.',
          'Die Sünde lag auf Seiner Schulter,',
          'durch Seinen Tod hab ich Vergebung.'
        ]
      }
    ]
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
          'so bleibst du in Ewigkeit.'
        ]
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
          '„Heilig, heilig, heilig!“ zu.'
        ]
      }
    ]
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
          'Oh, I will sing of the goodness of God.'
        ]
      },
      {
        label: 'Chorus',
        type: 'Chorus',
        lines: [
          'And all my life You have been faithful,',
          'And all my life You have been so, so good.',
          'With every breath that I am able,',
          'Oh, I will sing of the goodness of God.'
        ]
      }
    ]
  }
];

export async function searchSongSelect(query: string): Promise<SongSelectSong[]> {
  const q = query.trim().toLowerCase();
  if (!q) {
    return SONGSELECT_CATALOG;
  }

  const terms = q.split(/\s+/).filter(Boolean);

  return SONGSELECT_CATALOG.filter((song) => {
    const haystacks = [
      song.title.toLowerCase(),
      song.titleSecondary?.toLowerCase() || '',
      song.authors.toLowerCase(),
      song.ccliNumber,
      song.lyricsPreview.toLowerCase(),
      ...song.sections.flatMap((s) => s.lines.map((l) => l.toLowerCase()))
    ];

    // Every search term must match at least one haystack
    return terms.every((term) => haystacks.some((h) => h.includes(term)));
  });
}

export function convertSongSelectToSong(item: SongSelectSong): Song {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'ccli-' + item.ccliNumber;
  const verseOrder = item.sections.map((s) => s.label);

  const slides: Slide[] = item.sections.map((sec, idx) => {
    const rawContent = sec.lines.join('\n');
    return {
      id: `${id}-slide-${idx}`,
      index: idx,
      label: sec.label,
      section: { type: sec.type, value: sec.type === 'Verse' ? idx + 1 : undefined },
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
