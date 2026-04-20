const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });
const DrugInteraction = require('../models/DrugInteraction');

const interactions = [
  { drug1: 'warfarin', drug2: 'aspirin', severity: 'major', description: 'Increased risk of bleeding when combined', mechanism: 'Both drugs affect clotting mechanisms', management: 'Avoid combination or monitor INR closely' },
  { drug1: 'warfarin', drug2: 'ibuprofen', severity: 'major', description: 'NSAIDs increase bleeding risk with warfarin', mechanism: 'NSAID inhibits platelet aggregation + displaces warfarin from protein binding', management: 'Use paracetamol instead if possible' },
  { drug1: 'warfarin', drug2: 'metronidazole', severity: 'major', description: 'Metronidazole increases warfarin effect', mechanism: 'Inhibits CYP2C9 metabolism of warfarin', management: 'Reduce warfarin dose and monitor INR' },
  { drug1: 'metformin', drug2: 'alcohol', severity: 'major', description: 'Risk of lactic acidosis with excessive alcohol', mechanism: 'Both reduce hepatic gluconeogenesis', management: 'Limit alcohol intake' },
  { drug1: 'ciprofloxacin', drug2: 'theophylline', severity: 'major', description: 'Ciprofloxacin increases theophylline levels', mechanism: 'Inhibits CYP1A2 metabolism', management: 'Reduce theophylline dose by 30-50%' },
  { drug1: 'ciprofloxacin', drug2: 'antacid', severity: 'moderate', description: 'Antacids reduce ciprofloxacin absorption', mechanism: 'Metal ions chelate with fluoroquinolone', management: 'Take ciprofloxacin 2 hours before antacid' },
  { drug1: 'ibuprofen', drug2: 'aspirin', severity: 'moderate', description: 'Ibuprofen may reduce cardioprotective effect of aspirin', mechanism: 'Competitive inhibition of COX-1', management: 'Take aspirin 30 min before ibuprofen' },
  { drug1: 'amlodipine', drug2: 'simvastatin', severity: 'moderate', description: 'Increased simvastatin levels and risk of myopathy', mechanism: 'Amlodipine inhibits CYP3A4', management: 'Limit simvastatin to 20mg daily' },
  { drug1: 'metformin', drug2: 'contrast dye', severity: 'major', description: 'Risk of lactic acidosis with iodinated contrast', mechanism: 'Contrast may impair renal function', management: 'Hold metformin 48h before and after contrast' },
  { drug1: 'clopidogrel', drug2: 'omeprazole', severity: 'moderate', description: 'Omeprazole reduces clopidogrel effectiveness', mechanism: 'Inhibits CYP2C19 activation of clopidogrel', management: 'Use pantoprazole instead' },
  { drug1: 'enalapril', drug2: 'potassium', severity: 'moderate', description: 'Risk of hyperkalemia', mechanism: 'ACE inhibitors increase potassium retention', management: 'Monitor potassium levels regularly' },
  { drug1: 'enalapril', drug2: 'losartan', severity: 'major', description: 'Dual RAAS blockade increases renal failure risk', mechanism: 'Additive effect on renal perfusion', management: 'Avoid combination' },
  { drug1: 'fluconazole', drug2: 'warfarin', severity: 'major', description: 'Fluconazole significantly increases warfarin effect', mechanism: 'Potent CYP2C9 inhibitor', management: 'Reduce warfarin dose by 50%, monitor INR' },
  { drug1: 'diclofenac', drug2: 'lithium', severity: 'major', description: 'NSAIDs increase lithium levels', mechanism: 'Reduced renal lithium excretion', management: 'Monitor lithium levels, consider dose reduction' },
  { drug1: 'amoxicillin', drug2: 'methotrexate', severity: 'major', description: 'Amoxicillin reduces renal clearance of methotrexate', mechanism: 'Competition for tubular secretion', management: 'Monitor methotrexate levels and toxicity' },
  { drug1: 'azithromycin', drug2: 'amiodarone', severity: 'major', description: 'Risk of QT prolongation and cardiac arrhythmia', mechanism: 'Additive QT prolongation', management: 'Avoid combination if possible' },
  { drug1: 'prednisolone', drug2: 'ibuprofen', severity: 'moderate', description: 'Increased risk of GI bleeding', mechanism: 'Both damage gastric mucosa', management: 'Add PPI protection' },
  { drug1: 'alprazolam', drug2: 'alcohol', severity: 'contraindicated', description: 'Severe CNS depression, respiratory failure risk', mechanism: 'Additive CNS depressant effects', management: 'Absolutely avoid combination' },
  { drug1: 'alprazolam', drug2: 'tramadol', severity: 'major', description: 'Risk of respiratory depression and death', mechanism: 'Additive CNS and respiratory depression', management: 'Avoid or use lowest effective doses' },
  { drug1: 'tramadol', drug2: 'sertraline', severity: 'major', description: 'Risk of serotonin syndrome and seizures', mechanism: 'Both increase serotonin levels', management: 'Monitor for serotonin syndrome symptoms' },
  { drug1: 'sertraline', drug2: 'tramadol', severity: 'major', description: 'Serotonin syndrome risk', mechanism: 'Additive serotonergic effect', management: 'Use alternative analgesic' },
  { drug1: 'clarithromycin', drug2: 'simvastatin', severity: 'contraindicated', description: 'Extreme risk of rhabdomyolysis', mechanism: 'Strong CYP3A4 inhibition', management: 'Absolutely contraindicated — suspend statin' },
  { drug1: 'metoclopramide', drug2: 'domperidone', severity: 'major', description: 'Additive extrapyramidal effects', mechanism: 'Both are dopamine antagonists', management: 'Do not combine' },
  { drug1: 'atenolol', drug2: 'salbutamol', severity: 'moderate', description: 'Beta-blocker may reduce bronchodilator effect', mechanism: 'Pharmacological antagonism', management: 'Use cardioselective beta-blocker' },
  { drug1: 'losartan', drug2: 'potassium', severity: 'moderate', description: 'Risk of hyperkalemia', mechanism: 'ARBs reduce potassium excretion', management: 'Monitor serum potassium' },
  { drug1: 'gabapentin', drug2: 'pregabalin', severity: 'major', description: 'Additive CNS depression, no additional benefit', mechanism: 'Same mechanism of action', management: 'Use one or the other, not both' },
  { drug1: 'escitalopram', drug2: 'ibuprofen', severity: 'moderate', description: 'Increased bleeding risk', mechanism: 'SSRIs impair platelet function + NSAID effect', management: 'Use PPI protection' },
  { drug1: 'levothyroxine', drug2: 'calcium', severity: 'moderate', description: 'Calcium reduces levothyroxine absorption', mechanism: 'Chelation in GI tract', management: 'Separate doses by 4 hours' },
  { drug1: 'levothyroxine', drug2: 'omeprazole', severity: 'minor', description: 'PPI may reduce levothyroxine absorption', mechanism: 'Altered gastric pH', management: 'Monitor TSH when starting/stopping PPI' },
  { drug1: 'paracetamol', drug2: 'warfarin', severity: 'moderate', description: 'Regular high-dose paracetamol may increase INR', mechanism: 'Unknown mechanism', management: 'Monitor INR if >2g/day for >3 days' },
  { drug1: 'furosemide', drug2: 'gentamicin', severity: 'major', description: 'Increased ototoxicity and nephrotoxicity', mechanism: 'Additive toxic effects', management: 'Monitor renal function and hearing' },
  { drug1: 'diazepam', drug2: 'tramadol', severity: 'major', description: 'Risk of severe respiratory depression', mechanism: 'Additive CNS depression', management: 'Avoid or minimize doses' },
  { drug1: 'sildenafil', drug2: 'nitroglycerin', severity: 'contraindicated', description: 'Severe life-threatening hypotension', mechanism: 'Additive vasodilation via NO pathway', management: 'Absolutely contraindicated' },
  { drug1: 'carbamazepine', drug2: 'oral contraceptive', severity: 'major', description: 'Reduced contraceptive efficacy', mechanism: 'CYP3A4 induction', management: 'Use alternative contraception method' },
];

async function seedInteractions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    await DrugInteraction.deleteMany({});
    await DrugInteraction.insertMany(interactions);
    console.log(`${interactions.length} drug interactions seeded`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seedInteractions();
