const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Reconcile the MasterMedicine index — we moved from a single-field
    // unique on medicineName to a compound (medicineName + strength) so
    // variants like "Aspirin 500mg" and "Aspirin 250mg" can coexist.
    // syncIndexes() drops indexes not in the current schema definition.
    try {
      const MasterMedicine = require('../models/MasterMedicine');
      await MasterMedicine.syncIndexes();
    } catch (idxErr) {
      console.warn('[INDEX-SYNC] MasterMedicine sync failed (non-fatal):', idxErr.message);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
