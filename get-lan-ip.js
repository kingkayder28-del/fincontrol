import os from 'node:os';

const interfaces = os.networkInterfaces();

for (const name of Object.keys(interfaces)) {
  for (const iface of interfaces[name] ?? []) {
    if (iface.family === 'IPv4' && !iface.internal && !(iface.address ?? '').startsWith('169.254')) {
      console.log(`LAN IP: ${iface.address}`);
      process.exit(0);
    }
  }
}

console.log('No LAN IP found');
process.exit(1);
