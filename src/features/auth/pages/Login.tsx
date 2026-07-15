import { FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BankOutlined,
  BookOutlined,
  CheckOutlined,
  DownOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  LockOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { ROUTES } from "../../../config/constants";
import { useAuth } from "../../../hooks/useAuth";
import { getStudentLoginValidationError } from "../../../lib/validators";
import logo from "../../../assets/logo.png";
import studentBackground from "../../../assets/student-login-background.jpg";
import mobileStudentsBackground from "../../../assets/eleves.png";
import LogoLoader from "../../../components/common/LogoLoader";

interface LoginResponseData {
  schoolName: string;
  className: string;
  matricule: string;
  rememberMe: boolean;
  timestamp: string;
  status: "success" | "simulated";
}

const schools = ["Lycée Saint-Michel", "Collège Notre-Dame", "Institut Technique Matadi"];
const classes = ["6ème A", "6ème B", "5ème A", "5ème B"];

export default function Login() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [schoolName, setSchoolName] = useState<string>("");
  const [className, setClassName] = useState<string>("");
  const [matricule, setMatricule] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSchoolMenuOpen, setIsSchoolMenuOpen] = useState(false);
  const [isClassMenuOpen, setIsClassMenuOpen] = useState(false);
  const [mobileFocusField, setMobileFocusField] = useState<"matricule" | "password" | null>(null);
  const [schoolConfirmed, setSchoolConfirmed] = useState(false);
  const [classConfirmed, setClassConfirmed] = useState(false);
  const [matriculeConfirmed, setMatriculeConfirmed] = useState(false);
  const classInputRef = useRef<HTMLButtonElement>(null);
  const matriculeInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const isClassVisible = schoolConfirmed && Boolean(schoolName.trim());
  const isMatriculeVisible = isClassVisible && classConfirmed && Boolean(className.trim());
  const isPasswordVisible = isMatriculeVisible && matriculeConfirmed && Boolean(matricule.trim());

  useEffect(() => {
    if (isClassVisible) classInputRef.current?.focus();
  }, [isClassVisible]);

  useEffect(() => {
    if (isMatriculeVisible) matriculeInputRef.current?.focus();
  }, [isMatriculeVisible]);

  useEffect(() => {
    if (!isPasswordVisible) return;

    const focusTimer = window.setTimeout(() => passwordInputRef.current?.focus(), 260);
    return () => window.clearTimeout(focusTimer);
  }, [isPasswordVisible]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validationError = getStudentLoginValidationError({
      schoolName,
      className,
      matricule,
      password,
    });

    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setIsLoading(true);
    setIsPageTransitioning(true);
    setErrorMsg(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const payload: LoginResponseData = {
        schoolName: schoolName.trim(),
        className: className.trim(),
        matricule: matricule.trim(),
        rememberMe,
        timestamp: new Date().toISOString(),
        status: "success",
      };

      console.log("[SaaS Auth Simulation Submitting...]", payload);

      localStorage.setItem("auth_token", `simulated_token_${Date.now()}`);
      const userData = {
        id: "1",
        email: matricule,
        firstName: "Jean",
        lastName: "Mukendi",
        role: "student" as const,
        schoolId: schoolName.trim(),
        classId: className.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updateUser(userData);

    } catch {
      setIsPageTransitioning(false);
      setErrorMsg("Une erreur de connexion est survenue. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className={`premium-login${isPageTransitioning ? " premium-login--loading" : ""}`}>
      <div
        aria-hidden="true"
        className="premium-login__background"
        style={{ backgroundImage: `url(${studentBackground})` }}
      />
      <div
        aria-hidden="true"
        className="premium-login__mobile-students"
        style={{ backgroundImage: `url(${mobileStudentsBackground})` }}
      />
      <div className="premium-login__overlay" aria-hidden="true" />

      <section className={`premium-login__card${mobileFocusField ? " premium-login__card--credential-focus" : ""}`} aria-labelledby="login-title">
        <header className="premium-login__header">
          <div className="premium-login__logo" aria-hidden="true">
            <img src={logo} alt="" />
          </div>
          <p className="premium-login__brand">POINTS NANGA</p>
          <h1 id="login-title" className="sr-only">
            Connexion élève
          </h1>
        </header>

        <form onSubmit={handleSubmit} className="premium-login__form">
            {errorMsg && (
              <div className="premium-login__alert" role="alert">
                <span aria-hidden="true">!</span>
                <p>{errorMsg}</p>
              </div>
            )}

            <div className="premium-login__progressive-fields" aria-live="polite">
              <div className="premium-login__field">
                <label htmlFor="school">
                  École <span aria-hidden="true">*</span>
                </label>
                <div className="premium-login__school-picker">
                  <button
                    id="school"
                    type="button"
                    className="premium-login__school-trigger"
                    aria-haspopup="listbox"
                    aria-expanded={isSchoolMenuOpen}
                    aria-controls="school-options"
                    disabled={isLoading}
                    onClick={() => setIsSchoolMenuOpen((isOpen) => !isOpen)}
                  >
                    <BankOutlined aria-hidden="true" />
                    <span className={schoolName ? "" : "premium-login__school-placeholder"}>{schoolName || "Sélectionner votre école"}</span>
                    <DownOutlined className="premium-login__school-chevron" aria-hidden="true" />
                  </button>
                  {isSchoolMenuOpen && <div id="school-options" className="premium-login__school-menu" role="listbox" aria-label="Liste des écoles">
                    {schools.map((school, index) => (
                      <button
                        key={school}
                        type="button"
                        role="option"
                        aria-selected={schoolName === school}
                        className={schoolName === school ? "premium-login__school-option premium-login__school-option--selected" : "premium-login__school-option"}
                        style={{ animationDelay: `${70 + index * 65}ms` }}
                        onClick={() => {
                          setSchoolName(school);
                          setSchoolConfirmed(true);
                          setIsSchoolMenuOpen(false);
                      setClassName("");
                      setMatricule("");
                      setPassword("");
                      setClassConfirmed(false);
                      setMatriculeConfirmed(false);
                        }}
                      >
                        <span>{school}</span>
                        {schoolName === school && <CheckOutlined aria-hidden="true" />}
                      </button>
                    ))}
                  </div>}
                </div>
              </div>

              {isClassVisible && <div className="premium-login__field premium-login__field--reveal">
                <label htmlFor="class">
                  Classe <span aria-hidden="true">*</span>
                </label>
                <div className="premium-login__school-picker">
                  <button
                    id="class"
                    type="button"
                    className="premium-login__school-trigger"
                    aria-haspopup="listbox"
                    aria-expanded={isClassMenuOpen}
                    aria-controls="class-options"
                    disabled={isLoading}
                    ref={classInputRef}
                    onClick={() => setIsClassMenuOpen((isOpen) => !isOpen)}
                  >
                    <BookOutlined aria-hidden="true" />
                    <span className={className ? "" : "premium-login__school-placeholder"}>{className || "Sélectionner votre classe"}</span>
                    <DownOutlined className="premium-login__school-chevron" aria-hidden="true" />
                  </button>
                  {isClassMenuOpen && <div id="class-options" className="premium-login__school-menu" role="listbox" aria-label="Liste des classes">
                    {classes.map((classOption, index) => (
                      <button
                        key={classOption}
                        type="button"
                        role="option"
                        aria-selected={className === classOption}
                        className={className === classOption ? "premium-login__school-option premium-login__school-option--selected" : "premium-login__school-option"}
                        style={{ animationDelay: `${70 + index * 65}ms` }}
                        onClick={() => {
                          setClassName(classOption);
                          setClassConfirmed(true);
                          setIsClassMenuOpen(false);
                      setMatricule("");
                      setPassword("");
                      setMatriculeConfirmed(false);
                        }}
                      >
                        <span>{classOption}</span>
                        {className === classOption && <CheckOutlined aria-hidden="true" />}
                      </button>
                    ))}
                  </div>}
                </div>
              </div>}

            {isMatriculeVisible && <div className="premium-login__field premium-login__field--reveal">
              <label htmlFor="matricule">
                Matricule élève <span aria-hidden="true">*</span>
              </label>
              <div className="premium-login__input-wrap">
                <UserOutlined aria-hidden="true" />
                <input
                  id="matricule"
                  type="text"
                  required
                  disabled={isLoading}
                    value={matricule}
                    ref={matriculeInputRef}
                    autoComplete="username"
                    autoCapitalize="characters"
                    spellCheck={false}
                    onChange={(e) => {
                      setMatricule(e.target.value);
                      setMatriculeConfirmed(false);
                      setPassword("");
                    }}
                    onFocus={() => setMobileFocusField("matricule")}
                    onBlur={() => {
                      setMatriculeConfirmed(Boolean(matricule.trim()));
                      setMobileFocusField(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && matricule.trim()) {
                        e.preventDefault();
                        setMatriculeConfirmed(true);
                      }
                    }}
                  placeholder="Ex. ELV20260001"
                />
              </div>
            </div>}

            {isPasswordVisible && <div className="premium-login__field premium-login__field--reveal">
              <label htmlFor="password">
                Mot de passe <span aria-hidden="true">*</span>
              </label>
              <div className="premium-login__input-wrap">
                <LockOutlined aria-hidden="true" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  disabled={isLoading}
                    value={password}
                    ref={passwordInputRef}
                  autoComplete="current-password"
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setMobileFocusField("password")}
                  onBlur={() => setMobileFocusField(null)}
                  placeholder="Votre mot de passe"
                />
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => setShowPassword(!showPassword)}
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
            </div>}

            {isPasswordVisible && <div className="premium-login__field premium-login__field--reveal premium-login__form-actions">
            <div className="premium-login__options">
              <label className="premium-login__remember">
                <input
                  type="checkbox"
                  disabled={isLoading}
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
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
                "Valider"
              )}
            </button>
            </div>}
            </div>
        </form>

        <footer className="premium-login__footer">
          Plateforme sécurisée de publication des résultats scolaires
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
