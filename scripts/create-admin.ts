import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "Admin";

  if (!email || !password) {
    console.error("Error: ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
    process.exit(1);
  }

  // Check if admin already exists
  const existing = await db.admin.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin with email ${email} already exists. Updating...`);
    await db.admin.update({
      where: { email },
      data: { passwordHash: hashPassword(password), name, isActive: true },
    });
    console.log("Admin updated successfully.");
  } else {
    await db.admin.create({
      data: {
        email,
        passwordHash: hashPassword(password),
        name,
        role: "superadmin",
      },
    });
    console.log(`Admin created: ${email} (superadmin)`);
  }

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
