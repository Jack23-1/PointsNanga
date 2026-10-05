import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BankOutlined,
  DownOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  IdcardOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { ROUTES } from "../../../config/constants";
import { useAuth } from "../../../hooks/useAuth";
import { api } from "../../../lib/api";
import type { AuthResponse } from "../../../types";
import logo from "../../../assets/logo.png";
import mobileBackground from "../../../assets/eleves.png";
import LogoLoader from "../../../components/common/LogoLoader";

type ResolvedSchool = {
  name: string;
  logo?: string | null;
  className?: string | null;
};

export default function HomeroomTeacherLogin() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [matricule, setMatricule] = useState("");
  const [resolvedSchool, setResolvedSchool] = useState<ResolvedSchool | null>(null);
  const [isResolvingSchool, setIsResolvingSchool] = useState(false);
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const identifier = matricule.trim().toUpperCase();
    let cancelled = false;
    setResolvedSchool(null);
    if (!/^[A-Z0-9-]{3,50}$/.test(identifier)) {
      setIsResolvingSchool(false);
      return;
    }

    setIsResolvingSchool(true);
    const timeoutId = window.setTimeout(() => {
      api
        .post<{ school: ResolvedSchool | null }>("/auth/resolve-school", {
          role: "teacher",
          identifier: identifier.toUpperCase(),
        })
        .then((response) => {
          if (!cancelled) setResolvedSchool(response.data.school);
        })
        .catch(() => {
          if (!cancelled) setResolvedSchool(null);
        })
        .finally(() => {
          if (!cancelled) setIsResolvingSchool(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [matricule]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!matricule.trim() || !password) {
      setErrorMsg("Veuillez renseigner le matricule et le mot de passe.");
      return;
    }

    if (password.length > 72) {
      setErrorMsg("Le mot de passe ne doit pas dépasser 72 caractères.");
      return;
    }

    setIsLoading(true);
    setIsPageTransitioning(true);
    setErrorMsg(null);

    try {
      const response = await api.post<AuthResponse>("/auth/login", {
        role: "teacher",
        matricule: matricule.trim().toUpperCase(),
        password,
      });

      if (rememberMe) {
        localStorage.setItem("titulaire_matricule", matricule.trim().toUpperCase());
      } else {
        localStorage.removeItem("titulaire_matricule");
      }

      updateUser(response.data.user);
    } catch {
      setIsPageTransitioning(false);
      setErrorMsg("Code titulaire ou mot de passe incorrect.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main
      className={`premium-login premium-login--admin${
        isPageTransitioning ? " premium-login--loading" : ""
      }`}
    >
      <div
        aria-hidden="true"
        className="premium-login__background"
        style={{ backgroundImage: `url(${mobileBackground})` }}
      />
      <div
        aria-hidden="true"
        className="premium-login__mobile-students"
        style={{ backgroundImage: `url(${mobileBackground})` }}
      />
      <div className="premium-login__overlay" aria-hidden="true" />

      <section className="premium-login__card" aria-labelledby="titulaire-login-title">
        <header className="premium-login__header">
          <div className="premium-login__logo" aria-hidden="true">
            <img src={logo} alt="" />
          </div>
          <p className="premium-login__brand">POINTS NANGA</p>
          <span className="premium-login__admin-badge">
            <SafetyCertificateOutlined /> Espace enseignant
          </span>
          <h1 id="titulaire-login-title" className="sr-only">
            Connexion enseignant
          </h1>
        </header>

        <form onSubmit={handleSubmit} className="premium-login__form">
          {errorMsg && (
            <div className="premium-login__alert" role="alert">
              <span aria-hidden="true">!</span>
              <p>{errorMsg}</p>
            </div>
          )}

          {(isResolvingSchool || resolvedSchool) && (
            <div className="premium-login__field premium-login__resolved-school-field">
              <label>École</label>
              <div className="premium-login__director-school-picker">
                <div
                  className="premium-login__director-school-trigger premium-login__director-school-trigger--readonly"
                  aria-live="polite"
                  aria-label={resolvedSchool?.name ?? "Recherche de l’école"}
                >
                  <span className="premium-login__director-school-icon">
                    {resolvedSchool?.logo ? (
                      <img src={resolvedSchool.logo} alt="" />
                    ) : (
                      <BankOutlined aria-hidden="true" />
                    )}
                  </span>
                  <span className="premium-login__director-school-value">
                    <small>Établissement</small>
                    <strong className={resolvedSchool ? "" : "is-placeholder"}>
                      {isResolvingSchool
                        ? "Recherche de l’école…"
                        : resolvedSchool?.name}
                    </strong>
                  </span>
                  <span className="premium-login__director-school-chevron">
                    <DownOutlined aria-hidden="true" />
                  </span>
                </div>
              </div>
              {resolvedSchool?.className && (
                <div
                  className="premium-login__titular-class-card"
                  aria-live="polite"
                >
                  <span className="premium-login__titular-class-icon">
                    <TeamOutlined aria-hidden="true" />
                  </span>
                  <span className="premium-login__titular-class-content">
                    <small>Classe titulaire</small>
                    <strong>{resolvedSchool.className}</strong>
                  </span>
                  <span className="premium-login__titular-class-status">
                    Affectation confirmée
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="premium-login__field">
            <label htmlFor="titulaire-matricule">
              Matricule enseignant <span aria-hidden="true">*</span>
            </label>
            <div className="premium-login__input-wrap">
              <IdcardOutlined aria-hidden="true" />
              <input
                id="titulaire-matricule"
                type="text"
                required
                disabled={isLoading}
                value={matricule}
                onChange={(event) => {
                  setMatricule(event.target.value.toUpperCase());
                  setErrorMsg(null);
                }}
                placeholder="Ex. TIT-A7K29P"
                maxLength={50}
                autoComplete="username"
              />
            </div>
          </div>

          <div className="premium-login__field premium-login__field--reveal">
            <label htmlFor="titulaire-password">
              Mot de passe <span aria-hidden="true">*</span>
            </label>
            <div className="premium-login__input-wrap">
              <LockOutlined aria-hidden="true" />
              <input
                id="titulaire-password"
                type={showPassword ? "text" : "password"}
                required
                disabled={isLoading}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Votre mot de passe"
                autoComplete="current-password"
              />
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setShowPassword((visible) => !visible)}
                className="premium-login__password-toggle"
                aria-label={
                  showPassword
                    ? "Masquer le mot de passe"
                    : "Afficher le mot de passe"
                }
              >
                {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              </button>
            </div>
          </div>

          <div className="premium-login__options">
            <label className="premium-login__remember">
              <input
                type="checkbox"
                disabled={isLoading}
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              <span>Se souvenir de moi</span>
            </label>
            <a href="#forgot-password">Mot de passe oublié ?</a>
          </div>

          <button type="submit" disabled={isLoading} className="premium-login__submit">
            {isLoading ? (
              <>
                <span className="premium-login__spinner" /> Vérification…
              </>
            ) : (
              "Se connecter"
            )}
          </button>
        </form>

        <footer className="premium-login__footer">
          Accès réservé aux enseignants autorisés
        </footer>
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
