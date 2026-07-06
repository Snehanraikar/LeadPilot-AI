import { PrismaClient, Role, LeadStatus, LeadSource, WellnessFocus, ActivityType, ProductCategory } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const inDays = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);
const agoDays = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

async function main() {
  console.log('Seeding database…');

  const passwordHash = await bcrypt.hash('Demo1234!', 12);

  // Org — a health & wellness products company (reuses the original demo org slug so
  // existing users stay linked; only the name/branding changes to the new domain)
  const org = await prisma.organization.upsert({
    where: { slug: 'acme-demo' },
    update: { name: 'Vitality Wellness Co.', website: 'https://vitalitywellness.example.com' },
    create: { name: 'Vitality Wellness Co.', slug: 'acme-demo', website: 'https://vitalitywellness.example.com' },
  });

  // Team
  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.leadpilot.ai' },
    update: {},
    create: {
      email: 'admin@demo.leadpilot.ai',
      passwordHash,
      firstName: 'Alex',
      lastName: 'Rivera',
      role: Role.ADMIN,
      organizationId: org.id,
      isEmailVerified: true,
    },
  });

  const priya = await prisma.user.upsert({
    where: { email: 'priya.patel@demo.leadpilot.ai' },
    update: {},
    create: {
      email: 'priya.patel@demo.leadpilot.ai',
      passwordHash,
      firstName: 'Priya',
      lastName: 'Patel',
      role: Role.MANAGER,
      organizationId: org.id,
      isEmailVerified: true,
    },
  });

  const jordan = await prisma.user.upsert({
    where: { email: 'jordan.lee@demo.leadpilot.ai' },
    update: {},
    create: {
      email: 'jordan.lee@demo.leadpilot.ai',
      passwordHash,
      firstName: 'Jordan',
      lastName: 'Lee',
      role: Role.SALES_AGENT,
      organizationId: org.id,
      isEmailVerified: true,
    },
  });

  // Subscription
  await prisma.subscription.upsert({
    where: { organizationId: org.id },
    update: {},
    create: { organizationId: org.id, plan: 'GROWTH', status: 'ACTIVE' },
  });

  // Wipe any previously seeded demo leads/products (fixed, well-known ids) so re-running
  // the seed always produces a coherent wellness-domain dataset, regardless of which org
  // a prior/partial seed run may have attached them to (old data cascades away with the leads).
  await prisma.lead.deleteMany({ where: { id: { startsWith: 'demo-lead-' } } });
  await prisma.product.deleteMany({ where: { id: { startsWith: 'prod-' } } });
  await prisma.organization.deleteMany({ where: { slug: 'vitality-wellness' } });

  // ─── Product catalog ────────────────────────────────────────────────────────
  const productDefs = [
    { id: 'prod-omega3', name: 'Omega-3 Fish Oil', sku: 'OMEGA3-1000', category: ProductCategory.SUPPLEMENT, price: 24.99, replenishmentDays: 30, description: 'Daily omega-3 softgels for heart and joint health.' },
    { id: 'prod-magnesium', name: 'Magnesium Glycinate', sku: 'MAG-GLY-200', category: ProductCategory.SUPPLEMENT, price: 19.99, replenishmentDays: 30, description: 'Highly absorbable magnesium for sleep and recovery.' },
    { id: 'prod-collagen', name: 'Collagen Peptides Powder', sku: 'COLLAGEN-450', category: ProductCategory.SUPPLEMENT, price: 34.99, replenishmentDays: 45, description: 'Unflavored collagen powder for skin and joint support.' },
    { id: 'prod-kettlebell', name: 'Adjustable Kettlebell Set', sku: 'KB-ADJ-40', category: ProductCategory.EQUIPMENT, price: 149.99, replenishmentDays: null, description: '5-40lb adjustable kettlebell for home strength training.' },
    { id: 'prod-yogamat', name: 'Smart Yoga Mat', sku: 'MAT-SMART-01', category: ProductCategory.EQUIPMENT, price: 89.99, replenishmentDays: null, description: 'Pressure-sensing mat with guided pose tracking.' },
    { id: 'prod-sleepprogram', name: 'Sleep Recovery Program (12-Week)', sku: 'SLEEP-PRG-12', category: ProductCategory.PROGRAM, price: 199.0, replenishmentDays: 84, description: 'Coached 12-week program to rebuild healthy sleep cycles.' },
    { id: 'prod-meditation', name: 'Mindful Meditation Membership', sku: 'MED-MEM-MO', category: ProductCategory.PROGRAM, price: 14.99, replenishmentDays: 30, description: 'Monthly membership with guided meditation sessions.' },
    { id: 'prod-massagegun', name: 'Recovery Massage Gun', sku: 'MG-PRO-2', category: ProductCategory.DEVICE, price: 129.0, replenishmentDays: null, description: 'Percussive therapy device for muscle recovery.' },
    { id: 'prod-sleeves', name: 'Compression Recovery Sleeves', sku: 'APP-COMP-01', category: ProductCategory.APPAREL, price: 34.99, replenishmentDays: null, description: 'Graduated compression sleeves for post-workout recovery.' },
  ];

  const products: Record<string, Awaited<ReturnType<typeof prisma.product.create>>> = {};
  for (const p of productDefs) {
    products[p.id] = await prisma.product.create({ data: { ...p, currency: 'USD', organizationId: org.id } });
  }

  // ─── Leads ──────────────────────────────────────────────────────────────────
  const leadDefs = [
    { id: 'demo-lead-1', name: 'Maria Gonzalez', email: 'maria.gonzalez@example.com', company: null, jobTitle: null, wellnessFocus: WellnessFocus.FITNESS, leadSource: LeadSource.REFERRAL, status: LeadStatus.QUALIFIED, estimatedValue: 450, tags: ['repeat-customer'], ownerId: admin.id },
    { id: 'demo-lead-2', name: 'James Whitfield', email: 'james.whitfield@meridianhr.com', company: 'Meridian HR', jobTitle: 'Wellness Program Coordinator', wellnessFocus: WellnessFocus.MENTAL_WELLNESS, leadSource: LeadSource.EVENT, status: LeadStatus.NEGOTIATION, estimatedValue: 12000, tags: ['corporate', 'bulk-order', 'hot'], ownerId: priya.id },
    { id: 'demo-lead-3', name: 'Devon Clarke', email: 'devon.clarke@example.com', company: null, jobTitle: null, wellnessFocus: WellnessFocus.SLEEP_RECOVERY, leadSource: LeadSource.WEBSITE, status: LeadStatus.PROPOSAL, estimatedValue: 600, tags: ['hot'], ownerId: admin.id },
    { id: 'demo-lead-4', name: 'Aaliyah Brooks', email: 'aaliyah.brooks@example.com', company: null, jobTitle: null, wellnessFocus: WellnessFocus.WEIGHT_MANAGEMENT, leadSource: LeadSource.SOCIAL_MEDIA, status: LeadStatus.NEW, estimatedValue: 80, tags: [], ownerId: jordan.id },
    { id: 'demo-lead-5', name: 'Marcus Chen', email: 'marcus.chen@example.com', company: null, jobTitle: null, wellnessFocus: WellnessFocus.NUTRITION, leadSource: LeadSource.EMAIL_CAMPAIGN, status: LeadStatus.WON, estimatedValue: 300, tags: ['repeat-customer'], ownerId: jordan.id },
    { id: 'demo-lead-6', name: 'Sofia Reyes', email: 'sofia.reyes@example.com', company: null, jobTitle: null, wellnessFocus: WellnessFocus.SKINCARE, leadSource: LeadSource.SOCIAL_MEDIA, status: LeadStatus.CONTACTED, estimatedValue: 140, tags: [], ownerId: priya.id },
    { id: 'demo-lead-7', name: 'Ethan Walsh', email: 'ethan.walsh@example.com', company: null, jobTitle: null, wellnessFocus: WellnessFocus.FITNESS, leadSource: LeadSource.COLD_CALL, status: LeadStatus.LOST, estimatedValue: 90, tags: [], ownerId: admin.id },
    { id: 'demo-lead-8', name: 'Priya Nair', email: 'priya.nair@brightpathfitness.com', company: 'BrightPath Fitness Studios', jobTitle: 'Studio Owner', wellnessFocus: WellnessFocus.FITNESS, leadSource: LeadSource.PARTNER, status: LeadStatus.QUALIFIED, estimatedValue: 5400, tags: ['corporate', 'bulk-order'], ownerId: admin.id },
    { id: 'demo-lead-9', name: 'Noah Fischer', email: 'noah.fischer@example.com', company: null, jobTitle: null, wellnessFocus: WellnessFocus.SLEEP_RECOVERY, leadSource: LeadSource.WEBSITE, status: LeadStatus.DISQUALIFIED, estimatedValue: 50, tags: [], ownerId: jordan.id },
    { id: 'demo-lead-10', name: 'Grace Kim', email: 'grace.kim@example.com', company: null, jobTitle: null, wellnessFocus: WellnessFocus.MENTAL_WELLNESS, leadSource: LeadSource.EVENT, status: LeadStatus.NEGOTIATION, estimatedValue: 250, tags: ['repeat-customer'], ownerId: priya.id },
    { id: 'demo-lead-11', name: 'Liam O’Connor', email: 'liam.oconnor@example.com', company: null, jobTitle: null, wellnessFocus: WellnessFocus.NUTRITION, leadSource: LeadSource.INBOUND, status: LeadStatus.NEW, estimatedValue: 65, tags: [], ownerId: admin.id },
    { id: 'demo-lead-12', name: 'Amara Diallo', email: 'amara.diallo@example.com', company: null, jobTitle: null, wellnessFocus: WellnessFocus.WEIGHT_MANAGEMENT, leadSource: LeadSource.REFERRAL, status: LeadStatus.WON, estimatedValue: 320, tags: ['repeat-customer'], ownerId: jordan.id },
  ];

  const leads: Record<string, Awaited<ReturnType<typeof prisma.lead.create>>> = {};
  for (const l of leadDefs) {
    leads[l.id] = await prisma.lead.create({ data: { ...l, organizationId: org.id } });
  }

  // ─── Purchases (with replenishment cycles) ─────────────────────────────────
  const purchase = async (
    leadId: string,
    productId: keyof typeof products,
    opts: { quantity?: number; purchasedAgoDays: number },
  ) => {
    const product = products[productId];
    const purchasedAt = agoDays(opts.purchasedAgoDays);
    const nextReplenishmentAt = product.replenishmentDays
      ? new Date(purchasedAt.getTime() + product.replenishmentDays * 24 * 60 * 60 * 1000)
      : null;

    await prisma.purchase.create({
      data: {
        leadId,
        productId: product.id,
        organizationId: org.id,
        quantity: opts.quantity ?? 1,
        unitPrice: product.price,
        currency: product.currency,
        purchasedAt,
        nextReplenishmentAt,
      },
    });
  };

  // Maria — repeat kettlebell + recovery sleeves customer
  await purchase(leads['demo-lead-1'].id, 'prod-kettlebell', { purchasedAgoDays: 60 });
  await purchase(leads['demo-lead-1'].id, 'prod-sleeves', { purchasedAgoDays: 20 });

  // Devon — bought the sleep program, due to renew soon
  await purchase(leads['demo-lead-3'].id, 'prod-sleepprogram', { purchasedAgoDays: 80 });

  // Marcus — repeat omega-3 + magnesium buyer, due for refill very soon (demonstrates replenishment nudge)
  await purchase(leads['demo-lead-5'].id, 'prod-omega3', { purchasedAgoDays: 28, quantity: 2 });
  await purchase(leads['demo-lead-5'].id, 'prod-magnesium', { purchasedAgoDays: 27 });

  // Sofia — collagen for skincare focus
  await purchase(leads['demo-lead-6'].id, 'prod-collagen', { purchasedAgoDays: 40 });

  // Priya Nair — bulk studio equipment order
  await purchase(leads['demo-lead-8'].id, 'prod-kettlebell', { quantity: 10, purchasedAgoDays: 15 });
  await purchase(leads['demo-lead-8'].id, 'prod-yogamat', { quantity: 15, purchasedAgoDays: 15 });

  // Grace — meditation membership, renews monthly
  await purchase(leads['demo-lead-10'].id, 'prod-meditation', { purchasedAgoDays: 26 });

  // Amara — massage gun + compression sleeves
  await purchase(leads['demo-lead-12'].id, 'prod-massagegun', { purchasedAgoDays: 10 });
  await purchase(leads['demo-lead-12'].id, 'prod-sleeves', { purchasedAgoDays: 10 });

  // ─── Activities ─────────────────────────────────────────────────────────────
  await prisma.activity.createMany({
    skipDuplicates: true,
    data: [
      { type: ActivityType.CALL, title: 'Discovery call about training goals', leadId: leads['demo-lead-1'].id, userId: admin.id, duration: 20, outcome: 'Wants a home strength routine.' },
      { type: ActivityType.MEETING, title: 'Corporate wellness bundle walkthrough', leadId: leads['demo-lead-2'].id, userId: priya.id, duration: 45 },
      { type: ActivityType.EMAIL, title: 'Sent sleep program overview', leadId: leads['demo-lead-3'].id, userId: admin.id },
      { type: ActivityType.CALL, title: 'Discussed studio bulk pricing', leadId: leads['demo-lead-8'].id, userId: admin.id, duration: 30 },
      // Upcoming follow-ups (calls/tasks), independent of product replenishment
      { type: ActivityType.CALL, title: 'Check in on kettlebell routine progress', leadId: leads['demo-lead-1'].id, userId: admin.id, scheduledAt: inDays(2) },
      { type: ActivityType.MEETING, title: 'Employee wellness contract review', leadId: leads['demo-lead-2'].id, userId: priya.id, scheduledAt: inDays(3) },
      { type: ActivityType.CALL, title: 'Follow up on sleep program proposal', leadId: leads['demo-lead-3'].id, userId: admin.id, scheduledAt: inDays(5) },
      { type: ActivityType.TASK, title: 'Send studio order confirmation', leadId: leads['demo-lead-8'].id, userId: jordan.id, scheduledAt: inDays(1) },
      { type: ActivityType.CALL, title: 'Check satisfaction with meditation sessions', leadId: leads['demo-lead-10'].id, userId: priya.id, scheduledAt: inDays(6) },
    ],
  });

  // ─── Notes ──────────────────────────────────────────────────────────────────
  await prisma.note.createMany({
    skipDuplicates: true,
    data: [
      { content: 'Loves the adjustable kettlebell. Asked whether we sell resistance bands too — good cross-sell opportunity.', leadId: leads['demo-lead-1'].id, userId: admin.id, isPinned: true },
      { content: 'Needs sign-off from 40-person team before committing to the monthly meditation membership bundle. Budget approved for Q3.', leadId: leads['demo-lead-2'].id, userId: priya.id, isPinned: true },
      { content: 'Struggling with insomnia for 6 months, very motivated to start the sleep program. Price-sensitive.', leadId: leads['demo-lead-3'].id, userId: admin.id },
      { content: 'Following a few fitness influencers who recommended our brand. Early-stage, just browsing.', leadId: leads['demo-lead-4'].id, userId: jordan.id },
      { content: 'Reordered omega-3 and magnesium right on schedule last time — very reliable repeat buyer.', leadId: leads['demo-lead-5'].id, userId: jordan.id, isPinned: true },
      { content: 'Asked about a bundle of collagen + vitamin C for skin brightening.', leadId: leads['demo-lead-6'].id, userId: priya.id },
      { content: 'Went with a cheaper competitor kettlebell set — price was the deciding factor.', leadId: leads['demo-lead-7'].id, userId: admin.id },
      { content: 'Runs a 200-member fitness studio, wants ongoing wholesale pricing on equipment restocks.', leadId: leads['demo-lead-8'].id, userId: admin.id, isPinned: true },
      { content: 'Very happy with the massage gun, asked if we have a travel-size version.', leadId: leads['demo-lead-12'].id, userId: jordan.id },
    ],
  });

  console.log(`✅ Seeded: 1 org (Vitality Wellness Co.), 3 users, ${leadDefs.length} leads, ${productDefs.length} products, purchases + activities + notes`);
  console.log('Login: admin@demo.leadpilot.ai / Demo1234!  (also: priya.patel@demo.leadpilot.ai, jordan.lee@demo.leadpilot.ai — same password)');
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
