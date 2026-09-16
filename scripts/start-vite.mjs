import { spawn } from 'node:child_process';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const preferredPort = Number(process.env.PORT || 3000);
const viteBin = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));

async function getAvailablePort(startPort) {
  const net = await import('node:net');

  return new Promise((resolve) => {
    const server = net.createServer();

    server.unref();
    server.on('error', () => resolve(getAvailablePort(startPort + 1)));
    server.listen(startPort, '0.0.0.0', () => {
      const address = server.address();
      server.close(() => resolve(typeof address === 'object' && address ? address.port : startPort));
    });
  });
}

async function main() {
  const port = await getAvailablePort(preferredPort);
  const vite = spawn(process.execPath, [viteBin, '--host', '0.0.0.0', '--port', String(port)], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: String(port),
    },
  });

  vite.on('exit', (code) => process.exit(code ?? 0));
  vite.on('error', (err) => {
    console.error('Failed to start Vite:', err);
    process.exit(1);
  });

  const interfaces = os.networkInterfaces();
  const lanIp = Object.values(interfaces)
    .flat()
    .find((iface) => iface && iface.family === 'IPv4' && !iface.internal && !(iface.address ?? '').startsWith('169.254'));

  if (lanIp) {
    console.log(`\nLocal network URL: http://${lanIp.address}:${port}\n`);
  }
}

main();
