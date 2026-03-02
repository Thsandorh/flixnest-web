const http = require('http');
const next = require('next');

const port = parseInt(process.env.PORT || '3000', 10);
const host = process.env.HOST || '0.0.0.0';
const dev = process.env.NODE_ENV !== 'production';

const app = next({ dev, hostname: host, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const server = http.createServer((req, res) => handle(req, res));

    server.listen(port, host, () => {
      console.log(`FlixNest server running on http://${host}:${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start FlixNest server', error);
    process.exit(1);
  });
