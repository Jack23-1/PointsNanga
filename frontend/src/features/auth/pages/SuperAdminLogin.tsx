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
import { api } from "../../../lib/api";
import type { AuthResponse } from "../../../types";
import logo from "../../../assets/logo.png";
import mobileBackground from "../../../assets/eleves.png";
import LogoLoader from "../../../components/common/LogoLoader";
import { Button, Input, Modal, message } from "antd";

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
  const [destinationRoute, setDestinationRoute] = useState<string>(
    ROUTES.DASHBOARD,
  );
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [isSendingReset, setIsSendingReset] = useState(false);

  const requestPasswordReset = async () => {
    if (!forgotEmail.trim()) return;
    setIsSendingReset(true);
    try {
      await api.post("/auth/forgot-password", { email: forgotEmail.trim() });
      message.success(
        "Si ce compte existe, un lien de réinitialisation a été envoyé.",
      );
      setForgotOpen(false);
    } catch {
      message.error("Impossible d’envoyer l’e-mail pour le moment.");
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setIsPageTransitioning(true);
    setErrorMsg(null);

    try {
      const response = await api.post<AuthResponse>("/auth/login", {
        role: "super_admin",
        email: email.trim(),
        password,
      });

      if (rememberMe) {
        localStorage.setItem("super_admin_email", email.trim());
      } else {
        localStorage.removeItem("super_admin_email");
      }
      updateUser(response.data.user);
      setDestinationRoute(
        response.data.user.hasFullAccess
          ? ROUTES.DASHBOARD
          : `${ROUTES.DASHBOARD}?workspace=grades`,
      );

    } catch (error) {
      setIsPageTransitioning(false);
      setErrorMsg(
        "E-mail ou mot de passe incorrect. Vérifiez le compte superadmin.",
      );
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
              <a
                href="#forgot-password"
                onClick={(event) => {
                  event.preventDefault();
                  setForgotEmail(email);
                  setForgotOpen(true);
                }}
              >
                Mot de passe oublié ?
              </a>
            </div>
            <button type="submit" disabled={isLoading} className="premium-login__submit">
              {isLoading ? <><span className="premium-login__spinner" /> Vérification…</> : "Se connecter"}
            </button>
        </form>
        <footer className="premium-login__footer">Espace réservé aux administrateurs autorisés</footer>
      </section>
      {isPageTransitioning && (
        <LogoLoader
          onComplete={() => navigate(destinationRoute)}
          duration={2000}
          transparent
          label="Connexion..."
        />
      )}
      <Modal
        open={forgotOpen}
        title="Réinitialiser le mot de passe"
        onCancel={() => setForgotOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setForgotOpen(false)}>
            Annuler
          </Button>,
          <Button
            key="send"
            type="primary"
            loading={isSendingReset}
            onClick={requestPasswordReset}
          >
            Envoyer le lien
          </Button>,
        ]}
      >
        <p>Saisissez l’adresse e-mail de votre compte superadmin.</p>
        <Input
          type="email"
          value={forgotEmail}
          onChange={(event) => setForgotEmail(event.target.value)}
          placeholder="administrateur@gmail.com"
          onPressEnter={requestPasswordReset}
        />
      </Modal>
    </main>
  );
}
