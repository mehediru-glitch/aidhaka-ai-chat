const request = require('supertest');
const { app } = require('../api/server');
const db = require('../api/database');

beforeAll(async () => {
  await db.init();
});

beforeEach(async () => {
  await db.run('DELETE FROM messages');
  await db.run('DELETE FROM topics');
  await db.run('DELETE FROM conversations');
  await db.run('DELETE FROM user_profiles');
});

describe('Aidhaka AI API', () => {
  test('GET /api/health returns 200', async () => {
    const response = await request(app).get('/api/health');
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test('POST /api/chat returns response', async () => {
    const response = await request(app)
      .post('/api/chat')
      .send({ question: 'Hello, how are you?' });
    
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.reply).toBeDefined();
  });

  test('POST /api/chat without question returns 400', async () => {
    const response = await request(app)
      .post('/api/chat')
      .send({});
    
    expect(response.statusCode).toBe(400);
  });

  test('GET /api/routing returns routing decision', async () => {
    const response = await request(app)
      .get('/api/routing')
      .query({ q: 'write a python function' });
    
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.selectedProvider).toBeDefined();
  });

  test('GET /api/providers returns providers list', async () => {
    const response = await request(app).get('/api/providers');
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.providers).toBeDefined();
  });

  test('GET /api/health returns provider status', async () => {
    const response = await request(app).get('/api/health');
    expect(response.statusCode).toBe(200);
    expect(response.body.providers).toBeDefined();
  });

  test('GET /api/usage returns usage data', async () => {
    const response = await request(app).get('/api/usage');
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.usage).toBeDefined();
  });

  test('POST /api/chat/force returns response or error without keys', async () => {
    const response = await request(app)
      .post('/api/chat/force')
      .send({ question: 'Hello', provider: 'groq' });
    
    expect([200, 500]).toContain(response.statusCode);
    if (response.statusCode === 200) {
      expect(response.body.success).toBe(true);
      expect(response.body.reply).toBeDefined();
    }
  });

  test('GET /api/sentiment analyzes text', async () => {
    const response = await request(app)
      .get('/api/sentiment')
      .query({ text: 'I am very happy and excited today!' });
    
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.sentiment).toBeDefined();
    expect(response.body.emotion).toBeDefined();
  });

  test('POST /api/intent classifies intent', async () => {
    const response = await request(app)
      .post('/api/intent')
      .send({ text: 'How do I write a Python function?' });
    
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.intent).toBeDefined();
    expect(response.body.intent.primary).toBeDefined();
  });

  test('GET /api/reason shows reasoning steps', async () => {
    const response = await request(app)
      .get('/api/reason')
      .query({ q: 'Explain quantum computing' });
    
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.reasoningSteps).toBeDefined();
    expect(response.body.finalDecision).toBeDefined();
  });

  test('POST /api/context manages conversation context', async () => {
    const sessionId = 'test-session-123';
    
    const updateResponse = await request(app)
      .post('/api/context')
      .send({ session_id: sessionId, action: 'update', data: { input: 'Hello, how are you?' } });
    
    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.body.success).toBe(true);
    
    const getResponse = await request(app)
      .get('/api/context')
      .query({ session_id: sessionId });
    
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.body.context).toBeDefined();
  });

  test('GET /api/predict predicts best provider', async () => {
    const response = await request(app)
      .get('/api/predict')
      .query({ q: 'Write a JavaScript function' });
    
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.predictions).toBeDefined();
    expect(response.body.bestProvider).toBeDefined();
  });

  test('POST /api/learn/feedback records learning feedback', async () => {
    const response = await request(app)
      .post('/api/learn/feedback')
      .send({
        question: 'What is machine learning?',
        provider: 'groq',
        quality_score: 85,
        user_satisfaction: 8,
        success: true,
        response_time: 1500
      });
    
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.learned).toBeDefined();
  });

  test('POST /api/conversations creates conversation', async () => {
    const response = await request(app)
      .post('/api/conversations')
      .send({ user_id: 'test-user-1', session_id: 'test-session-1' });
    
    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.conversation.id).toBeDefined();
  });

  test('GET /api/conversations returns user conversations', async () => {
    const response = await request(app)
      .get('/api/conversations')
      .query({ user_id: 'test-user-1' });
    
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.conversations)).toBe(true);
  });

  test('GET /api/profile returns user profile', async () => {
    const response = await request(app)
      .get('/api/profile')
      .query({ user_id: 'test-user-1' });
    
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.profile).toBeDefined();
  });

  test('POST /api/profile/clarify detects ambiguity', async () => {
    const response = await request(app)
      .post('/api/profile/clarify')
      .send({ message: 'Can you explain it again?' });
    
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.needsClarification).toBe(true);
  });

  test('GET /api/privacy/settings returns default settings', async () => {
    const response = await request(app)
      .get('/api/privacy/settings')
      .query({ user_id: 'test-user-privacy-2' });
    
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.settings.dataRetentionDays).toBe(30);
  });

  test('PATCH /api/privacy/settings updates settings', async () => {
    const response = await request(app)
      .patch('/api/privacy/settings')
      .query({ user_id: 'test-user-privacy-2' })
      .send({ dataRetentionDays: 90, allowPersonalization: false });
    
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.settings.dataRetentionDays).toBe(90);
    expect(response.body.settings.allowPersonalization).toBe(false);
  });

  test('GET /api/privacy/export returns user data', async () => {
    const response = await request(app)
      .get('/api/privacy/export')
      .query({ user_id: 'test-user-privacy-2' });
    
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.user).toBeDefined();
  });

  test('GET /api/privacy/retention-report returns report', async () => {
    const response = await request(app)
      .get('/api/privacy/retention-report')
      .query({ user_id: 'test-user-privacy-2' });
    
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.report).toBeDefined();
  });

  test('DELETE /api/privacy/delete requires confirmation', async () => {
    const response = await request(app)
      .delete('/api/privacy/delete')
      .query({ user_id: 'test-user-privacy-2' });
    
    expect(response.statusCode).toBe(400);
  });

  test('GET /api/cache/stats returns cache statistics', async () => {
    const response = await request(app)
      .get('/api/cache/stats');
    
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.stats).toBeDefined();
  });

  test('GET /api/cache/analysis returns optimization analysis', async () => {
    const response = await request(app)
      .get('/api/cache/analysis');
    
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.analysis).toBeDefined();
  });

  test('POST /api/cache/clear clears cache', async () => {
    const response = await request(app)
      .post('/api/cache/clear')
      .send({});
    
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test('GET /api/cache/health returns cache health', async () => {
    const response = await request(app)
      .get('/api/cache/health');
    
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.health).toBeDefined();
  });
});
