import { FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BankOutlined,
  CheckOutlined,
  DownOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  LockOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
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

type SchoolOption = {
  id: string;
  name: string;
  logo?: string | null;
};

export default function DirectorLogin() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [schoolName, setSchoolName] = useState("");
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [schoolCode, setSchoolCode] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSchoolMenuOpen, setIsSchoolMenuOpen] = useState(false);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const selectedSchool = schools.find((school) => school.name === schoolName);
  const schoolPickerRef = useRef<HTMLDivElement>(null);
  const schoolTriggerRef = useRef<HTMLButtonElement>(null);
  const schoolSearchRef = useRef<HTMLInputElement>(null);
  const directorCardRef = useRef<HTMLElement>(null);
  const monitorShowcaseRef = useRef<HTMLDivElement>(null);

  const normalizedSchoolSearch = schoolSearch
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr");
  const filteredDirectorSchools = schools.filter((school) =>
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

    if (!schoolName || !schoolCode.trim() || !password) {
      setErrorMsg("Veuillez renseigner tous les champs obligatoires.");
      return;
    }

    setIsLoading(true);
    setIsPageTransitioning(true);
    setErrorMsg(null);

    try {
      const response = await api.post<AuthResponse>("/auth/login", {
        role: "director",
        schoolName,
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

              <div className="premium-login__field">
                <label htmlFor="director-school">
                  Établissement <span aria-hidden="true">*</span>
                </label>
                <div
                  ref={schoolPickerRef}
                  className="premium-login__director-school-picker"
                >
                  <button
                    id="director-school"
                    ref={schoolTriggerRef}
                    type="button"
                    disabled={isLoading}
                    className="premium-login__director-school-trigger"
                    aria-haspopup="listbox"
                    aria-expanded={isSchoolMenuOpen}
                    aria-controls="director-school-options"
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
                    <div
                      className="premium-login__director-school-menu"
                    >
                      <div className="premium-login__director-school-search">
                        <SearchOutlined aria-hidden="true" />
                        <input
                          ref={schoolSearchRef}
                          type="search"
                          value={schoolSearch}
                          onChange={(event) =>
                            setSchoolSearch(event.target.value)
                          }
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
                        id="director-school-options"
                        className="premium-login__director-school-options"
                        role="listbox"
                        aria-label="Liste des établissements"
                      >
                      {filteredDirectorSchools.map((school, index) => (
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

                      {filteredDirectorSchools.length === 0 && (
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
