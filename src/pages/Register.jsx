import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Building2, ShieldCheck, Hospital, MapPin } from 'lucide-react';

const Register = () => {
    const { register, authError } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'customer' });
    const [localError, setLocalError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const getFriendlyErrorMessage = (errorMsg) => {
        if (!errorMsg) return '';
        const lowerMsg = errorMsg.toLowerCase();

        // HIBP / Leaked Password
        if (lowerMsg.includes('breach') || lowerMsg.includes('exposed') || lowerMsg.includes('pwned') || lowerMsg.includes('leaked')) {
            return "This password was previously exposed in a data breach. Please choose a different password.";
        }

        // Weak Password (generic)
        if (lowerMsg.includes('weak') || lowerMsg.includes('password should be')) {
            return "Password is too weak. It should be at least 12 characters.";
        }

        // Existing role error hint
        if (lowerMsg.includes('database error') || lowerMsg.includes('constraint')) {
            return errorMsg; // The UI handles the specific database hint separately below
        }

        return errorMsg;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');
        const { name, email, password, role } = form;

        try {
            await register(name, email, password, role, {
                latitude: form.latitude,
                longitude: form.longitude
            });
            // redirect based on role
            if (role === 'customer') navigate('/customer');
            else if (role === 'pharmacy') navigate('/pharmacy');
            else if (role === 'hospital') navigate('/hospital');
            else if (role === 'admin') navigate('/admin');
        } catch (err) {
            setLocalError(getFriendlyErrorMessage(err.message || 'Registration failed'));
        }
    };

    return (
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-white/80 backdrop-blur-md rounded-2xl shadow-xl p-8 border border-white/50">
                <h2 className="text-2xl font-bold text-center mb-4">Create Account</h2>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-center">I am a...</label>
                    <div className="grid grid-cols-3 gap-4">
                        <button
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, role: 'customer' }))}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${form.role === 'customer'
                                ? 'border-primary bg-sky-50 text-primary'
                                : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                }`}
                        >
                            <User className="h-6 w-6 mb-1" />
                            <span className="text-xs font-medium">Patient</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, role: 'pharmacy' }))}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${form.role === 'pharmacy'
                                ? 'border-secondary bg-emerald-50 text-secondary'
                                : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                }`}
                        >
                            <Building2 className="h-6 w-6 mb-1" />
                            <span className="text-xs font-medium">Pharmacy</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, role: 'hospital' }))}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${form.role === 'hospital'
                                ? 'border-red-500 bg-red-50 text-red-600'
                                : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                }`}
                        >
                            <Hospital className="h-6 w-6 mb-1" />
                            <span className="text-xs font-medium">Hospital</span>
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="text"
                        name="name"
                        placeholder={form.role === 'pharmacy' ? "Pharmacy Name" : "Full Name"}
                        value={form.name}
                        onChange={handleChange}
                        required
                        className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                    <input
                        type="email"
                        name="email"
                        placeholder="Email"
                        value={form.email}
                        onChange={handleChange}
                        required
                        className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                    <input
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={form.password}
                        onChange={handleChange}
                        required
                        className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />

                    {/* Location Capture for Pharmacy/Hospital */}
                    {(form.role === 'pharmacy' || form.role === 'hospital') && (
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <label className="block text-sm font-medium text-blue-800 mb-2">Location Required for Navigation</label>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (navigator.geolocation) {
                                            navigator.geolocation.getCurrentPosition(
                                                (position) => {
                                                    setForm(prev => ({
                                                        ...prev,
                                                        latitude: position.coords.latitude,
                                                        longitude: position.coords.longitude
                                                    }));
                                                    alert("Location captured! " + position.coords.latitude.toFixed(4));
                                                },
                                                (error) => alert("Error getting location: " + error.message)
                                            );
                                        } else {
                                            alert("Geolocation is not supported by this browser.");
                                        }
                                    }}
                                    className="flex-1 bg-white border border-blue-200 text-blue-600 hover:bg-blue-100 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <MapPin className="h-4 w-4" />
                                    {form.latitude ? 'Location Captured ✓' : 'Get Current Location'}
                                </button>
                            </div>
                            {form.latitude && <p className="text-xs text-green-600 mt-1">Lat: {form.latitude.toFixed(4)}, Lng: {form.longitude.toFixed(4)}</p>}
                        </div>
                    )}

                    {(authError || localError) && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                            <p className="font-bold">Error:</p>
                            <p>{authError || localError}</p>
                            {(authError || localError).includes('Database error') && (
                                <p className="mt-2 text-xs text-gray-600">
                                    <strong>Hint:</strong> If you are the developer, please run the SQL script's new version.
                                </p>
                            )}
                        </div>
                    )}

                    <button type="submit" className="w-full bg-primary hover:bg-sky-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-sky-200 transition-all mt-2">
                        Register as {form.role.charAt(0).toUpperCase() + form.role.slice(1)}
                    </button>
                </form>

                <div className="mt-4 text-center">
                    <p className="text-gray-600">Already have an account? <a href="/login" className="text-primary hover:underline">Login here</a></p>
                </div>
            </div>
        </div>
    );
};

export default Register;
