import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  EyeInvisibleOutlined,
  EyeOutlined,
  LockOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { ROUTES } from "../../../config/constants";
import { useAuth } from "../../../hooks/useAuth";
import logo from "../../../assets/logo.png";
import mobileBackground from "../../../assets/eleves.png";
import LogoLoader from "../../../components/common/LogoLoader";

interface LoginResponseData {
  email: string;
  rememberMe: boolean;
  timestamp: string;
  status: "success" | "simulated";
}

export default function SuperAdminLogin() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setIsPageTransitioning(true);
    setErrorMsg(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const payload: LoginResponseData = { email: email.trim(), rememberMe, timestamp: new Date().toISOString(), status: "success" };
      console.log("[Super Admin Auth Simulation]", payload);

      localStorage.setItem("auth_token", `simulated_token_${Date.now()}`);
      updateUser({
        id: "admin_1",
        email,
        firstName: "Admin",
        lastName: "Système",
        role: "super_admin",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

    } catch {
      setIsPageTransitioning(false);
      setErrorMsg("Une erreur de connexion est survenue. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className={`premium-login premium-login--admin${isPageTransitioning ? " premium-login--loading" : ""}`}>
      <div aria-hidden="true" className="premium-login__background" style={{ backgroundImage: `url(${mobileBackground})` }} />
      <div aria-hidden="true" className="premium-login__mobile-students" style={{ backgroundImage: `url(${mobileBackground})` }} />
      <div className="premium-login__overlay" aria-hidden="true" />

      <section className="premium-login__card" aria-labelledby="admin-login-title">
        <header className="premium-login__header">
          <div className="premium-login__logo" aria-hidden="true"><img src={logo} alt="" /></div>
          <p className="premium-login__brand">POINTS NANGA</p>
          <span className="premium-login__admin-badge"><SafetyCertificateOutlined /> Administration sécurisée</span>
          <h1 id="admin-login-title" className="sr-only">Connexion Super Admin</h1>
        </header>

        <form onSubmit={handleSubmit} className="premium-login__form">
            {errorMsg && <div className="premium-login__alert" role="alert"><span aria-hidden="true">!</span><p>{errorMsg}</p></div>}
            <div className="premium-login__field">
              <label htmlFor="email">E-mail administrateur <span aria-hidden="true">*</span></label>
              <div className="premium-login__input-wrap">
                <MailOutlined aria-hidden="true" />
                <input id="email" type="email" required disabled={isLoading} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@pointsnanga.com" autoComplete="username" />
              </div>
            </div>
            <div className="premium-login__field premium-login__field--reveal">
              <label htmlFor="password">Mot de passe <span aria-hidden="true">*</span></label>
              <div className="premium-login__input-wrap">
                <LockOutlined aria-hidden="true" />
                <input id="password" type={showPassword ? "text" : "password"} required disabled={isLoading} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Votre mot de passe" autoComplete="current-password" />
                <button type="button" disabled={isLoading} onClick={() => setShowPassword((visible) => !visible)} className="premium-login__password-toggle" aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
                  {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                </button>
              </div>
            </div>
            <div className="premium-login__options">
              <label className="premium-login__remember"><input type="checkbox" disabled={isLoading} checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} /><span>Se souvenir de moi</span></label>
              <a href="#forgot-password">Mot de passe oublié ?</a>
            </div>
            <button type="submit" disabled={isLoading} className="premium-login__submit">
              {isLoading ? <><span className="premium-login__spinner" /> Vérification…</> : "Se connecter"}
            </button>
        </form>
        <footer className="premium-login__footer">Espace réservé aux administrateurs autorisés</footer>
      </section>
      {isPageTransitioning && (
        <LogoLoader
          onComplete={() => navigate(ROUTES.DASHBOARD)}
          duration={2000}
          transparent
          label="Connexion..."
        />
      )}
    </main>
  );
}
