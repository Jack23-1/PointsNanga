import { FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BankOutlined,
  DownOutlined,
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
import LogoLoader from "../../../components/common/LogoLoader";
import logo from "../../../assets/logo.png";
import educationPartnerAd from "../../../assets/education-partner-ad.png";
import studentsPhoto from "../../../assets/eleves.jpeg";
import classroomPhoto from "../../../assets/student-login-background.jpg";

const directorAdSlides = [
  educationPartnerAd,
  studentsPhoto,
  classroomPhoto,
];

type ResolvedSchool = { name: string; logo?: string | null };

export default function DirectorLogin() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [schoolCode, setSchoolCode] = useState("");
  const [resolvedSchool, setResolvedSchool] = useState<ResolvedSchool | null>(null);
  const [isResolvingSchool, setIsResolvingSchool] = useState(false);
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const directorCardRef = useRef<HTMLElement>(null);
  const monitorShowcaseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const identifier = schoolCode.trim().toUpperCase();
    let cancelled = false;
    setResolvedSchool(null);
    if (!/^[A-Z0-9-]{3,30}$/.test(identifier)) {
      setIsResolvingSchool(false);
      return;
    }

    setIsResolvingSchool(true);
    const timeoutId = window.setTimeout(() => {
      api
        .post<{ school: ResolvedSchool | null }>("/auth/resolve-school", {
          role: "director",
          identifier,
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
  }, [schoolCode]);

  useEffect(() => {
    const card = directorCardRef.current;
    const showcase = monitorShowcaseRef.current;
    if (!card || !showcase) return;

    const synchronizeHeights = () => {
      showcase.style.setProperty(
        "--director-form-height",
        `${card.getBoundingClientRect().height}px`,
      );
    };

    synchronizeHeights();
    const resizeObserver = new ResizeObserver(synchronizeHeights);
    resizeObserver.observe(card);
    window.addEventListener("resize", synchronizeHeights);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", synchronizeHeights);
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!schoolCode.trim() || !password) {
      setErrorMsg("Veuillez renseigner tous les champs obligatoires.");
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
        role: "director",
        matricule: schoolCode.trim().toUpperCase(),
        password,
      });

      if (rememberMe) {
        localStorage.setItem("director_school_code", schoolCode);
      } else {
        localStorage.removeItem("director_school_code");
      }

      updateUser(response.data.user);
    } catch {
      setIsPageTransitioning(false);
      setErrorMsg("Code établissement ou mot de passe incorrect.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main
      className={`premium-login premium-login--director${
        isPageTransitioning ? " premium-login--loading" : ""
      }`}
    >
      <div className="premium-login__director-layout premium-login__director-layout--cinematic">
        <div className="premium-login__director-form-pane premium-login__director-form-pane--cinematic">
          <section
            ref={directorCardRef}
            className="premium-login__card premium-login__director-card"
            aria-labelledby="director-login-title"
          >
            <header className="premium-login__header">
              <div className="premium-login__logo" aria-hidden="true">
                <img src={logo} alt="" />
              </div>
              <p className="premium-login__brand">POINTS NANGA</p>
              <span className="premium-login__admin-badge premium-login__director-badge">
                <SafetyCertificateOutlined /> Direction d’établissement
              </span>
              <h1 id="director-login-title" className="sr-only">
                Connexion Directeur
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
                  <label>Établissement</label>
                  <div className="premium-login__director-school-picker">
                    <div
                      className="premium-login__director-school-trigger premium-login__director-school-trigger--readonly"
                      aria-live="polite"
                      aria-label={resolvedSchool?.name ?? "Recherche de l’établissement"}
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
                </div>
              )}

              <div className="premium-login__field premium-login__field--reveal">
                <label htmlFor="director-email">
                  Code établissement <span aria-hidden="true">*</span>
                </label>
                <div className="premium-login__input-wrap">
                  <MailOutlined aria-hidden="true" />
                  <input
                    id="director-email"
                    type="text"
                    required
                    disabled={isLoading}
                    value={schoolCode}
                    onChange={(event) =>
                      setSchoolCode(event.target.value.toUpperCase())
                    }
                    maxLength={30}
                    placeholder="Ex. PG2123D4ABN"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="premium-login__field premium-login__field--reveal">
                <label htmlFor="director-password">
                  Mot de passe <span aria-hidden="true">*</span>
                </label>
                <div className="premium-login__input-wrap">
                  <LockOutlined aria-hidden="true" />
                  <input
                    id="director-password"
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={isLoading}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
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

              <button
                type="submit"
                disabled={isLoading}
                className="premium-login__submit"
              >
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
              Espace réservé à la direction de l’établissement
            </footer>
          </section>
        </div>

        <aside
          className="premium-login__director-ad premium-login__director-ad--editorial premium-login__director-ad--cinematic premium-login__director-monitor-stage"
          aria-label="Espace publicitaire partenaire"
        >
          <div
            ref={monitorShowcaseRef}
            className="premium-login__director-monitor-showcase"
          >
            <div className="premium-login__director-monitor">
              <div className="premium-login__director-monitor-frame">
                <span
                  className="premium-login__director-monitor-camera"
                  aria-hidden="true"
                />
                <div className="premium-login__director-monitor-screen">
                  <div className="premium-login__director-ad-body">
                    <div className="premium-login__director-ad-spot">
                      {directorAdSlides.map((image, index) => (
                        <img
                          key={image}
                          src={image}
                          alt=""
                          aria-hidden="true"
                          className="premium-login__director-ad-slide"
                          style={{ animationDelay: `${index * 5}s` }}
                        />
                      ))}
                      <div
                        className="premium-login__director-ad-shade"
                        aria-hidden="true"
                      />
                      <div
                        className="premium-login__director-ad-pagination"
                        aria-hidden="true"
                      >
                        <i />
                        <i />
                        <i />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div
                className="premium-login__director-monitor-stand"
                aria-hidden="true"
              />
            </div>
          </div>
        </aside>
      </div>

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
