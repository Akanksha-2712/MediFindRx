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
    const [showHospitalList, setShowHospitalList] = useState(null); // 'appointment' | 'bed' | null
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const fileInputRef = React.useRef(null);
    const navigate = useNavigate();

    // Listen for customer-specific notifications
    useEffect(() => {
        if (!user?.id) return;

        const setupSubscriptions = async () => {
            // 1. Bed Reservations
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

            // 2. Appointments
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

            // 3. Ambulance / SOS
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

        // Browsre notification as well
        if (Notification.permission === "granted") {
            new Notification(title, { body: message });
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission();
        }
    };

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchTerm.trim()) return;

        const allPharmacies = getPharmaciesWithDrug(searchTerm);

        const performSearch = (userLat = null, userLng = null) => {
            let sortedResults = [...allPharmacies];

            if (userLat && userLng) {
                sortedResults = sortedResults.map(p => ({
                    ...p,
                    distance: calculateDistance(userLat, userLng, p.latitude, p.longitude)
                })).sort((a, b) => a.distance - b.distance);
            } else {
                // Fallback to price sort if no location
                sortedResults = sortedResults.sort((a, b) => a.drug.price - b.drug.price);
            }

            setResults(sortedResults.slice(0, 2));
            setHasSearched(true);
        };

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    performSearch(position.coords.latitude, position.coords.longitude);
                },
                (error) => {
                    console.warn("Location access denied, falling back to price sort.");
                    performSearch();
                },
                { timeout: 5000 }
            );
        } else {
            performSearch();
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPrescriptionFile(file);
            setPrescriptionPreview(URL.createObjectURL(file));
        }
    };

    const handleReserve = async (pharmacyId, drugId) => {
        // 1. SHOW THE ALERT IMMEDIATELY
        alert(`Starting Reservation... \nPharmacy ID: ${pharmacyId}\nDrug ID: ${drugId}`);
        console.log(`Starting Reservation flow for P:${pharmacyId} D:${drugId}`);

        try {
            // 2. Prepare Data
            const customerName = user?.user_metadata?.name || 'Guest User';
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
                    quantity: 1
                }])
                .select(); // Use select() without single() to be safer

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
                                <div key={index} className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow border border-gray-100">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900">{item.name}</h3>
                                            <div className="flex items-center text-gray-500 text-sm mt-1">
                                                <MapPin className="h-4 w-4 mr-1 text-primary" />
                                                {item.address} {item.distance !== undefined && item.distance !== Infinity && (
                                                    <span className="ml-2 text-primary font-bold">({item.distance.toFixed(1)} km away)</span>
                                                )}
                                            </div>
                                        </div>
                                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                                            In Stock: {item.stock}
                                        </span>
                                    </div>

                                    <div className="border-t border-gray-100 pt-4 mt-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-gray-600">Price</span>
                                            <span className="font-bold text-lg text-primary">₹{item.drug.price.toFixed(2)}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleReserve(item.id, item.drug.id)}
                                            className="w-full mt-2 bg-primary hover:bg-sky-600 text-white py-2 rounded-lg font-medium transition-colors"
                                        >
                                            {prescriptionFile ? 'Reserve with Prescription' : 'Reserve Medicine'}
                                        </button>
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
