import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { DEFAULT_SETTINGS } from "../src/lib/types";

const prisma = new PrismaClient();

async function main() {
  const row = await prisma.settings.findUnique({ where: { id: "default" } });
  const current = row ? (JSON.parse(row.data) as Record<string, unknown>) : {};
  delete current.disallowCheckInWeekdays;
  delete current.disallowCheckOutWeekdays;
  const data = { ...DEFAULT_SETTINGS, ...current };

  await prisma.settings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      data: JSON.stringify(data),
    },
    update: {
      data: JSON.stringify(data),
    },
  });

  console.log("Seeded settings:");
  console.log(
    `  Weekday $${data.weekdayRateCents / 100}, Fri/Sat $${data.weekendRateCents / 100}`,
  );
  console.log(`  Min nights: ${data.minNights}, max: ${data.maxNights}`);
  console.log(
    `  Promos: last-minute ${data.lastMinutePercent}%, early-bird ${data.earlyBirdPercent}%, long ${data.longStayPercent}%, extended ${data.extendedStayPercent}%`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
