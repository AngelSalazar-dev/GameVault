import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import * as readline from "readline";

const apiId = parseInt(process.env.TG_API_ID || "39069634");
const apiHash = process.env.TG_API_HASH || "b9228d17e0b2595d7800857c887817c8";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string) => new Promise<string>((res) => rl.question(q, res));

async function main() {
  const client = new TelegramClient(new StringSession(""), apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => {
      const phone = await ask("📱 Numero de telefono (con +): ");
      return phone.trim();
    },
    password: async () => {
      const pw = await ask("🔒 2FA password (si tienes): ");
      return pw.trim();
    },
    phoneCode: async () => {
      const code = await ask("📩 Codigo de verificacion: ");
      return code.trim();
    },
    onError: (err) => console.error("Error:", err),
  });

  console.log("\n✅ Session generada:");
  console.log(client.session.save());
  console.log("\nCopia este string y pegalo en .env como TG_SESSION");
  rl.close();
  process.exit(0);
}

main();