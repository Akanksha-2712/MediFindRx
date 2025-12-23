import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { Hospital, Bed, CalendarCheck, Ambulance, X, AlertTriangle, CheckCircle } from 'lucide-react';

const HospitalDashboard = () => {
    const { user } = useAuth();
    const [hospital, setHospital] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [emergencyRequests, setEmergencyRequests] = useState([]);
    const [bedRequests, setBedRequests] = useState([]);
    const [newAppt, setNewAppt] = useState({ patient: '', time: '' });
    const [loading, setLoading] = useState(true);

    // Fetch Initial Data
    React.useEffect(() => {
        if (user?.role === 'hospital') {
            fetchHospitalData();
        }
    }, [user]);

    const fetchHospitalData = async () => {
        try {
            // Get Hospital Details
            let { data: hospitalData, error: hospitalError } = await supabase
                .from('hospitals')
                .select('*')
                .eq('id', user.id)
                .single();

            // Auto-Heal: If missing, create it
            if (!hospitalData && (!hospitalError || hospitalError.code === 'PGRST116')) {
                console.log("Hospital record missing, attempting auto-creation...");
                const { data: newHospital, error: createError } = await supabase
                    .from('hospitals')
                    .insert([{
                        id: user.id,
                        name: user.name || 'Hospital Name',
                        address: 'Pending Address',
                        phone: 'Pending Phone',
                        approved: false // Default to pending
                    }])
                    .select()
                    .single();

                if (createError) {
                    console.error("Auto-creation failed:", createError);
                    throw createError;
                }
                hospitalData = newHospital;
                // Clear error since we fixed it
                hospitalError = null;
            }

            if (hospitalError && hospitalError.code !== 'PGRST116') throw hospitalError;
            if (hospitalData) setHospital(hospitalData);

            // Get Appointments
            if (hospitalData) {
                const { data: apptData, error: apptError } = await supabase
                    .from('hospital_appointments')
                    .select('*')
                    .eq('hospital_id', hospitalData.id)
                    .order('scheduled_time', { ascending: true });

                if (apptError) throw apptError;
                setAppointments(apptData || []);

                // Get Emergency Requests
                const { data: emData, error: emError } = await supabase
                    .from('emergency_requests')
                    .select('*')
                    .or(`hospital_id.eq.${hospitalData.id},hospital_id.is.null`)
                    .in('status', ['pending', 'dispatched'])
                    .order('created_at', { ascending: false });

                if (!emError) setEmergencyRequests(emData || []);

                // Get Bed Requests
                const { data: bedData, error: bedError } = await supabase
                    .from('bed_reservations')
                    .select('*')
                    .eq('hospital_id', hospitalData.id)
                    .in('status', ['pending', 'accepted'])
                    .order('created_at', { ascending: false });

                if (!bedError) setBedRequests(bedData || []);

                // Set up Real-time listener for ALL Hospital Updates
                const hospitalSubscription = supabase
                    .channel('hospital-updates')
                    .on('postgres_changes', {
                        event: '*', schema: 'public', table: 'bed_reservations',
                        filter: `hospital_id=eq.${hospitalData.id}`
                    }, () => fetchHospitalData())
                    .on('postgres_changes', {
                        event: '*', schema: 'public', table: 'emergency_requests'
                    }, (payload) => {
                        if (!payload.new.hospital_id || payload.new.hospital_id === hospitalData.id) {
                            fetchHospitalData();
                        }
                    })
                    .on('postgres_changes', {
                        event: '*', schema: 'public', table: 'hospital_appointments',
                        filter: `hospital_id=eq.${hospitalData.id}`
                    }, () => fetchHospitalData())
                    .subscribe();

                return () => {
                    supabase.removeChannel(hospitalSubscription);
                };
            }
        } catch (error) {
            console.error('Error loading hospital data:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateOccupancy = async (change) => {
        if (!hospital) return;
        const newOccupancy = hospital.beds_occupied + change;

        // Basic Validation
        if (newOccupancy < 0) return;
        if (newOccupancy > hospital.beds_total) {
            alert('No beds available');
            return;
        }

        try {
            const { error } = await supabase
                .from('hospitals')
                .update({ beds_occupied: newOccupancy })
                .eq('id', hospital.id);

            if (error) throw error;

            // Optimistic Update
            setHospital(prev => ({ ...prev, beds_occupied: newOccupancy }));

        } catch (error) {
            console.error('Error updating occupancy:', error);
            alert('Failed to update bed count');
            fetchHospitalData(); // Revert UI
        }
    };

    const addAppointment = async () => {
        if (!newAppt.patient || !newAppt.time || !hospital) return;

        try {
            const { error } = await supabase
                .from('hospital_appointments')
                .insert([{
                    hospital_id: hospital.id,
                    patient_name: newAppt.patient,
                    scheduled_time: new Date(newAppt.time).toISOString()
                }]);

            if (error) throw error;

            fetchHospitalData(); // Refresh
            setNewAppt({ patient: '', time: '' });
        } catch (error) {
            console.error('Error adding appointment:', error);
            alert('Failed to save appointment');
        }
    };

    const cancelAppointment = async (id) => {
        try {
            const { error } = await supabase
                .from('hospital_appointments')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchHospitalData();
        } catch (error) {
            console.error('Error removing appointment:', error);
        }
    };

    const handleEmergencyAction = async (id, newStatus) => {
        try {
            const { error } = await supabase
                .from('emergency_requests')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;

            // Optimistic Update
            setEmergencyRequests(prev => prev.map(req =>
                req.id === id ? { ...req, status: newStatus } : req
            ).filter(req => newStatus !== 'resolved')); // Remove if resolved

            alert(`Emergency ${newStatus}!`);
        } catch (error) {
            console.error('Error updating emergency:', error);
            alert('Action failed');
        }
    };

    const handleBedRequest = async (id, newStatus) => {
        try {
            // If accepting, increment occupancy
            if (newStatus === 'accepted') {
                if (hospital.beds_occupied >= hospital.beds_total) {
                    alert('No beds available to accept request');
                    return;
                }
                const { error: updateError } = await supabase
                    .from('hospitals')
                    .update({ beds_occupied: hospital.beds_occupied + 1 })
                    .eq('id', hospital.id);
                if (updateError) throw updateError;
                setHospital(prev => ({ ...prev, beds_occupied: prev.beds_occupied + 1 }));
            }

            // If resolving/completing an accepted request, decrement occupancy
            if (newStatus === 'completed' || newStatus === 'rejected') {
                const currentReq = bedRequests.find(r => r.id === id);
                if (currentReq && currentReq.status === 'accepted') {
                    await supabase
                        .from('hospitals')
                        .update({ beds_occupied: Math.max(0, hospital.beds_occupied - 1) })
                        .eq('id', hospital.id);
                    setHospital(prev => ({ ...prev, beds_occupied: Math.max(0, prev.beds_occupied - 1) }));
                }
            }

            const { error } = await supabase
                .from('bed_reservations')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;

            // Refresh bed requests
            setBedRequests(prev => prev.map(req =>
                req.id === id ? { ...req, status: newStatus } : req
            ).filter(req => !['rejected', 'completed'].includes(newStatus)));

            alert(`Bed Request ${newStatus}!`);
        } catch (error) {
            console.error('Error updating bed request:', error);
            alert('Action failed');
        }
    };

    if (!user || user.role !== 'hospital') {
        return (
            <div className="p-8 text-center">
                <h2 className="text-2xl font-bold">Hospital access required</h2>
            </div>
        );
    }

    if (loading) return <div className="p-8 text-center">Loading dashboard...</div>;
    if (!hospital) return (
        <div className="p-8 text-center">
            <h2 className="text-xl font-bold text-red-600">Hospital Account Not Linked</h2>
            <p className="mt-2 text-gray-600">Please contact admin or run the SQL setup script.</p>
        </div>
    );

    const bedsAvailable = hospital.beds_total - hospital.beds_occupied;

    if (hospital && hospital.approved === false) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-gray-50">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md border border-yellow-200">
                    <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="h-8 w-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Registration Pending</h1>
                    <p className="text-gray-600">
                        Your hospital account is awaiting Admin approval. Please check back later.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-8 space-y-12 pb-24">
            <h1 className="text-3xl font-bold flex items-center gap-2">
                <Hospital className="h-8 w-8 text-primary" /> {hospital.name} Dashboard
            </h1>

            {/* Bed Management */}
            <section className="bg-white rounded-xl shadow-sm border p-6 transition-all hover:shadow-md">
                <h2 className="text-xl font-semibold mb-6 flex items-center text-gray-800">
                    <div className="bg-sky-100 p-2 rounded-lg mr-3">
                        <Bed className="h-6 w-6 text-primary" />
                    </div>
                    Bed Management
                </h2>

                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                    {/* Stats Circle */}
                    <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                cx="80" cy="80" r="70"
                                stroke="currentColor" strokeWidth="10"
                                fill="transparent"
                                className="text-gray-100"
                            />
                            <circle
                                cx="80" cy="80" r="70"
                                stroke="currentColor" strokeWidth="10"
                                fill="transparent"
                                strokeDasharray={440}
                                strokeDashoffset={440 - (440 * (hospital.beds_occupied / hospital.beds_total))}
                                className={`transition-all duration-1000 ease-out ${(hospital.beds_occupied / hospital.beds_total) > 0.9 ? 'text-red-500' : 'text-primary'
                                    }`}
                            />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-3xl font-bold text-gray-800">{bedsAvailable}</span>
                            <span className="text-xs text-gray-500 uppercase font-semibold">Free Beds</span>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex-1 w-full space-y-6">
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <span className="block text-2xl font-bold text-gray-800">{hospital.beds_total}</span>
                                <span className="text-xs text-gray-500">Total Capacity</span>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <span className="block text-2xl font-bold text-orange-600">{hospital.beds_occupied}</span>
                                <span className="text-xs text-gray-500">Occupied</span>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => updateOccupancy(-1)}
                                disabled={hospital.beds_occupied <= 0}
                                className="flex-1 py-3 px-4 bg-green-100 text-green-700 rounded-xl font-semibold hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <span className="text-xl font-bold">-</span> Discharge
                            </button>
                            <button
                                onClick={() => updateOccupancy(1)}
                                disabled={bedsAvailable <= 0}
                                className="flex-1 py-3 px-4 bg-primary text-white rounded-xl font-semibold hover:bg-sky-600 transition-colors shadow-lg shadow-sky-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <span className="text-xl font-bold">+</span> Admit
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bed Requests List */}
                <div className="mt-8 pt-8 border-t border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                        <CheckCircle className="h-5 w-5 mr-2 text-green-600" /> Bed Requests
                    </h3>
                    <div className="space-y-4">
                        {bedRequests.length === 0 ? (
                            <p className="text-gray-500 text-sm">No active bed requests.</p>
                        ) : (
                            bedRequests.map(req => (
                                <div key={req.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div>
                                        <p className="font-bold text-gray-900">{req.customer_name}</p>
                                        <p className="text-xs text-gray-500">Requested on {new Date(req.created_at).toLocaleDateString()}</p>
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${req.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {req.status}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        {req.status === 'pending' ? (
                                            <>
                                                <button
                                                    onClick={() => handleBedRequest(req.id, 'accepted')}
                                                    className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 px-4 rounded-lg shadow-sm"
                                                >
                                                    ACCEPT
                                                </button>
                                                <button
                                                    onClick={() => handleBedRequest(req.id, 'rejected')}
                                                    className="bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold py-2 px-4 rounded-lg"
                                                >
                                                    REJECT
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => handleBedRequest(req.id, 'completed')}
                                                className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold py-2 px-4 rounded-lg"
                                            >
                                                DISCHARGE
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>

            {/* Appointments */}
            <section className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-xl font-semibold mb-4">
                    <CalendarCheck className="inline-block mr-2" /> Appointments
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <input
                        type="text"
                        placeholder="Patient name"
                        className="border p-2 rounded focus:ring-2 focus:ring-primary outline-none"
                        value={newAppt.patient}
                        onChange={e => setNewAppt(prev => ({ ...prev, patient: e.target.value }))}
                    />
                    <input
                        type="datetime-local"
                        className="border p-2 rounded focus:ring-2 focus:ring-primary outline-none"
                        value={newAppt.time}
                        onChange={e => setNewAppt(prev => ({ ...prev, time: e.target.value }))}
                    />
                </div>
                <button
                    onClick={addAppointment}
                    className="bg-secondary hover:bg-emerald-600 text-white px-4 py-2 rounded font-medium"
                >
                    Add Appointment
                </button>
                <div className="mt-6 space-y-3">
                    {appointments.length === 0 && <p className="text-gray-500 text-sm">No scheduled appointments.</p>}
                    {appointments.map(appt => (
                        <div key={appt.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <div>
                                <p className="font-semibold text-gray-800">{appt.patient_name}</p>
                                <p className="text-sm text-gray-500">{new Date(appt.scheduled_time).toLocaleString()}</p>
                            </div>
                            <button
                                onClick={() => cancelAppointment(appt.id)}
                                className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-full transition-colors"
                                title="Cancel Appointment"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            {/* Emergency SOS Feed */}
            <section className="bg-white rounded-xl shadow-sm border p-6 border-red-50">
                <h2 className="text-xl font-semibold mb-4 flex items-center text-red-600">
                    <Ambulance className="inline-block mr-2 animate-pulse" /> Emergency SOS Feed
                    {emergencyRequests.length > 0 && (
                        <span className="ml-2 bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">{emergencyRequests.length} Active</span>
                    )}
                </h2>

                {emergencyRequests.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                        <p>No active emergency requests.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {emergencyRequests.map(req => (
                            <div key={req.id} className="border border-red-100 bg-red-50/50 p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4 animate-fade-in">
                                <div>
                                    <h3 className="font-bold text-gray-800 text-lg">{req.customer_name || 'Unknown User'}</h3>
                                    <p className="text-sm text-gray-600">Location: {req.latitude?.toFixed(4)}, {req.longitude?.toFixed(4)}</p>
                                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full uppercase font-bold ${req.status === 'dispatched' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-200 text-red-800'
                                        }`}>
                                        {req.status}
                                    </span>
                                </div>
                                <div className="flex gap-2 w-full md:w-auto">
                                    {req.status === 'pending' && (
                                        <button
                                            onClick={() => handleEmergencyAction(req.id, 'dispatched')}
                                            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-transform active:scale-95"
                                        >
                                            DISPATCH AMBULANCE
                                        </button>
                                    )}
                                    {req.status === 'dispatched' && (
                                        <button
                                            onClick={() => handleEmergencyAction(req.id, 'resolved')}
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-transform active:scale-95"
                                        >
                                            MARK RESOLVED
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default HospitalDashboard;
