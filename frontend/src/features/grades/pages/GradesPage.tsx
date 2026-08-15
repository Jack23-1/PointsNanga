import {
  type CSSProperties,
  type ClipboardEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BookOutlined,
  BellOutlined,
  CloudSyncOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  ReloadOutlined,
  SaveOutlined,
  UserOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Empty,
  Input,
  InputNumber,
  Skeleton,
  Tooltip,
  Modal,
  message,
  Select,
} from "antd";
import axios from "axios";
import { api } from "../../../lib/api";
import { API_URL } from "../../../config/constants";

interface Student {
  id: string;
  matricule: string;
  name: string;
  photo?: string | null;
  orderNumber?: number | null;
}

interface Course {
  id: string;
  name: string;
  weight: number;
  teacherName?: string | null;
}

interface TeacherRevision {
  assignmentId: string; periodId: string; className: string; courseName: string; teacherName: string; weight: number;
  changes: Array<{ enrollmentId: string; studentName: string; matricule: string; oldValue: number | null; newValue: number }>;
}

interface Gradebook {
  className: string;
  schoolYear: string;
  period: { id: string; name: string; isOpen: boolean } | null;
  periods: { id: string; name: string; number: number; isOpen: boolean }[];
  students: Student[];
  courses: Course[];
  submissionStatus: "SUBMITTED" | "APPROVED" | "REOPENED" | "REJECTED" | null;
  pendingTeacherRevisions?: TeacherRevision[];
  rejectionComment?: string | null;
  rejectedAt?: string | null;
  grades: {
    enrollmentId: string;
    courseClassId: string;
    value: number;
  }[];
  results?: {
    enrollmentId: string;
    totalObtained: number;
    totalWeight: number;
    percentage: number;
    rank: number | null;
    conduite?: AppreciationValue | null;
    application?: AppreciationValue | null;
  }[];
}

type AppreciationValue = "bonne" | "mauvaise" | "mediocre" | "excellente";

interface StudentAppreciation {
  conduite?: AppreciationValue | null;
  application?: AppreciationValue | null;
}

interface StudentSummary {
  totalObtained: number;
  totalWeight: number;
  percentage: number;
  rank: number;
}

const gradeKey = (studentId: string, courseId: string) =>
  `${studentId}:${courseId}`;

const clampGradeValue = (value: number, weight: number) =>
  Math.min(weight, Math.max(0, Math.round(value)));

const getGradeInputId = (studentId: string, courseId: string) =>
  `grade-input-${studentId}-${courseId}`;

const appreciationOptions: { value: AppreciationValue; label: string }[] = [
  { value: "excellente", label: "Excellente" },
  { value: "bonne", label: "Bonne" },
  { value: "mediocre", label: "Médiocre" },
  { value: "mauvaise", label: "Mauvaise" },
];

const formatGradeNumber = (value: number) =>
  new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);

const roundToTwoDecimals = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const ALLOWED_GRADE_KEYS = new Set([
  "Backspace",
  "Delete",
  "Tab",
  "Enter",
  "Escape",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
]);

const warnInvalidGrade = (content: string) => {
  message.warning({
    key: "invalid-grade-value",
    className: "gradebook__validation-message",
    icon: <span />,
    content: (
      <span className="gradebook__validation-dialog">
        <span className="gradebook__validation-icon">
          <WarningOutlined />
        </span>
        <span className="gradebook__validation-copy">
          <strong>Saisie refusée</strong>
          <small>{content}</small>
        </span>
      </span>
    ),
    duration: 1,
  });
};

const errorMessage = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError(error)) return fallback;
  const value = error.response?.data?.message;
  return Array.isArray(value)
    ? value.join(" ")
    : typeof value === "string"
      ? value
      : fallback;
};

interface GradesPageProps {
  titularName?: string;
  schoolLogo?: string | null;
}

const GradesPage = ({ titularName, schoolLogo }: GradesPageProps) => {
  const [data, setData] = useState<Gradebook | null>(null);
  const [grades, setGrades] = useState<Record<string, number>>({});
  const [appreciations, setAppreciations] = useState<
    Record<string, StudentAppreciation>
  >({});
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editVersion, setEditVersion] = useState(0);
  const [autoSaveStatus, setAutoSaveStatus] = useState<
    "saved" | "pending" | "saving"
  >("saved");
  const [selectedTeacherRevision, setSelectedTeacherRevision] = useState<TeacherRevision | null>(null);
  const [showAllTeacherRevisions, setShowAllTeacherRevisions] = useState(false);
  const editVersionRef = useRef(0);

  const markGradeChanged = () => {
    editVersionRef.current += 1;
    setEditVersion(editVersionRef.current);
    setAutoSaveStatus("pending");
  };

  const loadGradebook = async (periodId?: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await api.get<Gradebook>("/grades/homeroom", {
        refreshedAt: Date.now(),
        ...(periodId ? { periodId } : {}),
      });
      const courseWeights = new Map(
        response.data.courses.map((course) => [course.id, course.weight]),
      );
      setData(response.data);
      editVersionRef.current = 0;
      setEditVersion(0);
      setAutoSaveStatus("saved");
      setGrades(
        Object.fromEntries(
          response.data.grades.map((grade) => {
            const weight =
              courseWeights.get(grade.courseClassId) ?? grade.value;
            return [
              gradeKey(grade.enrollmentId, grade.courseClassId),
              clampGradeValue(grade.value, weight),
            ];
          }),
        ),
      );
      setAppreciations(
        Object.fromEntries(
          (response.data.results ?? []).map((result) => [
            result.enrollmentId,
            {
              conduite: result.conduite ?? null,
              application: result.application ?? null,
            },
          ]),
        ),
      );
    } catch (error) {
      if (!silent) {
        message.error(errorMessage(error, "Chargement des cotes impossible."));
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const acceptTeacherRevision = async (assignmentId: string, periodId: string) => {
    await api.post(`/grades/homeroom/teacher-revisions/${assignmentId}/periods/${periodId}/accept`);
    await loadGradebook(data?.period?.id ?? periodId, true);
    message.success("Les nouvelles cotes ont été intégrées dans votre grille.");
  };

  useEffect(() => {
    void loadGradebook();
  }, []);

  const students = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    if (!normalized) return data?.students ?? [];
    return (data?.students ?? []).filter((student) =>
      `${student.name} ${student.matricule}`
        .toLocaleLowerCase("fr")
        .includes(normalized),
    );
  }, [data, query]);
  const pendingTeacherRevisions = data?.pendingTeacherRevisions ?? [];
  const pendingTeacherCount = new Set(pendingTeacherRevisions.map((item) => item.teacherName)).size;
  const pendingChangesCount = pendingTeacherRevisions.reduce((total, item) => total + item.changes.length, 0);
  const displayedTeacherRevisions = pendingTeacherCount > 3 && !showAllTeacherRevisions
    ? pendingTeacherRevisions.filter((item, index, all) => all.findIndex((candidate) => candidate.teacherName === item.teacherName) === index).slice(0, 3)
    : pendingTeacherRevisions;

  const studentSummaries = useMemo<Record<string, StudentSummary>>(() => {
    if (!data) return {};
    const totalWeight = data.courses.reduce(
      (sum, course) => sum + course.weight,
      0,
    );
    const summaries = data.students.map((student) => {
      const totalObtained = data.courses.reduce(
        (sum, course) => sum + (grades[gradeKey(student.id, course.id)] ?? 0),
        0,
      );
      return {
        studentId: student.id,
        totalObtained: roundToTwoDecimals(totalObtained),
        totalWeight: roundToTwoDecimals(totalWeight),
        percentage:
          totalWeight > 0
            ? roundToTwoDecimals((totalObtained / totalWeight) * 100)
            : 0,
        rank: 0,
      };
    });
    const sortedSummaries = [...summaries].sort(
      (left, right) => right.percentage - left.percentage,
    );
    let lastPercentage: number | null = null;
    let currentRank = 0;
    sortedSummaries.forEach((summary, index) => {
      if (lastPercentage === null || summary.percentage !== lastPercentage) {
        currentRank = index + 1;
        lastPercentage = summary.percentage;
      }
      summary.rank = currentRank;
    });
    return Object.fromEntries(
      summaries.map((summary) => [
        summary.studentId,
        {
          totalObtained: summary.totalObtained,
          totalWeight: summary.totalWeight,
          percentage: summary.percentage,
          rank: summary.rank,
        },
      ]),
    );
  }, [data, grades]);

  const changeAppreciation = (
    studentId: string,
    field: keyof StudentAppreciation,
    value?: AppreciationValue,
  ) => {
    markGradeChanged();
    setAppreciations((current) => ({
      ...current,
      [studentId]: {
        ...current[studentId],
        [field]: value ?? null,
      },
    }));
  };

  const focusGradeCell = (rowIndex: number, columnIndex: number) => {
    if (!data) return;

    const targetStudent = students[rowIndex];
    const targetCourse = data.courses[columnIndex];

    if (!targetStudent || !targetCourse) return;

    const targetInput = document.getElementById(
      getGradeInputId(targetStudent.id, targetCourse.id),
    );

    if (!(targetInput instanceof HTMLInputElement)) return;

    targetInput.focus();
    targetInput.select();
  };

  const handleGradeKeyDown = (
    event: KeyboardEvent<HTMLElement>,
    rowIndex: number,
    columnIndex: number,
    weight: number,
  ) => {
    const { key, ctrlKey, metaKey } = event;

    if (
      key === "ArrowUp" ||
      key === "ArrowDown" ||
      key === "ArrowLeft" ||
      key === "ArrowRight"
    ) {
      event.preventDefault();

      const nextRowIndex =
        key === "ArrowUp"
          ? rowIndex - 1
          : key === "ArrowDown"
            ? rowIndex + 1
            : rowIndex;

      const nextColumnIndex =
        key === "ArrowLeft"
          ? columnIndex - 1
          : key === "ArrowRight"
            ? columnIndex + 1
            : columnIndex;

      if (
        nextRowIndex >= 0 &&
        nextRowIndex < students.length &&
        nextColumnIndex >= 0 &&
        nextColumnIndex < (data?.courses.length ?? 0)
      ) {
        requestAnimationFrame(() =>
          focusGradeCell(nextRowIndex, nextColumnIndex),
        );
      }

      return;
    }

    if (
      (ctrlKey || metaKey) &&
      ["a", "c", "v", "x"].includes(key.toLowerCase())
    ) {
      return;
    }

    if (ALLOWED_GRADE_KEYS.has(key)) {
      return;
    }

    if (/^\d$/.test(key)) {
      const input = event.target;
      if (input instanceof HTMLInputElement) {
        const start = input.selectionStart ?? input.value.length;
        const end = input.selectionEnd ?? input.value.length;
        const nextValue = `${input.value.slice(0, start)}${key}${input.value.slice(end)}`;
        if (Number(nextValue) > weight) {
          event.preventDefault();
          warnInvalidGrade(`La cote maximale pour ce cours est ${weight}.`);
        }
      }
      return;
    }

    event.preventDefault();
    warnInvalidGrade("Saisissez uniquement des chiffres.");
  };

  const handleGradePaste = (
    event: ClipboardEvent<HTMLElement>,
    currentKey: string,
    weight: number,
  ) => {
    const raw = event.clipboardData.getData("text").trim();

    if (!/^\d+$/.test(raw)) {
      event.preventDefault();
      warnInvalidGrade("Le collage doit contenir uniquement des chiffres.");
      return;
    }

    event.preventDefault();
    const numeric = Number(raw);

    if (Number.isNaN(numeric)) {
      return;
    }

    if (numeric > weight) {
      warnInvalidGrade(`La cote maximale pour ce cours est ${weight}.`);
      return;
    }

    markGradeChanged();
    setGrades((current) => ({
      ...current,
      [currentKey]: clampGradeValue(numeric, weight),
    }));
  };

  const save = async (automatic = false) => {
    if (!data?.period) return;
    if (
      !data.period.isOpen &&
      !["REOPENED", "REJECTED"].includes(data.submissionStatus ?? "")
    ) return;
    const versionBeingSaved = editVersionRef.current;
    const courseWeights = new Map(
      data.courses.map((course) => [course.id, course.weight]),
    );
    const payload = Object.entries(grades).map(([key, value]) => {
      const [enrollmentId, courseClassId] = key.split(":");
      const weight = courseWeights.get(courseClassId) ?? value;
      return {
        enrollmentId: Number(enrollmentId),
        courseClassId: Number(courseClassId),
        value: clampGradeValue(value, weight),
      };
    });
    const appreciationPayload = (data.students ?? []).map((student) => ({
      enrollmentId: Number(student.id),
      conduite: appreciations[student.id]?.conduite ?? null,
      application: appreciations[student.id]?.application ?? null,
    }));
    setSaving(true);
    if (automatic) setAutoSaveStatus("saving");
    try {
      await api.patch("/grades/homeroom", {
        periodId: Number(data.period.id),
        grades: payload,
        appreciations: appreciationPayload,
      });
      if (automatic) {
        if (versionBeingSaved === editVersionRef.current) {
          setAutoSaveStatus("saved");
        }
      } else {
        message.success(
          `${payload.length} cote${payload.length > 1 ? "s" : ""} enregistrée${payload.length > 1 ? "s" : ""}.`,
        );
        setAutoSaveStatus("saved");
        await loadGradebook();
      }
    } catch (error) {
      message.error(
        errorMessage(error, "Enregistrement des cotes impossible."),
      );
    } finally {
      setSaving(false);
    }
  };

  const submitGrades = () => {
    if (!data?.period) return;
    const missingGradeCount = data.students.reduce(
      (count, student) =>
        count +
        data.courses.filter((course) => {
          const value = grades[gradeKey(student.id, course.id)];
          return value === undefined || Number.isNaN(value);
        }).length,
      0,
    );
    if (missingGradeCount > 0) {
      message.warning(
        `Validation impossible : ${missingGradeCount} cote${missingGradeCount > 1 ? "s sont manquantes" : " est manquante"}.`,
      );
      return;
    }
    const missingAppreciationCount = data.students.reduce((count, student) => {
      const appreciation = appreciations[student.id];
      return (
        count +
        (appreciation?.conduite ? 0 : 1) +
        (appreciation?.application ? 0 : 1)
      );
    }, 0);
    if (missingAppreciationCount > 0) {
      message.warning(
        `Validation impossible : ${missingAppreciationCount} champ${missingAppreciationCount > 1 ? "s sont manquants" : " est manquant"} dans Conduite ou Application.`,
      );
      return;
    }
    Modal.confirm({
      centered: true,
      title: `Valider les cotes de ${data.period.name} ?`,
      content: "Le directeur recevra une notification indiquant que les cotes de cette période ont été envoyées.",
      okText: "Valider et envoyer",
      cancelText: "Annuler",
      async onOk() {
        setSubmitting(true);
        try {
          await save(true);
          await api.post("/grades/homeroom/submit", { periodId: data.period?.id });
          message.success("Les cotes ont été validées et le directeur a été notifié.");
          await loadGradebook(data.period?.id);
        } catch (error) {
          message.error(errorMessage(error, "Validation des cotes impossible."));
          throw error;
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  useEffect(() => {
    if (
      editVersion === 0 ||
      !data ||
      (!["REOPENED", "REJECTED"].includes(data.submissionStatus ?? "") && !data.period?.isOpen) ||
      ["SUBMITTED", "APPROVED"].includes(data.submissionStatus ?? "")
    ) return;

    const timeoutId = window.setTimeout(() => {
      void save(true);
    }, 1000);

    return () => window.clearTimeout(timeoutId);
    // The edit version intentionally restarts this one-second debounce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editVersion]);

  useEffect(() => {
    let active = true;
    let fallbackInterval: number | undefined;
    const events = new EventSource(`${API_URL}/grade-submissions/homeroom/events`, {
      withCredentials: true,
    });
    events.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data) as { action?: string; comment?: string; assignmentId?: string; periodId?: string; courseName?: string };
        if (update.action === "teacher_revision" && update.assignmentId && update.periodId) {
          void loadGradebook(update.periodId, true);
          message.warning(`Modification reçue${update.courseName ? ` pour ${update.courseName}` : ""}. Consultez les détails avant de l’accepter.`);
          return;
        }
        if (update.action === "approved" || update.action === "reopened" || update.action === "rejected" || update.action === "teacher_submitted") {
          if (!active) return;
          void loadGradebook(data?.period?.id, true);
          message.info(
            update.action === "teacher_submitted"
              ? "Un professeur vient d’envoyer les cotes de son cours. La grille a été actualisée."
              : update.action === "rejected"
              ? "Le directeur a rejeté votre grille. Consultez son commentaire et effectuez les corrections."
              : update.action === "reopened"
              ? "Le directeur a ouvert votre grille pour correction."
              : "Le directeur a approuvé et verrouillé votre grille.",
          );
        }
      } catch {
        // Les battements de connexion sans données métier sont ignorés.
      }
    };
    const refreshSilently = () => {
      if (active) void loadGradebook(data?.period?.id, true);
    };
    events.onerror = () => {
      if (!fallbackInterval) {
        fallbackInterval = window.setInterval(refreshSilently, 5000);
      }
    };
    events.onopen = () => {
      if (fallbackInterval) {
        window.clearInterval(fallbackInterval);
        fallbackInterval = undefined;
      }
      refreshSilently();
    };
    return () => {
      active = false;
      events.close();
      if (fallbackInterval) window.clearInterval(fallbackInterval);
    };
    // La connexion reste stable ; l’identifiant courant est lu lors de l’événement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.period?.id]);

  if (loading && !data) {
    return <Skeleton active paragraph={{ rows: 14 }} />;
  }

  if (!data) {
    return (
      <Card>
        <Empty description="Le carnet de cotes est indisponible.">
          <Button onClick={() => void loadGradebook()}>Réessayer</Button>
        </Empty>
      </Card>
    );
  }

  const isLocked = ["SUBMITTED", "APPROVED"].includes(data.submissionStatus ?? "");
  const canEdit = !isLocked && (Boolean(data.period?.isOpen) || ["REOPENED", "REJECTED"].includes(data.submissionStatus ?? ""));

  const headerRotationClass = "gradebook__sheet--rotate-90";
  const longestCourseName = data.courses.reduce(
    (longest, course) => Math.max(longest, course.name.length),
    0,
  );
  const courseHeaderHeight = Math.max(250, longestCourseName * 9 + 65);
  const sheetStyle = {
    "--gradebook-header-height": `${courseHeaderHeight}px`,
    "--gradebook-title-width": `${courseHeaderHeight - 40}px`,
  } as CSSProperties;
  const getColumnRevealStyle = (index: number) =>
    ({
      "--gradebook-column-delay": `${Math.min(index, 22) * 24}ms`,
    }) as CSSProperties;
  const getRowRevealStyle = (index: number) =>
    ({
      "--gradebook-row-delay": `${Math.min(index, 18) * 34}ms`,
    }) as CSSProperties;

  return (
    <section className="gradebook">
      <header className="gradebook__hero">
        <div className="gradebook__hero-icon">
          <BookOutlined />
        </div>
        <div>
          <span>Carnet de cotes · {data.schoolYear}</span>
          <h1>{data.className}</h1>
          <p>
            {canEdit
              ? `Saisie ouverte pour : ${data.period?.name ?? "la période sélectionnée"}`
              : data.period
                ? `Consultation : ${data.period.name}`
              : "La saisie est suspendue jusqu’à l’ouverture d’une période."}
          </p>
          {titularName && (
            <div className="gradebook__titular">
              <span>Titulaire :</span>
              <strong>{titularName}</strong>
            </div>
          )}
        </div>
        <div className="gradebook__actions">
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void loadGradebook(data.period?.id)}
          >
            Actualiser
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            disabled={!canEdit}
            loading={saving}
            onClick={() => void save(false)}
          >
            Enregistrer les cotes
          </Button>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            disabled={!canEdit}
            loading={submitting}
            onClick={submitGrades}
          >
            {isLocked ? "Cotes validées" : "Valider les cotes"}
          </Button>
        </div>
      </header>

      <nav className="gradebook__periods" aria-label="Périodes scolaires">
        {data.periods.map((period) => (
          <button
            key={period.id}
            type="button"
            className={`gradebook__period-button${data.period?.id === period.id ? " is-active" : ""}${period.isOpen ? " is-open" : ""}`}
            onClick={() => void loadGradebook(period.id)}
          >
            <span>{period.number}</span>
            <strong>{period.name}</strong>
            {period.isOpen && <small>Ouverte</small>}
          </button>
        ))}
      </nav>

      {!data.period?.isOpen && !["REOPENED", "REJECTED"].includes(data.submissionStatus ?? "") && (
        <Alert
          showIcon
          type="info"
          message={`${data.period?.name ?? "Cette période"} est en consultation`}
          description="Les cotes de cette période sont visibles mais ne peuvent être modifiées que lorsqu’elle est ouverte."
        />
      )}
      {data.submissionStatus === "REOPENED" && (
        <Alert
          showIcon
          type="warning"
          message="Grille ouverte par le directeur"
          description="Vous pouvez corriger les cotes. Une nouvelle validation sera obligatoire après vos modifications."
        />
      )}
      {data.submissionStatus === "REJECTED" && (
        <Alert
          showIcon
          type="error"
          message="Grille rejetée par le directeur"
          description={<><strong>Commentaire du directeur :</strong> {data.rejectionComment || "Veuillez corriger la grille puis la soumettre à nouveau."}</>}
        />
      )}
      {pendingTeacherRevisions.length > 0 && (
        <Card className="gradebook__teacher-revisions" title={<div className="gradebook__teacher-revisions-title"><span><BellOutlined /></span><div><strong>{pendingTeacherCount} professeur{pendingTeacherCount > 1 ? "s" : ""} · {pendingChangesCount} cote{pendingChangesCount > 1 ? "s" : ""} à vérifier</strong><small>Les anciennes cotes restent protégées jusqu’à votre décision.</small></div><b>{pendingTeacherRevisions.length}</b></div>}>
          {displayedTeacherRevisions.map((revision) => (
            <div className="gradebook__teacher-revision" key={`${revision.assignmentId}-${revision.periodId}`}>
              <div className="gradebook__teacher-revision-content">
                <div className="gradebook__teacher-revision-meta"><span className="is-course">{revision.courseName}</span><span className="is-class">{revision.className}</span><span className="is-count">{revision.changes.length} modification{revision.changes.length > 1 ? "s" : ""}</span></div>
                <div className="gradebook__teacher-revision-teacher"><UserOutlined /><span>Envoyé par <b>{revision.teacherName}</b></span></div>
                <div className="gradebook__teacher-revision-changes">
                  {revision.changes.slice(0, 3).map((change) => (
                    <div className="gradebook__teacher-revision-change" key={change.enrollmentId}>
                      <span className="is-student"><b>{change.studentName}</b><small>{change.matricule}</small></span>
                      <span className="is-old"><small>Ancienne cote</small><b>{change.oldValue ?? "—"}/{revision.weight}</b></span>
                      <span className="is-arrow">›</span>
                      <span className="is-new"><small>Nouvelle cote</small><b>{change.newValue}/{revision.weight}</b></span>
                    </div>
                  ))}
                </div>
                {revision.changes.length > 3 && <Button className="gradebook__teacher-revision-more" type="link" onClick={() => setSelectedTeacherRevision(revision)}>Voir les {revision.changes.length} élèves concernés</Button>}
              </div>
              <div className="gradebook__teacher-revision-action"><small>Vérifiez les changements avant de les appliquer.</small><Button type="primary" icon={<CheckCircleOutlined />} onClick={() => void acceptTeacherRevision(revision.assignmentId, revision.periodId)}>Accepter et intégrer</Button></div>
            </div>
          ))}
          {pendingTeacherCount > 3 && (
            <Button block className="gradebook__teacher-revisions-toggle" onClick={() => setShowAllTeacherRevisions((value) => !value)}>
              {showAllTeacherRevisions ? "Réduire la liste" : `Voir toutes les demandes (${pendingTeacherCount} professeurs)`}
            </Button>
          )}
        </Card>
      )}
      <Modal open={Boolean(selectedTeacherRevision)} centered width={680} footer={null} title={selectedTeacherRevision ? `${selectedTeacherRevision.courseName} · ${selectedTeacherRevision.className}` : "Détails des modifications"} onCancel={() => setSelectedTeacherRevision(null)} rootClassName="teacher-revision-details-modal">
        {selectedTeacherRevision && <>
          <div className="teacher-revision-details-modal__summary"><UserOutlined /><span><small>Professeur</small><b>{selectedTeacherRevision.teacherName}</b></span><strong>{selectedTeacherRevision.changes.length} modifications</strong></div>
          <div className="teacher-revision-details-modal__list">
            {selectedTeacherRevision.changes.map((change, index) => <div key={change.enrollmentId}><em>{index + 1}</em><span><b>{change.studentName}</b><small>{change.matricule}</small></span><del>{change.oldValue ?? "—"}/{selectedTeacherRevision.weight}</del><i>→</i><ins>{change.newValue}/{selectedTeacherRevision.weight}</ins></div>)}
          </div>
          <Button block type="primary" icon={<CheckCircleOutlined />} onClick={async () => { await acceptTeacherRevision(selectedTeacherRevision.assignmentId, selectedTeacherRevision.periodId); setSelectedTeacherRevision(null); }}>Accepter et intégrer ces modifications</Button>
        </>}
      </Modal>
      {isLocked && (
        <Alert
          showIcon
          type="success"
          message="Cotes validées et envoyées au directeur"
          description="Cette grille est verrouillée. Seul le directeur peut autoriser une nouvelle modification."
        />
      )}

      <Card className="gradebook__card">
        <div className="gradebook__toolbar">
          <div className="gradebook__toolbar-summary">
            <div className="gradebook__toolbar-icon">
              <UserOutlined />
            </div>
            <div>
              <strong>Carnet de la classe</strong>
              <span>{data.students.length} élèves · {data.courses.length} cours</span>
            </div>
          </div>
          <div className={`gradebook__autosave gradebook__autosave--${autoSaveStatus}`}>
            {autoSaveStatus === "saving" ? (
              <LoadingOutlined spin />
            ) : (
              <CloudSyncOutlined />
            )}
            <span>
              {autoSaveStatus === "pending"
                ? "Modification en attente"
                : autoSaveStatus === "saving"
                  ? "Enregistrement…"
                  : "Cotes enregistrées"}
            </span>
          </div>
          <Input.Search
            allowClear
            placeholder="Rechercher un élève..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        {students.length === 0 || data.courses.length === 0 ? (
          <Empty description="Aucun élève ou cours disponible." />
        ) : (
          <div
            className={`gradebook__sheet ${headerRotationClass}`.trim()}
            style={sheetStyle}
          >
            <table>
              <thead>
                <tr>
                  <th
                    className="gradebook__student-column"
                    style={getColumnRevealStyle(0)}
                  >
                    <div className="gradebook__corner-logo">
                      {schoolLogo ? (
                        <img src={schoolLogo} alt="Logo de l’école" />
                      ) : (
                        <BookOutlined />
                      )}
                      <span>Élèves</span>
                    </div>
                  </th>
                  {data.courses.map((course, columnIndex) => (
                    <th
                      key={course.id}
                      className="gradebook__course-column"
                      style={getColumnRevealStyle(columnIndex + 1)}
                    >
                      <Tooltip
                        placement="right"
                        mouseEnterDelay={0.1}
                        title={
                          <div className="gradebook__teacher-tooltip">
                            <small>Professeur du cours</small>
                            <strong>
                              {course.teacherName ?? "Aucun professeur attribué"}
                            </strong>
                          </div>
                        }
                      >
                        <div
                          className="gradebook__course-title"
                          title={course.teacherName ?? "Aucun professeur attribué"}
                        >
                          <strong className="gradebook__course-name">
                            {course.name}
                          </strong>
                        </div>
                      </Tooltip>
                    </th>
                  ))}
                  <th
                    className="gradebook__result-column gradebook__choice-column"
                    style={getColumnRevealStyle(data.courses.length + 1)}
                  >
                    <div className="gradebook__course-title">
                      <strong className="gradebook__course-name">
                        Conduite
                      </strong>
                    </div>
                  </th>
                  <th
                    className="gradebook__result-column gradebook__choice-column"
                    style={getColumnRevealStyle(data.courses.length + 2)}
                  >
                    <div className="gradebook__course-title">
                      <strong className="gradebook__course-name">
                        Application
                      </strong>
                    </div>
                  </th>
                  <th
                    className="gradebook__result-column"
                    style={getColumnRevealStyle(data.courses.length + 3)}
                  >
                    <div className="gradebook__course-title">
                      <strong className="gradebook__course-name">Place</strong>
                    </div>
                  </th>
                  <th
                    className="gradebook__result-column"
                    style={getColumnRevealStyle(data.courses.length + 4)}
                  >
                    <div className="gradebook__course-title">
                      <strong className="gradebook__course-name">
                        Total général
                      </strong>
                    </div>
                  </th>
                  <th
                    className="gradebook__result-column"
                    style={getColumnRevealStyle(data.courses.length + 5)}
                  >
                    <div className="gradebook__course-title">
                      <strong className="gradebook__course-name">
                        Pourcentage
                      </strong>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="gradebook__weight-row">
                  <th className="gradebook__student-column">
                    <div className="gradebook__weight-label">
                      <BookOutlined />
                      <div>
                        <strong>Pondération</strong>
                        <small>Maximum par cours</small>
                      </div>
                    </div>
                  </th>
                  {data.courses.map((course) => (
                    <td key={course.id}>
                      <span className="gradebook__weight-value">
                        {course.weight}
                      </span>
                    </td>
                  ))}
                  <td className="gradebook__meta-cell">Choix</td>
                  <td className="gradebook__meta-cell">Choix</td>
                  <td className="gradebook__meta-cell">Auto</td>
                  <td className="gradebook__meta-cell">
                    {formatGradeNumber(
                      data.courses.reduce((sum, course) => sum + course.weight, 0),
                    )}
                  </td>
                  <td className="gradebook__meta-cell">100%</td>
                </tr>
                {students.map((student, rowIndex) => {
                  const summary = studentSummaries[student.id] ?? {
                    totalObtained: 0,
                    totalWeight: 0,
                    percentage: 0,
                    rank: rowIndex + 1,
                  };
                  const summaryPassed = summary.percentage >= 50;
                  return (
                    <tr key={student.id} style={getRowRevealStyle(rowIndex)}>
                      <th className="gradebook__student-column">
                        <div className="gradebook__student">
                          <span className="gradebook__student-number">
                            {student.orderNumber ?? rowIndex + 1}
                          </span>
                          <Avatar
                            src={student.photo || undefined}
                            icon={<UserOutlined />}
                          />
                          <div>
                            <strong>{student.name}</strong>
                            <small>{student.matricule}</small>
                          </div>
                        </div>
                      </th>
                      {data.courses.map((course, columnIndex) => {
                        const key = gradeKey(student.id, course.id);
                        const inputId = getGradeInputId(student.id, course.id);
                        const value = grades[key];
                        const isFail =
                          value !== undefined && value < course.weight / 2;
                        const isPass =
                          value !== undefined && value >= course.weight / 2;
                        return (
                          <td key={course.id}>
                            <InputNumber
                              className={`gradebook__input${isFail ? " gradebook__input--fail" : isPass ? " gradebook__input--pass" : ""}`}
                              controls={false}
                              min={0}
                              max={course.weight}
                              precision={0}
                              id={inputId}
                              inputMode="numeric"
                              parser={(displayValue) => {
                                const sanitized = (displayValue ?? "").replace(
                                  /\D+/g,
                                  "",
                                );
                                return sanitized === ""
                                  ? Number.NaN
                                  : Number(sanitized);
                              }}
                              value={value}
                              disabled={!canEdit}
                              onKeyDown={(event) =>
                                handleGradeKeyDown(
                                  event,
                                  rowIndex,
                                  columnIndex,
                                  course.weight,
                                )
                              }
                              onPaste={(event) =>
                                handleGradePaste(event, key, course.weight)
                              }
                              onChange={(value) => {
                                if (value === null) {
                                  markGradeChanged();
                                  setGrades((current) => {
                                    const next = { ...current };
                                    delete next[key];
                                    return next;
                                  });
                                  return;
                                }
                                const numericValue =
                                  typeof value === "number"
                                    ? value
                                    : Number(value);
                                if (Number.isNaN(numericValue)) return;
                                if (numericValue > course.weight) {
                                  warnInvalidGrade(
                                    `La cote maximale pour ce cours est ${course.weight}.`,
                                  );
                                  return;
                                }
                                markGradeChanged();
                                setGrades((current) => ({
                                  ...current,
                                  [key]: numericValue,
                                }));
                              }}
                            />
                          </td>
                        );
                      })}
                      <td className="gradebook__choice-cell">
                        <Select
                          allowClear
                          disabled={!canEdit}
                          options={appreciationOptions}
                          placeholder="-"
                          popupMatchSelectWidth={132}
                          size="small"
                          value={appreciations[student.id]?.conduite ?? undefined}
                          onChange={(value) =>
                            changeAppreciation(student.id, "conduite", value)
                          }
                        />
                      </td>
                      <td className="gradebook__choice-cell">
                        <Select
                          allowClear
                          disabled={!canEdit}
                          options={appreciationOptions}
                          placeholder="-"
                          popupMatchSelectWidth={132}
                          size="small"
                          value={appreciations[student.id]?.application ?? undefined}
                          onChange={(value) =>
                            changeAppreciation(student.id, "application", value)
                          }
                        />
                      </td>
                      <td className="gradebook__summary-cell">
                        {summary.rank}
                      </td>
                      <td className="gradebook__summary-cell">
                        {formatGradeNumber(summary.totalObtained)}
                      </td>
                      <td
                        className={`gradebook__summary-cell ${summaryPassed ? "is-pass" : "is-fail"}`}
                      >
                        {formatGradeNumber(summary.percentage)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </section>
  );
};

export default GradesPage;
