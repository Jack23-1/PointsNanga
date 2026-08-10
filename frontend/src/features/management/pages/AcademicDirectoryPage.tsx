import { useEffect, useMemo, useState } from "react";
import {
  BookOutlined,
  DeleteOutlined,
  EditOutlined,
  PhoneOutlined,
  PlusOutlined,
  ReadOutlined,
  ReloadOutlined,
  SwapOutlined,
  HistoryOutlined,
  SearchOutlined,
  TeamOutlined,
  UploadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Upload,
  message,
} from "antd";
import axios from "axios";
import dayjs, { type Dayjs } from "dayjs";
import { api } from "../../../lib/api";

type DirectoryKind =
  | "classes"
  | "teachers"
  | "courses"
  | "homeroom"
  | "assignments";

interface DirectoryRow {
  key: string;
  primary: string;
  secondary: string;
  detail: string;
  extra: string;
  status: string;
  students?: number;
  classId?: string;
  courseId?: string;
  teacherId?: string;
  weight?: number;
}

interface FormValues {
  name?: string;
  firstName?: string;
  gender?: string;
  phone?: string;
  classId?: string;
  courseId?: string;
  teacherId?: string;
  weight?: number;
}

interface BulkFormValues {
  items: Array<{
    name?: string;
    firstName?: string;
    gender?: string;
    phone?: string;
  }>;
}

interface ResetPasswordValues {
  password: string;
  confirmation: string;
}

interface ReplacementValues {
  teacherId: string;
  effectiveDate: Dayjs;
  reason?: string;
}

interface AssignmentHistoryRow {
  id: string;
  teacher: string;
  course: string;
  className: string;
  startDate: string;
  endDate?: string | null;
  reason?: string | null;
  isActive: boolean;
}

interface Choice {
  id: string;
  label: string;
}

interface AssignmentApiRow {
  id: string;
  teacherId: string;
  courseId: string;
  classId: string;
  teacher: string;
  course: string;
  className: string;
  weight: number;
}

interface HomeroomApiRow {
  id: string;
  classId: string;
  teacherId: string;
  className: string;
  teacher: string;
  loginCode: string;
}

const contentByKind = {
  classes: {
    title: "Classes",
    description: "Organisation des classes et répartition des élèves.",
    icon: <TeamOutlined />,
    addLabel: "Ajouter une classe",
    search: "Rechercher une classe...",
  },
  teachers: {
    title: "Professeurs",
    description: "Gérez le personnel enseignant de votre établissement.",
    icon: <UserOutlined />,
    addLabel: "Ajouter un professeur",
    search: "Rechercher un professeur...",
  },
  courses: {
    title: "Cours",
    description: "Gérez les matières enseignées dans l’établissement.",
    icon: <ReadOutlined />,
    addLabel: "Ajouter un cours",
    search: "Rechercher un cours...",
  },
  homeroom: {
    title: "Titulaires",
    description: "Affectation des professeurs titulaires aux classes.",
    icon: <TeamOutlined />,
    addLabel: "Affecter un titulaire",
    search: "Rechercher un titulaire...",
  },
  assignments: {
    title: "Attributions des cours",
    description:
      "Réutilisez un même cours dans plusieurs classes avec une pondération propre à chacune.",
    icon: <BookOutlined />,
    addLabel: "Nouvelle attribution",
    search: "Rechercher un cours, une classe ou un professeur...",
  },
} as const;

const errorMessage = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError(error)) return fallback;
  const value = error.response?.data?.message;
  return Array.isArray(value)
    ? value.join(" ")
    : typeof value === "string"
      ? value
      : fallback;
};

const AcademicDirectoryPage = ({ kind }: { kind: DirectoryKind }) => {
  const content = contentByKind[kind];
  const [form] = Form.useForm<FormValues>();
  const [bulkForm] = Form.useForm<BulkFormValues>();
  const [resetPasswordForm] = Form.useForm<ResetPasswordValues>();
  const [replacementForm] = Form.useForm<ReplacementValues>();
  const [rows, setRows] = useState<DirectoryRow[]>([]);
  const [classes, setClasses] = useState<Choice[]>([]);
  const [courses, setCourses] = useState<Choice[]>([]);
  const [teachers, setTeachers] = useState<Choice[]>([]);
  const [assignments, setAssignments] = useState<AssignmentApiRow[]>([]);
  const [homeroomAssignments, setHomeroomAssignments] = useState<
    HomeroomApiRow[]
  >([]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<DirectoryRow | null>(null);
  const selectedClassId = Form.useWatch("classId", form);
  const supportsBulkCreate = ["classes", "teachers", "courses"].includes(kind);

  const loadData = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      if (kind === "classes") {
        const response = await api.get<any[]>("/classes");
        setRows(
          response.data.map((item) => ({
            key: item.id,
            primary: item.label,
            secondary: item.code,
            detail: `${item.students} élève${item.students !== 1 ? "s" : ""}`,
            extra: "",
            status: "Actif",
            students: item.students,
          })),
        );
      } else if (kind === "teachers") {
        const response = await api.get<any[]>("/teachers");
        setRows(
          response.data.map((item) => ({
            key: item.id,
            primary: `${item.lastName} ${item.firstName}`,
            secondary: item.gender || "—",
            detail: item.phone || "Aucun contact",
            extra: item.photo || "",
            status: "Actif",
          })),
        );
      } else if (kind === "courses") {
        const response = await api.get<any[]>("/courses");
        setRows(
          response.data.map((item) => ({
            key: item.id,
            primary: item.label,
            secondary: item.code || "Code automatique",
            detail: "Cours actif",
            extra: "",
            status: "Actif",
          })),
        );
      } else if (kind === "assignments") {
        const [assignments, classList, courseList, teacherList] =
          await Promise.all([
            api.get<AssignmentApiRow[]>("/course-assignments"),
            api.get<any[]>("/classes"),
            api.get<any[]>("/courses"),
            api.get<any[]>("/teachers"),
          ]);
        setRows(
          assignments.data.map((item) => ({
            key: item.id,
            primary: item.course,
            secondary: item.className,
            detail: item.teacher,
            extra: String(item.weight),
            status: "Actif",
            classId: item.classId,
            courseId: item.courseId,
            teacherId: item.teacherId,
            weight: item.weight,
          })),
        );
        setAssignments(assignments.data);
        setClasses(
          classList.data.map((item) => ({ id: item.id, label: item.label })),
        );
        setCourses(
          courseList.data.map((item) => ({ id: item.id, label: item.label })),
        );
        setTeachers(
          teacherList.data.map((item) => ({
            id: item.id,
            label: `${item.lastName} ${item.firstName}`,
          })),
        );
      } else if (kind === "homeroom") {
        const [assignmentList, classList, teacherList] = await Promise.all([
          api.get<HomeroomApiRow[]>("/homeroom-assignments"),
          api.get<any[]>("/classes"),
          api.get<any[]>("/teachers"),
        ]);
        setHomeroomAssignments(assignmentList.data);
        setRows(
          assignmentList.data.map((item) => ({
            key: item.id,
            primary: item.teacher,
            secondary: item.loginCode,
            detail: item.className,
            extra: "",
            status: "Actif",
            classId: item.classId,
            teacherId: item.teacherId,
          })),
        );
        setClasses(
          classList.data.map((item) => ({ id: item.id, label: item.label })),
        );
        setTeachers(
          teacherList.data.map((item) => ({
            id: item.id,
            label: `${item.lastName} ${item.firstName}`,
          })),
        );
      } else {
        setRows([]);
      }
    } catch (error) {
      message.error(errorMessage(error, "Chargement impossible."));
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    setRows([]);
    setSearch("");
    void loadData(true);
  }, [kind]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    if (!query) return rows;
    return rows.filter((row) =>
      `${row.primary} ${row.secondary} ${row.detail}`
        .toLocaleLowerCase("fr")
        .includes(query),
    );
  }, [rows, search]);

  const assignmentByCourse = useMemo(() => {
    const result = new Map<string, AssignmentApiRow>();
    if (!selectedClassId) return result;
    assignments
      .filter(
        (item) =>
          item.classId === String(selectedClassId) &&
          item.id !== editingRow?.key,
      )
      .forEach((item) => result.set(item.courseId, item));
    return result;
  }, [assignments, editingRow, selectedClassId]);

  const occupiedHomeroomClasses = useMemo(
    () =>
      new Set(
        homeroomAssignments
          .filter((item) => item.id !== editingRow?.key)
          .map((item) => item.classId),
      ),
    [editingRow, homeroomAssignments],
  );
  const occupiedHomeroomTeachers = useMemo(
    () =>
      new Set(
        homeroomAssignments
          .filter((item) => item.id !== editingRow?.key)
          .map((item) => item.teacherId),
      ),
    [editingRow, homeroomAssignments],
  );

  const openCreate = () => {
    setEditingRow(null);
    setPhoto(null);
    form.resetFields();
    if (supportsBulkCreate) {
      bulkForm.resetFields();
      bulkForm.setFieldsValue({ items: [{}] });
      setIsBulkModalOpen(true);
      return;
    }
    setIsModalOpen(true);
  };

  const saveBulk = async () => {
    const values = await bulkForm.validateFields();
    const items = (values.items ?? []).filter((item) =>
      Object.values(item ?? {}).some((value) => String(value ?? "").trim()),
    );
    if (items.length === 0) {
      message.warning("Ajoutez au moins une ligne.");
      return;
    }
    setIsBulkSaving(true);
    try {
      if (kind === "classes") {
        await api.post("/classes/bulk", {
          classes: items.map((item) => ({ label: item.name })),
        });
      } else if (kind === "courses") {
        await api.post("/courses/bulk", {
          courses: items.map((item) => ({ label: item.name })),
        });
      } else if (kind === "teachers") {
        await api.post("/teachers/bulk", {
          teachers: items.map((item) => ({
            lastName: item.name,
            firstName: item.firstName,
            gender: item.gender,
            phone: item.phone,
          })),
        });
      } else {
        return;
      }
      await loadData();
      setIsBulkModalOpen(false);
      bulkForm.resetFields();
      message.success(`${items.length} élément${items.length > 1 ? "s" : ""} ajouté${items.length > 1 ? "s" : ""}.`);
    } catch (error) {
      message.error(errorMessage(error, "Ajout multiple impossible."));
    } finally {
      setIsBulkSaving(false);
    }
  };

  const openEdit = (row: DirectoryRow) => {
    setEditingRow(row);
    if (kind === "assignments") {
      form.setFieldsValue({
        courseId: row.courseId,
        classId: row.classId,
        teacherId: row.teacherId,
        weight: row.weight,
      });
    } else if (kind === "homeroom") {
      form.setFieldsValue({
        classId: row.classId,
        teacherId: row.teacherId,
      });
    } else {
      form.setFieldsValue({ name: row.primary });
    }
    setIsModalOpen(true);
  };

  const save = async () => {
    const values = await form.validateFields();
    setIsSaving(true);
    try {
      if (kind === "classes") {
        if (editingRow) {
          await api.patch(`/classes/${editingRow.key}`, {
            label: values.name,
          });
        } else {
          await api.post("/classes", { label: values.name });
        }
      } else if (kind === "teachers") {
        await api.post("/teachers", {
          lastName: values.name,
          firstName: values.firstName,
          gender: values.gender,
          phone: values.phone,
          photo,
        });
      } else if (kind === "courses") {
        if (editingRow) {
          await api.patch(`/courses/${editingRow.key}`, {
            label: values.name,
          });
        } else {
          await api.post("/courses", { label: values.name });
        }
      } else if (kind === "assignments") {
        const payload = {
          classId: Number(editingRow?.classId ?? values.classId),
          courseId: Number(editingRow?.courseId ?? values.courseId),
          teacherId: Number(editingRow?.teacherId ?? values.teacherId),
          weight: values.weight,
        };
        if (editingRow) {
          await api.patch(`/course-assignments/${editingRow.key}`, payload);
        } else {
          await api.post("/course-assignments", payload);
        }
      } else if (kind === "homeroom") {
        const payload = {
          classId: Number(values.classId),
          teacherId: Number(values.teacherId),
        };
        if (editingRow) {
          await api.patch(`/homeroom-assignments/${editingRow.key}`, payload);
        } else {
          const response = await api.post<{
            loginCode: string;
            temporaryPassword: string;
          }>("/homeroom-assignments", payload);
          Modal.success({
            title: "Titulaire affecté avec succès",
            className: "academic-directory__credentials-modal",
            centered: true,
            width: 440,
            content: (
              <div className="academic-directory__credentials">
                <p>
                  Communiquez ces accès au professeur. Le mot de passe ne sera
                  plus affiché ensuite.
                </p>
                <div>
                  <span>Code de connexion</span>
                  <strong>{response.data.loginCode}</strong>
                </div>
                <div>
                  <span>Mot de passe temporaire</span>
                  <strong>{response.data.temporaryPassword}</strong>
                </div>
              </div>
            ),
            okText: "J’ai noté les accès",
          });
        }
      } else {
        return;
      }
      await loadData();
      form.resetFields();
      setPhoto(null);
      setEditingRow(null);
      setIsModalOpen(false);
      message.success(
        editingRow
          ? "Modification enregistrée avec succès."
          : "Enregistrement effectué avec succès.",
      );
    } catch (error) {
      message.error(errorMessage(error, "Enregistrement impossible."));
    } finally {
      setIsSaving(false);
    }
  };

  const resetHomeroomPassword = (row: DirectoryRow) => {
    resetPasswordForm.resetFields();
    Modal.confirm({
      title: `Nouveau mot de passe de ${row.primary}`,
      content: (
        <Form form={resetPasswordForm} layout="vertical" className="academic-directory__password-form">
          <p>Définissez le nouveau mot de passe du titulaire. L’ancien ne fonctionnera plus.</p>
          <Form.Item
            name="password"
            label="Nouveau mot de passe"
            rules={[{ required: true, message: "Saisissez le nouveau mot de passe." }, { min: 8, message: "Utilisez au moins 8 caractères." }]}
          >
            <Input.Password autoComplete="new-password" placeholder="Au moins 8 caractères" />
          </Form.Item>
          <Form.Item
            name="confirmation"
            label="Confirmer le mot de passe"
            dependencies={["password"]}
            rules={[
              { required: true, message: "Confirmez le mot de passe." },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  return !value || getFieldValue("password") === value
                    ? Promise.resolve()
                    : Promise.reject(new Error("Les mots de passe ne correspondent pas."));
                },
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" placeholder="Retapez le mot de passe" />
          </Form.Item>
        </Form>
      ),
      okText: "Enregistrer le mot de passe",
      cancelText: "Annuler",
      centered: true,
      className: "academic-directory__confirm-modal",
      async onOk() {
        try {
          const values = await resetPasswordForm.validateFields();
          await api.post(`/homeroom-assignments/${row.key}/reset-password`, {
            password: values.password,
          });
          message.success("Le nouveau mot de passe du titulaire est enregistré.");
        } catch (error) {
          if (error && typeof error === "object" && "errorFields" in error) throw error;
          message.error(
            errorMessage(error, "Réinitialisation du mot de passe impossible."),
          );
          throw error;
        }
      },
    });
  };

  const replaceCourseTeacher = (row: DirectoryRow) => {
    replacementForm.setFieldsValue({ teacherId: undefined, effectiveDate: dayjs(), reason: "" });
    Modal.confirm({
      centered: true,
      width: 520,
      title: `Remplacer le professeur de ${row.primary}`,
      icon: <SwapOutlined />,
      content: (
        <Form form={replacementForm} layout="vertical" style={{ marginTop: 18 }}>
          <p>{row.detail} enseigne actuellement ce cours en {row.secondary}.</p>
          <Form.Item name="teacherId" label="Nouveau professeur" rules={[{ required: true, message: "Choisissez le remplaçant." }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Sélectionner le nouveau professeur"
              options={teachers.filter((teacher) => teacher.id !== row.teacherId).map((teacher) => ({ value: teacher.id, label: teacher.label }))}
            />
          </Form.Item>
          <Form.Item name="effectiveDate" label="Date de prise d’effet" rules={[{ required: true, message: "Choisissez la date." }]}>
            <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="reason" label="Motif (facultatif)">
            <Input.TextArea maxLength={500} showCount placeholder="Mutation, indisponibilité, réorganisation…" />
          </Form.Item>
        </Form>
      ),
      okText: "Confirmer le remplacement",
      cancelText: "Annuler",
      async onOk() {
        try {
          const values = await replacementForm.validateFields();
          await api.post(`/course-assignments/${row.key}/replace`, {
            teacherId: Number(values.teacherId),
            effectiveDate: values.effectiveDate.format("YYYY-MM-DD"),
            reason: values.reason,
          });
          message.success("Le remplacement est enregistré sans modifier les cotes.");
          await loadData();
        } catch (error) {
          if (error && typeof error === "object" && "errorFields" in error) throw error;
          message.error(errorMessage(error, "Remplacement impossible."));
          throw error;
        }
      },
    });
  };

  const deleteDirectoryItem = (row: DirectoryRow) => {
    const label = kind === "teachers" ? "ce professeur" : kind === "courses" ? "ce cours" : "cette classe";
    Modal.confirm({
      centered: true,
      title: `Supprimer ${row.primary} ?`,
      content: `Si ${label} possède déjà des données, celles-ci seront protégées et conservées dans l’historique.`,
      okText: "Supprimer",
      okButtonProps: { danger: true },
      cancelText: "Annuler",
      async onOk() {
        try {
          const response = await api.delete<{ deleted: boolean; archived?: boolean; requested?: boolean }>(`/${kind}/${row.key}`);
          message.success(
            response.data.requested
              ? "Des données sont liées à cette classe. Demande envoyée au super administrateur."
              : response.data.archived
                ? `${row.primary} a été retiré des listes actives. Son historique est conservé.`
                : `${row.primary} a été supprimé.`,
          );
          await loadData();
        } catch (error) {
          message.error(errorMessage(error, "Suppression impossible."));
          throw error;
        }
      },
    });
  };

  const showAssignmentHistory = async () => {
    try {
      const history = (await api.get<AssignmentHistoryRow[]>("/course-assignments/history")).data;
      Modal.info({
        centered: true,
        width: 900,
        title: "Historique des professeurs par cours",
        okText: "Fermer",
        content: (
          <Table
            style={{ marginTop: 18 }}
            rowKey="id"
            size="small"
            dataSource={history}
            pagination={{ pageSize: 8 }}
            columns={[
              { title: "Cours", dataIndex: "course" },
              { title: "Classe", dataIndex: "className" },
              { title: "Professeur", dataIndex: "teacher" },
              { title: "Début", render: (_, item) => dayjs(item.startDate).format("DD/MM/YYYY") },
              { title: "Fin", render: (_, item) => item.endDate ? dayjs(item.endDate).format("DD/MM/YYYY") : "En cours" },
              { title: "Motif", render: (_, item) => item.reason || "—" },
            ]}
          />
        ),
      });
    } catch (error) {
      message.error(errorMessage(error, "Historique impossible à charger."));
    }
  };

  const columns = [
    {
      title:
        kind === "teachers"
          ? "Professeur"
          : kind === "homeroom"
            ? "Titulaire"
          : kind === "classes"
            ? "Classe"
            : "Cours",
      key: "primary",
      render: (_: unknown, row: DirectoryRow) => (
        <div className="academic-directory__identity">
          {kind === "teachers" ? (
            <Avatar src={row.extra || undefined} icon={<UserOutlined />} />
          ) : (
            <span>{content.icon}</span>
          )}
          <div>
            <strong>{row.primary}</strong>
            {!["courses", "classes"].includes(kind) && (
              <small>{row.secondary}</small>
            )}
          </div>
        </div>
      ),
    },
    ...(!["courses", "classes"].includes(kind)
      ? [
          {
            title:
              kind === "assignments"
                ? "Professeur"
                : kind === "homeroom"
                  ? "Classe"
                : kind === "teachers"
                  ? "Contact"
                  : "Informations",
            dataIndex: "detail",
            key: "detail",
          },
        ]
      : []),
    ...(kind === "assignments"
      ? [
          {
            title: "Pondération",
            dataIndex: "extra",
            key: "weight",
            render: (value: string) => <strong>{value}</strong>,
          },
        ]
      : []),
    ...(["classes", "teachers", "courses", "assignments", "homeroom"].includes(kind)
      ? [
          {
            title: "Actions",
            key: "actions",
            width: ["homeroom", "classes", "teachers", "courses", "assignments"].includes(kind) ? 240 : 110,
            align: "right" as const,
            render: (_: unknown, row: DirectoryRow) => (
              <div className="academic-directory__row-actions">
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => openEdit(row)}
                  aria-label={`Modifier ${row.primary}`}
                >
                  Modifier
                </Button>
                {kind === "assignments" && (
                  <Button type="text" icon={<SwapOutlined />} onClick={() => replaceCourseTeacher(row)}>
                    Remplacer
                  </Button>
                )}
                {["classes", "teachers", "courses"].includes(kind) && (
                  <Button
                    danger
                    type="text"
                    icon={<DeleteOutlined />}
                    onClick={() => deleteDirectoryItem(row)}
                  >
                    Supprimer
                  </Button>
                )}
                {kind === "homeroom" && (
                  <Button
                    type="text"
                    icon={<ReloadOutlined />}
                    onClick={() => resetHomeroomPassword(row)}
                  >
                    Réinitialiser
                  </Button>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  const statLabels =
    kind === "teachers"
      ? ["Professeurs actifs", "Avec contact", "Hommes", "Femmes"]
      : kind === "courses"
        ? ["Cours actifs", "Cours attribués", "Non attribués", "Total"]
        : kind === "assignments"
          ? ["Attributions", "Cours couverts", "Professeurs", "Classes"]
          : kind === "homeroom"
            ? ["Titulaires", "Classes couvertes", "Professeurs", "Sans titulaire"]
          : ["Classes actives", "Élèves répartis", "Classes occupées", "Total"];
  const statValues =
    kind === "teachers"
      ? [
          rows.length,
          rows.filter((row) => row.detail !== "Aucun contact").length,
          rows.filter((row) => ["M", "Garçon"].includes(row.secondary)).length,
          rows.filter((row) => ["F", "Fille"].includes(row.secondary)).length,
        ]
      : kind === "assignments"
        ? [
            rows.length,
            new Set(rows.map((row) => row.primary)).size,
            new Set(rows.map((row) => row.detail)).size,
            new Set(rows.map((row) => row.secondary)).size,
          ]
        : kind === "homeroom"
          ? [
              rows.length,
              new Set(rows.map((row) => row.detail)).size,
              rows.length,
              Math.max(classes.length - rows.length, 0),
            ]
        : kind === "classes"
          ? [
              rows.length,
              rows.reduce((sum, row) => sum + (row.students || 0), 0),
              rows.filter((row) => (row.students || 0) > 0).length,
              rows.length,
            ]
          : [rows.length, 0, rows.length, rows.length];

  return (
    <section className={`academic-directory academic-directory--${kind}`}>
      <header className="academic-directory__hero">
        <div className="academic-directory__seal">{content.icon}</div>
        <div>
          <span>Gestion scolaire</span>
          <h1>{content.title}</h1>
          <p>{content.description}</p>
        </div>
        <Space wrap>
          {kind === "assignments" && (
            <Button icon={<HistoryOutlined />} onClick={() => void showAssignmentHistory()}>
              Historique
            </Button>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {content.addLabel}
          </Button>
        </Space>
      </header>

      <div className="academic-directory__stats">
        {statLabels.map((label, index) => (
          <Card key={label}>
            <strong>{statValues[index]}</strong>
            <span>{label}</span>
          </Card>
        ))}
      </div>

      <Card className="academic-directory__registry">
        <div className="academic-directory__registry-title">
          <div>
            <span>Répertoire</span>
            <h2>Liste administrative</h2>
          </div>
          <small>{filteredRows.length} entrées enregistrées</small>
        </div>
        <div className="academic-directory__toolbar">
          <Input
            prefix={<SearchOutlined />}
            placeholder={content.search}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            allowClear
          />
        </div>
        <Table
          rowKey="key"
          columns={columns}
          dataSource={filteredRows}
          loading={isLoading}
          pagination={false}
          scroll={{ x: 680 }}
        />
      </Card>

      <Modal
        width={kind === "assignments" ? 620 : 520}
        title={
          <div className="academic-directory__modal-title">
            <span>{content.icon}</span>
            <div>
              <strong>
                {editingRow
                  ? kind === "assignments"
                    ? "Modifier la pondération"
                    : kind === "homeroom"
                      ? "Modifier le titulaire"
                    : kind === "classes"
                      ? "Modifier la classe"
                      : "Modifier le cours"
                  : content.addLabel}
              </strong>
            </div>
          </div>
        }
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setPhoto(null);
          setEditingRow(null);
          form.resetFields();
        }}
        onOk={save}
        confirmLoading={isSaving}
        okText={editingRow ? "Enregistrer les modifications" : "Enregistrer"}
        cancelText="Annuler"
        className="academic-directory__modal"
      >
        <Form
          form={form}
          layout="vertical"
          className="academic-directory__form academic-directory__form--simple"
        >
          {kind === "classes" && (
            <Form.Item
              name="name"
              label="Nom de la classe"
              rules={[{ required: true, message: "Champ requis." }]}
            >
              <Input autoFocus prefix={<TeamOutlined />} placeholder="6ème A" />
            </Form.Item>
          )}

          {kind === "teachers" && (
            <>
              <div className="students-directory__photo-field">
                <Avatar
                  size={68}
                  src={photo || undefined}
                  icon={<UserOutlined />}
                />
                <div>
                  <strong>Photo facultative</strong>
                  <Upload
                    accept="image/jpeg,image/png,image/webp"
                    showUploadList={false}
                    beforeUpload={(file) => {
                      if (file.size > 2 * 1024 * 1024) {
                        message.error("La photo ne doit pas dépasser 2 Mo.");
                        return Upload.LIST_IGNORE;
                      }
                      const reader = new FileReader();
                      reader.onload = () => setPhoto(String(reader.result));
                      reader.readAsDataURL(file);
                      return false;
                    }}
                  >
                    <Button size="small" icon={<UploadOutlined />}>
                      Choisir une photo
                    </Button>
                  </Upload>
                </div>
              </div>
              <Row gutter={14}>
                <Col span={12}>
                  <Form.Item
                    name="name"
                    label="Nom"
                    normalize={(value: string) =>
                      value.toLocaleUpperCase("fr")
                    }
                    rules={[{ required: true, message: "Champ requis." }]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="NOM" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="firstName"
                    label="Prénom"
                    rules={[{ required: true, message: "Champ requis." }]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="Prénom" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={14}>
                <Col span={12}>
                  <Form.Item
                    name="gender"
                    label="Sexe"
                    rules={[{ required: true, message: "Champ requis." }]}
                  >
                    <Select
                      options={[
                        { value: "M", label: "Homme" },
                        { value: "F", label: "Femme" },
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="phone" label="Contact (facultatif)">
                    <Input
                      prefix={<PhoneOutlined />}
                      placeholder="+243..."
                    />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          {kind === "courses" && (
            <Form.Item
              name="name"
              label="Intitulé du cours"
              rules={[{ required: true, message: "Champ requis." }]}
            >
              <Input
                autoFocus
                prefix={<BookOutlined />}
                placeholder="Mathématiques"
              />
            </Form.Item>
          )}

          {kind === "assignments" && (
            <>
              {!editingRow && <Row gutter={14}>
                <Col span={12}>
                  <Form.Item
                    name="classId"
                    label="Classe"
                    rules={[{ required: true, message: "Choisissez la classe." }]}
                  >
                    <Select
                      showSearch
                      optionFilterProp="label"
                      placeholder="Sélectionner d’abord une classe"
                      onChange={() => form.setFieldValue("courseId", undefined)}
                      options={classes.map((item) => ({
                        value: item.id,
                        label: item.label,
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="courseId"
                    label="Cours à ajouter"
                    rules={[{ required: true, message: "Choisissez le cours." }]}
                  >
                    <Select
                      showSearch
                      optionFilterProp="label"
                      disabled={!selectedClassId}
                      placeholder={
                        selectedClassId
                          ? "Sélectionner un cours réutilisable"
                          : "Choisissez d’abord la classe"
                      }
                      options={courses.map((item) => {
                        const existing = assignmentByCourse.get(item.id);
                        return {
                          value: item.id,
                          label: item.label,
                          disabled: Boolean(existing),
                        };
                      })}
                      optionRender={(option) => {
                        const existing = assignmentByCourse.get(
                          String(option.value),
                        );
                        return (
                          <div className="academic-directory__assignment-option">
                            <span>{String(option.label)}</span>
                            {existing && <small>Déjà présent dans cette classe</small>}
                          </div>
                        );
                      }}
                    />
                  </Form.Item>
                </Col>
              </Row>}
              <Row gutter={14}>
                {!editingRow && <Col span={12}>
                  <Form.Item
                    name="teacherId"
                    label="Professeur"
                    rules={[
                      { required: true, message: "Choisissez le professeur." },
                    ]}
                  >
                    <Select
                      showSearch
                      optionFilterProp="label"
                      options={teachers.map((item) => ({
                        value: item.id,
                        label: item.label,
                      }))}
                    />
                  </Form.Item>
                </Col>}
                <Col span={editingRow ? 24 : 12}>
                  <Form.Item
                    name="weight"
                    label={editingRow ? "Nouvelle pondération" : "Pondération"}
                    rules={[
                      { required: true, message: "Indiquez la pondération." },
                      {
                        validator: (_, value) =>
                          Number.isInteger(value) && value >= 1
                            ? Promise.resolve()
                            : Promise.reject(new Error("La pondération doit être un nombre entier.")),
                      },
                    ]}
                  >
                    <InputNumber min={1} step={1} precision={0} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          {kind === "homeroom" && (
            <Row gutter={14}>
              <Col span={12}>
                <Form.Item
                  name="classId"
                  label="Classe"
                  rules={[{ required: true, message: "Choisissez la classe." }]}
                >
                  <Select
                    showSearch
                    optionFilterProp="label"
                    placeholder="Sélectionner une classe"
                    options={classes.map((item) => ({
                      value: item.id,
                      label: occupiedHomeroomClasses.has(item.id)
                        ? `${item.label} — déjà attribuée`
                        : item.label,
                      disabled: occupiedHomeroomClasses.has(item.id),
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="teacherId"
                  label="Professeur titulaire"
                  rules={[
                    { required: true, message: "Choisissez le professeur." },
                  ]}
                >
                  <Select
                    showSearch
                    optionFilterProp="label"
                    placeholder="Sélectionner un professeur"
                    options={teachers.map((item) => ({
                      value: item.id,
                      label: occupiedHomeroomTeachers.has(item.id)
                        ? `${item.label} — déjà titulaire`
                        : item.label,
                      disabled: occupiedHomeroomTeachers.has(item.id),
                    }))}
                  />
                </Form.Item>
              </Col>
            </Row>
          )}
        </Form>
      </Modal>

      <Modal
        width={620}
        title={
          <div className="academic-directory__modal-title">
            <span>{content.icon}</span>
            <div>
              <strong>Ajout multiple</strong>
              <small>
                {kind === "teachers"
                  ? "Ajoutez un ou plusieurs professeurs"
                  : kind === "courses"
                    ? "Ajoutez un ou plusieurs cours"
                    : "Ajoutez une ou plusieurs classes"}
              </small>
            </div>
          </div>
        }
        open={isBulkModalOpen}
        onCancel={() => {
          setIsBulkModalOpen(false);
          bulkForm.resetFields();
        }}
        onOk={saveBulk}
        confirmLoading={isBulkSaving}
        okText="Enregistrer"
        cancelText="Annuler"
        className="academic-directory__modal"
      >
        <Form
          form={bulkForm}
          layout="vertical"
          className="academic-directory__form academic-directory__form--simple"
        >
          <Form.List name="items" initialValue={[{}]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map((field, index) => (
                  <Card
                    key={field.key}
                    size="small"
                    className="academic-directory__bulk-card"
                    title={`${kind === "teachers" ? "Professeur" : kind === "courses" ? "Cours" : "Classe"} ${index + 1}`}
                    extra={
                      fields.length > 1 ? (
                        <Button
                          danger
                          type="text"
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => remove(field.name)}
                        >
                          Retirer
                        </Button>
                      ) : null
                    }
                  >
                    {kind === "teachers" ? (
                      <>
                        <Row gutter={14}>
                          <Col span={12}>
                            <Form.Item
                              name={[field.name, "name"]}
                              label="Nom"
                              normalize={(value: string) =>
                                value?.toLocaleUpperCase("fr")
                              }
                              rules={[{ required: true, message: "Champ requis." }]}
                            >
                              <Input prefix={<UserOutlined />} placeholder="NOM" />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item
                              name={[field.name, "firstName"]}
                              label="Prénom"
                              rules={[{ required: true, message: "Champ requis." }]}
                            >
                              <Input prefix={<UserOutlined />} placeholder="Prénom" />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={14}>
                          <Col span={12}>
                            <Form.Item
                              name={[field.name, "gender"]}
                              label="Sexe"
                              rules={[{ required: true, message: "Champ requis." }]}
                            >
                              <Select
                                options={[
                                  { value: "M", label: "Homme" },
                                  { value: "F", label: "Femme" },
                                ]}
                              />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item
                              name={[field.name, "phone"]}
                              label="Contact (facultatif)"
                            >
                              <Input prefix={<PhoneOutlined />} placeholder="+243..." />
                            </Form.Item>
                          </Col>
                        </Row>
                      </>
                    ) : (
                      <Form.Item
                        name={[field.name, "name"]}
                        label={kind === "courses" ? "Intitulé du cours" : "Nom de la classe"}
                        rules={[{ required: true, message: "Champ requis." }]}
                      >
                        <Input
                          autoFocus={index === 0}
                          prefix={kind === "courses" ? <BookOutlined /> : <TeamOutlined />}
                          placeholder={kind === "courses" ? "Mathématiques" : "6ème A"}
                        />
                      </Form.Item>
                    )}
                  </Card>
                ))}
                <Button
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  onClick={() => add({})}
                >
                  Ajouter une autre ligne
                </Button>
              </>
            )}
          </Form.List>
          <p className="academic-directory__bulk-help">
            Remplissez plusieurs fiches avec le même format que l’ajout simple,
            puis enregistrez tout en une seule fois.
          </p>
        </Form>
      </Modal>
    </section>
  );
};

export default AcademicDirectoryPage;
