/**
 * Prueba de humo: levanta `next start` en un puerto libre, pide las paginas
 * nuevas y comprueba que el banner y el disclaimer estan en el HTML.
 * Se cierra solo al terminar.
 */
import { spawn } from "child_process";

const PORT = 3111;
const BASE = `http://localhost:${PORT}`;

async function waitForServer(timeoutMs: number) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(`${BASE}/privacidad`, { signal: AbortSignal.timeout(5000) });
      if (r.ok) return true;
    } catch {
      /* sigue esperando */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function main() {
  const server = spawn("npx.cmd", ["next", "start", "-p", String(PORT)], {
    shell: true,
    stdio: "ignore",
    detached: false,
  });

  const up = await waitForServer(90000);
  if (!up) {
    console.log("el servidor no levanto");
    server.kill();
    process.exit(1);
  }
  console.log("servidor listo\n");

  const checks: { url: string; expect: { name: string; re: RegExp }[] }[] = [
    {
      url: "/privacidad",
      expect: [
        { name: "titulo", re: /Pol.tica de Privacidad/i },
        { name: "tabla de cookies", re: /admin_token/ },
        { name: "aviso de cookies", re: /Solo esenciales/ },
        { name: "link a terminos", re: /href="\/terminos"/ },
        { name: "disclaimer en footer", re: /Disclaimer:/ },
      ],
    },
    {
      url: "/terminos",
      expect: [
        { name: "titulo", re: /T.rminos y Condiciones/i },
        { name: "no alojamos archivos", re: /No alojamos archivos/i },
        { name: "aviso de cookies", re: /Solo esenciales/ },
        { name: "link a privacidad", re: /href="\/privacidad"/ },
        { name: "disclaimer en footer", re: /Disclaimer:/ },
      ],
    },
    {
      url: "/",
      expect: [
        { name: "aviso de cookies", re: /Solo esenciales/ },
        { name: "disclaimer en footer", re: /Disclaimer:/ },
        { name: "link privacidad en footer", re: /href="\/privacidad"/ },
      ],
    },
  ];

  let failed = 0;
  for (const c of checks) {
    const r = await fetch(`${BASE}${c.url}`, { signal: AbortSignal.timeout(30000) });
    const html = await r.text();
    console.log(`${c.url}  status=${r.status}  len=${html.length}`);
    for (const e of c.expect) {
      const ok = e.re.test(html);
      if (!ok) failed++;
      console.log(`   ${ok ? "OK  " : "FALLA"}  ${e.name}`);
    }
    console.log("");
  }

  server.kill();
  console.log(failed === 0 ? "=== todas las comprobaciones pasaron ===" : `=== ${failed} comprobaciones fallaron ===`);
  process.exit(failed === 0 ? 0 : 1);
}

main();