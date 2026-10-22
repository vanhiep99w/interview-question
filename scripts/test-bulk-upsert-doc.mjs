// Requires local PostgreSQL binaries (PG_BIN may point to their directory).
// Creates a disposable Unix-socket-only cluster; never connects to an existing DB.
import { mkdtemp, readFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

const source = await readFile('content/docs/java/02-bulk-upsert-billion-rows.mdx', 'utf8');
const sql = [...source.matchAll(/^```sql\n([\s\S]*?)\n```/gm)].map((match) => match[1]);
assert.equal(sql.length, 2, 'Expected published schema and batch transaction');
const [schema, batch] = sql;
let bin = process.env.PG_BIN;
if (!bin) {
  try { await access('/usr/lib/postgresql/18/bin/initdb'); bin = '/usr/lib/postgresql/18/bin'; }
  catch { bin = ''; } // Use PATH on platforms without versioned package directories.
}
const program = (name) => bin ? path.join(bin, name) : name;
function run(name, args, input) {
  const result = spawnSync(program(name), args, { input, encoding: 'utf8', timeout: 30_000 });
  if (result.error || result.status !== 0) throw new Error(`${name}: ${result.error ?? result.stderr ?? result.stdout}`);
  return result.stdout.trim();
}
const directory = await mkdtemp(path.join(tmpdir(), 'bulk-upsert-doc-'));
const data = path.join(directory, 'data');
let started = false;
try {
  run('initdb', ['-D', data, '--auth=trust', '--no-locale', '--username=docs_lab']);
  run('pg_ctl', ['-D', data, '-l', path.join(directory, 'server.log'), '-o', `-h '' -k ${directory} -p 5432`, '-w', 'start']);
  started = true;
  const query = (input) => run('psql', [
    '-X', '-qAt', '-h', directory, '-p', '5432', '-U', 'docs_lab', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1',
    '-v', 'job_id=1', '-v', 'batch_size=2',
  ], input);
  query(schema + `
    INSERT INTO import_jobs(job_id, tenant_id) VALUES (1, 42);
    INSERT INTO orders VALUES (42, 1, 10, 'PENDING', 10), (42, 2, 20, 'PAID', 10);
    INSERT INTO orders_import_ready VALUES
      (1, 42, 1, 11, 'PAID', 11),
      (1, 42, 2, 9, 'PENDING', 9),
      (1, 42, 3, 30, 'PENDING', 1);
  `);
  const state = () => query(`
    SELECT string_agg(order_id || ':' || amount || ':' || source_version, ',' ORDER BY order_id) FROM orders;
    SELECT coalesce(last_order_id::text, 'NULL') FROM import_jobs WHERE job_id=1;
  `);
  const merge = (transaction = batch) => {
    const lines = query(transaction).split('\n');
    assert.equal(lines.length, 2);
    assert.equal(lines[0], '1', 'The published lock query must claim job 1');
    return lines[1];
  };
  const initial = state();
  // All statements come from the published transaction, including named bindings.
  assert.equal(merge(batch.replace('COMMIT;', 'ROLLBACK;')), '2|1|2');
  assert.equal(state(), initial, 'Rollback must leave both business state and checkpoint unchanged');
  assert.equal(merge(), '2|1|2', 'The stale row is examined but must not overwrite version 10');
  assert.equal(merge(), '1|1|3', 'Resume inserts the remaining row');
  assert.equal(merge(), '0|0|', 'Exhausted staging returns an explicit empty batch');
  const complete = state();
  assert.equal(complete, '1:11.00:11,2:20.00:10,3:30.00:1\n3');
  query('UPDATE import_jobs SET last_order_id = NULL WHERE job_id=1;');
  assert.equal(merge(), '2|0|2', 'Replay must advance even when no row changes');
  assert.equal(merge(), '1|0|3');
  assert.equal(state(), complete, 'Replaying the same input must preserve final business state');
  console.log('Published bulk-upsert SQL passed: insert, update, stale/equal versions, rollback, replay, exhaustion and atomic checkpoint.');
} finally {
  if (started) run('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop']);
  await rm(directory, { recursive: true, force: true });
}
