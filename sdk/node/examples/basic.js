/**
 * Memstore Node.js SDK — basic usage example
 *
 * Run:
 *   MEMSTORE_API_KEY=am_live_... node examples/basic.js
 */

const { Memstore } = require('../src/index.js');

const apiKey = process.env.MEMSTORE_API_KEY;
if (!apiKey) {
  console.error('Set MEMSTORE_API_KEY to run this example');
  process.exit(0); // soft exit so CI doesn't fail without a key
}

async function main() {
  const ms = new Memstore({ apiKey });

  // 1. Store a memory
  const mem = await ms.remember('User prefers concise replies and uses Node.js', {
    session: 'user_42',
  });
  console.log('Stored:', mem);

  // 2. Recall relevant memories
  const results = await ms.recall('tech stack preferences', { session: 'user_42' });
  console.log('Recalled:', results);

  // 3. List all memories
  const { memories, total } = await ms.list({ limit: 5 });
  console.log(`Total memories: ${total}`, memories);

  // 4. Delete the one we just created
  const deleted = await ms.forget(mem.id);
  console.log('Deleted:', deleted);
}

main().catch(console.error);
