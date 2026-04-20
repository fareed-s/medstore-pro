const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: __dirname + '/../.env' });

const Store = require('../models/Store');
const User = require('../models/User');
const Medicine = require('../models/Medicine');
const Category = require('../models/Category');
const Batch = require('../models/Batch');

// ─── Medicine Templates (5000+ generated from these base + variations) ───
const manufacturers = [
  'GSK Pakistan','Sanofi','Pfizer','Abbott','Novartis','Roche','Bayer','Merck',
  'AstraZeneca','Johnson & Johnson','Getz Pharma','Ferozsons','Searle Pakistan',
  'Martin Dow','Hilton Pharma','PharmEvo','AGP Limited','Highnoon Labs',
  'Platinum Pharma','Bosch Pharma','Wilsons Pharma','Ipca Labs','Herbion',
  'Reckitt Benckiser','Wyeth','Zafa Pharma','Shaigan Pharma','CCL Pharma',
  'Indus Pharma','Genome Pharma','Macter International','Continental Pharma',
  'Atco Labs','Barrett Hodgson','Medisure Labs','Sami Pharma','Don Valley Pharma',
];

const genericBaseMedicines = [
  // ── Painkillers / NSAIDs ──
  {g:'Paracetamol',brands:['Panadol','Tylenol','Calpol','Adol','Pyrigesic','Provas','Disprol'],cat:'Tablet',str:['500mg','650mg','250mg'],sch:'OTC',th:'Analgesic',df:'Oral',dose:'Tablet'},
  {g:'Ibuprofen',brands:['Brufen','Advil','Nurofen','Ibucap','Ibugesic'],cat:'Tablet',str:['200mg','400mg','600mg'],sch:'OTC',th:'NSAID',df:'Oral',dose:'Tablet'},
  {g:'Diclofenac Sodium',brands:['Voltaren','Diclofen','Voren','Jonac','Defnac'],cat:'Tablet',str:['50mg','75mg','100mg'],sch:'Schedule-H',th:'NSAID',df:'Oral',dose:'Tablet'},
  {g:'Naproxen',brands:['Naprosyn','Proxen','Naprogesic','Synflex'],cat:'Tablet',str:['250mg','500mg'],sch:'Schedule-H',th:'NSAID',df:'Oral',dose:'Tablet'},
  {g:'Aspirin',brands:['Disprin','Aspirin','Ecotrin','Loprin','Cartia'],cat:'Tablet',str:['75mg','150mg','300mg','500mg'],sch:'OTC',th:'Analgesic',df:'Oral',dose:'Tablet'},
  {g:'Mefenamic Acid',brands:['Ponstan','Meftal','Mefac','Ponstan Forte'],cat:'Capsule',str:['250mg','500mg'],sch:'Schedule-H',th:'NSAID',df:'Oral',dose:'Capsule'},
  {g:'Tramadol',brands:['Tramal','Tramadol','Contramal'],cat:'Capsule',str:['50mg','100mg'],sch:'Schedule-H1',th:'Opioid Analgesic',df:'Oral',dose:'Capsule'},
  {g:'Celecoxib',brands:['Celebrex','Celbexx','Revibra'],cat:'Capsule',str:['100mg','200mg'],sch:'Schedule-H',th:'COX-2 Inhibitor',df:'Oral',dose:'Capsule'},
  // ── Antibiotics ──
  {g:'Amoxicillin',brands:['Amoxil','Moxilin','Ospamox','Novamox','Polymox'],cat:'Capsule',str:['250mg','500mg'],sch:'Schedule-H',th:'Antibiotic',df:'Oral',dose:'Capsule'},
  {g:'Amoxicillin + Clavulanate',brands:['Augmentin','Clavoxin','Novamox-CV','Enhancin'],cat:'Tablet',str:['375mg','625mg','1g'],sch:'Schedule-H',th:'Antibiotic',df:'Oral',dose:'Tablet'},
  {g:'Azithromycin',brands:['Zithromax','Aztrin','Azomax','Zetro','Azee'],cat:'Tablet',str:['250mg','500mg'],sch:'Schedule-H',th:'Antibiotic',df:'Oral',dose:'Tablet'},
  {g:'Ciprofloxacin',brands:['Cipro','Ciproxin','Ciplox','Novidat'],cat:'Tablet',str:['250mg','500mg','750mg'],sch:'Schedule-H',th:'Fluoroquinolone',df:'Oral',dose:'Tablet'},
  {g:'Levofloxacin',brands:['Levaquin','Tavanic','Loxof','Cravit'],cat:'Tablet',str:['250mg','500mg','750mg'],sch:'Schedule-H',th:'Fluoroquinolone',df:'Oral',dose:'Tablet'},
  {g:'Cefixime',brands:['Suprax','Cefix','Fixef','Cephime'],cat:'Tablet',str:['200mg','400mg'],sch:'Schedule-H',th:'Cephalosporin',df:'Oral',dose:'Tablet'},
  {g:'Ceftriaxone',brands:['Rocephin','Ceftron','Injicef','Triaxone'],cat:'Injection',str:['250mg','500mg','1g','2g'],sch:'Schedule-H',th:'Cephalosporin',df:'Injectable',dose:'Injection'},
  {g:'Metronidazole',brands:['Flagyl','Metro','Metrozol','Arilin'],cat:'Tablet',str:['200mg','400mg'],sch:'Schedule-H',th:'Antibiotic',df:'Oral',dose:'Tablet'},
  {g:'Doxycycline',brands:['Vibramycin','Doxylin','Monodox'],cat:'Capsule',str:['100mg'],sch:'Schedule-H',th:'Tetracycline',df:'Oral',dose:'Capsule'},
  {g:'Clarithromycin',brands:['Klacid','Klaricid','Claribid'],cat:'Tablet',str:['250mg','500mg'],sch:'Schedule-H',th:'Macrolide',df:'Oral',dose:'Tablet'},
  {g:'Cephalexin',brands:['Keflex','Cefalin','Sporidex'],cat:'Capsule',str:['250mg','500mg'],sch:'Schedule-H',th:'Cephalosporin',df:'Oral',dose:'Capsule'},
  {g:'Clindamycin',brands:['Dalacin','Clindac','Cleocin'],cat:'Capsule',str:['150mg','300mg'],sch:'Schedule-H',th:'Lincosamide',df:'Oral',dose:'Capsule'},
  // ── Gastro / Antacids ──
  {g:'Omeprazole',brands:['Omez','Losec','Risek','Omepral','Gastrozol'],cat:'Capsule',str:['20mg','40mg'],sch:'OTC',th:'PPI',df:'Oral',dose:'Capsule'},
  {g:'Esomeprazole',brands:['Nexium','Esomax','Esogard','Esprazol'],cat:'Tablet',str:['20mg','40mg'],sch:'Schedule-H',th:'PPI',df:'Oral',dose:'Tablet'},
  {g:'Pantoprazole',brands:['Protonix','Pantop','Pantozol','Pantocid'],cat:'Tablet',str:['20mg','40mg'],sch:'Schedule-H',th:'PPI',df:'Oral',dose:'Tablet'},
  {g:'Ranitidine',brands:['Zantac','Rani','Aciloc'],cat:'Tablet',str:['150mg','300mg'],sch:'OTC',th:'H2 Blocker',df:'Oral',dose:'Tablet'},
  {g:'Domperidone',brands:['Motilium','Domstal','Vomistop','Peridone'],cat:'Tablet',str:['10mg'],sch:'Schedule-H',th:'Antiemetic',df:'Oral',dose:'Tablet'},
  {g:'Metoclopramide',brands:['Maxolon','Perinorm','Reglan'],cat:'Tablet',str:['10mg'],sch:'Schedule-H',th:'Antiemetic',df:'Oral',dose:'Tablet'},
  {g:'Loperamide',brands:['Imodium','Lopamide','Eldoper'],cat:'Capsule',str:['2mg'],sch:'OTC',th:'Antidiarrheal',df:'Oral',dose:'Capsule'},
  // ── Cardiac / BP ──
  {g:'Amlodipine',brands:['Norvasc','Amlo','Amlong','Amlopress'],cat:'Tablet',str:['2.5mg','5mg','10mg'],sch:'Schedule-H',th:'CCB',df:'Oral',dose:'Tablet'},
  {g:'Atenolol',brands:['Tenormin','Aten','Betacard'],cat:'Tablet',str:['25mg','50mg','100mg'],sch:'Schedule-H',th:'Beta-Blocker',df:'Oral',dose:'Tablet'},
  {g:'Metoprolol',brands:['Lopressor','Betaloc','Seloken'],cat:'Tablet',str:['25mg','50mg','100mg'],sch:'Schedule-H',th:'Beta-Blocker',df:'Oral',dose:'Tablet'},
  {g:'Losartan',brands:['Cozaar','Losacar','Losar','Repace'],cat:'Tablet',str:['25mg','50mg','100mg'],sch:'Schedule-H',th:'ARB',df:'Oral',dose:'Tablet'},
  {g:'Enalapril',brands:['Vasotec','Renitec','Enapril'],cat:'Tablet',str:['5mg','10mg','20mg'],sch:'Schedule-H',th:'ACE Inhibitor',df:'Oral',dose:'Tablet'},
  {g:'Ramipril',brands:['Altace','Tritace','Cardace'],cat:'Capsule',str:['2.5mg','5mg','10mg'],sch:'Schedule-H',th:'ACE Inhibitor',df:'Oral',dose:'Capsule'},
  {g:'Hydrochlorothiazide',brands:['Esidrex','HCT','Aquazide'],cat:'Tablet',str:['12.5mg','25mg'],sch:'Schedule-H',th:'Diuretic',df:'Oral',dose:'Tablet'},
  {g:'Furosemide',brands:['Lasix','Frusemide','Frusenex'],cat:'Tablet',str:['20mg','40mg','80mg'],sch:'Schedule-H',th:'Loop Diuretic',df:'Oral',dose:'Tablet'},
  {g:'Clopidogrel',brands:['Plavix','Clopilet','Plagril'],cat:'Tablet',str:['75mg'],sch:'Schedule-H',th:'Antiplatelet',df:'Oral',dose:'Tablet'},
  {g:'Atorvastatin',brands:['Lipitor','Atorva','Storvas'],cat:'Tablet',str:['10mg','20mg','40mg','80mg'],sch:'Schedule-H',th:'Statin',df:'Oral',dose:'Tablet'},
  {g:'Rosuvastatin',brands:['Crestor','Rosuvas','Rozavel'],cat:'Tablet',str:['5mg','10mg','20mg','40mg'],sch:'Schedule-H',th:'Statin',df:'Oral',dose:'Tablet'},
  // ── Diabetes ──
  {g:'Metformin',brands:['Glucophage','Glycomet','Glumet','Obimet'],cat:'Tablet',str:['500mg','850mg','1000mg'],sch:'Schedule-H',th:'Biguanide',df:'Oral',dose:'Tablet'},
  {g:'Glimepiride',brands:['Amaryl','Glimpid','Glimstar'],cat:'Tablet',str:['1mg','2mg','3mg','4mg'],sch:'Schedule-H',th:'Sulfonylurea',df:'Oral',dose:'Tablet'},
  {g:'Sitagliptin',brands:['Januvia','Sitaglu','Zita'],cat:'Tablet',str:['25mg','50mg','100mg'],sch:'Schedule-H',th:'DPP-4 Inhibitor',df:'Oral',dose:'Tablet'},
  {g:'Insulin Glargine',brands:['Lantus','Basalog','Glaritus'],cat:'Injection',str:['100IU/ml'],sch:'Schedule-H',th:'Insulin',df:'Injectable',dose:'Injection'},
  // ── Respiratory ──
  {g:'Salbutamol',brands:['Ventolin','Asthalin','Salbutamol'],cat:'Inhaler',str:['100mcg'],sch:'Schedule-H',th:'Bronchodilator',df:'Inhalation',dose:'Inhaler'},
  {g:'Montelukast',brands:['Singulair','Montair','Montek'],cat:'Tablet',str:['4mg','5mg','10mg'],sch:'Schedule-H',th:'LTRA',df:'Oral',dose:'Tablet'},
  {g:'Cetirizine',brands:['Zyrtec','Cetriz','Alerid','Incid'],cat:'Tablet',str:['5mg','10mg'],sch:'OTC',th:'Antihistamine',df:'Oral',dose:'Tablet'},
  {g:'Loratadine',brands:['Claritin','Lorfast','Alavert'],cat:'Tablet',str:['10mg'],sch:'OTC',th:'Antihistamine',df:'Oral',dose:'Tablet'},
  {g:'Fexofenadine',brands:['Allegra','Fexo','Telfast'],cat:'Tablet',str:['60mg','120mg','180mg'],sch:'OTC',th:'Antihistamine',df:'Oral',dose:'Tablet'},
  {g:'Dextromethorphan + Guaifenesin',brands:['Robitussin','Corex-DX','Benylin'],cat:'Syrup',str:['60ml','120ml'],sch:'OTC',th:'Cough Suppressant',df:'Oral',dose:'Syrup'},
  // ── Vitamins / Supplements ──
  {g:'Vitamin D3',brands:['Sunny-D','D-Rise','Devit-3','Calcirol'],cat:'Tablet',str:['1000IU','5000IU','60000IU'],sch:'OTC',th:'Vitamin',df:'Oral',dose:'Tablet'},
  {g:'Calcium + Vitamin D',brands:['Caltrate','Oscal-D','Calcimax-D','Sandocal'],cat:'Tablet',str:['500mg+250IU','600mg+400IU'],sch:'OTC',th:'Supplement',df:'Oral',dose:'Tablet'},
  {g:'Iron + Folic Acid',brands:['Fefol','Ferrous','Iberet','Folvit'],cat:'Tablet',str:['150mg+0.5mg'],sch:'OTC',th:'Supplement',df:'Oral',dose:'Tablet'},
  {g:'Multivitamin',brands:['Centrum','Pharmaton','Berocca','Theragran'],cat:'Tablet',str:['Multi'],sch:'OTC',th:'Vitamin',df:'Oral',dose:'Tablet'},
  {g:'Zinc',brands:['Zincovit','Zinc Sulfate','Zincat'],cat:'Tablet',str:['20mg','50mg'],sch:'OTC',th:'Mineral',df:'Oral',dose:'Tablet'},
  {g:'Omega-3 Fish Oil',brands:['MaxEPA','Omacor','SevenSeas'],cat:'Capsule',str:['1000mg'],sch:'OTC',th:'Supplement',df:'Oral',dose:'Capsule'},
  // ── Skin / Topical ──
  {g:'Clotrimazole',brands:['Canesten','Candid','Clotrim'],cat:'Cream/Ointment',str:['1%'],sch:'OTC',th:'Antifungal',df:'Topical',dose:'Cream'},
  {g:'Betamethasone',brands:['Betnovate','Betaderm','Diprosone'],cat:'Cream/Ointment',str:['0.1%'],sch:'Schedule-H',th:'Corticosteroid',df:'Topical',dose:'Cream'},
  {g:'Mupirocin',brands:['Bactroban','Mupiderm','T-Bact'],cat:'Cream/Ointment',str:['2%'],sch:'Schedule-H',th:'Antibiotic',df:'Topical',dose:'Cream'},
  {g:'Fusidic Acid',brands:['Fucidin','Fusicip','Fusigen'],cat:'Cream/Ointment',str:['2%'],sch:'Schedule-H',th:'Antibiotic',df:'Topical',dose:'Cream'},
  // ── Eye / Ear Drops ──
  {g:'Ciprofloxacin Eye Drops',brands:['Ciloxan','Ciplox Eye','Zoxan'],cat:'Drops',str:['0.3%'],sch:'Schedule-H',th:'Antibiotic',df:'Ophthalmic',dose:'Drops'},
  {g:'Tobramycin Eye Drops',brands:['Tobrex','Tobracin','Tobrasol'],cat:'Drops',str:['0.3%'],sch:'Schedule-H',th:'Antibiotic',df:'Ophthalmic',dose:'Drops'},
  {g:'Artificial Tears',brands:['Refresh','Tears Naturale','Systane','Visine'],cat:'Drops',str:['10ml','15ml'],sch:'OTC',th:'Lubricant',df:'Ophthalmic',dose:'Drops'},
  // ── Mental Health ──
  {g:'Sertraline',brands:['Zoloft','Serlift','Daxid'],cat:'Tablet',str:['25mg','50mg','100mg'],sch:'Schedule-H',th:'SSRI',df:'Oral',dose:'Tablet'},
  {g:'Escitalopram',brands:['Lexapro','Cipralex','Nexito'],cat:'Tablet',str:['5mg','10mg','20mg'],sch:'Schedule-H',th:'SSRI',df:'Oral',dose:'Tablet'},
  {g:'Alprazolam',brands:['Xanax','Restyl','Alprax'],cat:'Tablet',str:['0.25mg','0.5mg','1mg'],sch:'Schedule-X',th:'Benzodiazepine',df:'Oral',dose:'Tablet'},
  {g:'Diazepam',brands:['Valium','Calmpose','Diazep'],cat:'Tablet',str:['2mg','5mg','10mg'],sch:'Schedule-X',th:'Benzodiazepine',df:'Oral',dose:'Tablet'},
  {g:'Clonazepam',brands:['Rivotril','Clonotril','Epitril'],cat:'Tablet',str:['0.25mg','0.5mg','1mg','2mg'],sch:'Schedule-X',th:'Benzodiazepine',df:'Oral',dose:'Tablet'},
  // ── Thyroid ──
  {g:'Levothyroxine',brands:['Synthroid','Eltroxin','Thyronorm'],cat:'Tablet',str:['25mcg','50mcg','75mcg','100mcg'],sch:'Schedule-H',th:'Thyroid',df:'Oral',dose:'Tablet'},
  // ── Antifungal ──
  {g:'Fluconazole',brands:['Diflucan','Forcan','Flucos'],cat:'Capsule',str:['50mg','150mg','200mg'],sch:'Schedule-H',th:'Antifungal',df:'Oral',dose:'Capsule'},
  {g:'Terbinafine',brands:['Lamisil','Terbicip','Fungotek'],cat:'Tablet',str:['250mg'],sch:'Schedule-H',th:'Antifungal',df:'Oral',dose:'Tablet'},
  // ── Syrups ──
  {g:'Paracetamol Syrup',brands:['Calpol Syrup','Panadol Syrup','Tylenol Syrup'],cat:'Syrup',str:['120mg/5ml','250mg/5ml'],sch:'OTC',th:'Analgesic',df:'Oral',dose:'Syrup'},
  {g:'Amoxicillin Suspension',brands:['Amoxil Syrup','Moxilin DS','Ospamox Syrup'],cat:'Syrup',str:['125mg/5ml','250mg/5ml'],sch:'Schedule-H',th:'Antibiotic',df:'Oral',dose:'Syrup'},
  {g:'Cetirizine Syrup',brands:['Zyrtec Syrup','Cetriz Syrup','Incid Syrup'],cat:'Syrup',str:['5mg/5ml'],sch:'OTC',th:'Antihistamine',df:'Oral',dose:'Syrup'},
  {g:'Ibuprofen Syrup',brands:['Brufen Syrup','Nurofen Syrup','Ibucap Syrup'],cat:'Syrup',str:['100mg/5ml'],sch:'OTC',th:'NSAID',df:'Oral',dose:'Syrup'},
  {g:'Lactulose',brands:['Duphalac','Laxose','Lactifiber'],cat:'Syrup',str:['10g/15ml'],sch:'OTC',th:'Laxative',df:'Oral',dose:'Syrup'},
  {g:'Multivitamin Syrup',brands:['Vidaylin','Becadexamin','Zincovit Syrup'],cat:'Syrup',str:['200ml'],sch:'OTC',th:'Vitamin',df:'Oral',dose:'Syrup'},
  // ── More specialties ──
  {g:'Warfarin',brands:['Coumadin','Warf','Marevan'],cat:'Tablet',str:['1mg','2mg','5mg'],sch:'Schedule-H',th:'Anticoagulant',df:'Oral',dose:'Tablet'},
  {g:'Gabapentin',brands:['Neurontin','Gabapin','Gabantin'],cat:'Capsule',str:['100mg','300mg','400mg'],sch:'Schedule-H',th:'Anticonvulsant',df:'Oral',dose:'Capsule'},
  {g:'Pregabalin',brands:['Lyrica','Pregabalin','Pregalin'],cat:'Capsule',str:['75mg','150mg','300mg'],sch:'Schedule-H1',th:'Anticonvulsant',df:'Oral',dose:'Capsule'},
  {g:'Carbamazepine',brands:['Tegretol','Carbatol','Mazetol'],cat:'Tablet',str:['200mg','400mg'],sch:'Schedule-H',th:'Anticonvulsant',df:'Oral',dose:'Tablet'},
  {g:'Prednisolone',brands:['Omnacortil','Wysolone','Prelone'],cat:'Tablet',str:['5mg','10mg','20mg','40mg'],sch:'Schedule-H',th:'Corticosteroid',df:'Oral',dose:'Tablet'},
  {g:'Sildenafil',brands:['Viagra','Penegra','Vigora'],cat:'Tablet',str:['25mg','50mg','100mg'],sch:'Schedule-H',th:'PDE5 Inhibitor',df:'Oral',dose:'Tablet'},
  {g:'Tadalafil',brands:['Cialis','Megalis','Tadacip'],cat:'Tablet',str:['5mg','10mg','20mg'],sch:'Schedule-H',th:'PDE5 Inhibitor',df:'Oral',dose:'Tablet'},
  {g:'Tamsulosin',brands:['Flomax','Urimax','Contiflo'],cat:'Capsule',str:['0.2mg','0.4mg'],sch:'Schedule-H',th:'Alpha Blocker',df:'Oral',dose:'Capsule'},
  {g:'Ondansetron',brands:['Zofran','Emeset','Vomikind'],cat:'Tablet',str:['4mg','8mg'],sch:'Schedule-H',th:'Antiemetic',df:'Oral',dose:'Tablet'},
  {g:'Ranitidine Syrup',brands:['Zantac Syrup','Rani Syrup'],cat:'Syrup',str:['75mg/5ml'],sch:'OTC',th:'H2 Blocker',df:'Oral',dose:'Syrup'},
];

// ─── Seed function ───
async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      Store.deleteMany({}), User.deleteMany({}), Medicine.deleteMany({}),
      Category.deleteMany({}), Batch.deleteMany({}),
    ]);
    console.log('Cleared existing data');

    // Plain text password — the User model pre('save') hook will hash it automatically
    const plainPassword = 'admin123456';

    // 1. Create SuperAdmin
    const superAdmin = new User({
      name: 'Platform Admin',
      email: 'superadmin@medstore.com',
      password: plainPassword,
      role: 'SuperAdmin',
      isActive: true,
    });
    superAdmin.setDefaultPermissions();
    await superAdmin.save();
    console.log('SuperAdmin created: superadmin@medstore.com / admin123456');

    // 2. Create Demo Store
    const store = await Store.create({
      storeName: 'Al-Shifa Medical Store',
      slug: 'al-shifa-medical-' + Date.now().toString(36),
      email: 'demo@alshifa.com',
      phone: '+923001234567',
      address: { street: 'Main Boulevard, Gulberg III', city: 'Lahore', state: 'Punjab', country: 'Pakistan', postalCode: '54000' },
      ownerName: 'Dr. Ahmed Khan',
      ownerPhone: '+923001234567',
      drugLicenseNumber: 'DL-LHR-2024-00145',
      drugLicenseExpiry: new Date('2026-12-31'),
      gstNumber: 'GSTIN1234567890',
      plan: 'Premium',
      maxProducts: Infinity,
      maxStaff: Infinity,
      isApproved: true,
      approvedAt: new Date(),
    });
    console.log('Demo Store created:', store.storeName);

    // 3. Create Store Admin
    const storeAdmin = new User({
      name: 'Dr. Ahmed Khan',
      email: 'admin@alshifa.com',
      password: plainPassword,
      phone: '+923001234567',
      role: 'StoreAdmin',
      storeId: store._id,
      isActive: true,
    });
    storeAdmin.setDefaultPermissions();
    await storeAdmin.save();
    console.log('Store Admin: admin@alshifa.com / admin123456');

    // 4. Create staff users
    const staffRoles = [
      { name: 'Pharmacist Ali', email: 'pharmacist@alshifa.com', role: 'Pharmacist' },
      { name: 'Cashier Bilal', email: 'cashier@alshifa.com', role: 'Cashier' },
      { name: 'Stock Wala Hassan', email: 'inventory@alshifa.com', role: 'InventoryStaff' },
    ];
    for (const s of staffRoles) {
      const u = new User({ ...s, password: plainPassword, storeId: store._id, isActive: true });
      u.setDefaultPermissions();
      await u.save();
      console.log(`${s.role}: ${s.email} / admin123456`);
    }

    // 5. Create Categories
    const categoryNames = [
      'Tablets','Capsules','Syrups & Suspensions','Injections','Creams & Ointments',
      'Eye/Ear Drops','Inhalers','Suppositories','Sachets & Powders','Surgical Items',
      'Medical Devices','Cosmetics & Skin Care','OTC Medicines','Baby Care','Nutrition & Supplements',
      'Gels & Lotions','Sprays','Ayurvedic & Herbal','Solutions','Patches',
    ];
    const catDocs = [];
    for (const name of categoryNames) {
      const cat = await Category.create({ storeId: store._id, name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), isActive: true });
      catDocs.push(cat);
    }
    console.log(`${catDocs.length} categories created`);

    // 6. Generate medicines from world database
    const worldMedicines = require('./worldMedicines');

    const genBarcode = (i) => {
      const code = '890' + String(i).padStart(9, '0');
      let sum = 0;
      for (let j = 0; j < 12; j++) sum += parseInt(code[j]) * (j % 2 === 0 ? 1 : 3);
      return code.substring(0, 12) + ((10 - (sum % 10)) % 10);
    };

    const catMap = {
      'Tablet': 'Tablets', 'Capsule': 'Capsules', 'Syrup': 'Syrups & Suspensions',
      'Injection': 'Injections', 'Cream/Ointment': 'Creams & Ointments', 'Drops': 'Eye/Ear Drops',
      'Inhaler': 'Inhalers', 'Suppository': 'Suppositories', 'Sachet': 'Sachets & Powders',
      'Powder': 'Sachets & Powders', 'Gel': 'Gels & Lotions', 'Lotion': 'Gels & Lotions',
      'Spray': 'Sprays', 'Patch': 'Medical Devices', 'Solution': 'Surgical Items',
    };
    const unitMap = {
      'Tablet': 'tablet', 'Capsule': 'capsule', 'Syrup': 'bottle', 'Injection': 'vial',
      'Cream/Ointment': 'tube', 'Drops': 'bottle', 'Inhaler': 'piece', 'Suppository': 'piece',
      'Sachet': 'sachet', 'Powder': 'pack', 'Gel': 'tube', 'Lotion': 'bottle',
      'Spray': 'bottle', 'Patch': 'piece', 'Solution': 'bottle',
    };

    let medCount = 0;
    const batchesToCreate = [];
    const medicinesToCreate = [];
    const now = new Date();

    for (const base of worldMedicines) {
      for (const brand of base.b) {
        for (const strength of base.s) {
          const mfr = manufacturers[Math.floor(Math.random() * manufacturers.length)];
          const costPrice = parseFloat((Math.random() * 300 + 3).toFixed(2));
          const mrp = parseFloat((costPrice * (1.15 + Math.random() * 0.85)).toFixed(2));
          const salePrice = parseFloat((mrp * (0.88 + Math.random() * 0.12)).toFixed(2));
          const catName = catMap[base.c] || 'OTC Medicines';
          const catDoc = catDocs.find(c => c.name === catName);

          medCount++;
          medicinesToCreate.push({
            storeId: store._id,
            medicineName: `${brand} ${strength}`,
            genericName: base.g,
            manufacturer: mfr,
            barcode: genBarcode(medCount),
            sku: `${base.c.substring(0, 3).toUpperCase()}-${String(medCount).padStart(5, '0')}`,
            category: base.c,
            categoryId: catDoc?._id,
            subCategory: base.th,
            therapeuticClass: base.th,
            schedule: base.sc,
            isControlled: base.sc === 'Schedule-X',
            requiresPrescription: ['Schedule-H', 'Schedule-H1', 'Schedule-X'].includes(base.sc),
            formulation: `${base.c} ${strength}`,
            packSize: ['Syrup', 'Injection', 'Drops', 'Solution', 'Lotion'].includes(base.c) ? '1 bottle' : ['Cream/Ointment', 'Gel'].includes(base.c) ? '1 tube' : ['Inhaler', 'Spray'].includes(base.c) ? '1 piece' : '10',
            unitsPerPack: ['Syrup', 'Injection', 'Drops', 'Inhaler', 'Spray', 'Cream/Ointment', 'Gel', 'Solution', 'Lotion', 'Patch'].includes(base.c) ? 1 : 10,
            unitOfMeasure: unitMap[base.c] || 'piece',
            strength,
            dosageForm: base.df,
            costPrice, mrp, salePrice,
            wholesalePrice: parseFloat((costPrice * 1.08).toFixed(2)),
            taxRate: [0, 5, 12][Math.floor(Math.random() * 3)],
            lowStockThreshold: Math.floor(Math.random() * 15) + 5,
            reorderLevel: Math.floor(Math.random() * 30) + 10,
            reorderQuantity: Math.floor(Math.random() * 100) + 20,
            rackLocation: `Shelf ${String.fromCharCode(65 + Math.floor(Math.random() * 10))}${Math.floor(Math.random() * 6) + 1}, Row ${Math.floor(Math.random() * 4) + 1}`,
            storageCondition: ['Injection', 'Drops', 'Suppository'].includes(base.c) ? 'Refrigerate (2-8°C)' : 'Room Temperature',
            currentStock: 0,
            isActive: true,
            addedBy: storeAdmin._id,
          });
        }
      }
    }

    // Bulk insert medicines in chunks
    console.log(`Inserting ${medicinesToCreate.length} medicines...`);
    const CHUNK = 500;
    const insertedMeds = [];
    for (let i = 0; i < medicinesToCreate.length; i += CHUNK) {
      const chunk = medicinesToCreate.slice(i, i + CHUNK);
      const inserted = await Medicine.insertMany(chunk, { ordered: false });
      insertedMeds.push(...inserted);
      console.log(`  ${Math.min(i + CHUNK, medicinesToCreate.length)} / ${medicinesToCreate.length} inserted...`);
    }

    // Create batches for each medicine
    console.log('Creating batches...');
    for (const med of insertedMeds) {
      const numBatches = Math.floor(Math.random() * 2) + 1;
      let totalQty = 0;
      for (let b = 0; b < numBatches; b++) {
        const qty = Math.floor(Math.random() * 200) + 10;
        const monthsAhead = Math.floor(Math.random() * 30) + 3;
        const expiry = new Date(now.getFullYear(), now.getMonth() + monthsAhead, Math.floor(Math.random() * 28) + 1);
        const isNearExpiry = Math.random() < 0.06;
        const finalExpiry = isNearExpiry ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + Math.floor(Math.random() * 45)) : expiry;

        batchesToCreate.push({
          storeId: store._id, medicineId: med._id,
          batchNumber: `B${String(insertedMeds.indexOf(med) + 1).padStart(5, '0')}-${b + 1}`,
          expiryDate: finalExpiry, quantity: qty, remainingQty: qty,
          costPrice: med.costPrice, salePrice: med.salePrice, mrp: med.mrp,
          isExpired: finalExpiry < now, addedBy: storeAdmin._id,
        });
        totalQty += qty;
      }
      med.currentStock = totalQty;
    }

    // Bulk insert batches
    console.log(`Inserting ${batchesToCreate.length} batches...`);
    for (let i = 0; i < batchesToCreate.length; i += CHUNK) {
      await Batch.insertMany(batchesToCreate.slice(i, i + CHUNK), { ordered: false });
    }

    // Update stock counts
    console.log('Updating stock counts...');
    const stockUpdates = insertedMeds.map(med => ({ updateOne: { filter: { _id: med._id }, update: { $set: { currentStock: med.currentStock } } } }));
    for (let i = 0; i < stockUpdates.length; i += CHUNK) {
      await Medicine.bulkWrite(stockUpdates.slice(i, i + CHUNK));
    }

    // 7. Seed Dummy Customers
    const Customer = require('../models/Customer');
    const dummyCustomers = [
      { customerName: 'Muhammad Asad', phone: '+923001111111', gender: 'Male', customerType: 'regular', creditLimit: 5000, allergies: [{ name: 'Penicillin', severity: 'severe' }], conditions: [{ name: 'Hypertension' }] },
      { customerName: 'Fatima Zahra', phone: '+923002222222', gender: 'Female', customerType: 'chronic', creditLimit: 10000, currentMedications: [{ medicineName: 'Metformin 500mg', dosage: 'Twice daily', prescribedBy: 'Dr. Ahmed' }], conditions: [{ name: 'Diabetes' }, { name: 'Hypertension' }] },
      { customerName: 'Ali Hassan', phone: '+923003333333', gender: 'Male', customerType: 'regular', creditLimit: 3000 },
      { customerName: 'Ayesha Bibi', phone: '+923004444444', gender: 'Female', customerType: 'chronic', creditLimit: 8000, allergies: [{ name: 'Aspirin', severity: 'moderate' }], conditions: [{ name: 'Asthma' }] },
      { customerName: 'Usman Tariq', phone: '+923005555555', gender: 'Male', customerType: 'wholesale', creditLimit: 50000 },
      { customerName: 'Zainab Malik', phone: '+923006666666', gender: 'Female', customerType: 'insurance', creditLimit: 0, insuranceDetails: { company: 'State Life', policyNumber: 'SL-2024-1234', coPayPercent: 20 } },
      { customerName: 'Hamza Sheikh', phone: '+923007777777', gender: 'Male', customerType: 'regular', creditLimit: 2000 },
      { customerName: 'Sana Iqbal', phone: '+923008888888', gender: 'Female', customerType: 'employee', creditLimit: 15000, conditions: [{ name: 'Thyroid' }] },
      { customerName: 'Bilal Ahmed', phone: '+923009999999', gender: 'Male', customerType: 'regular', creditLimit: 5000, allergies: [{ name: 'Sulfa drugs', severity: 'severe' }] },
      { customerName: 'Nadia Khan', phone: '+923010000000', gender: 'Female', customerType: 'chronic', creditLimit: 7000, currentMedications: [{ medicineName: 'Levothyroxine 50mcg', dosage: 'Once daily' }], conditions: [{ name: 'Hypothyroid' }] },
    ];
    for (const c of dummyCustomers) {
      await Customer.create({ ...c, storeId: store._id, loyaltyPoints: Math.floor(Math.random() * 500), totalSpent: Math.floor(Math.random() * 50000), visitCount: Math.floor(Math.random() * 50) + 1 });
    }
    console.log(`${dummyCustomers.length} dummy customers created`);

    // 8. Seed Dummy Suppliers
    const Supplier = require('../models/Supplier');
    const dummySuppliers = [
      { supplierName: 'Getz Pharma Distribution', companyName: 'Getz Pharma', phone: '+924211234567', paymentTerms: 'Credit 30', creditLimit: 500000, drugLicenseNumber: 'DL-KHI-2024-001', currentBalance: 25000, rating: 5 },
      { supplierName: 'Martin Dow Supply', companyName: 'Martin Dow', phone: '+924212345678', paymentTerms: 'Credit 15', creditLimit: 300000, drugLicenseNumber: 'DL-KHI-2024-002', currentBalance: 15000, rating: 4 },
      { supplierName: 'Sami Pharma Agency', companyName: 'Sami Pharma', phone: '+924213456789', paymentTerms: 'COD', creditLimit: 100000, drugLicenseNumber: 'DL-LHR-2024-003', currentBalance: 0, rating: 4 },
      { supplierName: 'PharmEvo Distributors', companyName: 'PharmEvo', phone: '+924214567890', paymentTerms: 'Credit 60', creditLimit: 1000000, drugLicenseNumber: 'DL-KHI-2024-004', currentBalance: 85000, rating: 5 },
      { supplierName: 'Hilton Pharma Depot', companyName: 'Hilton Pharma', phone: '+924215678901', paymentTerms: 'Credit 30', creditLimit: 200000, drugLicenseNumber: 'DL-LHR-2024-005', currentBalance: 42000, rating: 3 },
    ];
    for (const s of dummySuppliers) {
      await Supplier.create({ ...s, storeId: store._id, address: { city: 'Karachi', country: 'Pakistan' }, totalPurchases: s.currentBalance * 3, totalPayments: s.currentBalance * 2 });
    }
    console.log(`${dummySuppliers.length} dummy suppliers created`);

    // 9. Seed Dummy Expenses
    const Expense = require('../models/Expense');
    const expenseData = [
      { category: 'Rent', amount: 50000, description: 'Monthly shop rent - April 2025', paymentMethod: 'bank_transfer' },
      { category: 'Electricity', amount: 12000, description: 'LESCO bill - March 2025', paymentMethod: 'cash' },
      { category: 'Salaries', amount: 120000, description: 'Staff salaries - March 2025', paymentMethod: 'bank_transfer' },
      { category: 'Internet', amount: 3500, description: 'PTCL broadband monthly', paymentMethod: 'cash' },
      { category: 'Maintenance', amount: 5000, description: 'AC repair', paymentMethod: 'cash' },
      { category: 'Stationery', amount: 2500, description: 'Receipt rolls, labels, printer ink', paymentMethod: 'cash' },
      { category: 'Transport', amount: 8000, description: 'Delivery bike fuel + maintenance', paymentMethod: 'cash' },
      { category: 'License Fees', amount: 15000, description: 'Drug license renewal fee', paymentMethod: 'bank_transfer' },
    ];
    for (const e of expenseData) {
      await Expense.create({ ...e, storeId: store._id, addedBy: storeAdmin._id, date: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000) });
    }
    console.log(`${expenseData.length} dummy expenses created`);

    console.log(`\n═══════════════════════════════════════`);
    console.log(`  SEED COMPLETE`);
    console.log(`  ${insertedMeds.length} medicines created`);
    console.log(`  ${batchesToCreate.length} batches created`);
    console.log(`  ${catDocs.length} categories`);
    console.log(`  5 users (1 SuperAdmin + 4 store staff)`);
    console.log(`═══════════════════════════════════════`);
    console.log(`\n  Login credentials:`);
    console.log(`  SuperAdmin:  superadmin@medstore.com / admin123456`);
    console.log(`  StoreAdmin:  admin@alshifa.com / admin123456`);
    console.log(`  Pharmacist:  pharmacist@alshifa.com / admin123456`);
    console.log(`  Cashier:     cashier@alshifa.com / admin123456`);
    console.log(`  Inventory:   inventory@alshifa.com / admin123456`);

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seedDatabase();
