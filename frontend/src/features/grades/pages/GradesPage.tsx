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
  CloudSyncOutlined,
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
  message,
} from "antd";
import axios from "axios";
import { api } from "../../../lib/api";

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

interface Gradebook {
  className: string;
  schoolYear: string;
  period: { id: string; name: string; isOpen: boolean } | null;
  periods: { id: string; name: string; number: number; isOpen: boolean }[];
  students: Student[];
  courses: Course[];
  grades: {
    enrollmentId: string;
    courseClassId: string;
    value: number;
  }[];
}

const gradeKey = (studentId: string, courseId: string) =>
  `${studentId}:${courseId}`;

const clampGradeValue = (value: number, weight: number) =>
  Math.min(weight, Math.max(0, Math.round(value)));

const getGradeInputId = (studentId: string, courseId: string) =>
  `grade-input-${studentId}-${courseId}`;

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
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editVersion, setEditVersion] = useState(0);
  const [autoSaveStatus, setAutoSaveStatus] = useState<
    "saved" | "pending" | "saving"
  >("saved");
  const editVersionRef = useRef(0);

  const markGradeChanged = () => {
    editVersionRef.current += 1;
    setEditVersion(editVersionRef.current);
    setAutoSaveStatus("pending");
  };

  const loadGradebook = async (periodId?: string) => {
    setLoading(true);
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
    } catch (error) {
      message.error(errorMessage(error, "Chargement des cotes impossible."));
    } finally {
      setLoading(false);
    }
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
    if (!data?.period?.isOpen) return;
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
    setSaving(true);
    if (automatic) setAutoSaveStatus("saving");
    try {
      await api.patch("/grades/homeroom", {
        periodId: Number(data.period.id),
        grades: payload,
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

  useEffect(() => {
    if (editVersion === 0 || !data?.period?.isOpen) return;

    const timeoutId = window.setTimeout(() => {
      void save(true);
    }, 1000);

    return () => window.clearTimeout(timeoutId);
    // The edit version intentionally restarts this one-second debounce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editVersion]);

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
            {data.period?.isOpen
              ? `Saisie ouverte pour : ${data.period.name}`
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
            disabled={!data.period?.isOpen}
            loading={saving}
            onClick={() => void save(false)}
          >
            Enregistrer les cotes
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

      {!data.period?.isOpen && (
        <Alert
          showIcon
          type="info"
          message={`${data.period?.name ?? "Cette période"} est en consultation`}
          description="Les cotes de cette période sont visibles mais ne peuvent être modifiées que lorsqu’elle est ouverte."
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
                  <th className="gradebook__student-column">
                    <div className="gradebook__corner-logo">
                      {schoolLogo ? (
                        <img src={schoolLogo} alt="Logo de l’école" />
                      ) : (
                        <BookOutlined />
                      )}
                      <span>Élèves</span>
                    </div>
                  </th>
                  {data.courses.map((course) => (
                    <th key={course.id} className="gradebook__course-column">
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
                </tr>
                {students.map((student, rowIndex) => (
                  <tr key={student.id}>
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
                            disabled={!data.period?.isOpen}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </section>
  );
};

export default GradesPage;
