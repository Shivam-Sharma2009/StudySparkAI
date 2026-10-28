import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getDemoPlanDates,
  isDemoMode,
  seedDemoHistory,
} from '../src/services/demoData.js';

const HISTORY_KEY = 'studyspark:history:v1';

function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}

function createDemoEntries() {
  return [
    {
      id: 'demo-explain',
      type: 'explain',
      result: { title: 'Ohm law', explanation: 'Voltage and current', key_points: ['V = IR'] },
    },
    {
      id: 'demo-summary',
      type: 'summary',
      result: { summary: 'Plants use light.', key_points: ['Photosynthesis'], key_terms: [] },
    },
    {
      id: 'demo-quiz',
      type: 'quiz',
      result: {
        questions: Array.from({ length: 5 }, (_, index) => ({
          options: ['A', 'B', 'C', 'D'],
          correct_index: index % 4,
        })),
      },
    },
    {
      id: 'demo-plan',
      type: 'plan',
      result: { days: [{ date: '2026-10-29', sessions: [] }] },
    },
  ];
}

const identity = (entries) => entries;

test('demo mode is enabled only by the exact demo=1 query parameter', () => {
  assert.equal(isDemoMode('?demo=1'), true);
  assert.equal(isDemoMode('?demo=0'), false);
  assert.equal(isDemoMode('?other=1'), false);
  assert.equal(isDemoMode('?demo=true'), false);
});

test('seeds all four valid sample types into empty history', () => {
  const storage = createMemoryStorage();
  const result = seedDemoHistory(storage, createDemoEntries(), identity);

  assert.equal(result.status, 'seeded');
  assert.deepEqual(result.entries.map((entry) => entry.type).sort(), [
    'explain',
    'plan',
    'quiz',
    'summary',
  ]);
  assert.deepEqual(JSON.parse(storage.getItem(HISTORY_KEY)), result.entries);
});

test('preserves existing user history without modifying its stored value', () => {
  const existing = JSON.stringify([{ id: 'user-entry', type: 'explain' }]);
  const storage = createMemoryStorage({ [HISTORY_KEY]: existing });

  assert.equal(seedDemoHistory(storage, createDemoEntries(), identity).status, 'preserved');
  assert.equal(storage.getItem(HISTORY_KEY), existing);
});

test('preserves malformed existing history and rejects malformed demo data', () => {
  const malformedHistory = '{not-json';
  const storage = createMemoryStorage({ [HISTORY_KEY]: malformedHistory });
  assert.equal(seedDemoHistory(storage, createDemoEntries(), identity).status, 'preserved');
  assert.equal(storage.getItem(HISTORY_KEY), malformedHistory);

  const emptyStorage = createMemoryStorage();
  const invalidEntries = createDemoEntries();
  invalidEntries.find((entry) => entry.type === 'quiz').result.questions = [];
  assert.equal(seedDemoHistory(emptyStorage, invalidEntries, identity).status, 'invalid');
  assert.equal(emptyStorage.getItem(HISTORY_KEY), null);
  assert.equal(
    seedDemoHistory(emptyStorage, createDemoEntries(), () => {
      throw new Error('Invalid demo fixture');
    }).status,
    'invalid'
  );
});

test('reports unavailable storage without throwing', () => {
  const storage = {};
  Object.defineProperty(storage, 'localStorage', {
    get() {
      throw new Error('Storage access denied');
    },
  });

  assert.equal(seedDemoHistory(storage, createDemoEntries(), identity).status, 'unavailable');
});

test('keeps demo plan dates current and consecutive across month boundaries', () => {
  assert.deepEqual(
    getDemoPlanDates(new Date(2026, 9, 30, 12)),
    ['2026-10-30', '2026-10-31', '2026-11-01']
  );
});
