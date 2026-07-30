import { FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BankOutlined,
  CheckOutlined,
  DownOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  IdcardOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { ROUTES } from "../../../config/constants";
import { useAuth } from "../../../hooks/useAuth";
import { api } from "../../../lib/api";
import type { AuthResponse } from "../../../types";
import logo from "../../../assets/logo.png";
import mobileBackground from "../../../assets/eleves.png";
import LogoLoader from "../../../components/common/LogoLoader";

type SchoolOption = {
  id: string;
  name: string;
  logo?: string | null;
};

export default function HomeroomTeacherLogin() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [schoolName, setSchoolName] = useState("");
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [matricule, setMatricule] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isSchoolMenuOpen, setIsSchoolMenuOpen] = useState(false);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const selectedSchool = schools.find((school) => school.name === schoolName);
  const [showPassword, setShowPassword] = useState(false);
  const schoolPickerRef = useRef<HTMLDivElement>(null);
  const schoolTriggerRef = useRef<HTMLButtonElement>(null);
  const schoolSearchRef = useRef<HTMLInputElement>(null);

  const normalizedSchoolSearch = schoolSearch
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr");
  const filteredTitulaireSchools = schools.filter((school) =>
    school.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("fr")
      .includes(normalizedSchoolSearch),
  );

  useEffect(() => {
    let isMounted = true;

    const loadSchools = () => {
      api
        .get<SchoolOption[]>("/schools")
        .then((response) => {
          if (isMounted) setSchools(response.data);
        })
        .catch(() => {
          if (isMounted) setSchools([]);
        });
    };

    loadSchools();
    const intervalId = window.setInterval(loadSchools, 1000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!isSchoolMenuOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!schoolPickerRef.current?.contains(event.target as Node)) {
        setIsSchoolMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSchoolMenuOpen(false);
        schoolTriggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isSchoolMenuOpen]);

  useEffect(() => {
    if (!isSchoolMenuOpen) {
      setSchoolSearch("");
      return;
    }

    const focusFrame = window.requestAnimationFrame(() => {
      schoolSearchRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(focusFrame);
  }, [isSchoolMenuOpen]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!schoolName || !matricule.trim() || !password) {
      setErrorMsg("Veuillez renseigner l'école, le matricule et le mot de passe.");
      return;
    }

    setIsLoading(true);
    setIsPageTransitioning(true);
    setErrorMsg(null);

    try {
      const response = await api.post<AuthResponse>("/auth/login", {
        role: "teacher",
        schoolName,
        matricule: matricule.trim(),
        password,
      });

      if (rememberMe) {
        localStorage.setItem("titulaire_school", schoolName);
        localStorage.setItem("titulaire_matricule", matricule.trim());
      } else {
        localStorage.removeItem("titulaire_school");
        localStorage.removeItem("titulaire_matricule");
      }

      updateUser(response.data.user);
    } catch {
      setIsPageTransitioning(false);
      setErrorMsg("École, code titulaire ou mot de passe incorrect.");
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
            <SafetyCertificateOutlined /> Espace titulaire
          </span>
          <h1 id="titulaire-login-title" className="sr-only">
            Connexion titulaire
          </h1>
        </header>

        <form onSubmit={handleSubmit} className="premium-login__form">
          {errorMsg && (
            <div className="premium-login__alert" role="alert">
              <span aria-hidden="true">!</span>
              <p>{errorMsg}</p>
            </div>
          )}

          <div className="premium-login__field">
            <label htmlFor="titulaire-school">
              École <span aria-hidden="true">*</span>
            </label>
            <div
              ref={schoolPickerRef}
              className="premium-login__director-school-picker"
            >
              <button
                id="titulaire-school"
                ref={schoolTriggerRef}
                type="button"
                disabled={isLoading}
                className="premium-login__director-school-trigger"
                aria-haspopup="listbox"
                aria-expanded={isSchoolMenuOpen}
                aria-controls="titulaire-school-options"
                aria-required="true"
                onClick={() => setIsSchoolMenuOpen((isOpen) => !isOpen)}
              >
                <span className="premium-login__director-school-icon">
                  {selectedSchool?.logo ? (
                    <img src={selectedSchool.logo} alt="" />
                  ) : (
                    <BankOutlined aria-hidden="true" />
                  )}
                </span>
                <span className="premium-login__director-school-value">
                  <small>Établissement</small>
                  <strong className={schoolName ? "" : "is-placeholder"}>
                    {schoolName || "Choisir votre école"}
                  </strong>
                </span>
                <span className="premium-login__director-school-chevron">
                  <DownOutlined aria-hidden="true" />
                </span>
              </button>

              {isSchoolMenuOpen && (
                <div className="premium-login__director-school-menu">
                  <div className="premium-login__director-school-search">
                    <SearchOutlined aria-hidden="true" />
                    <input
                      ref={schoolSearchRef}
                      type="search"
                      value={schoolSearch}
                      onChange={(event) => setSchoolSearch(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "ArrowDown") {
                          event.preventDefault();
                          schoolPickerRef.current
                            ?.querySelector<HTMLButtonElement>(
                              ".premium-login__director-school-option",
                            )
                            ?.focus();
                        }
                      }}
                      placeholder="Rechercher une école…"
                      aria-label="Rechercher une école"
                      autoComplete="off"
                    />
                  </div>

                  <div
                    id="titulaire-school-options"
                    className="premium-login__director-school-options"
                    role="listbox"
                    aria-label="Liste des établissements"
                  >
                    {filteredTitulaireSchools.map((school, index) => (
                      <button
                        key={school.id}
                        type="button"
                        role="option"
                        aria-selected={schoolName === school.name}
                        className={`premium-login__director-school-option${
                          schoolName === school.name ? " is-selected" : ""
                        }`}
                        onKeyDown={(event) => {
                          const options =
                            schoolPickerRef.current?.querySelectorAll<HTMLButtonElement>(
                              ".premium-login__director-school-option",
                            );
                          if (!options?.length) return;

                          if (event.key === "ArrowDown") {
                            event.preventDefault();
                            options[(index + 1) % options.length]?.focus();
                          }
                          if (event.key === "ArrowUp") {
                            event.preventDefault();
                            if (index === 0) {
                              schoolSearchRef.current?.focus();
                            } else {
                              options[index - 1]?.focus();
                            }
                          }
                        }}
                        onClick={() => {
                          setSchoolName(school.name);
                          setIsSchoolMenuOpen(false);
                          setErrorMsg(null);
                          schoolTriggerRef.current?.focus();
                        }}
                      >
                        <span className="premium-login__director-school-monogram">
                          {school.logo ? (
                            <img
                              src={school.logo}
                              alt=""
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            school.name
                              .split(" ")
                              .filter((word) => word.length > 2)
                              .slice(0, 2)
                              .map((word) => word[0])
                              .join("")
                          )}
                        </span>
                        <span>
                          <strong>{school.name}</strong>
                          <small>Établissement autorisé</small>
                        </span>
                        {schoolName === school.name && (
                          <CheckOutlined aria-hidden="true" />
                        )}
                      </button>
                    ))}

                    {filteredTitulaireSchools.length === 0 && (
                      <div
                        className="premium-login__director-school-empty"
                        role="status"
                      >
                        <SearchOutlined aria-hidden="true" />
                        <strong>Aucune école trouvée</strong>
                        <small>Essayez avec un autre nom.</small>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="premium-login__field">
            <label htmlFor="titulaire-matricule">
              Matricule titulaire <span aria-hidden="true">*</span>
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
                  setMatricule(event.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Ex. TIT-260001"
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
          Accès réservé aux professeurs titulaires autorisés
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
