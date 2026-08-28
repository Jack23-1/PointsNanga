import { type CSSProperties, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CheckCircleFilled,
  FileProtectOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Button, Spin } from "antd";
import appLogo from "../../../assets/logo.png";
import { ROUTES } from "../../../config/constants";
import { useAuth } from "../../../hooks/useAuth";
import { api } from "../../../lib/api";

interface StudentResultCourse {
  id: string;
  name: string;
  code?: string | null;
  teacherName?: string | null;
  grade: number;
  weight: number;
}

interface StudentResultResponse {
  available: boolean;
  status: string;
  message?: string;
  student: {
    id: string;
    matricule: string;
    fullName: string;
    lastName: string;
    postName: string;
    firstName: string;
    photoUrl?: string | null;
    schoolName: string;
    schoolLogoUrl?: string | null;
  };
  className?: string;
  schoolYear?: string;
  period?: {
    id: string;
    code: string;
    name: string;
    number: number;
    isOpen: boolean;
  };
  homeroomTeacherName?: string;
  publishedAt?: string | null;
  summary?: {
    totalObtained: number;
    totalWeight: number;
    percentage: number;
    rank?: number | null;
    conduite?: string | null;
    application?: string | null;
  };
  courses?: StudentResultCourse[];
}

const periodAliases: Record<string, string> = {
  "1ère": "P1",
  "1ère période": "P1",
  "2ème": "P2",
  "2ème période": "P2",
  "1er semestre": "S1",
  "3ème": "P3",
  "3ème période": "P3",
  "4ème": "P4",
  "4ème période": "P4",
  "2ème semestre": "S2",
};

const normalizePeriodCode = (value?: string | null) => {
  if (!value) return "";
  const trimmed = value.trim();
  if (/^(P1|P2|S1|P3|P4|S2)$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  return periodAliases[trimmed.toLocaleLowerCase("fr")] ?? "";
};

const readStoredPeriod = () => {
  try {
    return localStorage.getItem("student_period");
  } catch {
    return null;
  }
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);

const formatPercentage = (value: number) =>
  new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const formatAppreciation = (value?: string | null) => {
  if (!value) return "Non renseignée";
  const labels: Record<string, string> = {
    excellente: "Excellente",
    bonne: "Bonne",
    mediocre: "Médiocre",
    mauvaise: "Mauvaise",
  };
  return labels[value] ?? value;
};

const hasStudentPhoto = (photoUrl?: string | null) =>
  Boolean(photoUrl?.trim());

const StudentResultAvatar = ({
  fullName,
  photoUrl,
}: {
  fullName: string;
  photoUrl?: string | null;
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const showPhoto = hasStudentPhoto(photoUrl) && !imageFailed;

  return (
    <span className="student-result-identity__avatar">
      {showPhoto ? (
        <img
          src={photoUrl ?? ""}
          alt=""
          onError={() => setImageFailed(true)}
        />
      ) : (
        getInitials(fullName) || <UserOutlined />
      )}
    </span>
  );
};

const getInitials = (fullName: string) =>
  fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0]?.toUpperCase())
    .join("");

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [searchParams] = useSearchParams();
  const requestedPeriod = searchParams.get("period");
  const periodCode = useMemo(
    () =>
      normalizePeriodCode(requestedPeriod) ||
      normalizePeriodCode(readStoredPeriod()),
    [requestedPeriod],
  );
  const [result, setResult] = useState<StudentResultResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadResult = useCallback(async () => {
    if (!periodCode) {
      setResult(null);
      setError("resultat indisponible");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<StudentResultResponse>(
        "/results/student",
        { period: periodCode },
      );
      setResult(response.data);
    } catch {
      setResult(null);
      setError("resultat indisponible");
    } finally {
      setIsLoading(false);
    }
  }, [periodCode]);

  useEffect(() => {
    void loadResult();
  }, [loadResult]);

  if (isLoading) {
    return (
      <main className="student-result-page student-result-page--state">
        <div className="student-result-state">
          <Spin size="large" />
          <strong>Chargement en cours…</strong>
          <span>Veuillez patienter.</span>
        </div>
      </main>
    );
  }

  if (error || !result || !result.available || !result.summary || !result.courses) {
    const isPersonalUnavailable = result?.status === "PERSONAL_UNAVAILABLE";
    const unavailableTitle = "Vos résultats ne sont pas encore disponibles";
    const unavailableDescription = isPersonalUnavailable
      ? "Votre dossier est en attente d'activation individuelle."
      : "Cette période n'est pas encore ouverte pour la consultation.";

    return (
      <main className="student-result-page student-result-page--state">
        <div className="student-result-state student-result-state--error">
          <span className="student-result-state__brand" aria-label="Points Nanga">
            <img src={appLogo} alt="" />
          </span>
          <span className="student-result-state__icon-wrap" aria-hidden="true">
            <FileProtectOutlined />
          </span>
          <strong>{unavailableTitle}</strong>
          <span>{unavailableDescription}</span>
          <Button icon={<ReloadOutlined />} onClick={() => void loadResult()}>
            Réessayer
          </Button>
        </div>
      </main>
    );
  }

  const percentage = result.summary.percentage;
  const clampedPercentage = Math.min(100, Math.max(0, percentage));
  const percentagePassed = percentage >= 50;
  const percentageColor = percentagePassed ? "#16a36a" : "#dc2626";
  const quitToLogin = () => {
    logout();
    navigate(ROUTES.LOGIN, { replace: true });
  };
  const getResultRevealStyle = (index: number) =>
    ({
      "--student-result-delay": `${Math.min(index, 24) * 42}ms`,
    }) as CSSProperties;
  const getSummaryRevealStyle = (index: number) =>
    ({
      "--student-summary-delay": `${index * 70}ms`,
    }) as CSSProperties;

  return (
    <main className="student-result-page">
      <header className="student-result-header">
        <div className="student-result-header__school">
          <span>
            {result.student.schoolLogoUrl ? (
              <img src={result.student.schoolLogoUrl} alt="" />
            ) : (
              <SafetyCertificateOutlined />
            )}
          </span>
          <div>
            <small>Résultat scolaire officiel</small>
            <strong>{result.student.schoolName}</strong>
          </div>
        </div>
        <div className="student-result-header__period">
          <CheckCircleFilled /> {result.period?.name}
        </div>
        <span className="student-result-header__app-logo" aria-label="Points Nanga">
          <img src={appLogo} alt="" />
        </span>
      </header>

      <section className="student-result-overview">
        <div className="student-result-identity">
          <StudentResultAvatar
            fullName={result.student.fullName}
            photoUrl={result.student.photoUrl}
          />
          <div>
            <h1>{result.student.fullName}</h1>
            <p>{result.student.matricule}</p>
          </div>
        </div>

        <div className="student-result-context">
          <div><small>Classe</small><strong>{result.className}</strong></div>
          <div><small>Année scolaire</small><strong>{result.schoolYear}</strong></div>
          <div><small>Titulaire</small><strong>{result.homeroomTeacherName}</strong></div>
        </div>

        <div className={`student-result-summary ${percentagePassed ? "is-pass" : "is-fail"}`}>
          <div
            className="student-result-percentage"
            style={{
              background: `conic-gradient(${percentageColor} ${clampedPercentage}%, #e6edf3 ${clampedPercentage}% 100%)`,
            }}
            aria-label={`Pourcentage : ${formatPercentage(percentage)} pour cent`}
          >
            <div><strong>{formatPercentage(percentage)}%</strong><span>Pourcentage</span></div>
          </div>
          <div className="student-result-summary__items">
            <div style={getSummaryRevealStyle(0)}>
              <small>Place</small>
              <strong>{result.summary.rank ? `${result.summary.rank}e` : "-"}</strong>
            </div>
            <div style={getSummaryRevealStyle(1)}>
              <small>Total général</small>
              <strong>
                {formatNumber(result.summary.totalObtained)} / {formatNumber(result.summary.totalWeight)}
              </strong>
            </div>
            <div style={getSummaryRevealStyle(2)}>
              <small>Conduite</small>
              <strong>{formatAppreciation(result.summary.conduite)}</strong>
            </div>
            <div style={getSummaryRevealStyle(3)}>
              <small>Application</small>
              <strong>{formatAppreciation(result.summary.application)}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="student-result-sheet">
        <div className="student-result-table-wrap">
          <table className="student-result-table">
            <thead>
              <tr>
                <th scope="col" className="student-result-col-index">N°</th>
                <th scope="col" className="student-result-col-course">Cours</th>
                <th scope="col" className="student-result-col-teacher">Professeur</th>
                <th scope="col" className="student-result-col-grade">Cote obtenue</th>
                <th scope="col" className="student-result-col-weight">Pondération</th>
                <th scope="col" className="student-result-col-rate">Taux</th>
              </tr>
            </thead>
            <tbody>
              {result.courses.map((course, index) => {
                const courseRate = course.weight > 0
                  ? (course.grade / course.weight) * 100
                  : 0;
                const coursePassed = course.grade >= course.weight / 2;
                return (
                  <tr key={course.id} style={getResultRevealStyle(index)}>
                    <td className="student-result-col-index" data-label="N°">{index + 1}</td>
                    <td className="student-result-col-course" data-label="Cours">
                      <strong>{course.name}</strong>
                    </td>
                    <td className="student-result-col-teacher" data-label="Professeur">
                      {course.teacherName ?? "Non renseigné"}
                    </td>
                    <td
                      className={`student-result-col-grade ${coursePassed ? "is-pass" : "is-fail"}`}
                      data-label="Cote obtenue"
                    >
                      <b>{formatNumber(course.grade)}</b>
                    </td>
                    <td className="student-result-col-weight" data-label="Pondération">{formatNumber(course.weight)}</td>
                    <td className="student-result-col-rate" data-label="Taux"><span>{formatPercentage(courseRate)}%</span></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td className="student-result-col-index" aria-hidden="true" />
                <td className="student-result-col-course student-result-col-total" data-label="Synthèse">Total général</td>
                <td className="student-result-col-teacher" aria-hidden="true" />
                <td
                  className={`student-result-col-grade ${percentagePassed ? "is-pass" : "is-fail"}`}
                  data-label="Cotes"
                >
                  {formatNumber(result.summary.totalObtained)}
                </td>
                <td className="student-result-col-weight" data-label="Pondération">{formatNumber(result.summary.totalWeight)}</td>
                <td className="student-result-col-rate" data-label="Pourcentage">{formatPercentage(result.summary.percentage)}%</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <footer className="student-result-sheet__footer">
          <Button
            className="student-result-sheet__quit"
            size="small"
            onClick={quitToLogin}
          >
            Quitter
          </Button>
          <small>{result.period?.name} · {result.schoolYear}</small>
        </footer>
      </section>
    </main>
  );
};

export default StudentDashboard;
