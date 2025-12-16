import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../supabaseClient';
import { Package, Edit2, Save, X, ClipboardList, CheckCircle, Clock, AlertTriangle, Radio, Send, Check } from 'lucide-react';

const PharmacyDashboard = () => {
    const { user } = useAuth();
    const { drugs, inventory, updateStock, getReservationsForPharmacy, refreshReservations, confirmReservation, verifyOtp, pharmacies } = useData();

    const [activeTab, setActiveTab] = useState('inventory');
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [otpInput, setOtpInput] = useState({});

    // Broadcast Feature State
    const [liveRequests, setLiveRequests] = useState([]);
    const [responsePrice, setResponsePrice] = useState({});

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

    // Broadcast Feature Listener
    useEffect(() => {
        if (!user?.pharmacyId || !myPharmacy?.latitude || !myPharmacy?.longitude) return;

        console.log("Subscribing to medicine requests...");
        const channel = supabase
            .channel('public:medicine_requests')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'medicine_requests' },
                (payload) => {
                    console.log("New Medicine Request!", payload);
                    if (payload.new.status === 'pending') {
                        // Check distance (Haversine Formula)
                        const R = 6371; // Radius of Earth in km
                        const dLat = (payload.new.latitude - myPharmacy.latitude) * Math.PI / 180;
                        const dLon = (payload.new.longitude - myPharmacy.longitude) * Math.PI / 180;
                        const a =
                            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                            Math.cos(myPharmacy.latitude * Math.PI / 180) * Math.cos(payload.new.latitude * Math.PI / 180) *
                            Math.sin(dLon / 2) * Math.sin(dLon / 2);
                        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                        const distance = R * c;

                        console.log(`Request from ${distance.toFixed(2)} km away.`);

                        // "Nearby" definition expanded to 20km to ensure coverage
                        if (distance <= 20) {
                            // Add distance to the request object for display
                            const requestWithDistance = { ...payload.new, distance: distance };
                            setLiveRequests(prev => [requestWithDistance, ...prev]);

                            // Optional: Play sound or notify
                            const audio = new Audio('/notification.mp3');
                            audio.play().catch(e => console.log("Audio play failed", e));
                        } else {
                            console.log("Ignoring request: Too far away.");
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.pharmacyId, myPharmacy]);

    // Handle Broadcast Response
    const handleBroadcastResponse = async (request, status) => {
        if (status === 'available' && !responsePrice[request.id]) {
            alert("Please enter a price.");
            return;
        }

        // Find matches in inventory to link drug_id
        let matchedDrugId = null;
        const myInventory = drugs.map(drug => {
            const stockItem = inventory.find(i => i.pharmacy_id === user.pharmacyId && i.drug_id === drug.id);
            return { ...drug, stock: stockItem ? stockItem.stock : 0 };
        });

        if (status === 'available') {
            const match = myInventory.find(d =>
                d.name.toLowerCase().includes(request.drug_name.toLowerCase()) && d.stock > 0
            );
            if (match) {
                matchedDrugId = match.id;
            } else {
                console.warn("Could not auto-match inventory item for", request.drug_name);
                // Try fuzzy match ignoring stock
                const anyMatch = myInventory.find(d => d.name.toLowerCase().includes(request.drug_name.toLowerCase()));
                if (anyMatch) matchedDrugId = anyMatch.id;
            }
        }

        const { error } = await supabase
            .from('pharmacy_responses')
            .insert([{
                request_id: request.id,
                pharmacy_id: user.pharmacyId,
                pharmacy_name: myPharmacy?.name || 'Pharmacy',
                pharmacy_lat: myPharmacy?.latitude,
                pharmacy_lng: myPharmacy?.longitude,
                drug_id: matchedDrugId,
                status: status,
                price: status === 'available' ? parseFloat(responsePrice[request.id]) : null,
                message: status === 'available' ? 'We have this in stock.' : 'Not available.'
            }]);

        if (!error) {
            setLiveRequests(prev => prev.filter(r => r.id !== request.id));
            alert("Response sent!");
        } else {
            console.error(error);
            alert("Error sending response.");
        }
    };

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

    // Check for Missing Location (Critical for Broadcast)
    if (myPharmacy && (!myPharmacy.latitude || !myPharmacy.longitude)) {
        return (
            <div className="max-w-6xl mx-auto px-4 py-8 text-center">
                <div className="bg-red-50 p-8 rounded-2xl border border-red-200 inline-block">
                    <h1 className="text-2xl font-bold text-red-700 mb-2">Location Required</h1>
                    <p className="text-red-600">Your pharmacy location (Latitude/Longitude) is missing.</p>
                    <p className="text-gray-600 mt-2">The "Broadcast" feature cannot work without your location.</p>

                    <button
                        onClick={() => {
                            if (!navigator.geolocation) return alert("Geolocation not supported");
                            navigator.geolocation.getCurrentPosition(async (pos) => {
                                const { latitude, longitude } = pos.coords;
                                const { error } = await supabase
                                    .from('pharmacies')
                                    .update({ latitude, longitude })
                                    .eq('id', user.pharmacyId);

                                if (error) alert("Error saving location: " + error.message);
                                else window.location.reload();
                            }, (err) => alert("Could not get location: " + err.message));
                        }}
                        className="mt-6 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-red-200 transition-colors"
                    >
                        📍 Auto-Detect & Save Location
                    </button>
                </div>
            </div>
        );
    }

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

    if (!user || !user.pharmacyId) {
        return (
            <div className="max-w-6xl mx-auto px-4 py-8 text-center">
                <h1 className="text-2xl font-bold text-gray-900">Pharmacy Setup Required</h1>
                <p className="text-gray-600 mt-2">Please contact admin to link your account to a pharmacy.</p>
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
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${activeTab === 'requests' ? 'bg-orange-100 text-orange-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Radio className={`h-5 w-5 ${liveRequests.length > 0 ? 'animate-pulse text-orange-600' : ''}`} />
                        Requests
                        {liveRequests.length > 0 && (
                            <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full animate-bounce">
                                {liveRequests.length}
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
            ) : activeTab === 'requests' ? (
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Radio className="h-6 w-6 text-orange-500" /> Live Customer Requests
                    </h2>
                    {liveRequests.length === 0 ? (
                        <div className="bg-white p-12 rounded-xl text-center text-gray-500 border border-gray-200">
                            <p>No active requests right now.</p>
                            <p className="text-sm">They will appear here instantly when customers search nearby.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {liveRequests.map(req => (
                                <div key={req.id} className="bg-white p-6 rounded-xl shadow-md border-l-4 border-orange-500 animate-in slide-in-from-left duration-300">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900">{req.drug_name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs time bg-gray-100 px-2 py-1 rounded flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {new Date(req.created_at).toLocaleTimeString()}
                                                </span>
                                                {req.distance && (
                                                    <span className={`text-xs px-2 py-1 rounded font-bold ${req.distance < 5 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                        {req.distance.toFixed(1)} km away
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-4">Requested by: <span className="font-medium">{req.customer_name}</span></p>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Your Price (₹)</label>
                                            <input
                                                type="number"
                                                placeholder="0.00"
                                                className="w-full border rounded px-3 py-2 text-sm"
                                                value={responsePrice[req.id] || ''}
                                                onChange={(e) => setResponsePrice(prev => ({ ...prev, [req.id]: e.target.value }))}
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleBroadcastResponse(req, 'available')}
                                                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium text-sm transition-colors flex justify-center items-center gap-1"
                                            >
                                                <Check className="h-4 w-4" /> I have it
                                            </button>
                                            <button
                                                onClick={() => handleBroadcastResponse(req, 'not_available')}
                                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 rounded-lg font-medium text-sm transition-colors flex justify-center items-center gap-1"
                                            >
                                                <X className="h-4 w-4" /> Ignore
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
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
