import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const outDir = join(process.cwd(), 'out');
const appUrl = (process.env.CAPACITOR_SERVER_URL || 'https://flixnest.app').trim();

await mkdir(outDir, { recursive: true });

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>FlixNest</title>
    <meta http-equiv="refresh" content="0;url=${appUrl}" />
    <style>
      html, body {
        height: 100%;
        margin: 0;
        background: #050505;
        color: #ffffff;
        font-family: Arial, sans-serif;
      }

      body {
        display: grid;
        place-items: center;
      }

      .panel {
        width: min(32rem, calc(100vw - 3rem));
        padding: 2rem;
        border-radius: 1.5rem;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: linear-gradient(135deg, rgba(24, 24, 27, 0.96), rgba(9, 9, 11, 0.98));
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
      }

      h1 {
        margin: 0 0 0.75rem;
        font-size: 1.5rem;
      }

      p {
        margin: 0;
        color: rgba(255, 255, 255, 0.72);
        line-height: 1.6;
      }
    </style>
  </head>
  <body>
    <main class="panel">
      <h1>Launching FlixNest</h1>
      <p>If the app does not continue automatically, open <a href="${appUrl}">${appUrl}</a>.</p>
    </main>
  </body>
</html>
`;

await writeFile(join(outDir, 'index.html'), html, 'utf8');
