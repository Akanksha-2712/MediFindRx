import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { ShieldCheck, MapPin, Navigation, Lock, AlertTriangle } from 'lucide-react';
import { supabase } from '../supabaseClient';

const OtpPage = () => {
    const { reservationId } = useParams();
    const navigate = useNavigate();
    // We still access context for generic helpers, but we'll fetch this specific item directly
    const [reservation, setReservation] = useState(null);
    const [pharmacy, setPharmacy] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showOtpSection, setShowOtpSection] = useState(false);

    // Manual refresh function - just reload the page
    const refreshStatus = () => {
        window.location.reload();
    };

    // Fetch Data Directly
    useEffect(() => {
        const fetchReservationDetails = async () => {
            if (!reservationId) return;
            setLoading(true);
            try {
                // 1. Get Reservation
                const { data: resData, error: resError } = await supabase
                    .from('reservations')
                    .select('*')
                    .eq('id', reservationId)
                    .single();

                if (resError) throw resError;
                setReservation(resData);

                // Auto-redirect if already completed
                if (resData && resData.status === 'completed') {
                    navigate(`/rate/${resData.pharmacy_id}`);
                    return;
                }

                // 2. Get Pharmacy if reservation found
                if (resData && resData.pharmacy_id) {
                    const { data: pharmData, error: pharmError } = await supabase
                        .from('pharmacies')
                        .select('*')
                        .eq('id', resData.pharmacy_id)
                        .single();

                    if (pharmError) console.error("Pharmacy Fetch Error", pharmError);
                    else setPharmacy(pharmData);
                }

            } catch (err) {
                console.error("Error fetching reservation:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchReservationDetails();

        // Polling fallback: Check for status updates every 5 seconds
        const pollInterval = setInterval(async () => {
            try {
                const { data } = await supabase
                    .from('reservations')
                    .select('status, pharmacy_id')
                    .eq('id', reservationId)
                    .single();

                if (data && reservation && data.status !== reservation.status) {
                    console.log("Status changed via polling:", data.status);
                    setReservation(prev => ({ ...prev, status: data.status }));

                    // Auto-redirect to rating page when completed
                    if (data.status === 'completed') {
                        alert("✅ Order picked up! Redirecting to rate your experience...");
                        navigate(`/rate/${data.pharmacy_id}`);
                    }
                }
            } catch (err) {
                // Silently fail polling
            }
        }, 5000);

        // Real-time Listener (backup, may not work due to connection issues)
        const channel = supabase
            .channel(`reservation-${reservationId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'reservations', filter: `id=eq.${reservationId}` },
                (payload) => {
                    console.log("Status Updated via Realtime:", payload.new);
                    setReservation(payload.new);

                    // Auto-redirect to rating page when completed
                    if (payload.new.status === 'completed') {
                        alert("✅ Order picked up! Redirecting to rate your experience...");
                        navigate(`/rate/${payload.new.pharmacy_id}`);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            clearInterval(pollInterval);
        };
    }, [reservationId, navigate]);


    const handleNavigate = () => {
        if (pharmacy) {
            // Use full address + name for better accuracy
            const query = `${pharmacy.name}, ${pharmacy.address}`;
            const encodedQuery = encodeURIComponent(query);
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodedQuery}`, '_blank');
        } else {
            alert("Pharmacy location not available.");
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-gray-500">Loading order details...</p>
            </div>
        );
    }

    if (!reservation) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="bg-white p-8 rounded-xl shadow-lg border-l-4 border-red-500">
                    <h3 className="text-lg font-bold text-red-600 mb-2">Reservation Not Found</h3>
                    <p className="text-gray-600">We couldn't find order #{reservationId}.</p>
                    <button onClick={() => navigate('/')} className="mt-4 text-primary hover:underline">Return Home</button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div className="max-w-md w-full bg-white/80 backdrop-blur-md rounded-2xl shadow-xl p-8 border border-white/50">

                {reservation.status === 'pending' ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary mx-auto mb-6"></div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Medication Requested</h2>
                        <p className="text-gray-600 mb-4">Waiting for pharmacy to confirm availability for your order...</p>
                        <div className="bg-yellow-50 text-yellow-800 px-4 py-2 rounded-lg text-sm inline-block font-medium border border-yellow-200">
                            Status: Reviewing your request
                        </div>
                        <button
                            onClick={refreshStatus}
                            className="block mx-auto mt-4 text-sm text-primary hover:underline"
                        >
                            🔄 Check Status
                        </button>
                    </div>
                ) : reservation.status === 'confirmed' ? (
                    <div className="text-center space-y-6">
                        <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto ring-4 ring-green-50">
                            <Lock className="h-8 w-8 text-green-600" />
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Reservation Confirmed!</h2>
                            <p className="text-gray-600 mt-2">Your medicine is ready at:</p>
                            {pharmacy ? (
                                <>
                                    <p className="font-semibold text-lg text-primary mt-1">{pharmacy.name}</p>
                                    <div className="flex items-center justify-center text-gray-500 text-sm mt-1">
                                        <MapPin className="h-4 w-4 mr-1" />
                                        {pharmacy.address}
                                    </div>
                                </>
                            ) : (
                                <p className="text-red-500">Pharmacy details unavailable</p>
                            )}
                        </div>

                        <div className="space-y-4 pt-4 border-t border-gray-100">
                            {/* Navigation Section */}
                            <div className="p-4 bg-sky-50 rounded-xl border border-sky-100">
                                <p className="text-sky-900 font-medium mb-3 text-sm">Head to the pharmacy</p>
                                <button
                                    onClick={handleNavigate}
                                    className="w-full bg-white border-2 border-sky-500 text-sky-600 hover:bg-sky-500 hover:text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                                >
                                    <Navigation className="h-5 w-5" />
                                    Get Directions
                                </button>
                            </div>

                            {/* OTP Section */}
                            {!showOtpSection ? (
                                <button
                                    onClick={() => setShowOtpSection(true)}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-200 transition-colors"
                                >
                                    View Pickup OTP
                                </button>
                            ) : (
                                <div className="bg-gray-100 p-6 rounded-xl text-center border-2 border-dashed border-gray-300 animate-in fade-in slide-in-from-top-2">
                                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-2 font-bold">Show to Pharmacist</p>
                                    <div className="text-5xl font-mono font-bold text-gray-800 tracking-widest bg-white p-4 rounded-lg shadow-sm mb-2 select-all">
                                        {reservation.otp || "ERROR"}
                                    </div>

                                    {/* Fallback if OTP is missing for some reason */}
                                    {!reservation.otp && (
                                        <p className="text-red-500 text-xs">Error: OTP code missing. Please contact support.</p>
                                    )}

                                    <div className="flex items-center justify-center gap-2 text-gray-500 text-xs mt-4 animate-pulse">
                                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                        <p>Waiting for verification scan...</p>
                                    </div>
                                    <button
                                        onClick={() => setShowOtpSection(false)}
                                        className="text-xs text-gray-400 mt-4 hover:underline"
                                    >
                                        Hide Code
                                    </button>
                                </div>
                            )}

                            {/* Manual refresh button */}
                            <button
                                onClick={refreshStatus}
                                className="w-full mt-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 rounded-xl text-sm transition-colors"
                            >
                                🔄 Check if Verified
                            </button>

                            {/* Direct link to rating page for when auto-redirect doesn't work */}
                            <p className="text-center text-xs text-gray-400 mt-4">
                                Already verified? {' '}
                                <button
                                    onClick={() => navigate(`/rate/${reservation.pharmacy_id}`, { state: { reservationId: reservation.id } })}
                                    className="text-primary hover:underline font-medium"
                                >
                                    Go to Rating Page →
                                </button>
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center animate-in fade-in zoom-in duration-300">
                        <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ShieldCheck className="h-10 w-10 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Picked Up!</h2>
                        <p className="text-gray-600 mb-6">Thank you for using MediFindRx.</p>
                        <button
                            onClick={() => navigate(`/rate/${reservation.pharmacy_id}`, { state: { reservationId: reservation.id } })}
                            className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-primary text-white font-bold py-4 rounded-xl shadow-xl shadow-blue-200 transition-all transform hover:scale-[1.02]"
                        >
                            Rate Your Experience
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OtpPage;
