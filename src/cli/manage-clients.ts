import 'dotenv/config';
import crypto from 'crypto';
import { createClient, listClients } from '../db/database';

const command = process.argv[2];
const arg = process.argv[3];

async function main() {
  if (command === 'list') {
    const clients = await listClients() as any[];
    if (!clients.length) { console.log('Henüz client yok.'); return; }
    console.log('\nKayıtlı Clientlar:\n' + '─'.repeat(70));
    for (const c of clients) {
      console.log(`${c.active ? '✓ AKTİF' : '○ pending'}  ID: ${c.id}  |  ${c.name}`);
    }
  } else if (command === 'create') {
    if (!arg) { console.error('Kullanım: node manage-clients.js create "İsim"'); process.exit(1); }
    const id = 'cl_' + crypto.randomBytes(12).toString('hex');
    const secret = crypto.randomBytes(32).toString('hex');
    await createClient(id, secret, arg);
    console.log(`\n✓ Client oluşturuldu!\nClient ID : ${id}\nAPI Key   : ${secret}\n\nBunları PBXware'e gir. API Key bir daha gösterilmez!`);
  } else {
    console.log('Komutlar:\n  list\n  create "İsim"');
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
