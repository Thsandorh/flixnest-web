const { spawnSync } = require('child_process');
const path = require('path');

const nextCliPath = require.resolve('next/dist/bin/next');
const projectRoot = path.resolve(__dirname, '..');

const result = spawnSync(process.execPath, [nextCliPath, 'build'], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    CI: process.env.CI || '1',
    RAYON_NUM_THREADS: process.env.RAYON_NUM_THREADS || '1',
    TOKIO_WORKER_THREADS: process.env.TOKIO_WORKER_THREADS || '1',
  },
});

if (result.status !== 0) {
  process.exit(result.status || 1);
}
