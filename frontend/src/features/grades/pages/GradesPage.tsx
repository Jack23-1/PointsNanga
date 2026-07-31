import {
  type ClipboardEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  BookOutlined,
  ReloadOutlined,
  SaveOutlined,
  UserOutlined,
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
}

interface Gradebook {
  className: string;
  schoolYear: string;
  period: { id: string; name: string } | null;
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

const errorMessage = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError(error)) return fallback;
  const value = error.response?.data?.message;
  return Array.isArray(value)
    ? value.join(" ")
    : typeof value === "string"
      ? value
      : fallback;
};

const GradesPage = () => {
  const [data, setData] = useState<Gradebook | null>(null);
  const [grades, setGrades] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadGradebook = async () => {
    setLoading(true);
    try {
      const response = await api.get<Gradebook>("/grades/homeroom");
      const courseWeights = new Map(
        response.data.courses.map((course) => [course.id, course.weight]),
      );
      setData(response.data);
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
        requestAnimationFrame(() => focusGradeCell(nextRowIndex, nextColumnIndex));
      }

      return;
    }

    if (
      (ctrlKey || metaKey) &&
      ["a", "c", "v", "x"].includes(key.toLowerCase())
    ) {
      return;
    }

    if (ALLOWED_GRADE_KEYS.has(key) || /^\d$/.test(key)) {
      return;
    }

    event.preventDefault();
  };

  const handleGradePaste = (
    event: ClipboardEvent<HTMLElement>,
    currentKey: string,
    weight: number,
  ) => {
    const raw = event.clipboardData.getData("text").trim();

    if (!/^\d+$/.test(raw)) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    const numeric = Number(raw);

    if (Number.isNaN(numeric)) {
      return;
    }

    setGrades((current) => ({
      ...current,
      [currentKey]: clampGradeValue(numeric, weight),
    }));
  };

  const save = async () => {
    if (!data?.period) return;
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
    try {
      await api.patch("/grades/homeroom", { grades: payload });
      message.success(
        `${payload.length} cote${payload.length > 1 ? "s" : ""} enregistrée${payload.length > 1 ? "s" : ""}.`,
      );
      await loadGradebook();
    } catch (error) {
      message.error(
        errorMessage(error, "Enregistrement des cotes impossible."),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) {
    return <Skeleton active paragraph={{ rows: 14 }} />;
  }

  if (!data) {
    return (
      <Card>
        <Empty description="Le carnet de cotes est indisponible.">
          <Button onClick={loadGradebook}>Réessayer</Button>
        </Empty>
      </Card>
    );
  }

  const headerRotationClass = "gradebook__sheet--rotate-90";

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
            {data.period
              ? `Saisie en cours pour : ${data.period.name}`
              : "La saisie est suspendue jusqu’à l’ouverture d’une période."}
          </p>
        </div>
        <div className="gradebook__actions">
          <Button icon={<ReloadOutlined />} onClick={loadGradebook}>
            Actualiser
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            disabled={!data.period}
            loading={saving}
            onClick={save}
          >
            Enregistrer les cotes
          </Button>
        </div>
      </header>

      {!data.period && (
        <Alert
          showIcon
          type="warning"
          message="Aucune période ouverte"
          description="Le directeur doit ouvrir une période avant que les cotes puissent être saisies."
        />
      )}

      <Card className="gradebook__card">
        <div className="gradebook__toolbar">
          <div>
            <strong>{data.students.length} élèves</strong>
            <span>{data.courses.length} cours</span>
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
          <div className={`gradebook__sheet ${headerRotationClass}`.trim()}>
            <table>
              <thead>
                <tr>
                  <th className="gradebook__student-column">ÉLÈVES</th>
                  {data.courses.map((course) => (
                    <th key={course.id} className="gradebook__course-column">
                      <div className="gradebook__course-title">
                        <strong>{`${course.name} (${course.weight})`}</strong>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((student, rowIndex) => (
                  <tr key={student.id}>
                    <th className="gradebook__student-column">
                      <div className="gradebook__student">
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
                            disabled={!data.period}
                            onKeyDown={(event) =>
                              handleGradeKeyDown(event, rowIndex, columnIndex)
                            }
                            onPaste={(event) =>
                              handleGradePaste(event, key, course.weight)
                            }
                            onChange={(value) =>
                              setGrades((current) => {
                                if (value === null) {
                                  const next = { ...current };
                                  delete next[key];
                                  return next;
                                }
                                const numericValue =
                                  typeof value === "number"
                                    ? value
                                    : Number(value);
                                if (Number.isNaN(numericValue)) {
                                  return current;
                                }
                                return {
                                  ...current,
                                  [key]: clampGradeValue(
                                    numericValue,
                                    course.weight,
                                  ),
                                };
                              })
                            }
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
