
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, ArrowRight, User, Laptop } from "lucide-react";
import { Card } from "@/components/ui/card";
import axios from "axios";
import { toast } from "sonner";
import useSound from "use-sound";
import { LOGIN_SOUND } from "@/utils/sounds";

// Define API URL (same logic as App.js)
// Define API URL (same logic as App.js)
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const API = BACKEND_URL ? `${BACKEND_URL}/api` : "/api";

const LoginPage = ({ onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        gender: "male" // male, female
    });
    const [avatarIndex, setAvatarIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const [playLogin] = useSound(LOGIN_SOUND);

    // Filter avatars by gender
    const MALE_AVATARS = [
        "/avatars/avatar_1.png",
        "/avatars/avatar_2.png",
        "/avatars/avatar_3.png"
    ];
    const FEMALE_AVATARS = [
        "/avatars/avatar_4.png",
        "/avatars/avatar_5.png"
    ];

    const currentAvatars = formData.gender === "female" ? FEMALE_AVATARS : MALE_AVATARS;

    // Reset avatar index when gender changes
    useEffect(() => {
        setAvatarIndex(0);
    }, [formData.gender]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            let userUser = null;

            if (isLogin) {
                // Login
                const response = await axios.post(`${API}/auth/login`, {
                    email: formData.email,
                    password: formData.password
                });
                userUser = response.data;
            } else {
                // Signup
                const response = await axios.post(`${API}/auth/signup`, {
                    email: formData.email,
                    password: formData.password,
                    name: formData.name,
                    gender: formData.gender,
                    avatar: currentAvatars[avatarIndex]
                });
                userUser = response.data;
                toast.success("Account created successfully!");
            }

            // Play sound
            playLogin();

            // Pass full user object (with ID) to parent
            onLogin(userUser);

        } catch (error) {
            console.error("Auth error:", error);
            toast.error(error.response?.data?.detail || "Authentication failed");
            setIsLoading(false); // Stop loading only on error
        }
    };

    return (
        <div className="min-h-screen flex w-full bg-white text-slate-900 font-sans">
            {/* Loading Overlay with Transition */}
            {isLoading && (
                <div className="fixed inset-0 bg-white z-[100] flex items-center justify-center flex-col animate-in fade-in duration-500">
                    <div className="w-16 h-16 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mb-4"></div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Welcome to FocusFlow</h2>
                    <p className="text-slate-500">Preparing your personal dashboard...</p>
                </div>
            )}

            {/* Left Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12 relative overflow-hidden">

                {/* Decorative Circles */}
                <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-violet-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-amber-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>

                <div className="max-w-md w-full relative z-10">
                    <div className="mb-10 text-center md:text-left">
                        <div className="flex justify-center md:justify-start mb-6">
                            <img src="/images/login-illustration.png" alt="FocusFlow 3D Icon" className="w-48 h-48 object-contain drop-shadow-2xl animate-float-slow" />
                        </div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-medium text-xs mb-6">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            <span>v2.0 Now Available</span>
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-bold font-heading mb-4 text-slate-900 tracking-tight">
                            FocusFlow
                        </h1>
                        <p className="text-lg text-slate-500">
                            Master your workflow with our gamified productivity suite.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {!isLogin ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                                {/* Avatar Preview */}
                                <div className="flex justify-center md:justify-start">
                                    <div className="w-24 h-24 rounded-2xl bg-white border-2 border-slate-100 shadow-xl overflow-hidden p-1 group cursor-pointer" onClick={() => setAvatarIndex((prev) => (prev + 1) % currentAvatars.length)}>
                                        <img src={currentAvatars[avatarIndex]} alt="Avatar" className="w-full h-full object-cover rounded-xl bg-violet-50 group-hover:scale-110 transition-transform" />
                                    </div>
                                </div>

                                {/* Gender Selection */}
                                <div className="flex gap-3">
                                    <div
                                        className={`flex-1 p-3 rounded-xl border-2 cursor-pointer flex flex-col items-center justify-center gap-1 transition-all ${formData.gender === 'male' ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-100 hover:border-slate-200 text-slate-400'}`}
                                        onClick={() => setFormData({ ...formData, gender: 'male' })}
                                    >
                                        <User className="w-6 h-6" />
                                        <span className="text-xs font-semibold">Male</span>
                                    </div>
                                    <div
                                        className={`flex-1 p-3 rounded-xl border-2 cursor-pointer flex flex-col items-center justify-center gap-1 transition-all ${formData.gender === 'female' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-100 hover:border-slate-200 text-slate-400'}`}
                                        onClick={() => setFormData({ ...formData, gender: 'female' })}
                                    >
                                        <User className="w-6 h-6" />
                                        <span className="text-xs font-semibold">Female</span>
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <Input
                                        placeholder="Full Name"
                                        className="h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all text-base"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required={!isLogin}
                                    />
                                </div>
                            </div>
                        ) : null}

                        <div className="space-y-4">
                            <Input
                                type="email"
                                placeholder="Email Address"
                                className="h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all text-base"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                            <Input
                                type="password"
                                placeholder="Password"
                                className="h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all text-base"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full h-12 text-base font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20 hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
                            {isLogin ? "Welcome Back" : "Create Account"}
                            <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>

                        <div className="pt-4 text-center">
                            <p className="text-sm text-slate-500 inline-block">
                                {isLogin ? "Don't have an account? " : "Already have an account? "}
                                <button
                                    type="button"
                                    onClick={() => setIsLogin(!isLogin)}
                                    className="text-violet-600 font-semibold hover:underline ml-1"
                                >
                                    {isLogin ? "Sign up" : "Log in"}
                                </button>
                            </p>
                        </div>
                    </form>
                </div>
            </div>

            {/* Right Side - Visual/Hero */}
            <div className="hidden lg:flex w-1/2 bg-slate-50 items-center justify-center p-12 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center opacity-10 grayscale hover:grayscale-0 transition-all duration-1000"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-transparent"></div>

                <div className="relative z-10 max-w-sm">
                    <div className="bg-white p-6 rounded-3xl shadow-2xl border border-slate-100 transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                <Laptop className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">Deep Work Session</h3>
                                <p className="text-xs text-slate-500">25m focus • 5m break</p>
                            </div>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 w-[65%]"></div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-2xl border border-slate-100 transform rotate-[3deg] hover:rotate-0 transition-transform duration-500 mt-6 ml-12">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600">
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">Level Up!</h3>
                                <p className="text-xs text-slate-500">You reached Level 5</p>
                            </div>
                        </div>
                        <div className="flex gap-1">
                            {"★★★★★".split("").map((star, i) => (
                                <span key={i} className="text-amber-400 text-sm">{star}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
