const os = require('os');
const { spawnSync } = require('child_process');

function computeMacHostPlatform() {
  const verMajor = Number(os.release().split('.')[0]);
  let macVersion = '';
  if (verMajor < 18) {
    macVersion = 'mac10.13';
  } else if (verMajor === 18) {
    macVersion = 'mac10.14';
  } else if (verMajor === 19) {
    macVersion = 'mac10.15';
  } else {
    const lastStable = 15;
    macVersion = `mac${Math.min(verMajor - 9, lastStable)}`;
  }
  return `${macVersion}-arm64`;
}

if (
  !process.env.PLAYWRIGHT_HOST_PLATFORM_OVERRIDE &&
  process.platform === 'darwin' &&
  process.arch === 'arm64'
) {
  process.env.PLAYWRIGHT_HOST_PLATFORM_OVERRIDE = computeMacHostPlatform();
}

const result = spawnSync(
  'npx',
  ['playwright', ...process.argv.slice(2)],
  { stdio: 'inherit', env: process.env }
);

process.exit(result.status ?? 1);
