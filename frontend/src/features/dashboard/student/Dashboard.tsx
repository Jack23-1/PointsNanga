import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CheckCircleFilled,
  ClockCircleOutlined,
  FileProtectOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Button, Spin } from "antd";
import axios from "axios";
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
      setError("La période à consulter n’a pas été identifiée.");
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
    } catch (requestError) {
      const responseMessage = axios.isAxiosError(requestError)
        ? (
            requestError.response?.data as
              | { message?: string | string[] }
              | undefined
          )?.message
        : undefined;
      setResult(null);
      setError(
        Array.isArray(responseMessage)
          ? responseMessage.join(" ")
          : responseMessage ??
              "Impossible de charger les résultats pour le moment.",
      );
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
          <strong>Vérification de vos résultats…</strong>
          <span>Approbation, publication et calcul sont contrôlés.</span>
        </div>
      </main>
    );
  }

  if (error || !result) {
    return (
      <main className="student-result-page student-result-page--state">
        <div className="student-result-state student-result-state--error">
          <FileProtectOutlined />
          <strong>Résultats indisponibles</strong>
          <span>{error ?? "Le résultat demandé est introuvable."}</span>
          <Button icon={<ReloadOutlined />} onClick={() => void loadResult()}>
            Réessayer
          </Button>
        </div>
      </main>
    );
  }

  const approvalPassed = [
    "RESULT_NOT_PUBLISHED",
    "RESULT_INCOMPLETE",
    "INVALID_TOTAL_WEIGHT",
    "AVAILABLE",
  ].includes(result.status);
  const publicationPassed = [
    "RESULT_INCOMPLETE",
    "INVALID_TOTAL_WEIGHT",
    "AVAILABLE",
  ].includes(result.status);

  if (!result.available || !result.summary || !result.courses) {
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
              <small>Portail officiel des résultats</small>
              <strong>{result.student.schoolName}</strong>
            </div>
          </div>
          {result.period && (
            <div className="student-result-header__period">
              <ClockCircleOutlined /> {result.period.name}
            </div>
          )}
          <span className="student-result-header__app-logo" aria-label="Points Nanga">
            <img src={appLogo} alt="" />
          </span>
        </header>

        <section className="student-result-identity">
          <StudentResultAvatar
            fullName={result.student.fullName}
            photoUrl={result.student.photoUrl}
          />
          <div>
            <small>Élève identifié</small>
            <h1>{result.student.fullName}</h1>
            <p>
              {result.student.matricule}
              {result.className ? ` · ${result.className}` : ""}
              {result.schoolYear ? ` · ${result.schoolYear}` : ""}
            </p>
          </div>
        </section>

        <section className="student-result-pending">
          <FileProtectOutlined className="student-result-pending__icon" />
          <span>Résultat non disponible</span>
          <h2>{result.message ?? "Votre résultat n’est pas encore publié."}</h2>
          <p>Aucune cote n’est affichée tant que toutes les validations ne sont pas réunies.</p>
          <div className="student-result-checks">
            <div className="is-complete">
              <CheckCircleFilled />
              <span><strong>Identité vérifiée</strong><small>Matricule et inscription confirmés</small></span>
            </div>
            <div className={approvalPassed ? "is-complete" : "is-pending"}>
              {approvalPassed ? <CheckCircleFilled /> : <ClockCircleOutlined />}
              <span><strong>Grille approuvée</strong><small>Validation du directeur</small></span>
            </div>
            <div className={publicationPassed ? "is-complete" : "is-pending"}>
              {publicationPassed ? <CheckCircleFilled /> : <ClockCircleOutlined />}
              <span><strong>Résultat autorisé</strong><small>Publication individuelle</small></span>
            </div>
          </div>
        </section>
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
            <div>
              <small>Place</small>
              <strong>{result.summary.rank ? `${result.summary.rank}e` : "-"}</strong>
            </div>
            <div>
              <small>Total général</small>
              <strong>
                {formatNumber(result.summary.totalObtained)} / {formatNumber(result.summary.totalWeight)}
              </strong>
            </div>
            <div>
              <small>Conduite</small>
              <strong>{formatAppreciation(result.summary.conduite)}</strong>
            </div>
            <div>
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
                  <tr key={course.id}>
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
