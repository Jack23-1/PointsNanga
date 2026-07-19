import { FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOutlined,
  CheckOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  IdcardOutlined,
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

interface StudentProfile {
  id: string;
  lastName: string;
  postName: string;
  firstName: string;
  className: string;
  schoolName: string;
}

interface LoginResponseData {
  matricule: string;
  student: StudentProfile;
  timestamp: string;
  status: "success" | "simulated";
}

const MATRICULE_LENGTH = 6;
const STUDENT_LOOKUP_DELAY = 2000;
const studentDirectory: Omit<StudentProfile, "id">[] = [
  {
    lastName: "Mukendi",
    postName: "Kabeya",
    firstName: "Jean",
    className: "6ème A",
    schoolName: "Lycée Saint-Michel",
  },
  {
    lastName: "Ilunga",
    postName: "Mbuyi",
    firstName: "Esther",
    className: "5ème B",
    schoolName: "Collège Notre-Dame",
  },
  {
    lastName: "Kanku",
    postName: "Tshibangu",
    firstName: "Grâce",
    className: "6ème B",
    schoolName: "Institut Technique Matadi",
  },
];

const findStudentByMatricule = (matricule: string): StudentProfile => {
  const directoryIndex = Number(matricule.slice(-2)) % studentDirectory.length;

  return {
    id: `student-${matricule}`,
    ...studentDirectory[directoryIndex],
  };
};

export default function Login() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [matricule, setMatricule] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [isSearchingStudent, setIsSearchingStudent] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [mobileFocusField, setMobileFocusField] = useState<"matricule" | "password" | null>(null);
  const matriculeInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    matriculeInputRef.current?.focus();
  }, []);

  useEffect(() => {
    setStudentProfile(null);
    setPassword("");

    if (matricule.length !== MATRICULE_LENGTH) {
      setIsSearchingStudent(false);
      return;
    }

    setIsSearchingStudent(true);
    setErrorMsg(null);

    const lookupTimer = window.setTimeout(() => {
      setStudentProfile(findStudentByMatricule(matricule));
      setIsSearchingStudent(false);
    }, STUDENT_LOOKUP_DELAY);

    return () => window.clearTimeout(lookupTimer);
  }, [matricule]);

  useEffect(() => {
    if (!studentProfile) return;

    const focusTimer = window.setTimeout(() => passwordInputRef.current?.focus(), 650);
    return () => window.clearTimeout(focusTimer);
  }, [studentProfile]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validationError = getStudentLoginValidationError({
      matricule,
      password,
      isSearchingStudent,
      isStudentResolved: Boolean(studentProfile),
    });

    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    if (!studentProfile) return;

    const resolvedStudent = studentProfile;
    setIsLoading(true);
    setIsPageTransitioning(true);
    setErrorMsg(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const payload: LoginResponseData = {
        matricule,
        student: resolvedStudent,
        timestamp: new Date().toISOString(),
        status: "success",
      };

      console.log("[SaaS Auth Simulation Submitting...]", payload);

      localStorage.setItem("auth_token", `simulated_token_${Date.now()}`);
      const userData = {
        id: resolvedStudent.id,
        email: matricule,
        firstName: resolvedStudent.firstName,
        lastName: `${resolvedStudent.lastName} ${resolvedStudent.postName}`,
        role: "student" as const,
        schoolId: resolvedStudent.schoolName,
        classId: resolvedStudent.className,
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
    <main
      className={`premium-login premium-login--student-lookup${
        isPageTransitioning ? " premium-login--loading" : ""
      }`}
    >
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

          <div className="premium-login__progressive-fields">
            <div className="premium-login__field">
              <label htmlFor="matricule">
                Matricule <span aria-hidden="true">*</span>
              </label>
              <div
                className={`premium-login__input-wrap premium-login__matricule-wrap${
                  isSearchingStudent ? " premium-login__matricule-wrap--searching" : ""
                }${studentProfile ? " premium-login__matricule-wrap--resolved" : ""}`}
              >
                <IdcardOutlined aria-hidden="true" />
                <input
                  id="matricule"
                  type="text"
                  required
                  disabled={isLoading}
                  value={matricule}
                  ref={matriculeInputRef}
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={MATRICULE_LENGTH}
                  autoComplete="username"
                  spellCheck={false}
                  aria-describedby="matricule-status"
                  onChange={(e) => {
                    const digits = e.target.value
                      .replace(/\D/g, "")
                      .slice(0, MATRICULE_LENGTH);
                    setMatricule(digits);
                    setStudentProfile(null);
                    setIsSearchingStudent(digits.length === MATRICULE_LENGTH);
                    setPassword("");
                    setShowPassword(false);
                    setErrorMsg(null);
                  }}
                  onFocus={() => setMobileFocusField("matricule")}
                  onBlur={() => setMobileFocusField(null)}
                  placeholder="Ex. 260001"
                />
                {isSearchingStudent && (
                  <span
                    className="premium-login__lookup-spinner"
                    aria-hidden="true"
                  />
                )}
                {studentProfile && (
                  <span
                    className="premium-login__lookup-check"
                    aria-hidden="true"
                  >
                    <CheckOutlined />
                  </span>
                )}
              </div>
              <p
                id="matricule-status"
                className={`premium-login__lookup-status${
                  isSearchingStudent ? " premium-login__lookup-status--searching" : ""
                }${studentProfile ? " premium-login__lookup-status--resolved" : ""}`}
                role="status"
                aria-live="polite"
              >
                {isSearchingStudent
                  ? "Recherche du dossier élève…"
                  : studentProfile
                    ? "Dossier élève retrouvé"
                    : `${matricule.length}/${MATRICULE_LENGTH} chiffres`}
              </p>
            </div>

            {studentProfile && (
              <div className="premium-login__student-discovery">
                <div className="premium-login__student-profile-heading">
                  <span aria-hidden="true">
                    <CheckOutlined />
                  </span>
                  <div>
                    <strong>Élève identifié</strong>
                    <small>Informations récupérées automatiquement</small>
                  </div>
                </div>

                <div className="premium-login__grid premium-login__student-profile">
                  <div
                    className="premium-login__field premium-login__field--reveal"
                    style={{ animationDelay: "80ms" }}
                  >
                    <label htmlFor="student-last-name">Nom</label>
                    <div className="premium-login__input-wrap premium-login__input-wrap--resolved">
                      <UserOutlined aria-hidden="true" />
                      <input
                        id="student-last-name"
                        type="text"
                        value={studentProfile.lastName}
                        readOnly
                        tabIndex={-1}
                      />
                      <CheckOutlined
                        className="premium-login__resolved-check"
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  <div
                    className="premium-login__field premium-login__field--reveal"
                    style={{ animationDelay: "150ms" }}
                  >
                    <label htmlFor="student-post-name">Post-nom</label>
                    <div className="premium-login__input-wrap premium-login__input-wrap--resolved">
                      <UserOutlined aria-hidden="true" />
                      <input
                        id="student-post-name"
                        type="text"
                        value={studentProfile.postName}
                        readOnly
                        tabIndex={-1}
                      />
                      <CheckOutlined
                        className="premium-login__resolved-check"
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  <div
                    className="premium-login__field premium-login__field--reveal"
                    style={{ animationDelay: "220ms" }}
                  >
                    <label htmlFor="student-first-name">Prénom</label>
                    <div className="premium-login__input-wrap premium-login__input-wrap--resolved">
                      <UserOutlined aria-hidden="true" />
                      <input
                        id="student-first-name"
                        type="text"
                        value={studentProfile.firstName}
                        readOnly
                        tabIndex={-1}
                      />
                      <CheckOutlined
                        className="premium-login__resolved-check"
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  <div
                    className="premium-login__field premium-login__field--reveal"
                    style={{ animationDelay: "290ms" }}
                  >
                    <label htmlFor="student-class">Classe</label>
                    <div className="premium-login__input-wrap premium-login__input-wrap--resolved">
                      <BookOutlined aria-hidden="true" />
                      <input
                        id="student-class"
                        type="text"
                        value={studentProfile.className}
                        readOnly
                        tabIndex={-1}
                      />
                      <CheckOutlined
                        className="premium-login__resolved-check"
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </div>

                <div
                  className="premium-login__field premium-login__field--reveal premium-login__student-password"
                  style={{ animationDelay: "360ms" }}
                >
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
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrorMsg(null);
                      }}
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
                </div>

                <div
                  className="premium-login__field--reveal premium-login__student-actions"
                  style={{ animationDelay: "430ms" }}
                >
                  <button
                    type="submit"
                    disabled={isLoading || !password}
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
                </div>
              </div>
            )}
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
