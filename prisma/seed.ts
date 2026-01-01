import { PrismaClient } from "@prisma/client";
import { bigFiveBlueprint, bigFiveProfiles } from "../src/seed/big-five-blueprint";

const prisma = new PrismaClient();

async function main() {
  const slug = "big-five";
  
  console.log("🌱 Seeding database...");

  // 1. Create or update the Test
  const test = await prisma.test.upsert({
    where: { slug },
    update: {
      title: bigFiveBlueprint.title,
      description: bigFiveBlueprint.intro.subhead,
      blueprintJson: JSON.stringify(bigFiveBlueprint),
    },
    create: {
      slug,
      title: bigFiveBlueprint.title,
      description: bigFiveBlueprint.intro.subhead,
      blueprintJson: JSON.stringify(bigFiveBlueprint),
    },
  });
  console.log(`✅ Test created/updated: ${test.title} (${test.id})`);

  // 2. Create or update TestVersion (version 1)
  const existingVersion = await prisma.testVersion.findFirst({
    where: { testId: test.id, version: 1 },
  });

  let testVersion;
  if (existingVersion) {
    testVersion = await prisma.testVersion.update({
      where: { id: existingVersion.id },
      data: {
        blueprintJson: JSON.stringify(bigFiveBlueprint),
      },
    });
    console.log(`✅ TestVersion updated: v${testVersion.version}`);
  } else {
    testVersion = await prisma.testVersion.create({
      data: {
        testId: test.id,
        version: 1,
        blueprintJson: JSON.stringify(bigFiveBlueprint),
      },
    });
    console.log(`✅ TestVersion created: v${testVersion.version}`);
  }

  // 3. Create or update Profiles for this version
  console.log(`📦 Seeding ${bigFiveProfiles.length} archetype profiles...`);
  
  for (let i = 0; i < bigFiveProfiles.length; i++) {
    const profileDef = bigFiveProfiles[i];
    
    const existingProfile = await prisma.profile.findFirst({
      where: { testVersionId: testVersion.id, slug: profileDef.id },
    });

    if (existingProfile) {
      await prisma.profile.update({
        where: { id: existingProfile.id },
        data: {
          name: profileDef.name,
          oneLineHook: profileDef.oneLineHook,
          teaserBullets: profileDef.teaserBullets,
          shareTitle: profileDef.shareTitle || null,
          prototypeJson: JSON.stringify(profileDef.prototype),
          sortOrder: i,
        },
      });
    } else {
      await prisma.profile.create({
        data: {
          testVersionId: testVersion.id,
          slug: profileDef.id,
          name: profileDef.name,
          oneLineHook: profileDef.oneLineHook,
          teaserBullets: profileDef.teaserBullets,
          shareTitle: profileDef.shareTitle || null,
          prototypeJson: JSON.stringify(profileDef.prototype),
          sortOrder: i,
        },
      });
    }
  }
  console.log(`✅ ${bigFiveProfiles.length} profiles seeded`);

  console.log("🎉 Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

