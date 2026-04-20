const mongoose = require('mongoose');

/**
 * Safely convert any value to a Mongoose ObjectId.
 * Returns null if the input is falsy or invalid.
 */
const toObjectId = (id) => {
  if (!id) return null;
  try {
    return new mongoose.Types.ObjectId(id.toString());
  } catch {
    return null;
  }
};

module.exports = { toObjectId };
