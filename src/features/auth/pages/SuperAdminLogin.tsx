import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../../config/constants";
import logo from "../../../assets/logo.png";

interface LoginResponseData {
  email: string;
  rememberMe: boolean;
  timestamp: string;
  status: "success" | "simulated";
}

export default function SuperAdminLogin() {
  const navigate = useNavigate();
  
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [rememberMe, setRememberMe] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const payload: LoginResponseData = {
        email: email.trim(),
        rememberMe,
        timestamp: new Date().toISOString(),
        status: "success",
      };

      console.log("[Super Admin Auth Simulation]", payload);
      
      // Simulate token storage for testing
      localStorage.setItem('auth_token', 'simulated_token_' + Date.now());
      localStorage.setItem('user', JSON.stringify({
        id: 'admin_1',
        email: email,
        firstName: 'Admin',
        lastName: 'Système',
        role: 'super_admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      
      setIsSuccess(true);
      
      setTimeout(() => {
        navigate(ROUTES.DASHBOARD);
      }, 1500);
    } catch (err) {
      setErrorMsg("Une erreur de connexion est survenue. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] w-full bg-[#f8fafc] flex flex-col justify-center items-center px-4 py-8 sm:p-8 lg:px-12 lg:py-12 overflow-hidden antialiased selection:bg-blue-600/10 selection:text-blue-600 font-sans">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-70" />
        <div className="absolute top-[-30%] left-[-20%] w-[70vw] h-[70vw] rounded-full bg-gradient-to-br from-purple-100/40 to-indigo-100/20 blur-[140px] mix-blend-multiply animate-pulse [animation-duration:8s]" />
        <div className="absolute bottom-[-30%] right-[-20%] w-[70vw] h-[70vw] rounded-full bg-gradient-to-tr from-slate-200/40 to-purple-50/50 blur-[140px] mix-blend-multiply animate-pulse [animation-duration:12s]" />
      </div>

      <div className="relative z-10 w-full max-w-[420px] lg:max-w-[460px]">
        <div className="absolute -top-[1px] left-10 right-10 h-[2px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent blur-[1px]" />

        <div className="w-full bg-white border border-slate-200/70 rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_24px_60px_-15px_rgba(15,23,42,0.08)] p-6 sm:p-10 lg:p-12 transition-all duration-500 hover:shadow-[0_32px_72px_-12px_rgba(15,23,42,0.12)] backdrop-blur-sm">
          <div className="flex justify-center mb-8">
            <div className="relative group cursor-pointer">
              <div className="absolute inset-0 bg-purple-500/10 rounded-[1.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="auth-logo relative w-[90px] h-[90px] bg-gradient-to-b from-slate-50 to-slate-100/50 border border-slate-200/80 rounded-[1.5rem] flex items-center justify-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] overflow-hidden transition-all duration-300 group-hover:scale-[1.02] group-hover:border-slate-300">
                <img
                  src={logo}
                  className="w-full h-full object-cover p-2"
                  alt="Logo Établissement"
                />
              </div>
            </div>
          </div>

          <div className="text-center mb-9">
            <h1 className="text-[26px] font-bold text-slate-900 tracking-tight leading-tight mb-2.5">
              Super Admin
            </h1>
            <p className="text-sm text-slate-500 font-medium max-w-[280px] mx-auto leading-relaxed">
              Connexion administrateur système
            </p>
          </div>

          {isSuccess ? (
            <div className="py-8 text-center space-y-4 animate-fade-in">
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500 border border-emerald-100">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-800">
                  Authentification réussie
                </p>
                <p className="text-xs text-slate-500">
                  Redirection vers le tableau de bord...
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form space-y-6">
              {errorMsg && (
                <div className="p-3.5 bg-rose-50/80 border border-rose-100 rounded-xl text-xs font-medium text-rose-600 flex items-start space-x-2.5 animate-shake">
                  <svg
                    className="w-4 h-4 shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="auth-field space-y-2">
                <div className="flex justify-between items-center px-0.5">
                  <label
                    htmlFor="email"
                    className="block text-xs font-bold text-slate-700 tracking-wider uppercase"
                  >
                    Email
                  </label>
                </div>
                <div className="relative group">
                  <input
                    id="email"
                    type="email"
                    required
                    disabled={isLoading}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@pointsnanga.com"
                    className="auth-input w-full h-12 pl-4 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 text-sm font-medium transition-all duration-200 focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <div className="auth-field-icon absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-purple-500 transition-colors duration-200">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="auth-field space-y-2">
                <div className="flex justify-between items-center px-0.5">
                  <label
                    htmlFor="password"
                    className="block text-xs font-bold text-slate-700 tracking-wider uppercase"
                  >
                    Mot de passe
                  </label>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={isLoading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Votre mot de passe"
                    className="auth-input w-full h-12 pl-4 pr-11 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 text-sm font-medium transition-all duration-200 focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    disabled={isLoading}
                    onClick={() => setShowPassword(!showPassword)}
                    className="auth-field-icon absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors duration-150 p-1 rounded-md"
                    title={
                      showPassword
                        ? "Masquer le mot de passe"
                        : "Afficher le mot de passe"
                    }
                  >
                    {showPassword ? (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-0.5 text-xs">
                <label className="flex items-center space-x-2.5 text-slate-600 cursor-pointer select-none font-medium group">
                  <input
                    type="checkbox"
                    disabled={isLoading}
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded-md border-slate-300 text-purple-600 focus:ring-purple-500/10 focus:ring-offset-0 transition duration-150 ease-in-out cursor-pointer disabled:cursor-not-allowed"
                  />
                  <span className="group-hover:text-slate-800 transition-colors duration-150">
                    Se souvenir de moi
                  </span>
                </label>
                <a
                  href="#forgot-password"
                  className="text-purple-600 hover:text-purple-700 font-semibold transition-colors duration-150 focus:outline-none focus:underline"
                >
                  Mot de passe oublié ?
                </a>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="relative w-full h-12 bg-purple-600 hover:bg-purple-700 active:scale-[0.99] text-white text-sm font-semibold rounded-xl shadow-[0_4px_12px_rgba(147,51,234,0.2)] hover:shadow-[0_6px_20px_rgba(147,51,234,0.3)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none flex items-center justify-center"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <svg
                        className="animate-spin h-4 w-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span className="tracking-wide">Connexion...</span>
                    </div>
                  ) : (
                    <span>Se connecter</span>
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-10 pt-6 border-t border-slate-100 text-center space-y-1.5">
            <p className="text-[11px] font-semibold text-slate-400 tracking-wide uppercase">
              PointsNanga - Administration Système
            </p>
            <p className="text-[10px] font-medium text-slate-400/70">
              &copy; 2026 Tous droits réservés
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
