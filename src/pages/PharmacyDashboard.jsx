import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../supabaseClient';
import { Package, Edit2, Save, X, ClipboardList, CheckCircle, Clock, AlertTriangle, Send, Check } from 'lucide-react';

const PharmacyDashboard = () => {
    const { user } = useAuth();
    const { drugs, inventory, updateStock, getReservationsForPharmacy, refreshReservations, confirmReservation, verifyOtp, pharmacies } = useData();

    const [activeTab, setActiveTab] = useState('inventory');
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [otpInput, setOtpInput] = useState({});



    // Get current pharmacy details
    const myPharmacy = pharmacies ? pharmacies.find(p => p.owner_id === user?.id) : null;

    // Debug State
    const [debugLogs, setDebugLogs] = useState([]);
    const addLog = (msg) => setDebugLogs(prev => [`${new Date().toLocaleTimeString()}: ${msg}`, ...prev].slice(0, 10));

    // Real-time Reservations Listener & Polling Fallback
    useEffect(() => {
        if (!user?.pharmacyId) {
            addLog("Waiting for Pharmacy ID...");
            return;
        }

        addLog(`Subscribing for Pharmacy: ${user.pharmacyId}`);

        // 1. Real-time Subscription
        const reservationChannel = supabase
            .channel('public:reservations')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'reservations', filter: `pharmacy_id=eq.${user.pharmacyId}` },
                (payload) => {
                    console.log("New Reservation!", payload);
                    addLog(`EVENT: New Order #${payload.new.id}`);
                    alert(`🔔 NEW ORDER: #${payload.new.id}\nCustomer: ${payload.new.customer_name}\nStatus: ${payload.new.status}`);

                    if (typeof refreshReservations === 'function') {
                        refreshReservations();
                    } else {
                        addLog("Error: refreshReservations not ready");
                    }

                    setActiveTab('reservations');
                }
            )
            .subscribe((status) => {
                addLog(`Channel Status: ${status}`);
            });

        // 2. Polling Fallback (Every 5 seconds)
        const intervalId = setInterval(() => {
            if (typeof refreshReservations === 'function') {
                refreshReservations();
            } else {
                // addLog("Polling skipped: refreshReservations missing");
            }
        }, 5000);

        return () => {
            supabase.removeChannel(reservationChannel);
            clearInterval(intervalId);
        };
    }, [user?.pharmacyId]);



    // Inventory Helpers
    const handleEdit = (drugId, currentStock) => {
        setEditingId(drugId);
        setEditValue(currentStock);
    };

    const handleSave = (drugId) => {
        updateStock(user.pharmacyId, drugId, editValue);
        setEditingId(null);
    };

    const handleVerifyOtp = async (reservationId) => {
        const otp = otpInput[reservationId];
        alert(`DEBUG: Verifying #${reservationId} with OTP: "${otp}"`);

        if (otp && otp.trim().length > 0) {
            await verifyOtp(reservationId, otp);
            setOtpInput(prev => ({ ...prev, [reservationId]: '' }));
        } else {
            alert("Please enter the OTP code provided by the customer.");
        }
    };

    // --- RENDER GUARDS ---



    if (myPharmacy && myPharmacy.approved === false) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-gray-50">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md border border-yellow-200">
                    <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="h-8 w-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Registration Pending</h1>
                    <p className="text-gray-600 mb-6">
                        Your pharmacy account is currently under review by the Administrator.
                        You will receive access once approved.
                    </p>
                    <div className="text-sm text-gray-400">Owner ID: {user?.id}</div>
                </div>
            </div>
        );
    }

    // --- SELF-HEALING: Auto-create pharmacy record if missing ---
    const [isInitializing, setIsInitializing] = useState(false);

    useEffect(() => {
        const initializePharmacy = async () => {
            if (user && user.role === 'pharmacy' && !user.pharmacyId && !isInitializing) {
                setIsInitializing(true);
                // console.log("Self-Healing: Creating missing pharmacy record...");

                try {
                    const { error } = await supabase.from('pharmacies').insert([{
                        name: user.name || 'My Pharmacy',
                        owner_id: user.id,
                        address: 'Pending Address Update',
                        phone: 'Pending Phone',
                        approved: false // Default to false, let Admin approve
                    }]);

                    if (error) {
                        console.error("Auto-creation failed:", error);
                    } else {
                        // console.log("Auto-creation success! Reloading...");
                        window.location.reload(); // Reload to refresh AuthContext and get the new ID
                    }
                } catch (err) {
                    console.error("Initialization error:", err);
                }
            }
        };

        initializePharmacy();
    }, [user, isInitializing]);

    // Show initializing screen if we are fixing the account
    if (user && !user.pharmacyId && user.role === 'pharmacy') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4"></div>
                <h2 className="text-xl font-semibold text-gray-800">Setting up your Pharmacy...</h2>
                <p className="text-gray-500">Creating your dashboard workspace.</p>
            </div>
        );
    }

    // Fallback error only if something really weird happens (e.g. role is wrong)
    if (!user || (!user.pharmacyId && user.role !== 'pharmacy')) {
        return (
            <div className="max-w-6xl mx-auto px-4 py-8 text-center">
                <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
                <p className="text-gray-600 mt-2">You do not have a pharmacy account linked.</p>
            </div>
        );
    }

    // Prepare Data for Render
    const currentInventory = drugs.map(drug => {
        const stockItem = inventory.find(i => i.pharmacy_id === user.pharmacyId && i.drug_id === drug.id);
        return {
            ...drug,
            stock: stockItem ? stockItem.stock : 0
        };
    });

    const myReservations = getReservationsForPharmacy(user.pharmacyId);

    // --- MAIN RENDER ---
    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Pharmacy Dashboard</h1>
                    <p className="text-gray-500 mt-1">Manage your inventory and reservations</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setActiveTab('inventory')}
                        className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${activeTab === 'inventory' ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Package className="h-5 w-5" />
                        Inventory
                    </button>
                    <button
                        onClick={() => setActiveTab('reservations')}
                        className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${activeTab === 'reservations' ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                        <ClipboardList className="h-5 w-5" />
                        Reservations
                        {myReservations.filter(r => r.status === 'pending').length > 0 && (
                            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                                {myReservations.filter(r => r.status === 'pending').length}
                            </span>
                        )}
                    </button>

                </div>
            </div>

            {activeTab === 'inventory' ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Drug Name</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Type</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Dosage</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Price</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Stock Level</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {currentInventory.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                                        <td className="px-6 py-4 text-gray-600">{item.type}</td>
                                        <td className="px-6 py-4 text-gray-600">{item.dosage}</td>
                                        <td className="px-6 py-4 text-gray-600">₹{item.price.toFixed(2)}</td>
                                        <td className="px-6 py-4">
                                            {editingId === item.id ? (
                                                <input
                                                    type="number"
                                                    className="w-24 px-2 py-1 border rounded-md focus:ring-2 focus:ring-emerald-500 outline-none"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    autoFocus
                                                />
                                            ) : (
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.stock > 10 ? 'bg-green-100 text-green-800' :
                                                    item.stock > 0 ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-red-100 text-red-800'
                                                    }`}>
                                                    {item.stock} units
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {editingId === item.id ? (
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => handleSave(item.id)} className="text-emerald-600 hover:text-emerald-700">
                                                        <Save className="h-5 w-5" />
                                                    </button>
                                                    <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-500">
                                                        <X className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleEdit(item.id, item.stock)}
                                                    className="text-gray-400 hover:text-primary transition-colors"
                                                >
                                                    <Edit2 className="h-5 w-5" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            ) : (
                // RESERVATIONS TAB
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Order ID</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Customer</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Drug</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {myReservations.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                            No reservations found.
                                        </td>
                                    </tr>
                                ) : (
                                    myReservations.map((reservation) => {
                                        const drug = drugs.find(d => d.id === reservation.drug_id);
                                        return (
                                            <tr key={reservation.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 font-mono text-sm text-gray-600">#{reservation.id}</td>
                                                <td className="px-6 py-4 font-medium text-gray-900">{reservation.customer_name}</td>
                                                <td className="px-6 py-4 text-gray-600">
                                                    {drug ? drug.name : 'Unknown Drug'}
                                                    <span className="text-xs text-gray-400 ml-2">x{reservation.quantity || 1}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${reservation.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                        reservation.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                            'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                        {reservation.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                                                        {reservation.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                                                        {reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {reservation.status === 'pending' && (
                                                        <button
                                                            onClick={() => confirmReservation(reservation.id)}
                                                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors"
                                                        >
                                                            Confirm Order
                                                        </button>
                                                    )}

                                                    {reservation.status === 'confirmed' && (
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="text"
                                                                placeholder="Enter OTP"
                                                                className="w-24 px-2 py-1 border rounded-md text-sm outline-none focus:ring-2 focus:ring-green-500"
                                                                value={otpInput[reservation.id] || ''}
                                                                onChange={(e) => setOtpInput(prev => ({ ...prev, [reservation.id]: e.target.value }))}
                                                            />
                                                            <button
                                                                onClick={() => handleVerifyOtp(reservation.id)}
                                                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors"
                                                            >
                                                                Verify
                                                            </button>
                                                        </div>
                                                    )}
                                                    {/* Prescription Link */}
                                                    <a
                                                        href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/prescriptions/reservation_${reservation.id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="block mt-2 text-xs text-blue-500 hover:underline flex items-center gap-1"
                                                    >
                                                        <ClipboardList className="h-3 w-3" /> View Prescription
                                                    </a>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PharmacyDashboard;
