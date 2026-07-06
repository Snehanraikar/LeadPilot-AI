import request from 'supertest';
import app from '../app';
import { prisma } from '../config/database';

let accessToken: string;
let orgId: string;
let leadId: string;

beforeAll(async () => {
  await prisma.$connect();

  const res = await request(app).post('/api/auth/register').send({
    email: `lead-test-${Date.now()}@test.com`,
    password: 'Test1234!',
    firstName: 'Lead',
    lastName: 'Tester',
    organizationName: 'Lead Test Org',
  });

  accessToken = res.body.data.accessToken;

  const meRes = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${accessToken}`);

  orgId = meRes.body.data.organization.id;
});

afterAll(async () => { await prisma.$disconnect(); });

describe('POST /api/leads', () => {
  it('creates a lead successfully', async () => {
    const res = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Acme Corp', email: 'ceo@acme.com', company: 'Acme', status: 'NEW' });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Acme Corp');
    leadId = res.body.data.id;
  });

  it('returns 422 when name is missing', async () => {
    const res = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: 'test@test.com' });

    expect(res.status).toBe(422);
  });
});

describe('GET /api/leads', () => {
  it('returns paginated leads', async () => {
    const res = await request(app)
      .get('/api/leads')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.meta).toHaveProperty('total');
    expect(res.body.meta).toHaveProperty('page');
  });
});

describe('GET /api/leads/:id', () => {
  it('returns lead by id', async () => {
    const res = await request(app)
      .get(`/api/leads/${leadId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(leadId);
  });

  it('returns 404 for non-existent lead', async () => {
    const res = await request(app)
      .get('/api/leads/nonexistent-id')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/leads/:id', () => {
  it('updates lead status', async () => {
    const res = await request(app)
      .patch(`/api/leads/${leadId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'CONTACTED' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CONTACTED');
  });
});

describe('DELETE /api/leads/:id', () => {
  it('soft deletes a lead', async () => {
    const res = await request(app)
      .delete(`/api/leads/${leadId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(204);
  });
});

describe('GET /api/leads/stats/dashboard', () => {
  it('returns dashboard stats', async () => {
    const res = await request(app)
      .get('/api/leads/stats/dashboard')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('total');
    expect(res.body.data).toHaveProperty('conversionRate');
  });
});
