import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Search, MapPin, Navigation, Camera, Radio, Bell, CheckCircle, XCircle, CalendarCheck, Bed, Ambulance } from 'lucide-react';
import HospitalListModal from '../components/HospitalListModal';


const CustomerHome = () => {
    const { getPharmaciesWithDrug, addReservation } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [prescriptionFile, setPrescriptionFile] = useState(null);
    const [prescriptionPreview, setPrescriptionPreview] = useState(null);
    const [showHospitalList, setShowHospitalList] = useState(null); // 'appointment' | 'bed' | null
    const fileInputRef = React.useRef(null);
    const navigate = useNavigate();

    const handleSearch = (e) => {
        e.preventDefault();
        if (!searchTerm.trim()) return;
        const found = getPharmaciesWithDrug(searchTerm);
        setResults(found);
        setHasSearched(true);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPrescriptionFile(file);
            setPrescriptionPreview(URL.createObjectURL(file));
        }
    };

    const handleReserve = async (pharmacyId, drugId) => {
        // Debugging Alert: Verify ID reception
        alert(`Starting Reservation... \nPharmacy ID: ${pharmacyId}\nDrug ID: ${drugId}`);
        console.log(`Attempting DIRECT reserve: P=${pharmacyId} D=${drugId}`);

        try {
            // Get User directly
            const { data: { user } } = await supabase.auth.getUser();
            const customerName = user?.user_metadata?.name || 'Guest';
            const userId = user?.id || null;

            const otp = Math.floor(100000 + Math.random() * 900000).toString();

            const payload = {
                pharmacy_id: pharmacyId,
                drug_id: drugId,
                user_id: userId,
                customer_name: customerName,
                otp: otp,
                status: 'pending'
                // quantity: 1 // REMOVED: Causes error if column is missing
            };

            const { data, error } = await supabase
                .from('reservations')
                .insert([payload])
                .select()
                .single();

            if (error) {
                console.error("DB Error:", error);
                alert("Reservation Error: " + error.message);
                return;
            }

            if (!data) {
                alert("Error: Insert succeeded but returned no data.");
                return;
            }

            // Upload prescription if selected
            if (prescriptionFile) {
                const fileExt = prescriptionFile.name.split('.').pop();
                const fileName = `reservation_${data.id}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('prescriptions')
                    .upload(fileName, prescriptionFile);

                if (uploadError) {
                    console.error("Upload Failed:", uploadError);
                    // Don't alert blocking error, just log
                }
            }

            navigate(`/otp/${data.id}`);

        } catch (err) {
            console.error("Reserve Exception:", err);
            alert("System Error: " + err.message);
        }
    };

    const [isBroadcastMode, setIsBroadcastMode] = useState(false);
    const [broadcastRequest, setBroadcastRequest] = useState(null);
    const [broadcastResponses, setBroadcastResponses] = useState([]);

    const handleBroadcastSearch = async (e) => {
        e.preventDefault();
        if (!searchTerm.trim()) return;

        // Get Location
        if (!navigator.geolocation) {
            alert("Geolocation is required for broadcast search.");
            return;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                alert("Please login to use Broadcast Search");
                navigate('/login');
                return;
            }

            // 1. Create Request
            const { data: request, error } = await supabase
                .from('medicine_requests')
                .insert([{
                    user_id: user.id,
                    customer_name: user.user_metadata.name || 'Customer',
                    drug_name: searchTerm,
                    latitude,
                    longitude,
                    status: 'pending'
                }])
                .select()
                .single();

            if (error) {
                console.error("Broadcast failed:", error);
                alert("Failed to broadcast request.");
                return;
            }

            setBroadcastRequest(request);
            setBroadcastResponses([]); // Clear old

            // 2. Subscribe to Responses
            const channel = supabase
                .channel(`request-${request.id}`)
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'pharmacy_responses', filter: `request_id=eq.${request.id}` },
                    (payload) => {
                        console.log("New Response!", payload);
                        setBroadcastResponses(prev => [...prev, payload.new]);
                    }
                )
                .subscribe();

            // Cleanup subscription on unmount or new search (simplified for now)
        }, (err) => {
            alert("Error getting location: " + err.message);
        });
    };

    const handleSOS = async () => {
        if (!confirm("Are you sure you want to call for EMERGENCY help?")) return;

        // Mock location
        const location = { lat: 40.7128, lng: -74.0060 };

        try {
            const { error } = await supabase
                .from('emergency_requests')
                .insert([{
                    customer_name: 'Guest User', // or from user context
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
                className="fixed bottom-6 right-6 bg-red-600 hover:bg-red-700 text-white w-16 h-16 rounded-full shadow-lg shadow-red-300 flex items-center justify-center animate-pulse z-50 border-4 border-red-200"
                title="EMERGENCY SOS"
            >
                <div className="font-bold text-xs">SOS</div>
            </button>

            <div className="max-w-4xl w-full bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8">
                {/* ... existing content ... */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        Find Your <span className="text-primary">Medicine</span> Instantly
                    </h1>
                    <p className="text-center text-gray-700 mb-8 italic">Medicine should not hide and seek</p>


                </div>

                <form onSubmit={isBroadcastMode ? handleBroadcastSearch : handleSearch} className="relative max-w-2xl mx-auto mb-12">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-6 w-6" />
                        <input
                            type="text"
                            placeholder="Search for a drug (e.g., Amoxicillin)..."
                            className="w-full pl-12 pr-12 py-4 rounded-2xl border-2 border-gray-100 shadow-lg focus:border-primary focus:ring-4 focus:ring-sky-100 outline-none transition-all text-lg"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {/* Camera Button */}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute right-32 top-1/2 transform -translate-y-1/2 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                            title="Upload Prescription"
                        >
                            <Camera className="h-6 w-6" />
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
                            className="absolute right-2 top-2 bottom-2 bg-primary hover:bg-sky-600 text-white px-6 rounded-xl font-medium transition-colors"
                        >
                            {isBroadcastMode ? 'Broadcast' : 'Search'}
                        </button>
                    </div>

                    {/* Mode Toggle */}
                    <div className="flex justify-center gap-4 mb-8">
                        <button
                            type="button"
                            onClick={() => { setIsBroadcastMode(false); setHasSearched(false); }}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${!isBroadcastMode ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            Standard Search
                        </button>
                        <button
                            type="button"
                            onClick={() => { setIsBroadcastMode(true); setHasSearched(false); }}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${isBroadcastMode ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            <Radio className="h-4 w-4" /> Broadcast to Nearby
                        </button>
                    </div>

                    {/* Quick Hospital Actions (Compact) */}
                    <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto mb-8">
                        <button
                            type="button"
                            onClick={() => setShowHospitalList('appointment')}
                            className="bg-sky-50 hover:bg-sky-100 p-3 rounded-lg border border-sky-100 transition-all flex flex-col items-center gap-1 group"
                        >
                            <CalendarCheck className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                            <span className="font-semibold text-gray-700 text-xs">Appointment</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowHospitalList('bed')}
                            className="bg-green-50 hover:bg-green-100 p-3 rounded-lg border border-green-100 transition-all flex flex-col items-center gap-1 group"
                        >
                            <Bed className="h-5 w-5 text-green-600 group-hover:scale-110 transition-transform" />
                            <span className="font-semibold text-gray-700 text-xs">Reserve Bed</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleSOS}
                            className="bg-red-50 hover:bg-red-100 p-3 rounded-lg border border-red-100 transition-all flex flex-col items-center gap-1 group"
                        >
                            <Ambulance className="h-5 w-5 text-red-600 animate-pulse" />
                            <span className="font-semibold text-gray-700 text-xs">SOS</span>
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

                {/* Broadcast Results UI */}
                {isBroadcastMode && broadcastRequest && (
                    <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="text-center mb-8">
                            <div className="inline-block p-4 bg-orange-50 rounded-full mb-3 animate-pulse">
                                <Radio className="h-8 w-8 text-orange-500" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">Broadcasting Request...</h2>
                            <p className="text-gray-500">Asking nearby pharmacies for "{broadcastRequest.drug_name}"</p>
                        </div>

                        <div className="space-y-4">
                            {broadcastResponses.length === 0 ? (
                                <p className="text-center text-gray-400 italic">Waiting for responses...</p>
                            ) : (
                                broadcastResponses.map((resp) => (
                                    <div key={resp.id} className="bg-white border-l-4 border-green-500 rounded-lg p-4 shadow-sm flex justify-between items-center">
                                        <div>
                                            <h3 className="font-bold text-gray-900">{resp.pharmacy_name}</h3>
                                            <p className="text-sm text-gray-600">{resp.message || 'Product is available.'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-green-600">₹{resp.price}</p>
                                            <div className="flex gap-2 justify-end mt-1">
                                                <button
                                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-1 rounded-md text-sm transition-colors w-full"
                                                    onClick={() => {
                                                        if (resp.drug_id) {
                                                            handleReserve(resp.pharmacy_id, resp.drug_id);
                                                        } else {
                                                            alert(`Please visit ${resp.pharmacy_name} directly to purchase (Item ID not linked).`);
                                                        }
                                                    }}
                                                >
                                                    Reserve Medicine
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {!isBroadcastMode && hasSearched && (
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
                                                <MapPin className="h-4 w-4 mr-1" />
                                                {item.address}
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
                                            onClick={(e) => {
                                                e.stopPropagation(); // Stop bubbling just in case
                                                console.log("Button Clicked:", item.id, item.drug.id);
                                                handleReserve(item.id, item.drug.id);
                                            }}
                                            className="w-full mt-2 flex items-center justify-center gap-2 bg-primary hover:bg-sky-600 text-white py-2 rounded-lg font-medium transition-colors relative z-10"
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
