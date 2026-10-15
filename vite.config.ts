import { defineConfig, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import fs from 'fs';

const ccliSearchCache = new Map<string, { items: unknown[]; timestamp: number }>();

function songArchiveApiPlugin(): Plugin {
  return {
    name: 'song-archive-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || '', 'http://localhost:5173');

        if (url.pathname === '/api/default-folder') {
          const candidates = [
            'Z:/Users/wolfgangmeincke/Documents/SongBeamer/Songs',
            path.join(process.env.USERPROFILE || '', 'Documents', 'SongBeamer', 'Songs').replace(/\\/g, '/'),
            path.join(process.env.HOME || '', 'Documents', 'SongBeamer', 'Songs').replace(/\\/g, '/'),
          ];
          const found = candidates.find((c) => fs.existsSync(c));
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ folder: found || '' }));
          return;
        }

        if (url.pathname === '/api/songs') {
          const folderParam = url.searchParams.get('folder');
          const targetDir =
            folderParam && fs.existsSync(folderParam)
              ? folderParam
              : fs.existsSync('Z:/Users/wolfgangmeincke/Documents/SongBeamer/Songs')
                ? 'Z:/Users/wolfgangmeincke/Documents/SongBeamer/Songs'
                : path.join(process.env.USERPROFILE || '', 'Documents', 'SongBeamer', 'Songs').replace(/\\/g, '/');

          if (!fs.existsSync(targetDir)) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ folder: targetDir, songs: [] }));
            return;
          }

          const scanned: Array<{ fileName: string; path: string; sngContent: string }> = [];
          function scanDir(dir: string) {
            try {
              const entries = fs.readdirSync(dir, { withFileTypes: true });
              for (const e of entries) {
                const full = path.join(dir, e.name).replace(/\\/g, '/');
                if (e.isDirectory() && !e.name.startsWith('.')) {
                  scanDir(full);
                } else if (e.isFile() && e.name.toLowerCase().endsWith('.sng')) {
                  try {
                    const raw = fs.readFileSync(full);
                    let content = '';
                    try {
                      content = new TextDecoder('utf-8', { fatal: true }).decode(raw);
                    } catch {
                      content = new TextDecoder('windows-1252').decode(raw);
                    }
                    scanned.push({
                      fileName: e.name,
                      path: full,
                      sngContent: content,
                    });
                  } catch (err) {
                    console.warn('Failed to read song file:', full, err);
                  }
                }
              }
            } catch (err) {
              console.warn('Error reading dir:', dir, err);
            }
          }

          scanDir(targetDir);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ folder: targetDir, count: scanned.length, songs: scanned }));
          return;
        }

        if (url.pathname === '/api/save-song' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              const filePath = data.filePath;
              const content = data.content;
              if (!filePath || typeof content !== 'string') {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Missing filePath or content' }));
                return;
              }
              const parent = path.dirname(filePath);
              if (!fs.existsSync(parent)) {
                fs.mkdirSync(parent, { recursive: true });
              }
              fs.writeFileSync(filePath, content, 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, path: filePath }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: String(err) }));
            }
          });
          return;
        }

        if (url.pathname === '/api/ccli/search') {
          const rawQ = (url.searchParams.get('q') || '').trim();
          if (rawQ.length < 2) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ items: [] }));
            return;
          }

          const normKey = rawQ.toLowerCase();
          const cached = ccliSearchCache.get(normKey);
          const now = Date.now();
          if (cached && now - cached.timestamp < 3600_000) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ items: cached.items }));
            return;
          }

          // Query sanitization: clean up dots/commas (e.g. "10.000" -> "10000"), quotes, dashes
          const cleanQ = rawQ
            .replace(/(\d+)[.,](\d+)/g, '$1$2')
            .replace(/["'*:{}=_~()]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

          try {
            const form = new FormData();
            form.append('numPerPage', '25');
            form.append('search', cleanQ || rawQ);
            form.append('page', '1');
            form.append('expandToAllSongs', 'true');

            const ccliRes = await fetch('https://songselect.ccli.com/api/GetSongSearchResults', {
              method: 'POST',
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                Referer: `https://songselect.ccli.com/search/results?search=${encodeURIComponent(cleanQ || rawQ)}`,
                Origin: 'https://songselect.ccli.com',
              },
              body: form,
            });

            if (!ccliRes.ok) {
              // Rate limit or server error -> return cached or empty array gracefully
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ items: cached ? cached.items : [] }));
              return;
            }

            const rawText = await ccliRes.text();
            let items: unknown[] = [];
            try {
              const json = JSON.parse(rawText) as { payload?: { items?: unknown[] } };
              items = json.payload?.items || [];
              ccliSearchCache.set(normKey, { items, timestamp: now });
            } catch {
              // Cloudflare challenge page returned instead of JSON
              console.warn('CCLI returned non-JSON response (Cloudflare challenge)');
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ items }));
          } catch (err) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ items: cached ? cached.items : [] }));
          }
          return;
        }

        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    songArchiveApiPlugin(),
    tailwindcss(),
    svelte(),
  ],
  resolve: {
    alias: {
      $lib: path.resolve(__dirname, './src/lib'),
    },
  },
  clearScreen: false,
  server: {
    port: 5173,
    host: '0.0.0.0',
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**', '**/target/**', '**/tests/**', '**/*.tmp'],
    },
  },
});

