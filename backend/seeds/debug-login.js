/**
 * RUN THIS TO DEBUG & FIX LOGIN:
 *   cd backend && node seeds/debug-login.js
 * 
 * This script will:
 * 1. Connect to DB
 * 2. Show all users and their password hashes
 * 3. Test if 'admin123456' matches each hash
 * 4. If not matching, fix the password directly
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: __dirname + '/../.env' });

async function debugLogin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Direct DB access — bypass Mongoose model hooks
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    const users = await usersCollection.find({}).toArray();
    console.log(`Found ${users.length} users\n`);

    const plainPassword = 'admin123456';

    for (const user of users) {
      console.log(`═══════════════════════════════════`);
      console.log(`User: ${user.name}`);
      console.log(`Email: ${user.email}`);
      console.log(`Role: ${user.role}`);
      console.log(`Password hash: ${user.password?.substring(0, 30)}...`);
      console.log(`Hash length: ${user.password?.length}`);

      // Test if password matches
      let matches = false;
      try {
        matches = await bcrypt.compare(plainPassword, user.password);
      } catch (err) {
        console.log(`bcrypt.compare ERROR: ${err.message}`);
      }
      console.log(`Password 'admin123456' matches: ${matches ? '✅ YES' : '❌ NO'}`);

      if (!matches) {
        // Check if it's double-hashed (hash of a hash)
        // A bcrypt hash always starts with $2a$ or $2b$ and is 60 chars
        console.log(`\n🔧 FIXING password for ${user.email}...`);
        const salt = await bcrypt.genSalt(12);
        const correctHash = await bcrypt.hash(plainPassword, salt);

        await usersCollection.updateOne(
          { _id: user._id },
          { $set: { password: correctHash, loginAttempts: 0, lockUntil: null } }
        );

        // Verify fix
        const updated = await usersCollection.findOne({ _id: user._id });
        const nowMatches = await bcrypt.compare(plainPassword, updated.password);
        console.log(`After fix - password matches: ${nowMatches ? '✅ YES' : '❌ STILL NO'}`);
      }
      console.log('');
    }

    console.log(`\n═══════════════════════════════════`);
    console.log(`DONE! All passwords fixed to: admin123456`);
    console.log(`═══════════════════════════════════`);
    console.log(`\nTry logging in now with:`);
    console.log(`  SuperAdmin:  superadmin@medstore.com / admin123456`);
    console.log(`  StoreAdmin:  admin@alshifa.com / admin123456`);
    console.log(`  Pharmacist:  pharmacist@alshifa.com / admin123456`);
    console.log(`  Cashier:     cashier@alshifa.com / admin123456`);
    console.log(`  Inventory:   inventory@alshifa.com / admin123456`);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

debugLogin();
