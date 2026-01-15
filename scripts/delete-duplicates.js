const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const toDelete = JSON.parse(fs.readFileSync('/tmp/contacts_to_delete.json', 'utf8'));

console.log(`Deleting ${toDelete.length} duplicate contacts and their opportunities...\n`);

process.chdir(path.join(__dirname, '..', 'frontend'));

let deletedContacts = 0;
let deletedOpps = 0;

for (const item of toDelete) {
  try {
    // Delete opportunity first
    if (item.oppId) {
      execSync(`npx convex run opportunities:remove '{"id": "${item.oppId}"}'`, { stdio: 'pipe' });
      deletedOpps++;
    }

    // Delete contact
    execSync(`npx convex run contacts:remove '{"id": "${item.id}"}'`, { stdio: 'pipe' });
    deletedContacts++;

    console.log(`✓ Deleted: ${item.name} (${item.phone})`);
  } catch (e) {
    console.log(`✗ Error deleting ${item.name}: ${e.message}`);
  }
}

console.log(`\n=== SUMMARY ===`);
console.log(`Deleted ${deletedContacts} contacts`);
console.log(`Deleted ${deletedOpps} opportunities`);
