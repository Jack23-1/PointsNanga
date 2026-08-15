import { useEffect, useMemo, useState } from "react";
import { BookOutlined, CheckCircleOutlined, IdcardOutlined, SendOutlined, SaveOutlined, TeamOutlined, UserOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Empty, InputNumber, Modal, Select, Skeleton, Space, Tag, Typography, message } from "antd";
import axios from "axios";
import { useAuth } from "../../../hooks/useAuth";
import { api } from "../../../lib/api";

interface Assignment {
  id: string; className: string; courseClassId: string; courseName: string;
  weight: number; schoolYear: string; isHomeroomClass?: boolean;
  periods: { id: string; name: string; number: number; isOpen: boolean }[];
}
interface TeacherGradebook {
  assignmentId: string; schoolName: string; className: string; schoolYear: string;
  course: { id: string; name: string; weight: number };
  period: { id: string; name: string; isOpen: boolean };
  periods: { id: string; name: string; number: number; isOpen: boolean }[];
  isLocked: boolean;
  submissionStatus?: string | null;
  students: { id: string; matricule: string; name: string; orderNumber?: number | null }[];
  grades: { enrollmentId: string; value: number }[];
}

const errorText = (error: unknown) => axios.isAxiosError(error) && typeof error.response?.data?.message === "string" ? error.response.data.message : "Opération impossible.";

export default function TeacherCoursesPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentId, setAssignmentId] = useState<string>();
  const [periodId, setPeriodId] = useState<string>();
  const [book, setBook] = useState<TeacherGradebook | null>(null);
  const [grades, setGrades] = useState<Record<string, number | undefined>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<Assignment[]>("/grades/teacher/assignments").then(({ data }) => {
      setAssignments(data);
      setAssignmentId(data[0]?.id);
    }).catch((error) => message.error(errorText(error))).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!assignmentId) { setBook(null); return; }
    setLoading(true);
    api.get<TeacherGradebook>("/grades/teacher", { assignmentId, ...(periodId ? { periodId } : {}) }).then(({ data }) => {
      setBook(data); setPeriodId(data.period.id);
      setGrades(Object.fromEntries(data.grades.map((item) => [item.enrollmentId, item.value])));
      setVersion(0);
    }).catch((error) => message.error(errorText(error))).finally(() => setLoading(false));
  }, [assignmentId, periodId]);

  useEffect(() => {
    if (!version || !book?.period.isOpen || book.isLocked) return;
    const timer = window.setTimeout(async () => {
      setSaving(true);
      try {
        await api.patch("/grades/teacher", {
          assignmentId: book.assignmentId, periodId: Number(book.period.id),
          grades: Object.entries(grades).filter((entry): entry is [string, number] => entry[1] !== undefined).map(([enrollmentId, value]) => ({ enrollmentId: Number(enrollmentId), courseClassId: Number(book.course.id), value })),
        });
      } catch (error) { message.error(errorText(error)); }
      finally { setSaving(false); }
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [version, book, grades]);

  const selected = useMemo(() => assignments.find((item) => item.id === assignmentId), [assignments, assignmentId]);
  const teacherName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  const missingGrades = book ? book.students.filter((student) => grades[student.id] === undefined).length : 0;
  const warnInvalidGrade = (content: string) => message.warning({ content, duration: 1, className: "teacher-grade-warning", key: "teacher-grade-warning" });
  const submitGrades = () => {
    if (!book || missingGrades) {
      message.warning(`Complétez toutes les cotes avant l’envoi${missingGrades ? ` (${missingGrades} case${missingGrades > 1 ? "s" : ""} vide${missingGrades > 1 ? "s" : ""})` : ""}.`);
      return;
    }
    Modal.confirm({
      centered: true,
      title: "Envoyer les cotes au titulaire ?",
      content: `La colonne ${book.course.name} sera transmise au titulaire de ${book.className} et ne sera plus modifiable après l’envoi.`,
      okText: "Envoyer au titulaire",
      cancelText: "Continuer la saisie",
      async onOk() {
        setSubmitting(true);
        try {
          if (version) {
            await api.patch("/grades/teacher", { assignmentId: book.assignmentId, periodId: Number(book.period.id), grades: Object.entries(grades).filter((entry): entry is [string, number] => entry[1] !== undefined).map(([enrollmentId, value]) => ({ enrollmentId: Number(enrollmentId), courseClassId: Number(book.course.id), value })) });
          }
          const response = await api.post<{ revisionPending: boolean }>("/grades/teacher/submit", { assignmentId: book.assignmentId, periodId: book.period.id });
          message.success(response.data.revisionPending ? "La modification a été envoyée au titulaire pour acceptation." : "Les cotes ont été envoyées au titulaire.");
          setBook((current) => current ? { ...current, isLocked: false, submissionStatus: response.data.revisionPending ? "REVISION_PENDING" : "SUBMITTED" } : current);
          setVersion(0);
        } catch (error) { message.error(errorText(error)); throw error; }
        finally { setSubmitting(false); }
      },
    });
  };
  if (loading && !book) return <Skeleton active paragraph={{ rows: 12 }} />;

  return <section className="teacher-courses-page">
    <Card className="teacher-courses-page__selector">
      <div className="teacher-courses-page__heading">
        <span><UserOutlined /></span>
        <div>
          <small>ESPACE ENSEIGNANT</small>
          <h1>{teacherName || "Enseignant"}</h1>
          <div className="teacher-courses-page__identity"><IdcardOutlined /><b>{user?.email}</b><i>Mes cours et mes cotes</i></div>
          <p>Choisissez une classe, un cours et une période.</p>
        </div>
      </div>
      <div className="teacher-courses-page__filters">
        <Select disabled={!assignments.length} placeholder="Aucun cours attribué" value={assignmentId} onChange={(value) => { setPeriodId(undefined); setAssignmentId(value); }} options={assignments.map((item) => ({ value: item.id, label: `${item.className} — ${item.courseName}` }))} />
        <Select disabled={!assignments.length} placeholder="Période" value={periodId} onChange={setPeriodId} options={(selected?.periods ?? []).map((item) => ({ value: item.id, label: `${item.name}${item.isOpen ? " · Ouverte" : " · Fermée"}` }))} />
      </div>
    </Card>
    {!assignments.length && <Card><Empty description="Aucun cours ne vous est attribué pour l’année scolaire en cours." /></Card>}
    {book && <>
      <div className="teacher-courses-page__summary">
        <Card><TeamOutlined /><span>Classe<strong>{book.className}</strong></span></Card>
        <Card><BookOutlined /><span>Cours<strong>{book.course.name}</strong></span></Card>
        <Card><CheckCircleOutlined /><span>Pondération<strong>{book.course.weight} points</strong></span></Card>
        <Tag color={book.period.isOpen && !book.isLocked ? "green" : "red"}>{book.isLocked ? "Grille verrouillée" : book.period.isOpen ? "Saisie ouverte" : "Période fermée"}</Tag>
      </div>
      {book.submissionStatus && !book.isLocked && <Alert type={book.submissionStatus === "REVISION_PENDING" ? "warning" : "success"} showIcon message={book.submissionStatus === "REVISION_PENDING" ? "Votre modification attend l’acceptation du titulaire. Vous pouvez continuer à corriger votre brouillon." : "Ces cotes ont été envoyées. Une nouvelle modification devra être acceptée par le titulaire."} />}
      {book.isLocked && <Alert type="warning" showIcon message="La grille complète a déjà été envoyée ou approuvée par le directeur." />}
      <Card className="teacher-courses-page__grid" title={<Space><span>{book.course.name}</span><Typography.Text type="secondary">/ {book.course.weight}</Typography.Text></Space>} extra={<Space><span className="teacher-courses-page__save"><SaveOutlined /> {saving ? "Enregistrement…" : "Brouillon automatique"}</span><Button type="primary" icon={<SendOutlined />} loading={submitting} disabled={book.isLocked || !book.period.isOpen} onClick={submitGrades}>{book.submissionStatus ? "Envoyer la modification" : "Envoyer au titulaire"}</Button></Space>}>
        <div className="teacher-courses-page__rows">
          {book.students.map((student, index) => {
            const value = grades[student.id];
            const resultClass = value === undefined ? "" : value < book.course.weight / 2 ? "teacher-courses-page__row--failed" : "teacher-courses-page__row--passed";
            return <div className={`teacher-courses-page__row ${resultClass}`} key={student.id}>
              <b>{student.orderNumber ?? index + 1}</b><span><strong>{student.name}</strong><small>{student.matricule}</small></span>
              <InputNumber min={0} max={book.course.weight} precision={0} inputMode="numeric" controls={false} disabled={!book.period.isOpen || book.isLocked} value={value}
                parser={(raw) => Number(raw?.replace(/\D/g, "") || 0)}
                onKeyDown={(event) => {
                  if (!/[0-9]/.test(event.key) && !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Home", "End"].includes(event.key)) {
                    event.preventDefault(); warnInvalidGrade("Saisissez uniquement des chiffres.");
                  }
                }}
                onChange={(next) => {
                  if (next === null) { setGrades((current) => ({ ...current, [student.id]: undefined })); setVersion((item) => item + 1); return; }
                  const numeric = Math.round(Number(next));
                  if (numeric > book.course.weight) { warnInvalidGrade(`La cote ne peut pas dépasser ${book.course.weight}.`); return; }
                  if (numeric < 0) { warnInvalidGrade("La cote ne peut pas être négative."); return; }
                  setGrades((current) => ({ ...current, [student.id]: numeric })); setVersion((item) => item + 1);
                }} />
            </div>;
          })}
        </div>
      </Card>
    </>}
  </section>;
}
