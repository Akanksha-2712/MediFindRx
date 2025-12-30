import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Search, MapPin, Navigation, Camera, Bell, CheckCircle, XCircle, CalendarCheck, Bed, Ambulance } from 'lucide-react';
import HospitalListModal from '../components/HospitalListModal';

const CustomerHome = () => {
    const { getPharmaciesWithDrug, user } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [prescriptionFile, setPrescriptionFile] = useState(null);
    const [prescriptionPreview, setPrescriptionPreview] = useState(null);
    const [showHospitalList, setShowHospitalList] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [quantities, setQuantities] = useState({});

    const fileInputRef = React.useRef(null);
    const navigate = useNavigate();

    const handleQuantityChange = (pharmacyId, value, maxStock) => {
        const qty = Math.max(1, Math.min(parseInt(value) || 1, maxStock));
        setQuantities(prev => ({ ...prev, [pharmacyId]: qty }));
    };

    // Listen for customer-specific notifications
    useEffect(() => {
        if (!user?.id) return;

        const setupSubscriptions = async () => {
            const bedChannel = supabase
                .channel('customer-bed-updates')
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'bed_reservations',
                    filter: `user_id=eq.${user.id}`
                }, async (payload) => {
                    const { data: hospital } = await supabase.from('hospitals').select('name').eq('id', payload.new.hospital_id).single();
                    addNotification(`Bed Request ${payload.new.status.toUpperCase()}`, `Your request at ${hospital?.name || 'Hospital'} has been ${payload.new.status}.`);
                })
                .subscribe();

            const apptChannel = supabase
                .channel('customer-appt-updates')
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'hospital_appointments',
                    filter: `user_id=eq.${user.id}`
                }, async (payload) => {
                    const { data: hospital } = await supabase.from('hospitals').select('name').eq('id', payload.new.hospital_id).single();
                    addNotification(`Appointment ${payload.new.status.toUpperCase()}`, `Your appointment at ${hospital?.name || 'Hospital'} for ${new Date(payload.new.scheduled_time).toLocaleString()} is now ${payload.new.status}.`);
                })
                .subscribe();

            const sosChannel = supabase
                .channel('customer-sos-updates')
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'emergency_requests',
                    filter: `user_id=eq.${user.id}`
                }, async (payload) => {
                    const { data: hospital } = await supabase.from('hospitals').select('name').eq('id', payload.new.hospital_id).single();
                    const msg = payload.new.status === 'dispatched' ? `AMBULANCE DISPATCHED! from ${hospital?.name || 'Hospital'}` : `Emergency request ${payload.new.status}.`;
                    addNotification(`Emergency Update`, msg);
                })
                .subscribe();

            return () => {
                supabase.removeChannel(bedChannel);
                supabase.removeChannel(apptChannel);
                supabase.removeChannel(sosChannel);
            };
        };

        setupSubscriptions();
    }, [user?.id]);

    const addNotification = (title, message) => {
        const newNotif = {
            id: Date.now(),
            title,
            message,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: false
        };
        setNotifications(prev => [newNotif, ...prev]);

        if (Notification.permission === "granted") {
            new Notification(title, { body: message });
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission();
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (!searchTerm.trim()) return;

        // Client-side Search Logic
        let foundPharmacies = getPharmaciesWithDrug(searchTerm);

        // Calculate Distances (Client-Side)
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userLat = position.coords.latitude;
                    const userLng = position.coords.longitude;

                    foundPharmacies = foundPharmacies.map(p => {
                        const dist = calculateDistance(userLat, userLng, p.latitude, p.longitude);
                        return { ...p, distance: dist };
                    }).sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));

                    setResults(foundPharmacies);
                    setHasSearched(true);
                },
                (error) => {
                    console.warn("Location access denied or error:", error);
                    // Fallback: Just show results without distance
                    setResults(foundPharmacies);
                    setHasSearched(true);
                },
                { timeout: 5000 }
            );
        } else {
            setResults(foundPharmacies);
            setHasSearched(true);
        }
    };

    // Restore helper for Client-Side Distance
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        if (!lat1 || !lon1 || !lat2 || !lon2) return null;
        const R = 6371; // Radius of the earth in km
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in km
    };

    const deg2rad = (deg) => {
        return deg * (Math.PI / 180);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPrescriptionFile(file);
            setPrescriptionPreview(URL.createObjectURL(file));
        }
    };

    const handleReserve = async (pharmacyId, drugId) => {
        const quantity = quantities[pharmacyId] || 1;

        // 1. SHOW THE ALERT IMMEDIATELY
        alert(`Starting Reservation... \nPharmacy ID: ${pharmacyId}\nDrug ID: ${drugId}\nQuantity: ${quantity}`);
        console.log(`Starting Reservation flow for P:${pharmacyId} D:${drugId} Qty:${quantity}`);

        try {
            // 2. Prepare Data
            let customerName = 'Guest User';

            if (user) {
                // Priority 1: Check User Metadata
                customerName = user.user_metadata?.full_name || user.user_metadata?.name;

                // Priority 2: Check Profiles Table (Async) - highly recommended if metadata is empty
                if (!customerName) {
                    try {
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('full_name, name')
                            .eq('id', user.id)
                            .single();

                        if (profile) {
                            customerName = profile.full_name || profile.name;
                        }
                    } catch (fetchErr) {
                        console.warn("Could not fetch profile name, falling back.", fetchErr);
                    }
                }

                // Priority 3: Fallback to Email
                if (!customerName && user.email) {
                    customerName = user.email.split('@')[0];
                }

                // Final Fallback if somehow everything is empty but they are logged in
                if (!customerName) customerName = "Valued Customer";
            }

            const userId = user?.id || null;
            const otp = Math.floor(100000 + Math.random() * 900000).toString();

            // 3. Insert into Database
            const { data, error } = await supabase
                .from('reservations')
                .insert([{
                    pharmacy_id: pharmacyId,
                    drug_id: drugId,
                    user_id: userId,
                    customer_name: customerName,
                    otp: otp,
                    status: 'pending',
                    quantity: quantity
                }])
                .select();

            if (error) {
                console.error("Supabase Insert Error:", error);

                // Self-Healing: If Foreign Key violation (stale drug_id), reload
                if (error.code === '23503' || error.message.includes('foreign key')) {
                    alert("The medicine list is outdated. Refreshing data...");
                    window.location.reload();
                    return;
                }

                alert("Database Error: " + error.message);
                return;
            }

            if (!data || data.length === 0) {
                console.error("No data returned from insert");
                alert("Error: Reservation could not be created.");
                return;
            }

            const reservation = data[0];
            console.log("Reservation created:", reservation.id);

            // 4. Handle Prescription Upload (Optional)
            if (prescriptionFile) {
                console.log("Uploading prescription...");
                const fileExt = prescriptionFile.name.split('.').pop();
                const fileName = `reservation_${reservation.id}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('prescriptions')
                    .upload(fileName, prescriptionFile);

                if (uploadError) console.error("Upload Error:", uploadError);
            }

            // 5. REDIRECT
            console.log("Redirecting to OTP page...");
            navigate(`/otp/${reservation.id}`);

        } catch (err) {
            console.error("Critical Exception in handleReserve:", err);
            alert("System Error: " + err.message);
        }
    };

    const handleSOS = async () => {
        if (!confirm("Are you sure you want to call for EMERGENCY help?")) return;

        // Mock location
        const location = { lat: 40.7128, lng: -74.0060 };

        try {
            const { error } = await supabase
                .from('emergency_requests')
                .insert([{
                    customer_name: user?.user_metadata?.name || 'Guest User',
                    latitude: location.lat,
                    longitude: location.lng,
                    status: 'pending'
                }]);

            if (error) throw error;
            alert('SOS ALERT SENT! Help is on the way.');
        } catch (error) {
            console.error('Error sending SOS:', error);
            alert('Failed to send SOS');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative">
            {/* SOS Button */}
            <button
                onClick={handleSOS}
                className="fixed bottom-6 right-24 bg-red-600 hover:bg-red-700 text-white w-16 h-16 rounded-full shadow-lg shadow-red-300 flex items-center justify-center animate-pulse z-50 border-4 border-red-200"
                title="EMERGENCY SOS"
            >
                <div className="font-bold text-xs uppercase tracking-tighter">SOS</div>
            </button>

            {/* Notification Bell */}
            <div className="fixed bottom-6 right-6 z-50">
                <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="bg-white hover:bg-gray-50 text-gray-700 w-14 h-14 rounded-full shadow-xl flex items-center justify-center border-2 border-primary relative group transition-all"
                >
                    <Bell className={`h-7 w-7 ${notifications.some(n => !n.read) ? 'animate-bounce text-primary' : 'text-gray-400'}`} />
                    {notifications.some(n => !n.read) && (
                        <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white font-bold">
                            {notifications.filter(n => !n.read).length}
                        </span>
                    )}
                </button>

                {/* Notifications Panel */}
                {showNotifications && (
                    <div className="absolute bottom-16 right-0 w-80 max-h-[400px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-200 flex flex-col">
                        <div className="p-4 border-b border-gray-50 bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800">Notifications</h3>
                            <button
                                onClick={() => setNotifications(notifications.map(n => ({ ...n, read: true })))}
                                className="text-xs text-primary hover:underline"
                            >
                                Mark all as read
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">No new notifications</p>
                                </div>
                            ) : (
                                notifications.map(notif => (
                                    <div key={notif.id} className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!notif.read ? 'bg-blue-50/30' : ''}`}>
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-bold text-sm text-gray-900">{notif.title}</span>
                                            <span className="text-[10px] text-gray-400 uppercase font-medium">{notif.time}</span>
                                        </div>
                                        <p className="text-xs text-gray-600 leading-relaxed">{notif.message}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="max-w-4xl w-full bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        Find Your <span className="text-primary">Medicine</span> Instantly
                    </h1>
                    <p className="text-center text-gray-700 mb-8 italic">Medicine should not hide and seek</p>
                </div>

                <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto mb-12">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 sm:h-6 sm:w-6" />
                        <input
                            type="text"
                            placeholder="Search for a drug..."
                            className="w-full pl-12 pr-[120px] sm:pr-36 py-3 sm:py-4 rounded-2xl border-2 border-gray-100 shadow-lg focus:border-primary focus:ring-4 focus:ring-sky-100 outline-none transition-all text-base sm:text-lg"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute right-[85px] sm:right-32 top-1/2 transform -translate-y-1/2 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                            title="Upload Prescription"
                        >
                            <Camera className="h-5 w-5" />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileSelect}
                        />

                        <button
                            type="submit"
                            className="absolute right-2 top-2 bottom-2 bg-primary hover:bg-sky-600 text-white px-3 sm:px-6 rounded-xl font-medium transition-colors text-sm sm:text-base whitespace-nowrap"
                        >
                            Search
                        </button>
                    </div>

                    {/* Quick Hospital Actions */}
                    <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto mb-10 mt-12">
                        <button
                            type="button"
                            onClick={() => setShowHospitalList('appointment')}
                            className="bg-sky-50 hover:bg-sky-100 p-4 rounded-xl border border-sky-100 transition-all flex flex-col items-center gap-2 group shadow-sm"
                        >
                            <CalendarCheck className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                            <span className="font-semibold text-gray-700 text-xs text-center">Appointment</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowHospitalList('bed')}
                            className="bg-green-50 hover:bg-green-100 p-4 rounded-xl border border-green-100 transition-all flex flex-col items-center gap-2 group shadow-sm"
                        >
                            <Bed className="h-6 w-6 text-green-600 group-hover:scale-110 transition-transform" />
                            <span className="font-semibold text-gray-700 text-xs text-center">Reserve Bed</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowHospitalList('ambulance')}
                            className="bg-red-50 hover:bg-red-100 p-4 rounded-xl border border-red-100 transition-all flex flex-col items-center gap-2 group shadow-sm"
                        >
                            <Ambulance className="h-6 w-6 text-red-600 animate-pulse" />
                            <span className="font-semibold text-gray-700 text-xs text-center">Request Ambulance</span>
                        </button>
                    </div>

                    {/* Prescription Preview */}
                    {prescriptionPreview && (
                        <div className="mt-4 flex items-center justify-center p-4 bg-blue-50 rounded-xl border border-blue-100 animate-in fade-in zoom-in duration-300">
                            <div className="text-center">
                                <p className="text-sm font-medium text-blue-800 mb-2">Prescription Attached</p>
                                <img src={prescriptionPreview} alt="Prescription" className="h-32 w-auto rounded-lg shadow-sm border border-blue-200 mx-auto" />
                                <button
                                    type="button"
                                    onClick={() => { setPrescriptionFile(null); setPrescriptionPreview(null); }}
                                    className="mt-2 text-xs text-red-500 hover:underline"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    )}
                </form>

                {hasSearched && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">
                            {results.length > 0
                                ? `Found ${results.length} pharmacies with stock`
                                : 'No pharmacies found with stock for this item.'}
                        </h2>

                        <div className="grid gap-6 md:grid-cols-2">
                            {results.map((item, index) => (
                                <div key={index} className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all border border-gray-100 flex flex-col h-full group">
                                    {/* Header: Name & Price */}
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-bold text-lg text-gray-900 leading-tight group-hover:text-primary transition-colors">
                                            {item.name}
                                        </h3>
                                        <div className="text-right shrink-0">
                                            <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider">Price</span>
                                            <span className="font-bold text-xl text-primary">₹{item.drug?.price?.toFixed(2) || 'N/A'}</span>
                                        </div>
                                    </div>

                                    {/* Body: Address & Distance */}
                                    <div className="mb-4 flex-grow">
                                        <div className="flex items-start text-gray-500 text-sm mb-2">
                                            <MapPin className="h-4 w-4 mr-1.5 mt-0.5 text-gray-400 shrink-0" />
                                            <span className="leading-snug text-xs sm:text-sm">{item.address}</span>
                                        </div>

                                        {/* Distance Badge */}
                                        <div className="ml-5">
                                            {item.distance != null && item.distance !== Infinity ? (
                                                <span className="inline-flex items-center bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md text-[11px] font-bold border border-indigo-100">
                                                    <Navigation className="w-3 h-3 mr-1 fill-current" />
                                                    {item.distance.toFixed(1)} km away
                                                </span>
                                            ) : (
                                                <span className="text-[11px] text-gray-400 italic">
                                                    Location unavailable
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Footer: Controls */}
                                    <div className="pt-4 border-t border-gray-50 mt-auto flex flex-wrap items-center justify-between gap-3">
                                        {/* Stock Badge */}
                                        <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-100">
                                            {item.stock} left
                                        </span>

                                        <div className="flex items-center gap-2 ml-auto">
                                            {/* Quantity Input */}
                                            <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-sky-100 transition-all">
                                                <span className="text-[10px] text-gray-500 px-2 font-bold uppercase select-none">Qty</span>
                                                <div className="h-4 w-px bg-gray-200"></div>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max={item.stock}
                                                    value={quantities[item.id] || 1}
                                                    onChange={(e) => handleQuantityChange(item.id, e.target.value, item.stock)}
                                                    className="w-12 bg-transparent text-center font-bold text-sm py-1.5 focus:outline-none text-gray-900"
                                                />
                                            </div>

                                            {/* Action Button */}
                                            <button
                                                type="button"
                                                onClick={() => handleReserve(item.id, item.drug.id)}
                                                className="bg-primary hover:bg-sky-600 active:scale-95 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm shadow-sky-100 transition-all flex items-center gap-1"
                                            >
                                                {prescriptionFile ? (
                                                    <>Reserve <span className="opacity-70 text-xs font-normal">+Doc</span></>
                                                ) : (
                                                    'Reserve'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Hospital Selection Modal */}
            {showHospitalList && (
                <HospitalListModal
                    type={showHospitalList}
                    onClose={() => setShowHospitalList(null)}
                />
            )}
        </div>
    );
};

export default CustomerHome;
