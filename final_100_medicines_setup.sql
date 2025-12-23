-- Comprehensive SQL Script to add 100+ medicines with "Minimum 2 Pharmacies" Availability.
-- Every medicine will be assigned to at least two pharmacies so users always see multiple options.

-- 1. DIABETES & METABOLISM
insert into drugs (name, dosage, type, price, description) values
('Glimepiride', '2mg', 'Diabetes', 120.00, 'Used to treat Type 2 diabetes by increasing insulin production.'),
('Januvia', '100mg', 'Diabetes', 850.00, 'Helps control blood sugar levels in adults with Type 2 diabetes.'),
('Humalog', '100 units/ml', 'Diabetes (Insulin)', 1200.00, 'Fast-acting insulin to manage blood sugar spikes.'),
('Gliclazide', '80mg', 'Diabetes', 150.00, 'Improves insulin secretion in the pancreas.'),
('Pioglitazone', '15mg', 'Diabetes', 180.00, 'Helps restore proper response to insulin.'),
('Ozempic (Semaglutide)', '0.5mg/pen', 'Rare Diabetes', 18500.00, 'HIGHLY RARE: Facing global shortage; used for Type 2 diabetes.'),
('Mounjaro (Tirzepatide)', '5mg/vial', 'Rare Diabetes', 22000.00, 'LATEST GEN: Highly effective for blood sugar control.'),
('Baqsimi (Glucagon Nasal)', '3mg', 'Rare Emergency (Low Sugar)', 8500.00, 'RARE: Needle-free treatment for severe hypoglycemia.'),
('Fiasp (Ultra-fast Insulin)', '100 units/ml', 'Rare Diabetes (Insulin)', 2800.00, 'SPECIALIZED: Required for insulin pump users.'),
('Glucagon Emergency Kit', '1mg', 'Emergency (Diabetes)', 3500.00, 'Injectable kit for reviving unconscious diabetic patients.'),
('Synthroid (Levothyroxine)', '100mcg', 'Metabolism', 250.00, 'Thyroid management medication.');

-- 2. PEDIATRICS (Kids)
insert into drugs (name, dosage, type, price, description) values
('Calpol (Paracetamol) Suspension', '120mg/5ml', 'Pediatrics', 45.00, 'Fever and pain relief for infants.'),
('Augmentin Duo Syrup', '228.5mg', 'Pediatrics (Antibiotic)', 110.00, 'Pediatric antibiotic for infections.'),
('Ondem Syrup', '2mg/5ml', 'Pediatrics', 65.00, 'Stop vomiting and nausea in children.'),
('Enterogermina Spores', '2 Billion/5ml', 'Pediatrics (Probiotic)', 55.00, 'Gut health during diarrhea in kids.'),
('Maxtra Drops', 'Nasat Drop', 'Pediatrics (Cold)', 75.00, 'Nasal congestion relief for babies.'),
('Synagis (Palivizumab)', '100mg/vial', 'Rare Pediatrics', 145000.00, 'Expensive injection for high-risk infants.'),
('Keppra Oral Solution', '100mg/ml', 'Rare Pediatrics (Seizure)', 1200.00, 'Anti-seizure medication for children.'),
('Vigabatrin (Sabril)', '500mg', 'Rare Pediatrics (Epilepsy)', 9500.00, 'Specialized for infantile spasms.'),
('Creon (Pancreatin)', '25000 units', 'Rare Pediatrics (CF)', 4500.00, 'Specialized digestive health for CF.'),
('Montelukast Sodium Syrup', '4mg/5ml', 'Pediatrics (Asthma)', 145.00, 'Pediatric asthma prevention syrup.'),
('Oseltamivir Suspension', '6mg/ml', 'Pediatrics (Flu)', 950.00, 'Flu treatment liquid for kids.'),
('Ferrous Sulfate Drops', '15mg/ml', 'Pediatrics (Blood)', 65.00, 'Iron supplement for infants.'),
('Cholecalciferol (D3) Drops', '400 IU', 'Pediatrics', 110.00, 'Vitamin D for infants.'),
('Nystatin Suspension', '100000 units/ml', 'Pediatrics/Fungal', 180.00, 'Treatment for oral thrush in babies.'),
('Doxycycline Syrup', '25mg/5ml', 'Pediatrics/Antibiotic', 180.00, 'Specialty liquid antibiotic for children.'),
('Prednisolone Syrup', '15mg/5ml', 'Pediatrics/Steroid', 85.00, 'Emergency steroid syrup for children.');

-- 3. HEART, BLOOD & EMERGENCY
insert into drugs (name, dosage, type, price, description) values
('Epinephrine (EpiPen)', '0.3mg', 'Emergency (Allergy)', 4500.00, 'Severe allergic reaction treatment.'),
('Nitroglycerin', '0.4mg', 'Emergency (Heart)', 350.00, 'Emergency chest pain treatment.'),
('Aspirin (Soluble)', '300mg', 'Emergency (Heart Attack)', 10.00, 'Immediate heart attack treatment.'),
('Asthalin (Salbutamol) Inhaler', '100mcg', 'Emergency (Asthma)', 180.00, 'Quick asthma relief.'),
('Heparin Injection', '5000 units/ml', 'Emergency (Blood)', 450.00, 'Prevent blood clots during heart attack.'),
('Warfarin (Coumadin)', '5mg', 'Chronic (Blood)', 85.00, 'Common blood thinner.'),
('Clopidogrel (Plavix)', '75mg', 'Heart Recovery', 320.00, 'Prevents stroke and repeat heart attacks.'),
('Rivaroxaban (Xarelto)', '20mg', 'Specialty Blood Thinner', 4200.00, 'Advanced anticoagulant.'),
('Apixaban (Eliquis)', '5mg', 'Specialty Blood Thinner', 4800.00, 'Clot prevention; high demand.'),
('Amiodarone', '200mg', 'Emergency (Heart)', 120.00, 'Treatment for life-threatening heart rhythms.'),
('Atropine Injection', '0.6mg/ml', 'Emergency (Heart)', 55.00, 'Emergency treatment for slow heart rate.'),
('Furosemide (Lasix)', '40mg', 'Heart/Fluid', 15.00, 'Treat fluid buildup in heart failure.'),
('Amlodipine (Norvasc)', '5mg', 'Blood Pressure', 25.00, 'Daily BP management.'),
('Losartan', '50mg', 'Blood Pressure', 45.00, 'BP and kidney protection.'),
('Metoprolol Succinate', '25mg', 'Blood Pressure', 60.00, 'Beta-blocker for hypertension.'),
('Digoxin (Lanoxin)', '0.25mg', 'Heart Failure', 90.00, 'Strengthens heart contractions.'),
('Norepinephrine', '4mg/4ml', 'Emergency (Shock)', 1800.00, 'ICU treatment for low BP.'),
('Vitamin K1 Injection', '10mg/ml', 'Emergency (Blood)', 45.00, 'Antidote for blood thinner overdose.'),
('Sildenafil (Revatio)', '20mg', 'Specialty Heart', 3500.00, 'Pulmonary Arterial Hypertension treatment.'),
('Bosentan', '125mg', 'Rare Cardiology', 45000.00, 'Treatment for high pressure in lung arteries.'),
('Dobutamine Injection', '250mg', 'Emergency (Heart)', 1200.00, 'Acute heart failure treatment.'),
('Carvedilol', '6.25mg', 'Heart Failure', 55.00, 'Reduces heart workload.'),
('Spironolactone', '25mg', 'Heart Failure', 120.00, 'Heart failure management.'),
('Hydrochlorothiazide', '25mg', 'Blood Pressure', 15.00, 'Common diuretic.');

-- 4. RESPIRATORY
insert into drugs (name, dosage, type, price, description) values
('Symbicort Inhaler', '160/4.5', 'Respiratory (Asthma)', 3500.00, 'Maintenance treatment for COPD and Asthma.'),
('Advair Diskus', '250/50', 'Respiratory (Asthma)', 4200.00, 'Specialty inhaler for chronic issues.'),
('Spiriva Respimat', '2.5mcg', 'Respiratory (COPD)', 5800.00, 'Specialized maintenance for COPD.'),
('Montelukast (Singulair)', '10mg', 'Respiratory/Allergy', 120.00, 'Allergy and asthma prevention.'),
('Prednisone', '20mg', 'Respiratory/Steroid', 35.00, 'Acute asthma flare-up treatment.'),
('Dexamethasone Injection', '4mg/ml', 'Emergency Steroid', 50.00, 'Severe inflammation treatment.'),
('Combivent Respimat', '20/100', 'Emergency Respiratory', 4900.00, 'Rescue inhaler for distress.'),
('Pulmicort Turbuhaler', '400mcg', 'Respiratory/Steroid', 950.00, 'Maintenance steroid inhaler.'),
('Mometasone Nasal Spray', '50mcg', 'Allergy/Respiratory', 550.00, 'Specialized nasal steroid.'),
('Fluticasone Inhaler', '110mcg', 'Respiratory', 1400.00, 'Primary steroid inhaler.');

-- 5. INFECTIOUS DISEASE
insert into drugs (name, dosage, type, price, description) values
('Tamiflu (Oseltamivir)', '75mg', 'Antiviral', 1200.00, 'Influenza treatment.'),
('Paxlovid', '300/100mg', 'Antiviral (COVID)', 45000.00, 'Emergency antiviral for high-risk COVID.'),
('Ceftriaxone Injection', '1g', 'Emergency Antibiotic', 220.00, 'Critical antibiotic for sepsis.'),
('Vancomycin', '500mg', 'Critical Antibiotic', 1500.00, 'Treatment for resistant bacterial infections.'),
('Azithromycin (Z-Pak)', '500mg', 'Antibiotic', 180.00, 'Respiratory infections treatment.'),
('Fluconazole (Diflucan)', '150mg', 'Antifungal', 45.00, 'Fungal infection treatment.'),
('Valtrex (Valacyclovir)', '500mg', 'Antiviral', 850.00, 'Viral outbreak treatment.'),
('Biktarvy', '50/200/25mg', 'Specialty HIV', 38000.00, 'Modern HIV treatment.'),
('Truvada (PrEP)', '200/300mg', 'Specialty HIV/PrEP', 15000.00, 'HIV prevention medication.'),
('Tivicay (Dolutegravir)', '50mg', 'Specialty HIV', 12000.00, 'Standard HIV treatment.'),
('Descovy', '200/25mg', 'Specialty HIV/PrEP', 18000.00, 'Advanced HIV prevention PrEP.');

-- 6. NEUROLOGY & MENTAL HEALTH
insert into drugs (name, dosage, type, price, description) values
('Alprazolam (Xanax)', '0.5mg', 'Neuro (Anxiety)', 85.00, 'Severe anxiety treatment.'),
('Lorazepam (Ativan)', '2mg', 'Neuro (Emergency)', 110.00, 'Seizure emergency treatment.'),
('Diazepam (Valium)', '5mg', 'Neuro (Muscle)', 65.00, 'Muscle spasms and seizure treatment.'),
('Haloperidol (Haldol)', '5mg', 'Neuro (Psych)', 90.00, 'Emergency psychiatric medication.'),
('Quetiapine (Seroquel)', '100mg', 'Neuro (Mood)', 280.00, 'Bipolar and depression treatment.'),
('Sertraline (Zoloft)', '50mg', 'Neuro (Mood)', 150.00, 'Common depression treatment.'),
('Gabapentin (Neurontin)', '300mg', 'Neuro (Nerve Pain)', 210.00, 'Nerve pain treatment.'),
('Pregabalin (Lyrica)', '75mg', 'Neuro (Specialty)', 1400.00, 'Advanced nerve pain medication.'),
('Donepezil (Aricept)', '10mg', 'Neuro (Alzheimer''s)', 350.00, 'Alzheimer''s memory management.');

-- 7. RARE SPECIALTY & ANTIDOTES
insert into drugs (name, dosage, type, price, description) values
('Narcan (Naloxone) Spray', '4mg', 'Rare Emergency (Overdose)', 3200.00, 'Reverses opioid overdose.'),
('CroFab (Antivenom)', '1 vial', 'Rare Emergency (Bite)', 250000.00, 'Venomous snake bite treatment.'),
('Pralidoxime (2-PAM)', '1g/vial', 'Rare Emergency (Antidote)', 5500.00, 'Antidote for pesticide poisoning.'),
('Adenosine (Adenocor)', '6mg/2ml', 'Rare Emergency (Heart)', 800.00, 'Stops dangerous fast heart rates.'),
('Dantrolene', '20mg/vial', 'Rare Emergency', 1800.00, 'Treatment for anesthesia reactions.'),
('N-acetylcysteine (NAC)', '600mg', 'Emergency (Antidote)', 400.00, 'Antidote for acetaminophen overdose.'),
('Activated Charcoal', '50g', 'Emergency (Poison)', 850.00, 'Emergency toxin absorption.');

-- 8. ONCOLOGY & BIOLOGICS
insert into drugs (name, dosage, type, price, description) values
('Humira (Adalimumab)', '40mg/0.4ml', 'Rare Autoimmune', 55000.00, 'Specialized autoimmune treatment.'),
('Enbrel (Etanercept)', '50mg/ml', 'Rare Autoimmune', 48000.00, 'Treatment for RA and psoriasis.'),
('Stelara', '45mg/0.5ml', 'Rare Autoimmune', 180000.00, 'Treatment for severe immune conditions.'),
('Tamoxifen', '20mg', 'Specialty Oncology', 850.00, 'Breast cancer therapy.'),
('Methotrexate', '2.5mg', 'Rare Specialty', 450.00, 'Autoimmune and cancer therapy.'),
('Revlimid (Lenalidomide)', '10mg', 'Rare Oncology', 250000.00, 'Specialized Myeloma treatment.'),
('Imatinib (Gleevec)', '400mg', 'Rare Oncology', 85000.00, 'Specialized cancer treatment.'),
('Mesna', '400mg', 'Specialty Oncology', 2100.00, 'Protects bladder during chemo.'),
('Dupixent (Dupilumab)', '300mg', 'Rare Specialty', 45000.00, 'Severe eczema treatment.');

-- 9. MISC SPECIALTY
insert into drugs (name, dosage, type, price, description) values
('Epogen (Epoetin alfa)', '4000 units', 'Rare Kidney', 8500.00, 'Blood production for kidney failure.'),
('Aranesp', '40mcg', 'Rare Kidney', 15000.00, 'Long-acting anemia treatment.'),
('Latanoprost Eye Drops', '0.005%', 'Specialty Eye', 850.00, 'Daily glaucoma drops.'),
('Ciprofloxacin Eye Drops', '0.3%', 'Emergency (Eye)', 45.00, 'Antibiotic for eye infections.'),
('Brimonidine Eye Drops', '0.15%', 'Specialty Eye', 1200.00, 'Specialty eye pressure drops.'),
('Morphine Sulphate', '10mg', 'Emergency Pain', 250.00, 'Emergency strong pain killer.'),
('Fentanyl Patch', '25mcg/hr', 'Specialty Pain', 1800.00, 'Specialized chronic pain management.'),
('OxyContin', '20mg', 'Specialty Pain', 2500.00, 'Strong pain relief.'),
('Zofran (Ondansetron) ODT', '4mg', 'GI (Vomiting)', 350.00, 'Advanced vomiting control.'),
('Pantoprazole', '40mg', 'GI (Stomach)', 20.00, 'Daily acidity management.'),
('Mesalamine (Asacol)', '800mg', 'GI (Crohn''s)', 1500.00, 'Inflammatory bowel treatment.'),
('Tamsulosin (Flomax)', '0.4mg', 'Urinary', 320.00, 'Kidney stone and prostate support.'),
('Hydroxyurea', '500mg', 'Rare Blood', 2500.00, 'Specialized Sickle Cell treatment.'),
('Methylprednisolone', '40mg', 'Emergency Steroid', 120.00, 'Acute allergic shock treatment.');


-- ### INVENTORY ASSIGNMENT (MINIMUM 2 PHARMACIES PER DRUG)
-- We will distribute drugs across the 3 main pharmacies so every search results in 2+ matches.

-- Group A: Drugs 1-40 -> Pharmacy 1 & 2
insert into inventory (pharmacy_id, drug_id, stock)
select 1, id, 50 from drugs where id > 5 and id <= 40;
insert into inventory (pharmacy_id, drug_id, stock)
select 2, id, 45 from drugs where id > 5 and id <= 40;

-- Group B: Drugs 41-75 -> Pharmacy 2 & 3
insert into inventory (pharmacy_id, drug_id, stock)
select 2, id, 40 from drugs where id > 40 and id <= 75;
insert into inventory (pharmacy_id, drug_id, stock)
select 3, id, 35 from drugs where id > 40 and id <= 75;

-- Group C: Drugs 76-110 -> Pharmacy 1 & 3
insert into inventory (pharmacy_id, drug_id, stock)
select 1, id, 50 from drugs where id > 75;
insert into inventory (pharmacy_id, drug_id, stock)
select 3, id, 60 from drugs where id > 75;

-- Common items (Diabetes staples and First Aid) in ALL 3
insert into inventory (pharmacy_id, drug_id, stock)
select p.id, d.id, 100 
from pharmacies p, drugs d 
where d.name in ('Metformin', 'Amoxicillin', 'Aspirin (Soluble)', 'Ibuprofen', 'Pantoprazole', 'Humalog', 'Calpol (Paracetamol) Suspension');
