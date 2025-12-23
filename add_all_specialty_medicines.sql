-- consolidated SQL Script to add both standard specialty and rare/high-shortage medicines.

-- 1. Insert Standard Specialty Medicines
insert into drugs (name, dosage, type, price, description) values
('Glimepiride', '2mg', 'Diabetes', 120.00, 'Used to treat Type 2 diabetes by increasing insulin production.'),
('Januvia', '100mg', 'Diabetes', 850.00, 'Helps control blood sugar levels in adults with Type 2 diabetes.'),
('Humalog', '100 units/ml', 'Diabetes (Insulin)', 1200.00, 'Fast-acting insulin to manage blood sugar spikes.'),
('Gliclazide', '80mg', 'Diabetes', 150.00, 'Improves insulin secretion in the pancreas.'),
('Pioglitazone', '15mg', 'Diabetes', 180.00, 'Helps restore proper response to insulin.'),
('Calpol (Paracetamol) Suspension', '120mg/5ml', 'Pediatrics', 45.00, 'Used for fever and pain relief in infants and children.'),
('Augmentin Duo Syrup', '228.5mg', 'Pediatrics (Antibiotic)', 110.00, 'Pediatric antibiotic for ear, sinus, and respiratory infections.'),
('Ondem Syrup', '2mg/5ml', 'Pediatrics', 65.00, 'Used to stop vomiting and nausea in children.'),
('Enterogermina Spores', '2 Billion/5ml', 'Pediatrics (Probiotic)', 55.00, 'Helps restore gut health during diarrhea in kids.'),
('Maxtra Drops', 'Nasat Drop', 'Pediatrics (Cold)', 75.00, 'Relieves nasal congestion and cold symptoms in babies.'),
('Epinephrine (EpiPen)', '0.3mg', 'Emergency (Allergy)', 4500.00, 'Used for emergency treatment of severe allergic reactions (Anaphylaxis).'),
('Nitroglycerin', '0.4mg', 'Emergency (Heart)', 350.00, 'Used to treat sudden chest pain (angina) in heart patients.'),
('Aspirin (Soluble)', '300mg', 'Emergency (Heart Attack)', 10.00, 'Used immediately during a suspected heart attack to thin blood.'),
('Asthalin (Salbutamol) Inhaler', '100mcg', 'Emergency (Asthma)', 180.00, 'Provides quick relief during a sudden asthma attack or breathing difficulty.'),
('Dextrose (Glucagon)', '1mg', 'Emergency (Low Sugar)', 2100.00, 'Used for emergency treatment of severe low blood sugar (Hypoglycemia).');

-- 2. Insert Rare & High-Shortage Medicines
insert into drugs (name, dosage, type, price, description) values
('Ozempic (Semaglutide)', '0.5mg/pen', 'Rare Diabetes', 18500.00, 'HIGHLY RARE: Facing global shortage; used for Type 2 diabetes.'),
('Mounjaro (Tirzepatide)', '5mg/vial', 'Rare Diabetes', 22000.00, 'LATEST GEN: Highly effective for blood sugar control, extremely hard to source.'),
('Baqsimi (Glucagon Nasal)', '3mg', 'Rare Emergency (Low Sugar)', 8500.00, 'RARE: Needle-free treatment for severe hypoglycemia.'),
('Fiasp (Ultra-fast Insulin)', '100 units/ml', 'Rare Diabetes (Insulin)', 2800.00, 'SPECIALIZED: Required for insulin pump users, limited stock.'),
('Synagis (Palivizumab)', '100mg/vial', 'Rare Pediatrics', 145000.00, 'EXTREMELY RARE: Expensive injection for high-risk infants to prevent RSV.'),
('Keppra Oral Solution', '100mg/ml', 'Rare Pediatrics (Seizure)', 1200.00, 'SPECIALIZED: Anti-seizure medication for children with epilepsy.'),
('Vigabatrin (Sabril)', '500mg', 'Rare Pediatrics (Epilepsy)', 9500.00, 'HIGHLY SPECIALIZED: Used for rare infantile spasms in babies.'),
('Creon (Pancreatin)', '25000 units', 'Rare Pediatrics (CF)', 4500.00, 'SUPPLY SHORTAGE: Required for digestive health in children with Cystic Fibrosis.'),
('Narcan (Naloxone) Spray', '4mg', 'Rare Emergency (Overdose)', 3200.00, 'LIFE-SAVING: Instantly reverses opioid overdose; rarely kept in small retail.'),
('CroFab (Antivenom)', '1 vial', 'Rare Emergency (Bite)', 250000.00, 'CRITICAL: Treatment for venomous snake bites; usually only in specialty hubs.'),
('Pralidoxime (2-PAM)', '1g/vial', 'Rare Emergency (Antidote)', 5500.00, 'SPECIALIZED: Antidote for pesticide or nerve agent poisoning.'),
('Adenosine (Adenocor)', '6mg/2ml', 'Rare Emergency (Heart)', 800.00, 'HOSPITAL GRADE: Used to stop life-threateningly fast heart rates.'),
('Dantrolene', '20mg/vial', 'Rare Emergency', 18000.00, 'EXTREMELY RARE: Only treatment for fatal anesthesia reactions.');

-- 3. Assign to Inventory (Scattering them to make search realistic)

-- Pharmacy ID 1: HealthPlus Pharmacy
insert into inventory (pharmacy_id, drug_id, stock)
select 1, id, 20 from drugs where name in (
    'Glimepiride', 'Calpol (Paracetamol) Suspension', 'Epinephrine (EpiPen)', 
    'Asthalin (Salbutamol) Inhaler', 'Ozempic (Semaglutide)', 'Vigabatrin (Sabril)', 'Narcan (Naloxone) Spray'
);

-- Pharmacy ID 2: City Care Chemist
insert into inventory (pharmacy_id, drug_id, stock)
select 2, id, 15 from drugs where name in (
    'Januvia', 'Humalog', 'Augmentin Duo Syrup', 'Nitroglycerin', 
    'Dextrose (Glucagon)', 'Mounjaro (Tirzepatide)', 'Keppra Oral Solution', 'Adenosine (Adenocor)'
);

-- Pharmacy ID 3: MediQuick Rx
insert into inventory (pharmacy_id, drug_id, stock)
select 3, id, 10 from drugs where name in (
    'Gliclazide', 'Ondem Syrup', 'Maxtra Drops', 'Aspirin (Soluble)', 
    'Humalog', 'Baqsimi (Glucagon Nasal)', 'Synagis (Palivizumab)', 'Creon (Pancreatin)', 'CroFab (Antivenom)'
);
