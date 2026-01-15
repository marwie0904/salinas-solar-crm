const xlsx = require('xlsx');
const { execSync } = require('child_process');
const path = require('path');

// Helper to normalize phone numbers
function normalizePhone(phone) {
  if (!phone) return null;
  // Convert to string and clean
  let cleaned = String(phone).replace(/[\s\-\(\)\.]/g, '').replace(/\r/g, '');

  // Handle Philippines phone numbers
  if (cleaned.startsWith('63')) {
    cleaned = '+' + cleaned;
  } else if (cleaned.startsWith('9') && cleaned.length === 10) {
    cleaned = '+63' + cleaned;
  } else if (cleaned.startsWith('09') && cleaned.length === 11) {
    cleaned = '+63' + cleaned.slice(1);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '+63' + cleaned.slice(1);
  } else if (cleaned.length === 10 && !cleaned.startsWith('+')) {
    cleaned = '+63' + cleaned;
  }

  return cleaned || null;
}

// Parse a single row based on sheet structure
function parseRow(row, sheetName) {
  // Different sheets have different column layouts
  // Most sheets: [Date, Client Name, Contact Number, Address, ...]
  // Some sheets: [Date, First Name, Last Name, Contact Number, Address, ...]

  let firstName = '';
  let lastName = '';
  let phone = null;
  let address = '';
  let notes = '';

  if (!row || row.length < 2) return null;

  // Check if this is a "split name" sheet (Copy of Nov w1, Dec, Jan - 2026)
  const splitNameSheets = ['Copy of Nov w1', 'Dec', 'Jan -  2026', 'Copy of Dec'];

  if (splitNameSheets.includes(sheetName)) {
    // Column structure: [Date, FirstName, LastName, Phone, Address, ...]
    firstName = (row[1] || '').toString().trim();
    lastName = (row[2] || '').toString().trim();
    phone = normalizePhone(row[3]);
    address = (row[4] || '').toString().trim();
    // Notes/Remarks is typically at the end
    notes = (row[row.length - 1] || '').toString().trim();
  } else {
    // Column structure: [Date, Client Name, Contact Number, Address, ...]
    const fullName = (row[1] || '').toString().trim();
    phone = normalizePhone(row[2]);
    address = (row[3] || '').toString().trim();
    // Notes/Remarks is typically at the end
    notes = (row[row.length - 1] || '').toString().trim();

    // Split full name into first/last
    const nameParts = fullName.split(/\s+/);
    if (nameParts.length >= 2) {
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(' ');
    } else {
      firstName = fullName;
      lastName = '';
    }
  }

  // Clean up names
  firstName = firstName.replace(/[\(\)]/g, '').replace(/\(FB\)/gi, '').trim();
  lastName = lastName.replace(/[\(\)]/g, '').replace(/\(FB\)/gi, '').trim();

  // Skip if no valid data
  if (!firstName || firstName.toLowerCase() === 'client name') return null;
  if (!phone) return null;

  return {
    firstName,
    lastName: lastName || 'Unknown',
    phone,
    address: address || undefined,
    notes: notes && notes.length > 5 ? notes : undefined,
    source: 'cold_call'
  };
}

// Main import function
async function importContacts() {
  const files = [
    'Salinas Solar - Appointment_Setting_Tracker (1).xlsx',
    'Salinas Solar - Appointment_Setting_Tracker.xlsx'
  ];

  const sheetsToImport = ['w1', 'w2', 'w3', 'w4', 'Nov w1', 'Dec', 'Jan -  2026'];
  const contacts = new Map(); // Use phone as key for deduplication

  for (const file of files) {
    const filePath = path.join(__dirname, '..', file);
    console.log(`Reading ${file}...`);

    let wb;
    try {
      wb = xlsx.readFile(filePath);
    } catch (e) {
      console.log(`  Skipping ${file}: ${e.message}`);
      continue;
    }

    for (const sheetName of sheetsToImport) {
      if (!wb.SheetNames.includes(sheetName)) {
        console.log(`  Sheet "${sheetName}" not found, skipping...`);
        continue;
      }

      const sheet = wb.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

      console.log(`  Processing sheet "${sheetName}" (${data.length} rows)...`);

      // Skip header row
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const contact = parseRow(row, sheetName);

        if (contact && contact.phone) {
          // Deduplicate by phone
          if (!contacts.has(contact.phone)) {
            contacts.set(contact.phone, contact);
          }
        }
      }
    }
  }

  console.log(`\nFound ${contacts.size} unique contacts with phone numbers.`);

  // Convert to array
  const contactsArray = Array.from(contacts.values());

  // Log first few for verification
  console.log('\nSample contacts:');
  contactsArray.slice(0, 5).forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.firstName} ${c.lastName} - ${c.phone}`);
  });

  // Batch insert using Convex
  const batchSize = 10;
  const batches = [];
  for (let i = 0; i < contactsArray.length; i += batchSize) {
    batches.push(contactsArray.slice(i, i + batchSize));
  }

  console.log(`\nImporting ${contactsArray.length} contacts in ${batches.length} batches...`);

  let importedCount = 0;
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const args = JSON.stringify({ contacts: batch });

    try {
      process.chdir(path.join(__dirname, '..', 'frontend'));
      execSync(`npx convex run contacts:batchCreate '${args.replace(/'/g, "'\\''")}'`, {
        stdio: 'inherit'
      });
      importedCount += batch.length;
      console.log(`  Batch ${i + 1}/${batches.length} complete (${importedCount}/${contactsArray.length})`);
    } catch (e) {
      console.error(`  Error in batch ${i + 1}:`, e.message);
    }
  }

  console.log(`\nImport complete! ${importedCount} contacts imported.`);
}

importContacts().catch(console.error);
