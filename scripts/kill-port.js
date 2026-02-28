const { execSync } = require('child_process');

const portArg = process.argv[2];
const port = Number(portArg || 3000);

if (!Number.isInteger(port) || port <= 0) {
  console.error('Invalid port. Usage: node scripts/kill-port.js <port>');
  process.exit(1);
}

const isWindows = process.platform === 'win32';

function getPidsOnWindows(targetPort) {
  const output = execSync(`netstat -ano -p tcp | findstr :${targetPort}`, {
    stdio: ['pipe', 'pipe', 'ignore'],
    encoding: 'utf8'
  });

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => /LISTENING/i.test(line))
    .map((line) => line.split(/\s+/).pop())
    .filter(Boolean)
    .map((pid) => Number(pid))
    .filter((pid) => Number.isInteger(pid) && pid > 0);
}

function getPidsOnUnix(targetPort) {
  const output = execSync(`lsof -ti tcp:${targetPort}`, {
    stdio: ['pipe', 'pipe', 'ignore'],
    encoding: 'utf8'
  });

  return output
    .split(/\r?\n/)
    .map((line) => Number(line.trim()))
    .filter((pid) => Number.isInteger(pid) && pid > 0);
}

function unique(values) {
  return [...new Set(values)];
}

try {
  const pids = unique(isWindows ? getPidsOnWindows(port) : getPidsOnUnix(port));

  if (pids.length === 0) {
    console.log(`Port ${port} is already free.`);
    process.exit(0);
  }

  pids.forEach((pid) => {
    try {
      process.kill(pid, 'SIGTERM');
      console.log(`Stopped PID ${pid} on port ${port}`);
    } catch (error) {
      console.warn(`Could not stop PID ${pid}: ${error.message}`);
    }
  });
} catch {
  console.log(`Port ${port} is already free.`);
}