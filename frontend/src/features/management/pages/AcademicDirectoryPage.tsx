import { useEffect, useMemo, useState } from "react";
import {
  BookOutlined,
  DeleteOutlined,
  EditOutlined,
  PhoneOutlined,
  PlusOutlined,
  ReadOutlined,
  ReloadOutlined,
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
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Table,
  Upload,
  message,
} from "antd";
import axios from "axios";
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

interface ResetPasswordValues {
  password: string;
  confirmation: string;
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
  const [resetPasswordForm] = Form.useForm<ResetPasswordValues>();
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<DirectoryRow | null>(null);
  const selectedClassId = Form.useWatch("classId", form);

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
    setIsModalOpen(true);
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
          classId: Number(values.classId),
          courseId: Number(values.courseId),
          teacherId: Number(values.teacherId),
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
    ...(["classes", "courses", "assignments", "homeroom"].includes(kind)
      ? [
          {
            title: "Actions",
            key: "actions",
            width: kind === "homeroom" || kind === "classes" ? 240 : 110,
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
                {kind === "classes" && (
                  <Button
                    danger
                    type="text"
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      Modal.confirm({
                        centered: true,
                        title: `Supprimer ${row.primary} ?`,
                        content: "Si cette classe contient des données, une demande sera envoyée au super administrateur.",
                        okText: "Supprimer ou envoyer",
                        okButtonProps: { danger: true },
                        cancelText: "Annuler",
                        async onOk() {
                          try {
                            const response = await api.delete<{ deleted: boolean; requested: boolean }>(`/classes/${row.key}`);
                            message.success(
                              response.data.requested
                                ? "La classe contient des données. Demande envoyée au super administrateur."
                                : "Classe supprimée.",
                            );
                            await loadData();
                          } catch (error) {
                            message.error(errorMessage(error, "Suppression impossible."));
                            throw error;
                          }
                        },
                      });
                    }}
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
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreate}
        >
          {content.addLabel}
        </Button>
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
                    ? "Modifier l’attribution"
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
              </Row>
              <Row gutter={14}>
                <Col span={12}>
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
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="weight"
                    label="Pondération"
                    rules={[
                      { required: true, message: "Indiquez la pondération." },
                    ]}
                  >
                    <InputNumber min={0.01} precision={2} style={{ width: "100%" }} />
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
    </section>
  );
};

export default AcademicDirectoryPage;
