-- Fix Missing User Profiles
-- Run this if you can login but the app doesn't redirect.

INSERT INTO public.profiles (id, email, name, role)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'name', 'Unknown User'), 
    COALESCE(raw_user_meta_data->>'role', 'customer')
FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.users.id);
