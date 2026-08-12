import { FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  BookOutlined,
  CalendarOutlined,
  CheckOutlined,
  DownOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  IdcardOutlined,
  LockOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { ROUTES } from "../../../config/constants";
import { useAuth } from "../../../hooks/useAuth";
import { api } from "../../../lib/api";
import { getStudentLoginValidationError } from "../../../lib/validators";
import type { AuthResponse } from "../../../types";
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
  schoolLogoUrl?: string;
  photoUrl?: string;
}

const MATRICULE_LENGTH = 8;
const MATRICULE_PATTERN = /^[A-Z]{3}-[0-9]{4}$/;
const STUDENT_FIELDS_REVEAL_DELAY = 950;

const formatStudentMatricule = (value: string) => {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const letters = compact.match(/^[A-Z]{0,3}/)?.[0] ?? "";

  if (letters.length < 3) return letters;

  const digits = compact.slice(3).replace(/\D/g, "").slice(0, 4);
  return `${letters}-${digits}`;
};

const academicPeriods = [
  { value: "1ère", label: "1ère période", detail: "Première période", code: "P1" },
  { value: "2ème", label: "2ème période", detail: "Deuxième période", code: "P2" },
  {
    value: "1er Semestre",
    label: "1er semestre",
    detail: "Synthèse semestrielle",
    code: "S1",
  },
  { value: "3ème", label: "3ème période", detail: "Troisième période", code: "P3" },
  { value: "4ème", label: "4ème période", detail: "Quatrième période", code: "P4" },
  {
    value: "2ème semestre",
    label: "2ème semestre",
    detail: "Synthèse semestrielle",
    code: "S2",
  },
];
export default function Login() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [matricule, setMatricule] = useState<string>("");
  const [period, setPeriod] = useState("");
  const [password, setPassword] = useState<string>("");
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [isSearchingStudent, setIsSearchingStudent] = useState(false);
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [mobileFocusField, setMobileFocusField] = useState<"matricule" | "password" | null>(null);
  const matriculeInputRef = useRef<HTMLInputElement>(null);
  const periodPickerRef = useRef<HTMLDivElement>(null);
  const periodTriggerRef = useRef<HTMLButtonElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const lookupRequestRef = useRef(0);
  const selectedPeriod = academicPeriods.find(
    (periodOption) => periodOption.value === period,
  );

  useEffect(() => {
    matriculeInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const requestId = ++lookupRequestRef.current;
    setStudentProfile(null);
    setPeriod("");
    setPassword("");
    setIsPeriodMenuOpen(false);

    if (!MATRICULE_PATTERN.test(matricule)) {
      setIsSearchingStudent(false);
      return;
    }

    setIsSearchingStudent(true);
    setErrorMsg(null);

    void (async () => {
      try {
        const response = await api.get<StudentProfile>(
          `/students/by-matricule/${matricule}`,
        );
        if (lookupRequestRef.current !== requestId) return;
        setStudentProfile(response.data);
      } catch (error) {
        if (lookupRequestRef.current !== requestId) return;
        setStudentProfile(null);
        setErrorMsg(
          axios.isAxiosError(error) && !error.response
            ? "Connexion au serveur impossible. Vérifiez que le backend est démarré."
            : "Aucun élève actif trouvé avec ce matricule.",
        );
      }
      if (lookupRequestRef.current === requestId) setIsSearchingStudent(false);
    })();

    return () => {
      if (lookupRequestRef.current === requestId) lookupRequestRef.current += 1;
    };
  }, [matricule]);

  useEffect(() => {
    if (!studentProfile || period) return;

    const focusTimer = window.setTimeout(() => {
      periodTriggerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      periodTriggerRef.current?.focus();
      setIsPeriodMenuOpen(true);
    }, STUDENT_FIELDS_REVEAL_DELAY);
    return () => window.clearTimeout(focusTimer);
  }, [studentProfile, period]);

  useEffect(() => {
    if (!isPeriodMenuOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!periodPickerRef.current?.contains(event.target as Node)) {
        setIsPeriodMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPeriodMenuOpen(false);
        periodTriggerRef.current?.focus();
      }
    };
    const focusFrame = window.requestAnimationFrame(() => {
      const selectedOption =
        periodPickerRef.current?.querySelector<HTMLButtonElement>(
          ".premium-login__period-option.is-selected",
        );
      const firstOption =
        periodPickerRef.current?.querySelector<HTMLButtonElement>(
          ".premium-login__period-option",
        );
      (selectedOption ?? firstOption)?.focus();
    });

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isPeriodMenuOpen]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validationError = getStudentLoginValidationError({
      matricule,
      period,
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
      const response = await api.post<AuthResponse>("/auth/login", {
        role: "student",
        matricule,
        schoolName: resolvedStudent.schoolName,
        password: password.trim().toUpperCase(),
      });

      try {
        localStorage.setItem("student_period", selectedPeriod?.code ?? period);
      } catch {
        // A blocked storage must not cancel an otherwise valid authentication.
      }
      updateUser(response.data.user);

    } catch (error) {
      setIsPageTransitioning(false);
      if (axios.isAxiosError(error) && !error.response) {
        setErrorMsg(
          "Connexion au serveur impossible. Vérifiez que le backend est démarré.",
        );
      } else if (axios.isAxiosError(error) && error.response?.status === 401) {
        setErrorMsg("Le mot de passe élève est incorrect.");
      } else if (axios.isAxiosError(error) && error.response) {
        const responseMessage = (
          error.response.data as { message?: string | string[] } | undefined
        )?.message;
        setErrorMsg(
          Array.isArray(responseMessage)
            ? responseMessage.join(" ")
            : responseMessage ??
                `Validation refusée par le serveur (${error.response.status}).`,
        );
      } else {
        setErrorMsg(
          "Le navigateur a interrompu la validation. Rechargez la page et réessayez.",
        );
      }
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
                  inputMode="text"
                  pattern="[A-Za-z]{3}-[0-9]{4}"
                  maxLength={MATRICULE_LENGTH}
                  autoComplete="username"
                  autoCapitalize="characters"
                  spellCheck={false}
                  aria-describedby="matricule-status"
                  onKeyDown={(event) => {
                    if (
                      event.key === "Backspace" &&
                      matricule.endsWith("-") &&
                      event.currentTarget.selectionStart === matricule.length &&
                      event.currentTarget.selectionEnd === matricule.length
                    ) {
                      event.preventDefault();
                      setMatricule(matricule.slice(0, -2));
                      setErrorMsg(null);
                    }
                  }}
                  onChange={(e) => {
                    const formattedMatricule = formatStudentMatricule(
                      e.target.value,
                    );
                    setMatricule(formattedMatricule);
                    setStudentProfile(null);
                    setIsSearchingStudent(
                      MATRICULE_PATTERN.test(formattedMatricule),
                    );
                    setPeriod("");
                    setPassword("");
                    setIsPeriodMenuOpen(false);
                    setShowPassword(false);
                    setErrorMsg(null);
                  }}
                  onFocus={() => setMobileFocusField("matricule")}
                  onBlur={() => setMobileFocusField(null)}
                  placeholder="Ex. ABC-1234"
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
                    : "Format attendu : ABC-1234"}
              </p>
            </div>

            {studentProfile && (
              <div className="premium-login__student-discovery">
                <div className="premium-login__student-profile-heading">
                  <span className="premium-login__school-logo">
                    <img
                      src={studentProfile.schoolLogoUrl ?? logo}
                      alt={`Logo de ${studentProfile.schoolName}`}
                    />
                  </span>
                  <div className="premium-login__student-school">
                    <strong>{studentProfile.schoolName}</strong>
                    <small>Établissement de l’élève</small>
                  </div>
                  {studentProfile.photoUrl ? (
                    <span className="premium-login__student-photo">
                      <img
                        src={studentProfile.photoUrl}
                        alt={`Photo de ${studentProfile.firstName} ${studentProfile.lastName}`}
                      />
                    </span>
                  ) : (
                    <span
                      className="premium-login__student-avatar"
                      role="img"
                      aria-label={`Avatar de ${studentProfile.firstName} ${studentProfile.lastName}`}
                    >
                      {studentProfile.firstName.charAt(0)}
                      {studentProfile.lastName.charAt(0)}
                    </span>
                  )}
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
                  className="premium-login__field premium-login__field--reveal premium-login__student-period"
                  style={{ animationDelay: "360ms" }}
                >
                  <div className="premium-login__period-heading">
                    <label htmlFor="student-period">
                      Période <span aria-hidden="true">*</span>
                    </label>
                    {!period && (
                      <span className="premium-login__period-next-badge">
                        Étape suivante
                      </span>
                    )}
                  </div>
                  <div
                    ref={periodPickerRef}
                    className="premium-login__director-school-picker premium-login__period-picker"
                  >
                    <button
                      id="student-period"
                      ref={periodTriggerRef}
                      type="button"
                      disabled={isLoading}
                      className={`premium-login__director-school-trigger${
                        period
                          ? ""
                          : " premium-login__period-trigger--attention"
                      }`}
                      aria-haspopup="listbox"
                      aria-expanded={isPeriodMenuOpen}
                      aria-controls="student-period-options"
                      aria-describedby="student-period-guidance"
                      aria-required="true"
                      onClick={() =>
                        setIsPeriodMenuOpen((isOpen) => !isOpen)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "ArrowDown") {
                          event.preventDefault();
                          setIsPeriodMenuOpen(true);
                        }
                      }}
                    >
                      <span className="premium-login__director-school-icon">
                        <CalendarOutlined aria-hidden="true" />
                      </span>
                      <span className="premium-login__director-school-value">
                        <small>Période scolaire</small>
                        <strong className={period ? "" : "is-placeholder"}>
                          {selectedPeriod?.label ?? "Choisir une période"}
                        </strong>
                      </span>
                      <span className="premium-login__director-school-chevron">
                        <DownOutlined aria-hidden="true" />
                      </span>
                    </button>

                    {isPeriodMenuOpen && (
                      <div className="premium-login__director-school-menu premium-login__period-menu">
                        <div
                          id="student-period-options"
                          className="premium-login__director-school-options"
                          role="listbox"
                          aria-label="Liste des périodes scolaires"
                        >
                          {academicPeriods.map((periodOption, index) => (
                            <button
                              key={periodOption.value}
                              type="button"
                              role="option"
                              aria-selected={period === periodOption.value}
                              className={`premium-login__director-school-option premium-login__period-option${
                                period === periodOption.value
                                  ? " is-selected"
                                  : ""
                              }`}
                              style={{
                                animationDelay: `${55 + index * 45}ms`,
                              }}
                              onKeyDown={(event) => {
                                const options =
                                  periodPickerRef.current?.querySelectorAll<HTMLButtonElement>(
                                    ".premium-login__period-option",
                                  );
                                if (!options?.length) return;

                                if (event.key === "ArrowDown") {
                                  event.preventDefault();
                                  options[(index + 1) % options.length]?.focus();
                                }
                                if (event.key === "ArrowUp") {
                                  event.preventDefault();
                                  if (index === 0) {
                                    periodTriggerRef.current?.focus();
                                  } else {
                                    options[index - 1]?.focus();
                                  }
                                }
                              }}
                              onClick={() => {
                                setPeriod(periodOption.value);
                                setIsPeriodMenuOpen(false);
                                setErrorMsg(null);
                                periodTriggerRef.current?.focus();
                              }}
                            >
                              <span className="premium-login__director-school-monogram">
                                {periodOption.code}
                              </span>
                              <span>
                                <strong>{periodOption.label}</strong>
                                <small>{periodOption.detail}</small>
                              </span>
                              {period === periodOption.value && (
                                <CheckOutlined aria-hidden="true" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <p
                    id="student-period-guidance"
                    className={`premium-login__period-guidance${
                      period
                        ? " premium-login__period-guidance--complete"
                        : ""
                    }`}
                    role="status"
                    aria-live="polite"
                  >
                    {period
                      ? "Période sélectionnée, vous pouvez saisir votre mot de passe."
                      : "Choisissez maintenant la période à consulter pour continuer."}
                  </p>
                </div>

                <div
                  className="premium-login__field premium-login__field--reveal premium-login__student-password"
                  style={{ animationDelay: "430ms" }}
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
                      autoCapitalize="characters"
                      maxLength={11}
                      spellCheck={false}
                      onChange={(e) => {
                        setPassword(
                          e.target.value
                            .toUpperCase()
                            .replace(/\s/g, "")
                            .slice(0, 11),
                        );
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
                  style={{ animationDelay: "500ms" }}
                >
                  <button
                    type="submit"
                    disabled={isLoading || !period || !password}
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
          <span>Plateforme sécurisée de publication des résultats scolaires</span>
          <button
            type="button"
            className="premium-login__teacher-portal-link"
            onClick={() => navigate(ROUTES.TEACHER_LOGIN)}
          >
            <BookOutlined /> Espace enseignant
          </button>
        </footer>
      </section>
      {isPageTransitioning && (
        <LogoLoader
          onComplete={() =>
            navigate(
              `${ROUTES.DASHBOARD}?period=${encodeURIComponent(
                selectedPeriod?.code ?? "",
              )}`,
            )
          }
          duration={2000}
          transparent
          label="Connexion..."
        />
      )}
    </main>
  );
}
