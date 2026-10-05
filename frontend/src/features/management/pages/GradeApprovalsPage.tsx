import { useEffect, useMemo, useState } from "react";
import { AuditOutlined, CheckCircleOutlined, CloseCircleOutlined, EyeOutlined, ReloadOutlined, SaveOutlined, UnlockOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography, message } from "antd";
import axios from "axios";
import { api } from "../../../lib/api";
import { API_URL } from "../../../config/constants";

type SubmissionStatus = "SUBMITTED" | "APPROVED" | "REOPENED" | "REJECTED";

interface GradeSubmission {
  id: string;
  schoolName: string;
  province: string;
  className: string;
  classCode?: string | null;
  teacherName: string;
  periodName: string;
  schoolYear: string;
  periodIsOpen: boolean;
  submittedAt: string;
  status: SubmissionStatus;
  rejectionComment?: string | null;
}

type Appreciation = "bonne" | "mauvaise" | "mediocre" | "excellente";

interface DirectorGradebook {
  className: string;
  schoolYear: string;
  period: { id: string; name: string; isOpen: boolean };
  students: { id: string; matricule: string; name: string; orderNumber?: number | null }[];
  courses: { id: string; name: string; weight: number }[];
  grades: { enrollmentId: string; courseClassId: string; value: number }[];
  results: { enrollmentId: string; conduite?: Appreciation | null; application?: Appreciation | null }[];
}

const appreciationOptions = [
  { value: "excellente", label: "Excellente" },
  { value: "bonne", label: "Bonne" },
  { value: "mediocre", label: "Médiocre" },
  { value: "mauvaise", label: "Mauvaise" },
];

const getError = (error: unknown) =>
  axios.isAxiosError(error) && typeof error.response?.data?.message === "string"
    ? error.response.data.message
    : "Opération impossible.";

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

export default function GradeApprovalsPage() {
  const [items, setItems] = useState<GradeSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [rejectedItem, setRejectedItem] = useState<GradeSubmission | null>(null);
  const [rejectionComment, setRejectionComment] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [viewedItem, setViewedItem] = useState<GradeSubmission | null>(null);
  const [gradebook, setGradebook] = useState<DirectorGradebook | null>(null);
  const [gradebookLoading, setGradebookLoading] = useState(false);
  const [gradebookSaving, setGradebookSaving] = useState(false);
  const [gradeValues, setGradeValues] = useState<Record<string, number | undefined>>({});
  const [appreciations, setAppreciations] = useState<Record<string, { conduite?: Appreciation; application?: Appreciation }>>({});

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try { setItems((await api.get<GradeSubmission[]>("/grade-submissions")).data); }
    catch (error) { if (!silent) message.error(getError(error)); }
    finally { if (!silent) setLoading(false); }
  };

  useEffect(() => {
    void load();
    let active = true;
    let fallbackInterval: number | undefined;
    const refresh = () => { if (active) void load(true); };
    const events = new EventSource(`${API_URL}/grade-submissions/events`, {
      withCredentials: true,
    });

    events.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data) as { action?: string };
        if (update.action && update.action !== "heartbeat") refresh();
      } catch {
        // Un événement mal formé ne doit pas interrompre le flux suivant.
      }
    };
    events.onerror = () => {
      // EventSource se reconnecte automatiquement. Ce contrôle silencieux couvre
      // aussi les proxys qui retardent les événements SSE.
      if (!fallbackInterval) {
        fallbackInterval = window.setInterval(refresh, 5000);
      }
    };
    events.onopen = () => {
      if (fallbackInterval) {
        window.clearInterval(fallbackInterval);
        fallbackInterval = undefined;
      }
      refresh();
    };

    window.addEventListener("grade-submissions-updated", refresh);
    return () => {
      active = false;
      events.close();
      if (fallbackInterval) window.clearInterval(fallbackInterval);
      window.removeEventListener("grade-submissions-updated", refresh);
    };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    return items.filter((item) => !query || `${item.schoolName} ${item.province} ${item.teacherName} ${item.className} ${item.classCode ?? ""} ${item.periodName} ${item.schoolYear}`.toLocaleLowerCase("fr").includes(query));
  }, [items, search]);

  const totalWeight = gradebook?.courses.reduce((sum, course) => sum + course.weight, 0) ?? 0;

  const act = (item: GradeSubmission, action: "approve" | "reopen") => {
    const approve = action === "approve";
    Modal.confirm({
      centered: true,
      icon: approve ? <CheckCircleOutlined /> : <UnlockOutlined />,
      title: approve ? `Approuver les cotes de ${item.className} ?` : `Ouvrir la grille de ${item.className} ?`,
      content: approve
        ? `Les cotes de ${item.periodName} seront officiellement approuvées et resteront verrouillées.`
        : `Le titulaire pourra de nouveau modifier les cotes de ${item.periodName}, puis devra les soumettre à nouveau.`,
      okText: approve ? "Approuver la grille" : "Ouvrir la grille",
      cancelText: "Annuler",
      async onOk() {
        try {
          await api.patch(`/grade-submissions/${item.id}/${action}`);
          message.success(approve ? "Grille approuvée." : "Grille ouverte pour correction.");
          await load();
        } catch (error) { message.error(getError(error)); throw error; }
      },
    });
  };

  const reject = async () => {
    if (!rejectedItem) return;
    const comment = rejectionComment.trim();
    if (comment.length < 3) return void message.warning("Veuillez expliquer la raison du rejet.");
    setRejecting(true);
    try {
      await api.patch(`/grade-submissions/${rejectedItem.id}/reject`, { comment });
      message.success("Grille rejetée et commentaire envoyé au titulaire.");
      setRejectedItem(null);
      setRejectionComment("");
      await load();
    } catch (error) { message.error(getError(error)); }
    finally { setRejecting(false); }
  };

  const openGradebook = async (item: GradeSubmission) => {
    setViewedItem(item);
    setGradebook(null);
    setGradebookLoading(true);
    try {
      const { data } = await api.get<DirectorGradebook>(`/grade-submissions/${item.id}/gradebook`);
      setGradebook(data);
      setGradeValues(Object.fromEntries(data.grades.map((grade) => [`${grade.enrollmentId}:${grade.courseClassId}`, grade.value])));
      setAppreciations(Object.fromEntries(data.results.map((result) => [result.enrollmentId, {
        conduite: result.conduite ?? undefined,
        application: result.application ?? undefined,
      }])));
    } catch (error) {
      message.error(getError(error));
      setViewedItem(null);
    } finally {
      setGradebookLoading(false);
    }
  };

  const saveGradebook = async () => {
    if (!viewedItem || !gradebook) return;
    setGradebookSaving(true);
    try {
      await api.patch(`/grade-submissions/${viewedItem.id}/gradebook`, {
        periodId: Number(gradebook.period.id),
        grades: Object.entries(gradeValues)
          .filter((entry): entry is [string, number] => entry[1] !== undefined)
          .map(([key, value]) => {
          const [enrollmentId, courseClassId] = key.split(":");
          return { enrollmentId: Number(enrollmentId), courseClassId: Number(courseClassId), value };
        }),
        appreciations: gradebook.students.map((student) => ({
          enrollmentId: Number(student.id),
          conduite: appreciations[student.id]?.conduite ?? null,
          application: appreciations[student.id]?.application ?? null,
        })),
      });
      message.success("Les modifications du directeur ont été enregistrées.");
      await openGradebook(viewedItem);
      await load(true);
    } catch (error) {
      message.error(getError(error));
    } finally {
      setGradebookSaving(false);
    }
  };

  return (
    <section className="grade-approvals-page">
      <Card
        title={<Space><AuditOutlined /><span>Cotes et approbation</span></Space>}
        extra={<Button icon={<ReloadOutlined />} onClick={() => void load()}>Actualiser</Button>}
      >
        <Typography.Paragraph type="secondary">
          Approuvez les grilles reçues ou rejetez-les avec un commentaire pour demander une correction au titulaire.
        </Typography.Paragraph>
        <Input.Search value={search} onChange={(event) => setSearch(event.target.value)} allowClear placeholder="Ecole, province, classe, titulaire ou période..." style={{ maxWidth: 460, marginBottom: 18 }} />
        <Table
          rowKey="id"
          loading={loading}
          dataSource={filtered}
          pagination={false}
          columns={[
            { title: "N°", width: 65, render: (_value, _item, index) => index + 1 },
            {
              title: "Ecole / Province",
              width: 250,
              render: (_, item) => (
                <Space direction="vertical" size={0}>
                  <Typography.Text strong>{item.schoolName}</Typography.Text>
                  <Typography.Text type="secondary">{item.province}</Typography.Text>
                </Space>
              ),
            },
            {
              title: "Classe",
              width: 220,
              render: (_, item) => (
                <Space direction="vertical" size={0}>
                  <Typography.Text strong>{item.className}</Typography.Text>
                  <Typography.Text type="secondary">
                    {item.classCode ? `Code: ${item.classCode}` : "Code: —"}
                  </Typography.Text>
                </Space>
              ),
            },
            { title: "Titulaire", dataIndex: "teacherName" },
            { title: "Période", render: (_, item) => <Space direction="vertical" size={0}><span>{item.periodName}</span><Typography.Text type="secondary">{item.schoolYear}</Typography.Text></Space> },
            { title: "Envoyée le", render: (_, item) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.submittedAt)) },
            { title: "Statut", render: (_, item) => <Space wrap><Tag color={item.status === "SUBMITTED" ? "gold" : item.status === "APPROVED" ? "green" : item.status === "REJECTED" ? "red" : "blue"}>{item.status === "SUBMITTED" ? "À APPROUVER" : item.status === "APPROVED" ? "APPROUVÉE" : item.status === "REJECTED" ? "REJETÉE" : "OUVERTE"}</Tag><Tag color={item.periodIsOpen ? "green" : "default"}>{item.periodIsOpen ? "Période ouverte" : "Période fermée"}</Tag></Space> },
            { title: "Commentaire", render: (_, item) => item.rejectionComment ? <Typography.Text type="danger">{item.rejectionComment}</Typography.Text> : "—" },
            { title: "Action", align: "right", render: (_, item) => <Space wrap><Button icon={<EyeOutlined />} onClick={() => void openGradebook(item)}>{item.periodIsOpen ? "Voir et modifier" : "Voir"}</Button>{item.status === "SUBMITTED" ? <><Button danger icon={<CloseCircleOutlined />} onClick={() => { setRejectedItem(item); setRejectionComment(""); }}>Rejeter</Button><Button type="primary" icon={<CheckCircleOutlined />} onClick={() => act(item, "approve")}>Approuver</Button></> : item.status === "APPROVED" ? <Button icon={<UnlockOutlined />} onClick={() => act(item, "reopen")}>Ouvrir la grille</Button> : item.status === "REJECTED" ? <Tag color="error">Correction demandée</Tag> : <Tag color="processing">Correction autorisée</Tag>}</Space> },
          ]}
        />
      </Card>
      <Modal
        centered
        width="96vw"
        open={Boolean(viewedItem)}
        title={`Grille de cotes — ${viewedItem?.className ?? ""} · ${viewedItem?.periodName ?? ""} · ${viewedItem?.schoolYear ?? ""}`}
        okText="Enregistrer les modifications"
        cancelText="Fermer"
        okButtonProps={{ icon: <SaveOutlined />, loading: gradebookSaving, disabled: !gradebook?.period.isOpen }}
        onOk={() => void saveGradebook()}
        onCancel={() => { if (!gradebookSaving) { setViewedItem(null); setGradebook(null); } }}
        rootClassName="director-gradebook-modal"
      >
        <div className="director-gradebook__hero">
          <div>
            <small>GRILLE DIRECTEUR</small>
            <h2>{gradebook?.className ?? viewedItem?.className ?? "Classe"}</h2>
            <p>{gradebook?.schoolYear ?? viewedItem?.schoolYear ?? ""}</p>
          </div>
          <div className="director-gradebook__pills">
            <span className={`director-gradebook__pill${gradebook?.period.isOpen ? " is-open" : " is-closed"}`}>
              {gradebook?.period.isOpen ? "Période ouverte" : "Période fermée"}
            </span>
            <span className="director-gradebook__pill director-gradebook__pill--info">{gradebook?.period.name ?? viewedItem?.periodName ?? ""}</span>
            <span className="director-gradebook__pill director-gradebook__pill--neutral">{totalWeight} points</span>
          </div>
        </div>
        {gradebook && !gradebook.period.isOpen && (
          <Alert
            showIcon
            type="info"
            message={`${gradebook.period.name} est fermée`}
            description="Cette grille est disponible en consultation uniquement. Ouvrez d’abord la période scolaire pour autoriser une modification."
            style={{ marginBottom: 16 }}
          />
        )}
        <Table
          rowKey="id"
          loading={gradebookLoading}
          dataSource={gradebook?.students ?? []}
          pagination={false}
          scroll={{ x: "max-content", y: "60vh" }}
          rowClassName={(student) => {
            if (!gradebook?.courses.length) return "";
            const obtained = gradebook.courses.reduce(
              (sum, course) => sum + (gradeValues[`${student.id}:${course.id}`] ?? 0),
              0,
            );
            const ratio = totalWeight > 0 ? obtained / totalWeight : 0;
            if (ratio < 0.5) return "director-gradebook__row director-gradebook__row--fail";
            if (ratio >= 0.75) return "director-gradebook__row director-gradebook__row--pass";
            return "director-gradebook__row director-gradebook__row--warning";
          }}
          columns={[
            { title: "N°", width: 60, fixed: "left", render: (_value, student, index) => student.orderNumber ?? index + 1 },
            { title: "Élève", width: 230, fixed: "left", render: (_value, student) => <><strong>{student.name}</strong><br /><Typography.Text type="secondary">{student.matricule}</Typography.Text></> },
            ...(gradebook?.courses ?? []).map((course) => ({
              title: <span>{course.name} <Typography.Text type="secondary">/{course.weight}</Typography.Text></span>,
              width: 130,
              render: (_value: unknown, student: DirectorGradebook["students"][number]) => {
                const key = `${student.id}:${course.id}`;
                const value = gradeValues[key];
                const cellClassName = value === undefined
                  ? "director-gradebook__input"
                  : value < course.weight / 2
                    ? "director-gradebook__input director-gradebook__input--fail"
                    : "director-gradebook__input director-gradebook__input--pass";
                return <InputNumber
                  className={cellClassName}
                  disabled={!gradebook?.period.isOpen}
                  min={0}
                  max={course.weight}
                  precision={0}
                  controls={false}
                  inputMode="numeric"
                  value={value}
                  parser={(raw) => Number(raw?.replace(/\D/g, "") || 0)}
                  onKeyDown={(event) => {
                    if (!ALLOWED_GRADE_KEYS.has(event.key) && !/^[0-9]$/.test(event.key)) {
                      event.preventDefault();
                    }
                  }}
                  onChange={(next) => {
                    if (next === null) {
                      setGradeValues((current) => {
                        const nextValues = { ...current };
                        delete nextValues[key];
                        return nextValues;
                      });
                      return;
                    }
                    const numeric = Math.round(Number(next));
                    if (numeric > course.weight) {
                      message.warning(`La cote ne peut pas dépasser ${course.weight}.`);
                      return;
                    }
                    if (numeric < 0) {
                      message.warning("La cote ne peut pas être négative.");
                      return;
                    }
                    setGradeValues((current) => ({ ...current, [key]: numeric }));
                  }}
                />;
              },
            })),
            { title: "Conduite", width: 150, render: (_value, student) => <Select disabled={!gradebook?.period.isOpen} style={{ width: 135 }} options={appreciationOptions} value={appreciations[student.id]?.conduite} onChange={(value) => setAppreciations((current) => ({ ...current, [student.id]: { ...current[student.id], conduite: value } }))} /> },
            { title: "Application", width: 150, render: (_value, student) => <Select disabled={!gradebook?.period.isOpen} style={{ width: 135 }} options={appreciationOptions} value={appreciations[student.id]?.application} onChange={(value) => setAppreciations((current) => ({ ...current, [student.id]: { ...current[student.id], application: value } }))} /> },
          ]}
        />
      </Modal>
      <Modal centered open={Boolean(rejectedItem)} title={<Space><CloseCircleOutlined style={{ color: "#dc2626" }} /><span>Rejeter la grille de {rejectedItem?.className}</span></Space>} okText="Rejeter et envoyer" cancelText="Annuler" okButtonProps={{ danger: true, loading: rejecting, disabled: rejectionComment.trim().length < 3 }} onOk={() => void reject()} onCancel={() => { if (!rejecting) { setRejectedItem(null); setRejectionComment(""); } }} rootClassName="grade-rejection-modal">
        <Typography.Paragraph type="secondary">Le titulaire verra immédiatement ce commentaire et pourra corriger sa grille.</Typography.Paragraph>
        <Input.TextArea autoFocus value={rejectionComment} onChange={(event) => setRejectionComment(event.target.value)} placeholder="Expliquez clairement les corrections demandées…" maxLength={500} showCount rows={4} />
      </Modal>
    </section>
  );
}
