import { describe, it, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { startPostgres } from './helpers/postgres.js';

let pg;
const realFetch = globalThis.fetch;
let handlers;
let calls;

// Records every outbound AI call and returns whatever the test queued for it.
const stubFetch = async (url, init = {}) => {
  const host = String(url);
  calls.push({ host, init });

  for (const handler of handlers) {
    if (host.includes(handler.match)) {
      if (handler.networkError) throw new Error(handler.networkError);
      return {
        ok: handler.status >= 200 && handler.status < 300,
        status: handler.status,
        json: async () => handler.body
      };
    }
  }

  throw new Error(`unstubbed request to ${host}`);
};

const queue = (...list) => { handlers = list; };

const chatBody = (text) => ({ choices: [{ message: { content: text } }] });
const geminiBody = (text) => ({ candidates: [{ content: { parts: [{ text }] } }] });

before(async () => {
  pg = await startPostgres();
  process.env.DATABASE_URL = pg.url;
  process.env.DIRECT_URL = pg.url;
  process.env.JWT_SECRET = 'test-secret-not-a-public-default';
  process.env.SESSION_SECRET = 'test-session-secret-not-public';
  process.env.PASSWORD_RESET_TOKEN_SECRET = 'test-reset-secret-not-public';
  process.env.NODE_ENV = 'test';
  // Deliberately real-looking values so a leak would be obvious in an assertion.
  process.env.GEMINI_API_KEY = 'AIzaTESTKEY0000000000000000000000000000000';
  process.env.GROQ_API_KEY = 'gsk_TESTKEY0000000000000000000000000000000000000000000000000';
  process.env.OPENROUTER_API_KEY = 'sk-or-v1-TESTKEY0000000000000000000000000000000000000000000';
  process.env.DEEPSEEK_API_KEY = 'sk-TESTKEY00000000000000000000000000';
  process.env.DEEPSEEK_API_KEY = 'sk-TESTKEY00000000000000000000000000';
  process.env.ELEVENLABS_API_KEY = 'sk_TESTELEVENLABSKEY00000000000000000000000000';
});

after(async () => {
  globalThis.fetch = realFetch;
  await pg.stop();
});

beforeEach(() => {
  handlers = [];
  calls = [];
  globalThis.fetch = stubFetch;
});

describe('AI provider failover', () => {
  it('reports the full chain and every provider as configured', async () => {
    const { aiStatus } = await import('../src/services/aiService.js');
    const status = aiStatus();

    assert.equal(status.enabled, true);
    assert.equal(status.activeProvider, 'gemini -> groq -> openrouter -> deepseek');

    for (const id of ['gemini', 'groq', 'openrouter', 'deepseek']) {
      assert.equal(status.providers[id].configured, true, `${id} should be configured`);
    }
  });

  it('never exposes a key through the status payload', async () => {
    const { aiStatus } = await import('../src/services/aiService.js');
    const serialized = JSON.stringify(aiStatus());

    for (const key of Object.values(process.env).filter((v) => /^(AIza|gsk_|sk-or-v1|sk_TEST)/.test(v || ''))) {
      assert.ok(!serialized.includes(key), 'a key leaked into the status payload');
    }
  });

  it('never puts a key in a request URL', async () => {
    const { generateDoubtAnswer } = await import('../src/services/aiService.js');
    queue({ match: 'generativelanguage', status: 200, body: geminiBody('ok') });

    await generateDoubtAnswer({ question: 'What is a mutex?' });

    assert.equal(calls.length, 1);
    assert.ok(!calls[0].host.includes('AIza'), 'the Gemini key must not appear in the URL query string');
    assert.equal(calls[0].init.headers['x-goog-api-key'], process.env.GEMINI_API_KEY);
  });

  it('sends the key in the Authorization header for OpenAI-compatible providers', async () => {
    const { generateDoubtAnswer } = await import('../src/services/aiService.js');
    // Fail Gemini over so the request lands on Groq.
    queue(
      { match: 'generativelanguage', status: 500, body: { error: { message: 'quota exceeded' } } },
      { match: 'api.groq.com', status: 200, body: chatBody('a mutex is a lock') }
    );

    const result = await generateDoubtAnswer({ question: 'What is a mutex?' });
    assert.equal(result.provider, 'groq');

    const groqCall = calls.find((c) => c.host.includes('api.groq.com'));
    assert.equal(groqCall.init.headers.Authorization, `Bearer ${process.env.GROQ_API_KEY}`);
    assert.ok(!groqCall.host.includes(process.env.GROQ_API_KEY), 'key must not be in the URL');
  });

  it('uses the first provider that succeeds', async () => {
    const { generateDoubtAnswer } = await import('../src/services/aiService.js');
    queue({ match: 'generativelanguage', status: 200, body: geminiBody('primary answer') });

    const result = await generateDoubtAnswer({ question: 'q' });
    assert.equal(result.provider, 'gemini');
    assert.equal(result.answer, 'primary answer');
    assert.equal(calls.length, 1, 'no failover should be attempted after a success');
  });

  it('falls through providers in order until one answers', async () => {
    const { generateDoubtAnswer } = await import('../src/services/aiService.js');
    queue(
      { match: 'generativelanguage', status: 429, body: { error: { message: 'rate limited' } } },
      { match: 'api.groq.com', status: 503, body: { error: { message: 'unavailable' } } },
      { match: 'openrouter.ai', status: 200, body: chatBody('third time lucky') }
    );

    const result = await generateDoubtAnswer({ question: 'q' });
    assert.equal(result.provider, 'openrouter');
    assert.equal(result.answer, 'third time lucky');
    assert.equal(calls.length, 3);
  });

  it('reaches the last provider in the chain', async () => {
    const { generateDoubtAnswer } = await import('../src/services/aiService.js');
    queue(
      { match: 'generativelanguage', status: 500, body: { error: { message: 'a' } } },
      { match: 'api.groq.com', status: 500, body: { error: { message: 'b' } } },
      { match: 'openrouter.ai', status: 500, body: { error: { message: 'c' } } },
      { match: 'api.deepseek.com', status: 200, body: chatBody('deepseek answered') }
    );

    const result = await generateDoubtAnswer({ question: 'q' });
    assert.equal(result.provider, 'deepseek');
    assert.equal(calls.length, 4);
  });

  it('fails with a 502 when every provider fails, naming each one', async () => {
    const { generateDoubtAnswer } = await import('../src/services/aiService.js');
    queue(
      { match: 'generativelanguage', status: 500, body: { error: { message: 'a' } } },
      { match: 'api.groq.com', status: 500, body: { error: { message: 'b' } } },
      { match: 'openrouter.ai', status: 500, body: { error: { message: 'c' } } },
      { match: 'api.deepseek.com', status: 500, body: { error: { message: 'd' } } }
    );

    await assert.rejects(
      generateDoubtAnswer({ question: 'q' }),
      (err) => {
        assert.equal(err.statusCode, 502);
        for (const id of ['gemini', 'groq', 'openrouter', 'deepseek']) {
          assert.match(err.message, new RegExp(id, 'i'), 'the failure should name the provider');
        }
        return true;
      }
    );
  });

  it('treats an empty completion as a failure and keeps failing over', async () => {
    const { generateDoubtAnswer } = await import('../src/services/aiService.js');
    queue(
      { match: 'generativelanguage', status: 200, body: { candidates: [{ content: { parts: [{ text: '   ' }] } }] } },
      { match: 'api.groq.com', status: 200, body: chatBody('   ' ) },
      { match: 'openrouter.ai', status: 200, body: chatBody('real content') }
    );

    const result = await generateDoubtAnswer({ question: 'q' });
    assert.equal(result.provider, 'openrouter');
    assert.equal(result.answer, 'real content');
  });

  it('recovers from a network error by trying the next provider', async () => {
    const { generateDoubtAnswer } = await import('../src/services/aiService.js');
    queue(
      { match: 'generativelanguage', networkError: 'getaddrinfo ENOTFOUND generativelanguage.googleapis.com' },
      { match: 'api.groq.com', status: 200, body: chatBody('groq saved the day') }
    );

    const result = await generateDoubtAnswer({ question: 'q' });
    assert.equal(result.provider, 'groq');
  });

  it('never attempts a text completion against ElevenLabs', async () => {
    const { generateDoubtAnswer } = await import('../src/services/aiService.js');
    // Every provider fails; ElevenLabs is configured, so if it were in the chain
    // it would have been tried and named in the error.
    queue(
      { match: 'generativelanguage', status: 500, body: { error: { message: 'a' } } },
      { match: 'api.groq.com', status: 500, body: { error: { message: 'b' } } },
      { match: 'openrouter.ai', status: 500, body: { error: { message: 'c' } } },
      { match: 'api.deepseek.com', status: 500, body: { error: { message: 'd' } } }
    );

    await assert.rejects(generateDoubtAnswer({ question: 'q' }), (err) => {
      assert.ok(!/elevenlabs/i.test(err.message), 'ElevenLabs must not appear in the completion chain');
      return true;
    });
  });
});

describe('AI structured output handling', () => {
  it('parses a fenced JSON quiz and reports the provider', async () => {
    const { generateQuiz } = await import('../src/services/aiService.js');
    const payload = {
      title: 'Operating Systems',
      questions: [{ prompt: 'What is a semaphore?', options: ['a', 'b', 'c', 'd'], correctAnswer: 'a', explanation: 'because' }]
    };
    queue({ match: 'generativelanguage', status: 200, body: geminiBody('```json\n' + JSON.stringify(payload) + '\n```') });

    const quiz = await generateQuiz({ topic: 'OS', difficulty: 'medium', count: 1 });
    assert.equal(quiz.provider, 'gemini');
    assert.equal(quiz.questions.length, 1);
    assert.equal(quiz.questions[0].correctAnswer, 'a');
  });

  it('rejects a quiz that is not the promised shape instead of returning junk', async () => {
    const { generateQuiz } = await import('../src/services/aiService.js');
    // Every provider answers conversationally, so all four must be tried and the
    // request must still fail rather than hand the client a shape-less object.
    queue(
      { match: 'generativelanguage', status: 200, body: geminiBody('I am a chatty model and refused to emit JSON.') },
      { match: 'api.groq.com', status: 200, body: chatBody('also chatty') },
      { match: 'openrouter.ai', status: 200, body: chatBody('still chatty') },
      { match: 'api.deepseek.com', status: 200, body: chatBody('chatty to the end') }
    );

    await assert.rejects(generateQuiz({ topic: 'OS', difficulty: 'medium', count: 1 }), (err) => {
      assert.equal(err.statusCode, 502);
      assert.match(err.message, /not valid JSON/i);
      return true;
    });
  });

  it('fails over when a provider returns the wrong JSON shape', async () => {
    const { generateStudyPlan } = await import('../src/services/aiService.js');
    const plan = { title: 'Plan', description: 'd', schedule: [{ title: 'Day 1', time: '2 hours', detail: 'x' }] };

    // The first provider returns perfectly valid JSON of the *wrong* shape. That
    // is a provider failure, so the chain must continue rather than propagate it.
    queue(
      { match: 'generativelanguage', status: 200, body: geminiBody(JSON.stringify({ notes: ['not a schedule'] })) },
      { match: 'api.groq.com', status: 200, body: chatBody(JSON.stringify(plan)) }
    );

    const result = await generateStudyPlan({ course: 'OS', targetDate: '14 days', hours: 2 });
    assert.equal(result.provider, 'groq');
    assert.equal(result.schedule.length, 1);
    assert.equal(result.schedule[0].title, 'Day 1');
  });

  it('rejects an empty schedule rather than returning an empty plan', async () => {
    const { generateStudyPlan } = await import('../src/services/aiService.js');
    queue(
      { match: 'generativelanguage', status: 200, body: geminiBody(JSON.stringify({ schedule: [] })) },
      { match: 'api.groq.com', status: 200, body: chatBody('no plan for you') },
      { match: 'openrouter.ai', status: 200, body: chatBody('nope') },
      { match: 'api.deepseek.com', status: 200, body: chatBody('nope') }
    );

    await assert.rejects(generateStudyPlan({ course: 'OS' }), /no schedule entries/i);
  });

  it('escapes nothing into HTML: a script payload survives as inert data', async () => {
    const { generateDoubtAnswer } = await import('../src/services/aiService.js');
    const hostile = '<script>alert(1)</script>';
    queue({ match: 'generativelanguage', status: 200, body: geminiBody(hostile) });

    const result = await generateDoubtAnswer({ question: 'q' });
    // The service returns raw text. The frontend must render it with textContent;
    // this test pins the fact that the payload is unescaped server-side so the
    // rendering choice is a conscious one, not an accident.
    assert.equal(result.answer, hostile);
  });
});
