import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { X, Bed, CalendarCheck, MapPin, Ambulance } from 'lucide-react';

const HospitalListModal = ({ type, onClose }) => {
    const [hospitals, setHospitals] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHospitals();
    }, []);

    const fetchHospitals = async () => {
        try {
            const { data, error } = await supabase
                .from('hospitals')
                .select('*')
                .eq('approved', true);

            if (error) throw error;
            setHospitals(data || []);
        } catch (error) {
            console.error('Error fetching hospitals:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (hospital) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert('Please login first');
            return; // Or redirect
        }

        if (type === 'bed') {
            reserveBed(hospital);
        } else if (type === 'appointment') {
            bookAppointment(hospital, user);
        } else if (type === 'ambulance') {
            bookAmbulance(hospital, user);
        }
    };

    const bookAmbulance = async (hospital, user) => {
        const confirm = window.confirm(`Request emergency ambulance from ${hospital.name}?`);
        if (!confirm) return;

        try {
            const { error } = await supabase
                .from('emergency_requests')
                .insert([{
                    user_id: user.id,
                    hospital_id: hospital.id,
                    customer_name: user.user_metadata.name || 'Emergency User',
                    status: 'pending',
                    latitude: 40.7128,
                    longitude: -74.0060
                }]);

            if (error) throw error;
            alert(`Ambulance service requested from ${hospital.name}!`);
            onClose();
        } catch (error) {
            console.error("Ambulance request failed:", error);
            alert("Failed to request ambulance.");
        }
    };

    const reserveBed = async (hospital) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const customerName = user?.user_metadata?.name || 'Guest User';
            const userId = user?.id || null;

            const { error } = await supabase
                .from('bed_reservations')
                .insert([{
                    hospital_id: hospital.id,
                    user_id: userId,
                    customer_name: customerName,
                    status: 'pending'
                }]);

            if (error) throw error;

            alert(`Bed Request sent to ${hospital.name}! They will confirm your booking shortly.`);
            onClose();
        } catch (error) {
            console.error("Bed reservation failed:", error);
            alert("Failed to request bed: " + error.message);
        }
    };

    const bookAppointment = async (hospital, user) => {
        const timePreference = prompt("Enter preferred time (e.g., Today at 5 PM):");
        if (!timePreference) return;

        try {
            const { error } = await supabase
                .from('hospital_appointments')
                .insert([{
                    hospital_id: hospital.id,
                    user_id: user.id,
                    patient_name: user?.user_metadata?.name || 'Customer',
                    scheduled_time: new Date().toISOString(), // In a real app, use a proper date picker
                    status: 'scheduled'
                }]);

            if (error) throw error;
            alert(`Appointment booked at ${hospital.name} for ${timePreference}!`);
            onClose();
        } catch (error) {
            console.error("Booking failed:", error);
            alert("Failed to book appointment: " + error.message);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        {type === 'bed' ? <Bed className="h-6 w-6 text-green-600" /> :
                            type === 'appointment' ? <CalendarCheck className="h-6 w-6 text-sky-600" /> :
                                <Ambulance className="h-6 w-6 text-red-600" />}
                        {type === 'bed' ? 'Reserve a Bed' :
                            type === 'appointment' ? 'Book Appointment' : 'Request Ambulance'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {loading ? (
                        <p className="text-center text-gray-500">Loading hospitals...</p>
                    ) : hospitals.length === 0 ? (
                        <p className="text-center text-gray-500">No active hospitals found.</p>
                    ) : (
                        hospitals.map(hospital => (
                            <div key={hospital.id} className="border border-gray-200 rounded-xl p-4 hover:border-primary hover:shadow-md transition-all group">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-gray-900 group-hover:text-primary transition-colors">{hospital.name}</h3>
                                        <p className="text-sm text-gray-500 flex items-center mt-1">
                                            <MapPin className="h-3 w-3 mr-1" />
                                            {hospital.address || 'Location Info'}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-2">
                                            Phone: {hospital.phone || 'N/A'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        {type === 'bed' && (
                                            <div className="mb-2">
                                                <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${(hospital.beds_total - hospital.beds_occupied) > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {hospital.beds_total - hospital.beds_occupied} Beds Free
                                                </span>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => handleAction(hospital)}
                                            disabled={type === 'bed' && (hospital.beds_total - hospital.beds_occupied) <= 0}
                                            className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${type === 'bed'
                                                ? 'bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-300'
                                                : type === 'appointment'
                                                    ? 'bg-sky-600 hover:bg-sky-700 text-white'
                                                    : 'bg-red-600 hover:bg-red-700 text-white'
                                                }`}
                                        >
                                            {type === 'bed' ? 'Request Bed' :
                                                type === 'appointment' ? 'Book Now' : 'Request Ambulance'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default HospitalListModal;
