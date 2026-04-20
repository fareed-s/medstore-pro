const Prescription = require('../models/Prescription');
const Customer = require('../models/Customer');
const DrugInteraction = require('../models/DrugInteraction');
const Doctor = require('../models/Doctor');
const Medicine = require('../models/Medicine');
const { asyncHandler } = require('../utils/errorHandler');

// ═══ PRESCRIPTIONS ═══
exports.getPrescriptions = asyncHandler(async (req, res) => {
  const { customerId, status, doctorName, page = 1, limit = 25 } = req.query;
  const filter = { storeId: req.user.storeId };
  if (customerId) filter.customerId = customerId;
  if (status) filter.status = status;
  if (doctorName) filter.doctorName = { $regex: doctorName, $options: 'i' };

  const total = await Prescription.countDocuments(filter);
  const prescriptions = await Prescription.find(filter)
    .populate('customerId', 'customerName phone')
    .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
  res.json({ success: true, data: prescriptions, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) } });
});

exports.getPrescription = asyncHandler(async (req, res) => {
  const rx = await Prescription.findOne({ _id: req.params.id, storeId: req.user.storeId })
    .populate('customerId', 'customerName phone allergies currentMedications conditions');
  if (!rx) return res.status(404).json({ success: false, message: 'Prescription not found' });
  res.json({ success: true, data: rx });
});

exports.createPrescription = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  const data = {
    ...req.body, storeId, addedBy: req.user._id,
    expiryDate: req.body.expiryDate || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months default
  };

  const rx = await Prescription.create(data);

  // Update/create doctor
  if (data.doctorName) {
    await Doctor.findOneAndUpdate(
      { storeId, doctorName: data.doctorName },
      {
        $set: { registration: data.doctorRegistration, specialty: data.doctorSpecialty, clinicName: data.clinicName },
        $inc: { prescriptionCount: 1 },
        $setOnInsert: { storeId, doctorName: data.doctorName },
      },
      { upsert: true }
    );
  }

  res.status(201).json({ success: true, data: rx });
});

exports.updatePrescription = asyncHandler(async (req, res) => {
  const rx = await Prescription.findOneAndUpdate(
    { _id: req.params.id, storeId: req.user.storeId }, req.body, { new: true }
  );
  if (!rx) return res.status(404).json({ success: false, message: 'Prescription not found' });
  res.json({ success: true, data: rx });
});

// Mark medicines as dispensed
exports.dispensePrescription = asyncHandler(async (req, res) => {
  const rx = await Prescription.findOne({ _id: req.params.id, storeId: req.user.storeId });
  if (!rx) return res.status(404).json({ success: false, message: 'Prescription not found' });

  const { dispensedItems, saleId } = req.body; // [{medicineIndex, quantity}]
  let allDispensed = true;

  for (const di of dispensedItems) {
    const med = rx.medicines[di.medicineIndex];
    if (med) {
      med.dispensed = true;
      med.dispensedQty = (med.dispensedQty || 0) + di.quantity;
      med.dispensedDate = new Date();
      med.saleId = saleId;
      if (med.dispensedQty < (med.quantity || Infinity)) allDispensed = false;
    }
  }

  // Check if all fully dispensed
  const anyPending = rx.medicines.some(m => !m.dispensed || (m.quantity && m.dispensedQty < m.quantity));
  rx.isDispensed = !anyPending;
  rx.isPartiallyDispensed = !rx.isDispensed && rx.medicines.some(m => m.dispensed);
  rx.status = rx.isDispensed ? 'dispensed' : rx.isPartiallyDispensed ? 'partial' : 'active';
  rx.dispensedBy = req.user._id;
  rx.dispensedAt = new Date();
  await rx.save();

  res.json({ success: true, data: rx });
});

// ═══ DRUG INTERACTION ENGINE ═══
exports.checkInteractions = asyncHandler(async (req, res) => {
  const { drugs, customerId } = req.body;
  // drugs = [{genericName: 'paracetamol'}, {genericName: 'ibuprofen'}]

  if (!drugs || drugs.length === 0) return res.json({ success: true, data: { interactions: [], allergyAlerts: [], conditionAlerts: [] } });

  const drugNames = drugs.map(d => (d.genericName || d.medicineName || '').toLowerCase().trim()).filter(Boolean);
  const interactions = [];
  const allergyAlerts = [];
  const conditionAlerts = [];

  // 1. Drug-Drug interactions
  for (let i = 0; i < drugNames.length; i++) {
    for (let j = i + 1; j < drugNames.length; j++) {
      const found = await DrugInteraction.find({
        $or: [
          { drug1: { $regex: drugNames[i], $options: 'i' }, drug2: { $regex: drugNames[j], $options: 'i' } },
          { drug1: { $regex: drugNames[j], $options: 'i' }, drug2: { $regex: drugNames[i], $options: 'i' } },
        ],
      });
      interactions.push(...found.map(f => ({
        drug1: drugNames[i], drug2: drugNames[j],
        severity: f.severity, description: f.description,
        mechanism: f.mechanism, management: f.management,
      })));
    }
  }

  // 2. Drug-Allergy check (if customer provided)
  if (customerId) {
    const customer = await Customer.findById(customerId);
    if (customer) {
      // Check allergies
      for (const allergy of (customer.allergies || [])) {
        for (const drug of drugNames) {
          if (drug.includes(allergy.name.toLowerCase()) || allergy.name.toLowerCase().includes(drug)) {
            allergyAlerts.push({
              drug, allergy: allergy.name, severity: allergy.severity || 'severe',
              message: `Patient is allergic to ${allergy.name} — ${drug} may trigger reaction`,
            });
          }
        }
      }

      // 3. Check against current medications
      for (const med of (customer.currentMedications || [])) {
        const medName = (med.genericName || med.medicineName || '').toLowerCase();
        for (const drug of drugNames) {
          if (medName === drug) continue; // Same drug
          const found = await DrugInteraction.find({
            $or: [
              { drug1: { $regex: drug, $options: 'i' }, drug2: { $regex: medName, $options: 'i' } },
              { drug1: { $regex: medName, $options: 'i' }, drug2: { $regex: drug, $options: 'i' } },
            ],
          });
          interactions.push(...found.map(f => ({
            drug1: drug, drug2: medName + ' (current medication)',
            severity: f.severity, description: f.description,
            mechanism: f.mechanism, management: f.management,
          })));
        }
      }

      // 4. Condition-based alerts
      const conditionDrugWarnings = {
        'kidney disease': ['ibuprofen', 'naproxen', 'diclofenac', 'aspirin'],
        'liver disease': ['paracetamol', 'acetaminophen', 'methotrexate'],
        'asthma': ['aspirin', 'ibuprofen', 'naproxen', 'propranolol', 'atenolol'],
        'diabetes': ['prednisolone', 'dexamethasone', 'hydrochlorothiazide'],
        'hypertension': ['ibuprofen', 'naproxen', 'pseudoephedrine'],
        'pregnancy': ['warfarin', 'methotrexate', 'isotretinoin', 'misoprostol'],
        'peptic ulcer': ['ibuprofen', 'naproxen', 'aspirin', 'diclofenac'],
      };

      for (const condition of (customer.conditions || [])) {
        const cond = condition.name.toLowerCase();
        const warnings = Object.entries(conditionDrugWarnings).find(([k]) => cond.includes(k));
        if (warnings) {
          for (const drug of drugNames) {
            if (warnings[1].some(w => drug.includes(w))) {
              conditionAlerts.push({
                drug, condition: condition.name, severity: 'major',
                message: `${drug} should be used with caution in patients with ${condition.name}`,
              });
            }
          }
        }
      }
    }
  }

  // Sort by severity
  const severityOrder = { contraindicated: 0, major: 1, moderate: 2, minor: 3 };
  interactions.sort((a, b) => (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3));

  const hasBlocking = interactions.some(i => ['contraindicated', 'major'].includes(i.severity)) || allergyAlerts.some(a => a.severity === 'severe');

  res.json({
    success: true,
    data: {
      interactions, allergyAlerts, conditionAlerts,
      totalAlerts: interactions.length + allergyAlerts.length + conditionAlerts.length,
      hasBlocking,
      summary: {
        contraindicated: interactions.filter(i => i.severity === 'contraindicated').length,
        major: interactions.filter(i => i.severity === 'major').length,
        moderate: interactions.filter(i => i.severity === 'moderate').length,
        minor: interactions.filter(i => i.severity === 'minor').length,
        allergyAlerts: allergyAlerts.length,
        conditionAlerts: conditionAlerts.length,
      },
    },
  });
});

// ═══ DOCTORS ═══
exports.getDoctors = asyncHandler(async (req, res) => {
  const doctors = await Doctor.find({ storeId: req.user.storeId, isActive: true }).sort({ prescriptionCount: -1 });
  res.json({ success: true, data: doctors });
});

// ═══ REFILL REMINDERS ═══
exports.getRefillReminders = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  // Chronic patients with medications running out
  const customers = await Customer.find({
    storeId, isActive: true, customerType: 'chronic',
    'currentMedications.0': { $exists: true },
  }).select('customerName phone currentMedications lastVisit');

  const reminders = [];
  const now = new Date();

  for (const c of customers) {
    if (c.lastVisit) {
      const daysSinceVisit = Math.floor((now - c.lastVisit) / (1000 * 60 * 60 * 24));
      if (daysSinceVisit >= 25) { // Approaching 30-day refill
        reminders.push({
          customerId: c._id, customerName: c.customerName, phone: c.phone,
          daysSinceVisit, medications: c.currentMedications.map(m => m.medicineName),
        });
      }
    }
  }

  res.json({ success: true, data: reminders });
});
