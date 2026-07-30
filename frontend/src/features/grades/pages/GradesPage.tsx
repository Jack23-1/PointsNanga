import { useEffect, useMemo, useState } from "react";
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
      setData(response.data);
      setGrades(
        Object.fromEntries(
          response.data.grades.map((grade) => [
            gradeKey(grade.enrollmentId, grade.courseClassId),
            grade.value,
          ]),
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

  const save = async () => {
    if (!data?.period) return;
    const payload = Object.entries(grades).map(([key, value]) => {
      const [enrollmentId, courseClassId] = key.split(":");
      return { enrollmentId: Number(enrollmentId), courseClassId: Number(courseClassId), value };
    });
    setSaving(true);
    try {
      await api.patch("/grades/homeroom", { grades: payload });
      message.success(`${payload.length} cote${payload.length > 1 ? "s" : ""} enregistrée${payload.length > 1 ? "s" : ""}.`);
      await loadGradebook();
    } catch (error) {
      message.error(errorMessage(error, "Enregistrement des cotes impossible."));
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
            <span>{data.courses.length} cours avec pondération</span>
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
          <div className="gradebook__sheet">
            <table>
              <thead>
                <tr>
                  <th className="gradebook__student-column">ÉLÈVES</th>
                  {data.courses.map((course) => (
                    <th key={course.id}>
                      <div className="gradebook__course-title">
                        <strong>{course.name}</strong>
                        <span>Pondération : {course.weight}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
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
                    {data.courses.map((course) => {
                      const key = gradeKey(student.id, course.id);
                      return (
                        <td key={course.id}>
                          <InputNumber
                            className="gradebook__input"
                            min={0}
                            max={course.weight}
                            precision={2}
                            value={grades[key]}
                            disabled={!data.period}
                            placeholder={`0 / ${course.weight}`}
                            onChange={(value) =>
                              setGrades((current) => {
                                if (value === null) {
                                  const next = { ...current };
                                  delete next[key];
                                  return next;
                                }
                                return { ...current, [key]: value };
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
