const fs = require('fs');

const contacts = JSON.parse(fs.readFileSync('/tmp/all_contacts.json', 'utf8'));
const opportunities = JSON.parse(fs.readFileSync('/tmp/all_opps.json', 'utf8'));

// Build contact -> opportunity stage map
const contactStage = {};
const contactOppId = {};
opportunities.forEach(o => {
  if (!o.isDeleted) {
    contactStage[o.contactId] = o.stage;
    contactOppId[o.contactId] = o._id;
  }
});

// Normalize phone for comparison
function normalizePhone(p) {
  if (!p) return null;
  return p.replace(/[^0-9]/g, '').slice(-10);
}

// Group contacts by normalized phone
const phoneGroups = {};
contacts.forEach(c => {
  const np = normalizePhone(c.phone);
  if (np && np.length >= 9) {
    if (!phoneGroups[np]) phoneGroups[np] = [];
    phoneGroups[np].push({
      id: c._id,
      name: c.fullName,
      phone: c.phone,
      email: c.email,
      source: c.source,
      stage: contactStage[c._id] || 'no_opportunity',
      oppId: contactOppId[c._id]
    });
  }
});

// Find duplicates where one is in inbox (to delete) and another exists elsewhere
const toDelete = [];
Object.entries(phoneGroups).forEach(([phone, group]) => {
  if (group.length > 1) {
    const inboxOnes = group.filter(g => g.stage === 'inbox');
    const otherOnes = group.filter(g => g.stage !== 'inbox');

    // If there are contacts in inbox AND in other stages, delete inbox ones
    if (inboxOnes.length > 0 && otherOnes.length > 0) {
      inboxOnes.forEach(c => toDelete.push(c));
    }
  }
});

console.log('=== DUPLICATE CONTACTS TO DELETE (in INBOX, duplicating existing) ===');
console.log('Count:', toDelete.length);
console.log('');
toDelete.forEach(c => {
  console.log(c.id + ' | ' + c.name + ' | ' + c.phone + ' | opp: ' + c.oppId);
});

// Save for deletion
fs.writeFileSync('/tmp/contacts_to_delete.json', JSON.stringify(toDelete));
console.log('');
console.log('Data saved to /tmp/contacts_to_delete.json');

// Also find contacts without phone AND email
console.log('\n=== CONTACTS WITHOUT PHONE AND EMAIL ===');
const noContact = contacts.filter(c => !c.phone && !c.email);
console.log('Count:', noContact.length);
noContact.forEach(c => {
  console.log(c._id + ' | ' + c.fullName + ' | stage: ' + (contactStage[c._id] || 'no_opp'));
});

fs.writeFileSync('/tmp/contacts_no_info.json', JSON.stringify(noContact.map(c => ({
  id: c._id,
  name: c.fullName,
  oppId: contactOppId[c._id]
}))));
