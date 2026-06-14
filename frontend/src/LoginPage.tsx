import { useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from './authConfig';
import { Lock, Mail, Building, KeyRound, AlertCircle } from 'lucide-react';

interface LoginPageProps {
    onLocalLogin: (token: string, username: string) => void;
}

export default function LoginPage({ onLocalLogin }: LoginPageProps) {
    const { instance } = useMsal();
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Gestione Login Microsoft Entra ID
    const handleMicrosoftLogin = async () => {
        try {
            await instance.loginPopup(loginRequest);
        } catch (e) {
            console.error("Errore durante il login Microsoft", e);
            setError("Login Microsoft fallito o annullato.");
        }
    };

    // Gestione Login Locale
    const handleLocalLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);

            const res = await fetch('http://localhost:8000/api/token', { 
                method: 'POST', 
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData 
            });

            if (!res.ok) {
                setError("Credenziali non valide. Prova admin@demo.it / admin");
                setIsLoading(false);
                return;
            }

            const data = await res.json();
            onLocalLogin(data.access_token, data.username);
        } catch (err) {
            setError("Errore di connessione al server.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
            <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-2xl shadow-xl border border-slate-100">
                
                {/* Header */}
                <div className="text-center">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100">
                        <Building className="h-8 w-8 text-blue-600" />
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-slate-900">
                        AI Sales Assistant
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                        Accedi alla piattaforma commerciale
                    </p>
                </div>

                {/* Microsoft Entra Login */}
                <div className="mt-8">
                    <button
                        onClick={handleMicrosoftLogin}
                        className="w-full flex items-center justify-center px-4 py-3 border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                        {/* Microsoft Logo SVG */}
                        <svg className="w-5 h-5 mr-3" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 0H0v10h10V0z" fill="#f25022"/>
                            <path d="M21 0H11v10h10V0z" fill="#7fba00"/>
                            <path d="M10 11H0v10h10V11z" fill="#00a4ef"/>
                            <path d="M21 11H11v10h10V11z" fill="#ffb900"/>
                        </svg>
                        Accedi con Microsoft Entra ID
                    </button>
                </div>

                <div className="mt-6">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-300" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-slate-500">Oppure usa le credenziali locali</span>
                        </div>
                    </div>
                </div>

                {/* Local Login Form */}
                <form className="mt-6 space-y-6" onSubmit={handleLocalLogin}>
                    {error && (
                        <div className="rounded-md bg-red-50 p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4 rounded-md shadow-sm">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="appearance-none rounded-lg relative block w-full px-3 py-3 pl-10 border border-slate-300 placeholder-slate-500 text-slate-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-colors"
                                placeholder="Indirizzo Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="appearance-none rounded-lg relative block w-full px-3 py-3 pl-10 border border-slate-300 placeholder-slate-500 text-slate-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-colors"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <input
                                id="remember-me"
                                name="remember-me"
                                type="checkbox"
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-900">
                                Ricordami
                            </label>
                        </div>

                        <div className="text-sm">
                            <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                                Password dimenticata?
                            </a>
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                                <KeyRound className="h-5 w-5 text-blue-500 group-hover:text-blue-400" aria-hidden="true" />
                            </span>
                            {isLoading ? 'Accesso in corso...' : 'Accedi'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
