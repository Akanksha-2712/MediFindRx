import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(null);

    useEffect(() => {
        // AUTO-FIX: Check if specific version exists to clear stale cache from previous buggy versions
        const APP_VERSION = 'v1.2_fix_login';
        const storedVersion = localStorage.getItem('app_version');

        if (storedVersion !== APP_VERSION) {
            console.log("New version detected. Clearing potential stale cache...");
            // Preserve specific keys if needed, but for now clear auth to be safe
            localStorage.clear();
            localStorage.setItem('app_version', APP_VERSION);
            // We don't force reload here to avoid infinite loops, but the clear will ensure getSession() starts fresh
        }

        let mounted = true;

        // Safety timeout in case Supabase hangs (e.g. invalid key or cookie block)
        const timeoutId = setTimeout(() => {
            if (mounted && loading) {
                console.error("Supabase connection timeout - possibly blocked by browser extensions or cache.");
                setAuthError("Loading is taking longer than expected. Stale browser data might be causing a hang.");
                setLoading(false);
            }
        }, 60000); // Increased to 60 seconds per user request

        // Check active session
        const getSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;

                if (mounted) {
                    setAuthError(null);
                    if (session) {
                        await fetchProfile(session.user.id, session.user.email);
                    } else {
                        setLoading(false);
                    }
                }
            } catch (err) {
                console.error("Session check failed:", err);
                if (mounted) {
                    setAuthError(err.message);
                    setLoading(false);
                }
            }
        };

        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!mounted) return;
            if (session) {
                await fetchProfile(session.user.id, session.user.email);
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            clearTimeout(timeoutId);
            subscription.unsubscribe();
        };
    }, []);

    const fetchProfile = async (userId, email) => {
        try {
            console.log("Fetching profile for:", userId);
            // Robust fetch: use limit(1) instead of single()
            const { data: profiles, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .limit(1);

            const profile = profiles?.[0];

            if (error) {
                console.error('Error fetching profile:', error);
                setAuthError("Profile fetch error: " + error.message);
            } else if (!profile) {
                console.warn("No profile found for user:", userId);
                setAuthError("Profile missing. Please contact support.");
            } else {
                console.log("Profile found:", profile.role);
                let pharmacyId = null;

                if (profile.role === 'pharmacy') {
                    const { data: pharmacyData } = await supabase
                        .from('pharmacies')
                        .select('id')
                        .eq('owner_id', userId)
                        .limit(1); // Robust fetch

                    if (pharmacyData && pharmacyData.length > 0) {
                        pharmacyId = pharmacyData[0].id;
                    }
                }

                setUser({ ...profile, email, pharmacyId });
            }
        } catch (err) {
            console.error('Unexpected error in fetchProfile:', err);
            setAuthError("Login Error: " + err.message);
        } finally {
            console.log("Finished loading.");
            setLoading(false);
        }
    };

    const handleHardReset = () => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
    };

    const login = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    };

    const register = async (name, email, password, role, additionalData = {}) => {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name,
                        role,
                    },
                },
            });
            if (error) {
                setAuthError(error.message);
                throw error;
            }
            setAuthError(null);
            return data;
        } catch (e) {
            setAuthError(e.message || 'Registration failed');
            throw e;
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    useEffect(() => {
        // AUTO-HEAL: If loading gets stuck > 5s, auto-fix it.
        const timer = setTimeout(() => {
            if (loading) {
                console.warn("Auth taking too long. Attempting auto-recovery.");
                const hasRetried = sessionStorage.getItem('auth_auto_fix');

                if (!hasRetried) {
                    sessionStorage.setItem('auth_auto_fix', 'true');
                    localStorage.clear(); // Wipe potential bad state
                    window.location.reload(); // Hard refresh
                } else {
                    // Already tried fixing, show error
                    setAuthError("Application stuck. Please clear your browser cache manually or try Incognito mode.");
                    setLoading(false);
                }
            }
        }, 5000); // 5 second timeout

        return () => clearTimeout(timer);
    }, [loading]);

    return (
        <AuthContext.Provider value={{ user, login, logout, register, loading, authError }}>
            {loading ? (
                <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                    <p className="text-gray-500 animate-pulse text-sm">Authenticating Securely...</p>
                    <p className="text-xs text-gray-400 mt-2">Checking credentials...</p>

                    {/* Always allow manual escape if it feels stuck */}
                    <button
                        onClick={handleHardReset}
                        className="mt-12 text-xs text-red-500 hover:text-red-700 underline font-semibold transition-opacity opacity-80 hover:opacity-100"
                    >
                        Trouble loading? Click here to Reset
                    </button>
                </div>
            ) : authError && !user ? (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border-t-8 border-red-500 text-center">
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Sync Issue Detected</h2>
                        <p className="text-gray-600 text-sm mb-6">
                            Chrome's cache sometimes blocks the login system. Click the button below to clear the stash and fix the connection.
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={handleHardReset}
                                className="w-full bg-primary hover:bg-sky-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-sky-100 transition-all flex items-center justify-center gap-2"
                            >
                                ⚡ Reset & Fix App
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full bg-gray-50 hover:bg-gray-100 text-gray-600 font-medium py-3 px-4 rounded-xl transition-all"
                            >
                                Simple Reload
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};
