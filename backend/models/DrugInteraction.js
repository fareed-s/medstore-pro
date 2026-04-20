const mongoose = require('mongoose');

const drugInteractionSchema = new mongoose.Schema({
  drug1: { type: String, required: true, lowercase: true, trim: true },
  drug2: { type: String, required: true, lowercase: true, trim: true },
  severity: {
    type: String,
    enum: ['minor', 'moderate', 'major', 'contraindicated'],
    required: true,
  },
  description: { type: String, required: true },
  mechanism: String,
  management: String,
  source: String,
}, {
  timestamps: true,
});

drugInteractionSchema.index({ drug1: 1, drug2: 1 });
drugInteractionSchema.index({ drug2: 1, drug1: 1 });

module.exports = mongoose.model('DrugInteraction', drugInteractionSchema);
