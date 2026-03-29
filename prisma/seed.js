import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultSmartRules = [
  { matterId: 'HERRERA, JESSICA', triggers: ['jessicah26@gmail.com', 'Herrera', '71534'] },
  { matterId: 'Admin', triggers: ['lexisnexis', 'bar association', 'invoice', 'subscription', 'Microsoft on behalf of your organization', 'Daily Journal Editor', 'ACG Los Angeles', 'Michael Prestia', 'Allison Hoffenberg'] },
  { matterId: 'AFE', triggers: ['AFE', 'Fabric', 'Douglas Coulter', 'Aburto, Armando', 'Project Turf', 'CIS', 'Nick Berquist', 'Chase McClung', 'Page, Michael'] },
  { matterId: 'CONSTANCIO', triggers: ['Rudy', 'Constancio'] },
  { matterId: 'MAXWELL', triggers: ['Maxwell', 'Dee Dodson', 'William Maxwell', 'CRETE'] },
  { matterId: 'D&L', triggers: ['Jawad, Rama M.', 'D&L', 'D & L'] },
  { matterId: 'NATALEE', triggers: ['Michael G. Ebiner', 'PUENTE'] },
  { matterId: 'CASE', triggers: ['Michael Case Jr', 'Byerly', 'Byerlys'] },
  { matterId: 'DIAZ', triggers: ['Diaz'] },
  { matterId: 'HUBBLE', triggers: ['Char Davis Hubble'] },
  { matterId: 'CAL BORING', triggers: ['Gregory W. Brittain', 'NOBEL', 'CAL BORING', 'CALIFORNIA BORING'] },
  { matterId: 'ABELL', triggers: ['Victor Yu', 'ABELL'] },
  { matterId: 'HERNANDEZ', triggers: ['HERNANDEZ'] },
  { matterId: 'RYAN G.', triggers: ['RYAN G'] },
  { matterId: 'LIZARDI', triggers: ['Blake Slater', 'Lizardi', 'GARY BARLOW'] },
  { matterId: 'POCOROBA', triggers: ['Alberto Araujo', 'POCOROBA'] },
  { matterId: 'OCYSA', triggers: ['Sean Slattery'] },
  { matterId: 'GRAY', triggers: ['CINDY PARRISH', 'Zachary Congelliere'] },
  { matterId: 'LANE', triggers: ['45312-002', 'Lane', 'Brossia'] },
];

const defaultCastMappings = [
  { matterId: 'HERRERA, JESSICA', name: 'jessicah26@gmail.com', role: 'Client' },
  { matterId: 'HERRERA, JESSICA', name: 'Jessica Herrera', role: 'Client' },
  { matterId: 'HERRERA, JESSICA', name: 'Steven Moore', role: 'Internal' },
];

async function main() {
  console.log('Seeding database...');

  // Only seed if no rules exist yet
  const existingRules = await prisma.smartRule.count();
  if (existingRules === 0) {
    for (const rule of defaultSmartRules) {
      await prisma.smartRule.create({ data: rule });
    }
    console.log(`Created ${defaultSmartRules.length} smart rules`);
  } else {
    console.log(`Skipping smart rules — ${existingRules} already exist`);
  }

  const existingCast = await prisma.castMapping.count();
  if (existingCast === 0) {
    for (const mapping of defaultCastMappings) {
      await prisma.castMapping.create({ data: mapping });
    }
    console.log(`Created ${defaultCastMappings.length} cast mappings`);
  } else {
    console.log(`Skipping cast mappings — ${existingCast} already exist`);
  }

  // Ensure settings row exists
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings) {
    await prisma.settings.create({
      data: {
        id: 1,
        narrativePrompt: 'Your job is to assist me to draft law firm billing entries...',
      },
    });
    console.log('Created default settings');
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
