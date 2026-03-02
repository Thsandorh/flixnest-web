const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const next = require('next');

const port = parseInt(process.env.PORT || '3000', 10);
const host = process.env.HOST || '0.0.0.0';
const dev = process.env.NODE_ENV !== 'production';
const appDir = path.resolve(__dirname);
const buildIdPath = path.join(appDir, '.next', 'BUILD_ID');

const ensureProductionBuild = () => {
  if (dev || fs.existsSync(buildIdPath)) return;

  console.log(`Missing Next production build at ${buildIdPath}. Running next build...`);

  const nextCliPath = require.resolve('next/dist/bin/next');
  const buildResult = spawnSync(process.execPath, [nextCliPath, 'build'], {
    cwd: appDir,
    stdio: 'inherit',
    env: process.env,
  });

  if (buildResult.status !== 0 || !fs.existsSync(buildIdPath)) {
    throw new Error(`Automatic next build failed for ${appDir}`);
  }
};

ensureProductionBuild();

const app = next({ dev, dir: appDir, hostname: host, port });
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
