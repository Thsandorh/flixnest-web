/* Custom Node.js server for running Next.js without `next start`.
 *
 * Production default: `npm run build` then `npm start`
 * Development: use `npm run dev` (preferred). You can also set NODE_ENV=development.
 */

const http = require("http");
const next = require("next");
const { parse } = require("url");
const path = require("path");

const port = Number.parseInt(process.env.PORT || "3000", 10);
const hostname = process.env.HOSTNAME || "0.0.0.0";

// Default to production unless explicitly running in development.
const dev = process.env.NODE_ENV === "development";

// cPanel/LSWS app runners often start Node with a different cwd. Next defaults to process.cwd(),
// which can make it look for `.next` in the wrong place. Pin the app dir to this file's folder.
const dir = path.resolve(__dirname);
const app = next({ dev, hostname, port, dir });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const server = http.createServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    });

    server.listen(port, hostname, () => {
      // eslint-disable-next-line no-console
      console.log(`Server ready on http://${hostname}:${port} (dev=${dev})`);
    });
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Failed to start server:", err);
    process.exit(1);
  });
