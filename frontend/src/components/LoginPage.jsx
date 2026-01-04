import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, ArrowRight, UserCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";

const LoginPage = ({ onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        gender: "male" // male, female
    });
    const [avatarUrl, setAvatarUrl] = useState("");

    // Generate avatar based on name and gender
    useEffect(() => {
        const seed = formData.name || "user";
        // Using Dicebear's new "Notionists" or "Avataaars" style for a fun look, 
        // or "Ready Player Me" if we want true 3D (requires iframe). 
        // Let's stick to a high-quality 2D/3D illustrative style for now that matches the "3D character" request nicely without heaviness.
        // "Micah" is a nice clean style, or "3d" style from other providers. 
        // Let's use Dicebear 'avataaars' or 'notionists' which look premium.
        // User asked for "3d character image". 
        // Let's try to construct a URL that looks like a 3D avatar.

        // Using a reliable placeholder service for 3D-ish avatars if possible, or stick to consistent colorful avatars.
        // Let's use `multiavatar` or stick to `dicebear` with a specific style. 
        // Actually, `https://api.dicebear.com/7.x/adventurer/svg` is cute.
        // For "3D", let's use a specialized 3D avatar generator public URL if reliable, or just use a very high quality set.
        // Let's us `https://api.dicebear.com/9.x/notionists/svg` for professional look or `fun-emoji`.

        // User specifically asked for "3d character image".
        // Let's use `https://api.dicebear.com/9.x/avataaars/svg` it renders nicely.
        // Or we can simple use 3D rendered generic images based on gender if the name generation is complex.

        // Let 's simulate dynamic generation:
        const genderParam = formData.gender === "female" ? "longHair" : "shortHair";
        // Simplified logic for demo
        setAvatarUrl(`https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9&clothing=${formData.gender === 'female' ? 'collarAndSweater' : 'shirtScoopNeck'}`);

    }, [formData.name, formData.gender]);

    const handleSubmit = (e) => {
        e.preventDefault();
        // Simulate login
        onLogin({
            name: formData.name || "User",
            email: formData.email,
            avatar: avatarUrl,
            gender: formData.gender
        });
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
            {/* Animated Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 -left-4 w-72 h-72 bg-violet-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                <div className="absolute top-0 -right-4 w-72 h-72 bg-amber-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-rose-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
            </div>

            <div className="relative z-10 w-full max-w-md p-6">
                <div className="text-center mb-8 animate-fade-in">
                    <div className="inline-flex items-center justify-center p-3 mb-4 rounded-xl bg-white/50 backdrop-blur-sm shadow-xl">
                        <Sparkles className="w-8 h-8 text-amber-500" />
                    </div>
                    <h1 className="text-3xl font-bold font-heading bg-gradient-to-r from-violet-600 to-amber-600 bg-clip-text text-transparent">
                        FocusFlow
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Master your time, gamify your life.
                    </p>
                </div>

                <Card className="glass border-white/20 shadow-2xl overflow-hidden animate-fade-in animation-delay-500 p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {!isLogin && (
                            <div className="space-y-4">
                                <div className="flex justify-center mb-6">
                                    <div className="relative group cursor-pointer transition-transform hover:scale-105">
                                        <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden bg-violet-100">
                                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="absolute bottom-0 right-0 bg-violet-600 text-white p-1 rounded-full shadow-md">
                                            <UserCircle2 className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div
                                        className={`p-3 rounded-xl border-2 cursor-pointer flex flex-col items-center gap-2 transition-all ${formData.gender === 'male' ? 'border-violet-500 bg-violet-50' : 'border-transparent hover:bg-slate-50'}`}
                                        onClick={() => setFormData({ ...formData, gender: 'male' })}
                                    >
                                        <span className="text-2xl">👨‍💻</span>
                                        <span className="text-sm font-medium">Male</span>
                                    </div>
                                    <div
                                        className={`p-3 rounded-xl border-2 cursor-pointer flex flex-col items-center gap-2 transition-all ${formData.gender === 'female' ? 'border-rose-500 bg-rose-50' : 'border-transparent hover:bg-slate-50'}`}
                                        onClick={() => setFormData({ ...formData, gender: 'female' })}
                                    >
                                        <span className="text-2xl">👩‍💻</span>
                                        <span className="text-sm font-medium">Female</span>
                                    </div>
                                </div>

                                <div>
                                    <Input
                                        placeholder="Your Name"
                                        className="input-minimal"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <Input
                                type="email"
                                placeholder="Email Address"
                                className="input-minimal"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                            <Input
                                type="password"
                                placeholder="Password"
                                className="input-minimal"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full btn-primary h-12 text-lg group">
                            {isLogin ? "Sign In" : "Get Started"}
                            <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </Button>

                        <div className="text-center">
                            <button
                                type="button"
                                onClick={() => setIsLogin(!isLogin)}
                                className="text-sm text-muted-foreground hover:text-violet-600 transition-colors"
                            >
                                {isLogin ? "New here? Create an account" : "Already have an account? Sign in"}
                            </button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default LoginPage;
