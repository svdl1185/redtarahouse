import { PrismaClient } from "@prisma/client";
import { DEFAULT_SETTINGS } from "../src/lib/types";

const prisma = new PrismaClient();

async function main() {
  const row = await prisma.settings.findUnique({ where: { id: "default" } });
  const current = row ? (JSON.parse(row.data) as Record<string, unknown>) : {};
  delete current.disallowCheckInWeekdays;
  delete current.disallowCheckOutWeekdays;
  const maxNights = Math.max(Number(current.maxNights ?? 0), 90);
  const next = { ...DEFAULT_SETTINGS, ...current, maxNights };
  await prisma.settings.upsert({
    where: { id: "default" },
    create: { id: "default", data: JSON.stringify(next) },
    update: { data: JSON.stringify(next) },
  });
  console.log("Updated settings maxNights=", maxNights);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
