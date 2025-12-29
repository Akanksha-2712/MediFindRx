-- Force Approve All Pharmacies
-- Run this in Supabase SQL Editor to ensure all pharmacies are approved.

UPDATE public.pharmacies
SET approved = true
WHERE approved = false;
