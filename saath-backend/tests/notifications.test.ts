import { describe, expect, it, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { store } from '../src/db/store.js';

describe('SAATH Case-Specific Notifications', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    store.users.clear();
    store.records.clear();
    store.blocklist.clear();
  });

  const connectVictim = async (docket: string) => {
    const res = await request(app).post('/api/v1/cases/connect').send({ reference_id: docket });
    expect(res.status).toBe(200);
    return res.body.data.accessToken as string;
  };

  it('generates case-specific notifications for victim 1 (NHAA-RJ-2026-004821)', async () => {
    const token = await connectVictim('NHAA-RJ-2026-004821');
    const res = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const notifs = res.body.data;
    expect(Array.isArray(notifs)).toBe(true);

    // 1. Case connected
    const connected = notifs.find((n: any) => n.type === 'case_connected');
    expect(connected).toBeDefined();
    expect(connected.message).toContain('NHAA-RJ-2026-004821');

    // 2. Stage updated
    const stage = notifs.find((n: any) => n.type === 'case_stage_updated');
    expect(stage).toBeDefined();
    expect(stage.title).toContain('Investigation');

    // 3. Upcoming hearing
    const hearing = notifs.find((n: any) => n.type === 'upcoming_hearing');
    expect(hearing).toBeDefined();
    expect(hearing.message).toContain('2026-09-18');

    // 4. Counsellor assigned (resolved from counsellors DB: C001 -> Anjali Sharma)
    const counsellor = notifs.find((n: any) => n.type === 'counsellor_assigned');
    expect(counsellor).toBeDefined();
    expect(counsellor.message).toContain('Anjali Sharma');

    // 5. Counselling appointment / schedule
    const counselling = notifs.find((n: any) => n.type === 'counselling_appointment');
    expect(counselling).toBeDefined();
    expect(counselling.title).toBe('Counselling Follow-up Schedule');
    expect(counselling.message).toContain('every 3 days');

    // 6. Legal aid / protection
    const protection = notifs.find((n: any) => n.type === 'legal_protection_update');
    expect(protection).toBeDefined();
    expect(protection.message).toContain('Under Review');

    // 7. Financial relief update (valid amounts from database)
    const relief = notifs.find((n: any) => n.type === 'financial_relief_update');
    expect(relief).toBeDefined();
    expect(relief.message).toContain('Partially Disbursed');
    expect(relief.message).toContain('1,25,000');
    expect(relief.message).toContain('62,500');

    // 8. Daily check-in
    const daily = notifs.find((n: any) => n.type === 'daily_checkin');
    expect(daily).toBeDefined();
    expect(daily.message).toBe('Take a moment to complete your wellbeing check-in. You can check in whenever you feel ready.');
  });

  it('generates completely different case-specific notifications for victim 2 (NHAA-TN-2026-003746)', async () => {
    const token = await connectVictim('NHAA-TN-2026-003746');
    const res = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const notifs = res.body.data;

    // Different docket
    const connected = notifs.find((n: any) => n.type === 'case_connected');
    expect(connected.message).toContain('NHAA-TN-2026-003746');

    // Different hearing date
    const hearing = notifs.find((n: any) => n.type === 'upcoming_hearing');
    expect(hearing.message).toContain('2026-09-15');
    expect(hearing.message).not.toContain('2026-09-18');

    // Different counsellor (C002 -> Ravi Kumar)
    const counsellor = notifs.find((n: any) => n.type === 'counsellor_assigned');
    expect(counsellor.message).toContain('Ravi Kumar');
    expect(counsellor.message).not.toContain('Anjali Sharma');

    // Different counselling schedule (daily)
    const counselling = notifs.find((n: any) => n.type === 'counselling_appointment');
    expect(counselling.message).toContain('daily');

    // Legal aid is false (Not assigned), Protection is Active
    const protection = notifs.find((n: any) => n.type === 'legal_protection_update');
    expect(protection.message).toContain('Active');

    // Different relief amounts: 90,000 and 45,000
    const relief = notifs.find((n: any) => n.type === 'financial_relief_update');
    expect(relief.message).toContain('90,000');
    expect(relief.message).toContain('45,000');
  });

  it('omits notifications when database fields are null or not applicable (NHAA-KA-2026-005218)', async () => {
    const token = await connectVictim('NHAA-KA-2026-005218');
    const res = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const notifs = res.body.data;

    // next_court_date is null in database -> hearing notification MUST be omitted
    const hearing = notifs.find((n: any) => n.type === 'upcoming_hearing');
    expect(hearing).toBeUndefined();

    // financial_relief_status is "Not Yet Assessed" with 0/0 amounts -> relief notification MUST be omitted
    const relief = notifs.find((n: any) => n.type === 'financial_relief_update');
    expect(relief).toBeUndefined();

    // Daily check-in is still generated
    const daily = notifs.find((n: any) => n.type === 'daily_checkin');
    expect(daily).toBeDefined();

    // Total count is less than 8 (no fabrication of missing data)
    expect(notifs.length).toBeLessThan(8);
  });

  it('generates daily check-in immediately upon login and prevents duplicate daily notifications', async () => {
    const token = await connectVictim('NHAA-RJ-2026-004821');

    // First request
    const firstRes = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${token}`);
    expect(firstRes.status).toBe(200);
    const firstDailyList = firstRes.body.data.filter((n: any) => n.type === 'daily_checkin');
    expect(firstDailyList).toHaveLength(1);

    // Repeated request should not duplicate daily check-in
    const secondRes = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${token}`);
    expect(secondRes.status).toBe(200);
    const secondDailyList = secondRes.body.data.filter((n: any) => n.type === 'daily_checkin');
    expect(secondDailyList).toHaveLength(1);
    expect(secondRes.body.data.length).toBe(firstRes.body.data.length);
  });

  it('marks a single notification and all notifications as read', async () => {
    const token = await connectVictim('NHAA-RJ-2026-004821');
    const getRes = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${token}`);
    const notifs = getRes.body.data;
    expect(notifs.every((n: any) => !n.read)).toBe(true);

    const targetId = notifs[0].id;

    // Mark single notification as read
    const patchRes = await request(app).patch(`/api/v1/notifications/${encodeURIComponent(targetId)}/read`).set('Authorization', `Bearer ${token}`);
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data).toMatchObject({ id: targetId, read: true });

    // Verify target is now read and others remain unread
    const afterSingle = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${token}`);
    const readItem = afterSingle.body.data.find((n: any) => n.id === targetId);
    expect(readItem.read).toBe(true);
    const unreadCount = afterSingle.body.data.filter((n: any) => !n.read).length;
    expect(unreadCount).toBe(notifs.length - 1);

    // Mark all as read
    const allRes = await request(app).post('/api/v1/notifications/mark-all-read').set('Authorization', `Bearer ${token}`);
    expect(allRes.status).toBe(200);
    expect(allRes.body.data.markedAllRead).toBe(true);

    // Verify all notifications are read
    const afterAll = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${token}`);
    expect(afterAll.body.data.every((n: any) => n.read)).toBe(true);
  });

  it('enforces authentication and does not leak or accept arbitrary case IDs from query/body', async () => {
    // Unauthenticated request fails
    const unauthRes = await request(app).get('/api/v1/notifications');
    expect(unauthRes.status).toBe(401);

    // Authenticated request ignores query params trying to view another case
    const token = await connectVictim('NHAA-RJ-2026-004821');
    const queryRes = await request(app)
      .get('/api/v1/notifications?caseId=synthetic-case-005&docket=NHAA-TN-2026-003746')
      .set('Authorization', `Bearer ${token}`);

    expect(queryRes.status).toBe(200);
    const connected = queryRes.body.data.find((n: any) => n.type === 'case_connected');
    // Must strictly be the authenticated survivor's case, NOT the query param!
    expect(connected.message).toContain('NHAA-RJ-2026-004821');
    expect(connected.message).not.toContain('NHAA-TN-2026-003746');
  });
});
