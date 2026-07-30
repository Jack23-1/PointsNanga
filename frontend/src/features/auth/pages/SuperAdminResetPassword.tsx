import { FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { EyeInvisibleOutlined, EyeOutlined, LockOutlined } from "@ant-design/icons";
import { message } from "antd";
import { ROUTES } from "../../../config/constants";
import { api } from "../../../lib/api";
import logo from "../../../assets/logo.png";

export default function SuperAdminResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) {
      message.error("Lien de réinitialisation invalide.");
      return;
    }
    if (password.length < 8) {
      message.error("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirmation) {
      message.error("Les mots de passe ne correspondent pas.");
      return;
    }

    setIsSaving(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      message.success("Mot de passe réinitialisé.");
      navigate(ROUTES.SUPER_ADMIN_LOGIN);
    } catch {
      message.error("Ce lien est invalide ou a expiré.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="premium-login premium-login--admin">
      <section className="premium-login__card">
        <header className="premium-login__header">
          <div className="premium-login__logo"><img src={logo} alt="PointsNanga" /></div>
          <p className="premium-login__brand">POINTS NANGA</p>
          <h1>Nouveau mot de passe</h1>
        </header>
        <form onSubmit={handleSubmit} className="premium-login__form">
          <div className="premium-login__field">
            <label htmlFor="new-password">Nouveau mot de passe</label>
            <div className="premium-login__input-wrap">
              <LockOutlined />
              <input id="new-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
              <button type="button" className="premium-login__password-toggle" onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              </button>
            </div>
          </div>
          <div className="premium-login__field">
            <label htmlFor="confirm-password">Confirmer le mot de passe</label>
            <div className="premium-login__input-wrap">
              <LockOutlined />
              <input id="confirm-password" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required minLength={8} />
            </div>
          </div>
          <button type="submit" disabled={isSaving || !token} className="premium-login__submit">
            {isSaving ? "Enregistrement…" : "Enregistrer le mot de passe"}
          </button>
        </form>
      </section>
    </main>
  );
}
