import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Pill, LogOut, User, ArrowLeft } from 'lucide-react';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <nav className="bg-white shadow-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center gap-4">
                        {/* Back Button */}
                        {location.pathname !== '/' && location.pathname !== '/login' && location.pathname !== '/register' && !location.pathname.startsWith('/rate') && (
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
                                title="Go Back"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                        )}
                        <Link to="/" className="flex-shrink-0 flex items-center gap-2">
                            <div className="bg-primary p-1.5 rounded-lg">
                                <Pill className="h-6 w-6 text-white" />
                            </div>
                            <span className="font-bold text-xl text-gray-800">MediFindRx</span>
                        </Link>
                    </div>
                    <div className="flex items-center gap-4">
                        {user ? (
                            <>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <User className="h-5 w-5" />
                                    <span className="hidden sm:block">{user.name} ({user.role})</span>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-red-500 transition-colors"
                                    title="Logout"
                                >
                                    <LogOut className="h-5 w-5" />
                                </button>
                            </>
                        ) : (
                            <Link
                                to="/login"
                                className="bg-primary hover:bg-sky-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                                Login
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
