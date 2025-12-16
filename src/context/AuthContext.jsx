import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(null);

    useEffect(() => {
        let mounted = true;

        // Safety timeout in case Supabase hangs (e.g. invalid key)
        const timeoutId = setTimeout(() => {
            if (mounted && loading) {
                console.error("Supabase connection timeout");
                setAuthError("Connection timed out. Please check your internet connection.");
                setLoading(false);
            }
        }, 300000); // Increased to 5 minutes for slow connections

        // Check active session
        const getSession = async () => {
            console.log("AuthContext: getSession started");
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                console.log("AuthContext: getSession result", { session, error });
                if (error) throw error;

                if (mounted) {
                    setAuthError(null); // Clear any timeout errors if request succeeded
                    if (session) {
                        console.log("AuthContext: Fetching profile...");
                        await fetchProfile(session.user.id, session.user.email);
                    } else {
                        console.log("AuthContext: No session, stopping loading");
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
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error fetching profile:', error);
            } else {
                let pharmacyId = null;
                if (data.role === 'pharmacy') {
                    const { data: pharmacyData } = await supabase
                        .from('pharmacies')
                        .select('id')
                        .eq('owner_id', userId)
                        .single();
                    if (pharmacyData) pharmacyId = pharmacyData.id;
                }
                setUser({ ...data, email, pharmacyId }); // Combine auth data and profile data
            }
        } catch (err) {
            console.error('Unexpected error:', err);
        } finally {
            setLoading(false);
        }
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
            // Ensure any unexpected errors also surface
            setAuthError(e.message || 'Registration failed');
            throw e;
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, register, loading, authError }}>
            {loading ? (
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            ) : authError && !user ? (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                    <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full border-l-4 border-red-500">
                        <h2 className="text-xl font-bold text-red-600 mb-2">Initialization Error</h2>
                        <p className="text-gray-600">{authError}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-4 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};
