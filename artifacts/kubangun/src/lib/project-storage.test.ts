import test from 'node:test';
import assert from 'node:assert/strict';
import { seedProjects } from './seed';
import { encodeProjects, readProjects, withProjectLock } from './project-storage';

test('legacy storage and versioned snapshots preserve project records without normalizing labels', () => {
  const projects = seedProjects();
  delete projects[0].rooms[0].state;
  assert.deepEqual(readProjects(JSON.stringify(projects)), projects);
  const first = encodeProjects(projects);
  const second = encodeProjects(projects);
  assert.notEqual(JSON.parse(first).saveVersion, JSON.parse(second).saveVersion);
  assert.deepEqual(readProjects(first), projects);
  assert.equal(readProjects(first)[0].rooms[0].state, undefined);
  assert.deepEqual(readProjects(encodeProjects([])), []);
});

test('unknown storage envelopes and invalid rooms fail explicitly', () => {
  assert.throws(() => readProjects('{"format":"other","projects":[]}'));
  assert.throws(() => readProjects('{"format":"kubangun-storage-v1","projects":[]}'));
  assert.throws(() => readProjects('[{"rooms":[null]}]'));
  assert.throws(() => readProjects('{'));
});

test('unsupported locking never executes an unsafe write', async () => {
  let wrote = false;
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} });
  try { await assert.rejects(withProjectLock(() => { wrote = true; }), /penguncian antartab/); }
  finally {
    if (original) Object.defineProperty(globalThis, 'navigator', original);
    else Reflect.deleteProperty(globalThis, 'navigator');
  }
  assert.equal(wrote, false);
});