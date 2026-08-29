import { useEffect, useMemo, useState } from "react";
import {
  DeleteOutlined,
  EditOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
  FilterOutlined,
  HomeOutlined,
  IdcardOutlined,
  LockOutlined,
  PlusOutlined,
  SearchOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  PhoneOutlined,
  UploadOutlined,
  UserOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Table,
  Tag,
  Upload,
  message,
} from "antd";
import axios from "axios";
import dayjs from "dayjs";

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError(error)) return fallback;
  const responseMessage = error.response?.data?.message;
  if (Array.isArray(responseMessage)) return responseMessage.join(" ");
  return typeof responseMessage === "string" ? responseMessage : fallback;
};
import { api } from "../../../lib/api";
import StudentImportModal from "../components/StudentImportModal";

interface StudentRow {
  id: string;
  key: string;
  matricule: string;
  name: string;
  detail: string;
  className: string;
  gender: "Fille" | "Garçon";
  status: "Actif" | "En attente";
  photo: string;
  classId?: string;
  lastName?: string;
  postName?: string;
  firstName?: string;
  birthDate?: string;
  address?: string;
  guardianPhone?: string;
}

interface ClassOption {
  id: string;
  label: string;
  isActive: boolean;
}

interface SchoolYearOption {
  id: string;
  label: string;
  isActive: boolean;
  status: string;
}

interface ReenrollmentRow { enrollmentId: string; studentId: string; matricule: string; name: string; sourceClass: string; classId: string; orderNumber?: number | null; }
interface ReenrollmentPreview { sourceYear: { id: string; label: string }; targetYear: { id: string; label: string }; students: ReenrollmentRow[]; }

const initialStudents: StudentRow[] = [];

interface StudentDateValue {
  format: (template: string) => string;
}

interface StudentDraftValues {
  lastName: string;
  middleName: string;
  firstName: string;
  gender: "Fille" | "Garçon";
  classId: string;
  birthDate: StudentDateValue;
  address: string;
  phone?: string;
}

interface StudentFormValues {
  students?: StudentDraftValues[];
  schoolYearId?: string;
  lastName: string;
  middleName: string;
  firstName: string;
  gender: "Fille" | "Garçon";
  classId: string;
  birthDate: StudentDateValue;
  address: string;
  phone?: string;
}

const StudentsPage = () => {
  const [students, setStudents] = useState(initialStudents);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYearOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("Toutes les classes");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null);
  const [studentPhoto, setStudentPhoto] = useState<string | null>(null);
  const [batchSize, setBatchSize] = useState(1);
  const [studentToDelete, setStudentToDelete] = useState<StudentRow | null>(
    null,
  );
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [form] = Form.useForm<StudentFormValues>();
  const [reenrollOpen, setReenrollOpen] = useState(false);
  const [reenrollSourceYearId, setReenrollSourceYearId] = useState<string>();
  const [reenrollPreview, setReenrollPreview] = useState<ReenrollmentPreview | null>(null);
  const [reenrollRows, setReenrollRows] = useState<ReenrollmentRow[]>([]);
  const [reenrollLoading, setReenrollLoading] = useState(false);

  const buildStudentPayload = (
    values: StudentDraftValues,
    photo?: string | null,
    schoolYearId?: string,
  ) => ({
    classId: Number(values.classId),
    ...(schoolYearId ? { schoolYearId: Number(schoolYearId) } : {}),
    lastName: values.lastName,
    postName: values.middleName,
    firstName: values.firstName,
    gender: values.gender,
    birthDate: values.birthDate.format("YYYY-MM-DD"),
    address: values.address,
    guardianPhone: values.phone,
    photo: photo ?? undefined,
  });

  const syncBatchStudentFields = (nextSize: number) => {
    const currentRows =
      (form.getFieldValue("students") as
        | Partial<StudentDraftValues>[]
        | undefined) ?? [];
    const nextRows = Array.from(
      { length: nextSize },
      (_, index) => currentRows[index] ?? {},
    );
    form.setFieldsValue({ students: nextRows as StudentDraftValues[] });
  };

  const handleBatchSizeChange = (nextSize: number) => {
    setBatchSize(nextSize);
    if (nextSize > 1) setStudentPhoto(null);
    syncBatchStudentFields(nextSize);
  };

  const loadStudents = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const response = await api.get<StudentRow[]>("/students");
      setStudents(response.data);
    } catch (error) {
      setStudents([]);
      if (showLoading) {
        message.error(
          getApiErrorMessage(
            error,
            "Impossible de charger la liste des élèves.",
          ),
        );
      }
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadClasses = () => {
      api
        .get<ClassOption[]>("/classes")
        .then((response) =>
          setClasses(
            response.data.filter((schoolClass) => schoolClass.isActive),
          ),
        )
        .catch(() => setClasses([]));
    };

    const loadSchoolYears = () => {
      api
        .get<SchoolYearOption[]>("/school-years")
        .then((response) => setSchoolYears(response.data))
        .catch(() => setSchoolYears([]));
    };

    loadStudents(true);
    loadClasses();
    loadSchoolYears();

    let active = true;
    const refreshLists = () => {
      if (!active) return;
      loadStudents();
      loadClasses();
      loadSchoolYears();
    };

    window.addEventListener("focus", refreshLists);
    document.addEventListener("visibilitychange", refreshLists);

    return () => {
      active = false;
      window.removeEventListener("focus", refreshLists);
      document.removeEventListener("visibilitychange", refreshLists);
    };
  }, []);

  const classFilters = useMemo(
    () => [
      "Toutes les classes",
      ...Array.from(
        new Set(
          students
            .map((student) => student.className)
            .filter((className) => className && className !== "—"),
        ),
      ),
    ],
    [students],
  );

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    return students.filter((student) => {
      const matchesSearch =
        !query ||
        `${student.name} ${student.matricule} ${student.detail}`
          .toLocaleLowerCase("fr")
          .includes(query);
      const matchesClass =
        selectedClass === "Toutes les classes" ||
        student.className === selectedClass;
      return matchesSearch && matchesClass;
    });
  }, [search, selectedClass, students]);

  const activeStudents = students.filter(
    (student) => student.status === "Actif",
  ).length;
  const girlsCount = students.filter(
    (student) => student.gender === "Fille",
  ).length;
  const representedClasses = new Set(
    students
      .map((student) => student.className)
      .filter((className) => className && className !== "—"),
  ).size;

  const saveStudent = async () => {
    setIsSaving(true);
    try {
      if (editingStudent) {
        const values = await form.validateFields();
        await api.patch<{ id: string }>(
          `/students/${editingStudent.id}`,
          buildStudentPayload(values as StudentDraftValues, studentPhoto),
        );
        message.success("Élève modifié avec succès.");
      } else {
        const values = await form.validateFields();
        const studentsToCreate = (values.students ?? []).slice(0, batchSize);

        if (!studentsToCreate.length) {
          message.error("Ajoutez au moins un élève à enregistrer.");
          return;
        }

        if (batchSize === 1) {
          const response = await api.post<{ matricule: string }>(
            "/students",
            buildStudentPayload(
              studentsToCreate[0],
              studentPhoto,
              values.schoolYearId,
            ),
          );
          message.success(
            `Élève ajouté · matricule ${response.data.matricule}`,
          );
        } else {
          const creationResults = await Promise.allSettled(
            studentsToCreate.map((studentValues) =>
              api.post<{ matricule: string }>(
                "/students",
                buildStudentPayload(
                  studentValues,
                  undefined,
                  values.schoolYearId,
                ),
              ),
            ),
          );

          const successfulCreations = creationResults.filter(
            (result): result is PromiseFulfilledResult<any> =>
              result.status === "fulfilled",
          );
          const failedCreations = creationResults.filter(
            (result): result is PromiseRejectedResult =>
              result.status === "rejected",
          );

          if (!successfulCreations.length && failedCreations.length) {
            throw failedCreations[0].reason;
          }

          if (!failedCreations.length) {
            message.success(
              `${successfulCreations.length} élèves ajoutés avec succès.`,
            );
          } else {
            const firstFailureMessage = getApiErrorMessage(
              failedCreations[0].reason,
              "Certains élèves n'ont pas pu être enregistrés.",
            );
            message.warning(
              `${successfulCreations.length} ajouté(s), ${failedCreations.length} en échec. ${firstFailureMessage}`,
            );
          }
        }
      }

      await loadStudents();
      form.resetFields();
      setIsModalOpen(false);
      setEditingStudent(null);
      setStudentPhoto(null);
      setBatchSize(1);
      form.setFieldsValue({ students: [{} as StudentDraftValues] });
    } catch (error) {
      message.error(
        getApiErrorMessage(
          error,
          editingStudent
            ? "Modification impossible. Vérifiez les informations saisies."
            : "Ajout impossible. Vérifiez les informations saisies.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const openCreateModal = () => {
    setEditingStudent(null);
    setBatchSize(1);
    setStudentPhoto(null);
    form.resetFields();
    form.setFieldsValue({
      students: [{} as StudentDraftValues],
      schoolYearId: schoolYears.find((year) => year.isActive)?.id,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (student: StudentRow) => {
    setEditingStudent(student);
    setBatchSize(1);
    setStudentPhoto(student.photo || null);
    form.setFieldsValue({
      lastName: student.lastName ?? "",
      middleName: student.postName ?? "",
      firstName: student.firstName ?? "",
      gender: student.gender,
      classId: student.classId,
      birthDate: student.birthDate ? dayjs(student.birthDate) : undefined,
      address: student.address ?? "",
      phone: student.guardianPhone ?? undefined,
    });
    setIsModalOpen(true);
  };

  const activeSchoolYear = schoolYears.find((year) => year.isActive);

  const deleteStudent = async () => {
    if (!studentToDelete || !deletePassword) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/students/${studentToDelete.id}`, {
        password: deletePassword,
      });
      await loadStudents();
      setStudentToDelete(null);
      setDeletePassword("");
      message.success("Élève supprimé.");
    } catch (error) {
      setDeleteError(
        getApiErrorMessage(
          error,
          "Suppression impossible. Réessayez dans quelques instants.",
        ),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const openReenrollment = () => { setReenrollOpen(true); setReenrollSourceYearId(undefined); setReenrollPreview(null); setReenrollRows([]); };
  const loadReenrollmentPreview = async (yearId: string) => {
    setReenrollSourceYearId(yearId); setReenrollLoading(true);
    try { const preview = (await api.get<ReenrollmentPreview>(`/students/reenrollment-preview/${yearId}`)).data; setReenrollPreview(preview); setReenrollRows(preview.students); }
    catch (error) { setReenrollPreview(null); setReenrollRows([]); message.error(getApiErrorMessage(error, "Aperçu des élèves impossible.")); }
    finally { setReenrollLoading(false); }
  };
  const applyReenrollment = async () => {
    if (!reenrollSourceYearId || !reenrollRows.length) return message.warning("Conservez au moins un élève.");
    setReenrollLoading(true);
    try { const response = await api.post<{ created: number; skipped: number; targetYear: string }>("/students/reenroll", { sourceYearId: Number(reenrollSourceYearId), students: reenrollRows.map((item) => ({ studentId: Number(item.studentId), classId: Number(item.classId), ...(item.orderNumber ? { orderNumber: item.orderNumber } : {}) })) }); message.success(`${response.data.created} élève(s) réinscrit(s) en ${response.data.targetYear}${response.data.skipped ? `, ${response.data.skipped} déjà inscrit(s)` : ""}.`); setReenrollOpen(false); await loadStudents(true); }
    catch (error) { message.error(getApiErrorMessage(error, "Réinscription impossible.")); }
    finally { setReenrollLoading(false); }
  };

  const columns = [
    {
      title: "Élève",
      key: "student",
      render: (_: unknown, student: StudentRow) => (
        <div className="students-directory__identity">
          <Avatar size={48} src={student.photo} icon={<UserOutlined />} />
          <div>
            <strong className="student-name-unified">{student.name}</strong>
          </div>
        </div>
      ),
    },
    {
      title: "Matricule",
      dataIndex: "matricule",
      key: "matricule",
      render: (value: string) => (
        <code className="students-directory__matricule">{value}</code>
      ),
    },
    {
      title: "Classe",
      dataIndex: "className",
      key: "className",
      render: (value: string) => (
        <Tag className="students-directory__class-tag">{value}</Tag>
      ),
    },
    { title: "Genre", dataIndex: "gender", key: "gender" },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, student: StudentRow) => (
        <div className="students-directory__actions">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => openEditModal(student)}
            aria-label="Modifier l’élève"
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              setStudentToDelete(student);
              setDeletePassword("");
              setDeleteError(null);
            }}
            aria-label="Supprimer l’élève"
          />
        </div>
      ),
    },
  ];

  return (
    <section className="students-directory">
      <header className="students-directory__hero">
        <div className="students-directory__hero-seal" aria-hidden="true">
          <TeamOutlined />
        </div>
        <div className="students-directory__hero-copy">
          <span className="students-directory__official-label">
            Gestion scolaire
          </span>
          <h1>Élèves</h1>
          <p>Consultez et gérez les élèves de votre établissement.</p>
        </div>
        <div className="students-directory__hero-action">
          <Button icon={<CopyOutlined />} onClick={openReenrollment}>Réinscrire depuis une année</Button>
          <Button
            icon={<UploadOutlined />}
            onClick={() => setIsImportOpen(true)}
          >
            Importer Excel / CSV
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateModal}
            className="students-directory__add"
          >
            Ajouter un élève
          </Button>
        </div>
      </header>

      <StudentImportModal
        open={isImportOpen}
        classes={classes}
        schoolYears={schoolYears}
        onClose={() => setIsImportOpen(false)}
        onImported={() => loadStudents()}
      />
      <Modal width={1000} centered open={reenrollOpen} title="Réinscrire les élèves d’une ancienne année" okText={`Réinscrire en ${reenrollPreview?.targetYear.label ?? "année actuelle"}`} cancelText="Annuler" confirmLoading={reenrollLoading} okButtonProps={{ disabled: !reenrollPreview || !reenrollRows.length }} onOk={() => void applyReenrollment()} onCancel={() => !reenrollLoading && setReenrollOpen(false)} rootClassName="student-reenrollment-modal">
        <p className="student-reenrollment-modal__intro">Le dossier et le matricule restent inchangés. Choisissez la nouvelle classe ou retirez les élèves qui ne doivent pas être réinscrits.</p>
        <Select value={reenrollSourceYearId} onChange={(value) => void loadReenrollmentPreview(value)} placeholder="Choisir l’année précédente" style={{ width: "100%", marginBottom: 16 }} options={schoolYears.filter((year) => !year.isActive).map((year) => ({ value: year.id, label: `${year.label} · ${year.status === "ARCHIVEE" ? "Archivée" : year.status}` }))} />
        {reenrollPreview && <><Alert showIcon type="info" message={`${reenrollPreview.sourceYear.label} → ${reenrollPreview.targetYear.label}`} style={{ marginBottom: 14 }} /><Table rowKey="studentId" size="small" pagination={false} scroll={{ x: 800, y: 410 }} dataSource={reenrollRows} columns={[
          { title: "Élève", render: (_, row) => <div><strong>{row.name}</strong><br/><small>{row.matricule}</small></div> },
          { title: "Ancienne classe", dataIndex: "sourceClass", width: 180 },
          { title: "Nouvelle classe", width: 230, render: (_, row) => <Select value={row.classId} style={{ width: "100%" }} options={classes.filter((item) => item.isActive).map((item) => ({ value: item.id, label: item.label }))} onChange={(value) => setReenrollRows((current) => current.map((item) => item.studentId === row.studentId ? { ...item, classId: value } : item))} /> },
          { title: "N°", width: 85, render: (_, row) => <Input type="number" min={1} value={row.orderNumber ?? ""} onChange={(event) => setReenrollRows((current) => current.map((item) => item.studentId === row.studentId ? { ...item, orderNumber: event.target.value ? Number(event.target.value) : null } : item))} /> },
          { title: "", width: 55, render: (_, row) => <Button danger type="text" icon={<DeleteOutlined />} onClick={() => setReenrollRows((current) => current.filter((item) => item.studentId !== row.studentId))} /> },
        ]} /></>}
      </Modal>

      <div className="students-directory__student-password" role="note">
        <span className="students-directory__student-password-icon">
          <LockOutlined aria-hidden="true" />
        </span>
        <div>
          <span>Mot de passe commun des élèves</span>
          <small>À utiliser pour consulter leurs résultats</small>
        </div>
        <code>POINTSNANGA</code>
      </div>

      <Row gutter={[14, 14]} className="students-directory__summary">
        <Col xs={12} md={6}>
          <Card>
            <strong>{students.length}</strong>
            <span>Total des élèves</span>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <strong>{activeStudents}</strong>
            <span>Élèves actifs</span>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <strong>{representedClasses}</strong>
            <span>Classes représentées</span>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <strong>{girlsCount}</strong>
            <span>Filles inscrites</span>
          </Card>
        </Col>
      </Row>

      <Card className="students-directory__card">
        <div className="students-directory__card-title">
          <div>
            <span>Répertoire</span>
            <h2>Liste des élèves</h2>
          </div>
          <small>
            {students.length} dossier{students.length !== 1 ? "s" : ""}{" "}
            enregistré{students.length !== 1 ? "s" : ""}
          </small>
        </div>
        <div className="students-directory__toolbar">
          <Input
            prefix={<SearchOutlined />}
            placeholder="Rechercher un élève ou un matricule..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            allowClear
          />
          <Select
            suffixIcon={<FilterOutlined />}
            value={selectedClass}
            onChange={setSelectedClass}
            options={classFilters.map((value) => ({ value, label: value }))}
          />
          <span className="students-directory__count">
            <TeamOutlined /> {filteredStudents.length} élèves
          </span>
        </div>
        <Table<StudentRow>
          columns={columns}
          dataSource={filteredStudents}
          loading={isLoading}
          pagination={{ pageSize: 6, showSizeChanger: false }}
          scroll={{ x: 850 }}
        />
      </Card>

      <Modal
        width={720}
        title={
          <div className="students-directory__modal-title">
            <span>
              <IdcardOutlined />
            </span>
            <div>
              <strong>
                {editingStudent
                  ? "Modifier l’élève"
                  : batchSize > 1
                    ? "Nouveaux élèves"
                    : "Nouvel élève"}
              </strong>
              <small>
                {editingStudent
                  ? editingStudent.matricule
                  : "Ajouter au répertoire"}
              </small>
            </div>
          </div>
        }
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingStudent(null);
          setBatchSize(1);
          setStudentPhoto(null);
          form.resetFields();
          form.setFieldsValue({ students: [{} as StudentDraftValues] });
        }}
        onOk={saveStudent}
        confirmLoading={isSaving}
        okText={
          editingStudent
            ? "Enregistrer"
            : batchSize > 1
              ? `Ajouter ${batchSize} élèves`
              : "Ajouter"
        }
        cancelText="Annuler"
        className="students-directory__modal"
      >
        <Form
          form={form}
          layout="vertical"
          className="students-directory__student-form"
        >
          <div className="students-directory__form-banner">
            <SafetyCertificateOutlined />
            <div>
              <strong>Fiche d’identification scolaire</strong>
              <span>Complétez les informations officielles de l’élève.</span>
            </div>
            <b>{activeSchoolYear?.label ?? "Année non définie"}</b>
          </div>
          {!editingStudent && (
            <>
              <Form.Item
                name="schoolYearId"
                label="Année scolaire en cours"
                extra="Toutes les inscriptions, cotes, résultats et bulletins seront rattachés à cette année."
                rules={[{ required: true, message: "Sélectionnez l’année scolaire en cours." }]}
              >
                <Select
                  placeholder="Sélectionner l’année active"
                  options={schoolYears.map((year) => ({
                    value: year.id,
                    label: `${year.label}${year.isActive ? " · En cours" : ""}`,
                    disabled: !year.isActive,
                  }))}
                />
              </Form.Item>
              {!activeSchoolYear && (
                <Alert
                  showIcon
                  type="warning"
                  message="Aucune année scolaire active"
                  description="Activez d’abord une année dans la section Années scolaires."
                  style={{ marginBottom: 16 }}
                />
              )}
              <Form.Item
                label="Nombre d’élèves à ajouter"
                extra="Vous pouvez enregistrer jusqu’à 10 élèves en une seule validation."
              >
                <Select
                  value={batchSize}
                  onChange={handleBatchSizeChange}
                  options={Array.from({ length: 10 }, (_, index) => {
                    const value = index + 1;
                    return {
                      value,
                      label: `${value} élève${value > 1 ? "s" : ""}`,
                    };
                  })}
                />
              </Form.Item>
            </>
          )}

          {!editingStudent && batchSize > 1 && (
            <Alert
              showIcon
              type="info"
              style={{ marginBottom: 16 }}
              message="Ajout groupé activé"
              description="La photo n’est pas gérée en lot. Vous pourrez l’ajouter ensuite depuis la modification de chaque élève."
            />
          )}

          {(editingStudent || batchSize === 1) && (
            <div className="students-directory__photo-field">
              <Avatar
                size={72}
                src={studentPhoto || undefined}
                icon={<UserOutlined />}
              />
              <div>
                <strong>Photo de l’élève (facultatif)</strong>
                <Upload
                  accept="image/jpeg,image/png,image/webp"
                  showUploadList={false}
                  beforeUpload={(file) => {
                    if (!file.type.startsWith("image/")) {
                      message.error("Sélectionnez une image valide.");
                      return Upload.LIST_IGNORE;
                    }
                    if (file.size > 2 * 1024 * 1024) {
                      message.error("La photo ne doit pas dépasser 2 Mo.");
                      return Upload.LIST_IGNORE;
                    }
                    const reader = new FileReader();
                    reader.onload = () =>
                      setStudentPhoto(String(reader.result));
                    reader.readAsDataURL(file);
                    return false;
                  }}
                >
                  <Button size="small" icon={<UploadOutlined />}>
                    {studentPhoto ? "Changer la photo" : "Choisir une photo"}
                  </Button>
                </Upload>
              </div>
            </div>
          )}

          {editingStudent ? (
            <>
              <div className="students-directory__form-section-title">
                <span>01</span>
                <div>
                  <strong>Identité de l’élève</strong>
                  <small>
                    Informations figurant sur les documents officiels
                  </small>
                </div>
              </div>
              <Row gutter={14}>
                <Col span={8}>
                  <Form.Item
                    name="lastName"
                    label="Nom"
                    normalize={(value: string) => value.toLocaleUpperCase("fr")}
                    rules={[{ required: true, message: "Champ requis." }]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="NOM" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="middleName"
                    label="Postnom"
                    normalize={(value: string) => value.toLocaleUpperCase("fr")}
                    rules={[{ required: true, message: "Champ requis." }]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="POSTNOM" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="firstName"
                    label="Prénom"
                    normalize={(value: string) => {
                      const normalized = value.toLocaleLowerCase("fr");
                      return normalized
                        ? `${normalized.charAt(0).toLocaleUpperCase("fr")}${normalized.slice(1)}`
                        : normalized;
                    }}
                    rules={[{ required: true, message: "Champ requis." }]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="Prénom" />
                  </Form.Item>
                </Col>
              </Row>
              <div className="students-directory__form-section-title">
                <span>02</span>
                <div>
                  <strong>Scolarité et naissance</strong>
                  <small>Classe, sexe et date de naissance</small>
                </div>
              </div>
              <Row gutter={14}>
                <Col span={12}>
                  <Form.Item
                    name="classId"
                    label="Classe"
                    rules={[
                      { required: true, message: "Choisissez une classe." },
                    ]}
                  >
                    <Select
                      placeholder="Sélectionner une classe"
                      options={classes.map((schoolClass) => ({
                        value: schoolClass.id,
                        label: schoolClass.label,
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="gender"
                    label="Sexe"
                    rules={[{ required: true, message: "Choisissez le sexe." }]}
                  >
                    <Select
                      options={[
                        { value: "Fille", label: "Fille" },
                        { value: "Garçon", label: "Garçon" },
                      ]}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={14}>
                <Col span={12}>
                  <Form.Item
                    name="birthDate"
                    label="Date de naissance"
                    rules={[
                      {
                        required: true,
                        message: "Choisissez la date de naissance.",
                      },
                    ]}
                  >
                    <DatePicker
                      suffixIcon={<CalendarOutlined />}
                      format="DD/MM/YYYY"
                      placeholder="Jour / Mois / Année"
                      disabledDate={(date) => date.valueOf() > Date.now()}
                      style={{ width: "100%" }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="phone" label="Téléphone (facultatif)">
                    <Input prefix={<PhoneOutlined />} placeholder="+243..." />
                  </Form.Item>
                </Col>
              </Row>
              <div className="students-directory__form-section-title">
                <span>03</span>
                <div>
                  <strong>Coordonnées</strong>
                  <small>Adresse physique et contact</small>
                </div>
              </div>
              <Form.Item
                name="address"
                label="Adresse physique"
                rules={[{ required: true, message: "Saisissez l’adresse." }]}
              >
                <Input
                  prefix={<HomeOutlined />}
                  placeholder="Quartier, commune, ville"
                />
              </Form.Item>
            </>
          ) : (
            Array.from({ length: batchSize }).map((_, index) => (
              <Card
                key={`student-form-${index}`}
                size="small"
                style={{ marginBottom: index === batchSize - 1 ? 0 : 14 }}
              >
                <div className="students-directory__form-section-title">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>Élève {index + 1}</strong>
                    <small>Renseignez les informations de cette fiche.</small>
                  </div>
                </div>
                <Row gutter={14}>
                  <Col span={8}>
                    <Form.Item
                      name={["students", index, "lastName"]}
                      label="Nom"
                      normalize={(value: string) =>
                        value.toLocaleUpperCase("fr")
                      }
                      rules={[{ required: true, message: "Champ requis." }]}
                    >
                      <Input prefix={<UserOutlined />} placeholder="NOM" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name={["students", index, "middleName"]}
                      label="Postnom"
                      normalize={(value: string) =>
                        value.toLocaleUpperCase("fr")
                      }
                      rules={[{ required: true, message: "Champ requis." }]}
                    >
                      <Input prefix={<UserOutlined />} placeholder="POSTNOM" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name={["students", index, "firstName"]}
                      label="Prénom"
                      normalize={(value: string) => {
                        const normalized = value.toLocaleLowerCase("fr");
                        return normalized
                          ? `${normalized.charAt(0).toLocaleUpperCase("fr")}${normalized.slice(1)}`
                          : normalized;
                      }}
                      rules={[{ required: true, message: "Champ requis." }]}
                    >
                      <Input prefix={<UserOutlined />} placeholder="Prénom" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={14}>
                  <Col span={12}>
                    <Form.Item
                      name={["students", index, "classId"]}
                      label="Classe"
                      rules={[
                        { required: true, message: "Choisissez une classe." },
                      ]}
                    >
                      <Select
                        placeholder="Sélectionner une classe"
                        options={classes.map((schoolClass) => ({
                          value: schoolClass.id,
                          label: schoolClass.label,
                        }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name={["students", index, "gender"]}
                      label="Sexe"
                      rules={[
                        { required: true, message: "Choisissez le sexe." },
                      ]}
                    >
                      <Select
                        options={[
                          { value: "Fille", label: "Fille" },
                          { value: "Garçon", label: "Garçon" },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={14}>
                  <Col span={12}>
                    <Form.Item
                      name={["students", index, "birthDate"]}
                      label="Date de naissance"
                      rules={[
                        {
                          required: true,
                          message: "Choisissez la date de naissance.",
                        },
                      ]}
                    >
                      <DatePicker
                        suffixIcon={<CalendarOutlined />}
                        format="DD/MM/YYYY"
                        placeholder="Jour / Mois / Année"
                        disabledDate={(date) => date.valueOf() > Date.now()}
                        style={{ width: "100%" }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name={["students", index, "phone"]}
                      label="Téléphone (facultatif)"
                    >
                      <Input prefix={<PhoneOutlined />} placeholder="+243..." />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item
                  name={["students", index, "address"]}
                  label="Adresse physique"
                  rules={[{ required: true, message: "Saisissez l’adresse." }]}
                >
                  <Input
                    prefix={<HomeOutlined />}
                    placeholder="Quartier, commune, ville"
                  />
                </Form.Item>
              </Card>
            ))
          )}
        </Form>
      </Modal>

      <Modal
        width={440}
        centered
        className="students-directory__delete-modal"
        title={
          <div className="students-directory__delete-title">
            <span>
              <ExclamationCircleOutlined />
            </span>
            <div>
              <strong>Confirmer la suppression</strong>
              <small>Cette action nécessite votre mot de passe</small>
            </div>
          </div>
        }
        open={Boolean(studentToDelete)}
        okText="Supprimer"
        okButtonProps={{
          danger: true,
          disabled: !deletePassword,
        }}
        confirmLoading={isDeleting}
        cancelText="Annuler"
        onOk={deleteStudent}
        onCancel={() => {
          setStudentToDelete(null);
          setDeletePassword("");
          setDeleteError(null);
        }}
      >
        <div className="students-directory__delete-content">
          <div className="students-directory__delete-student">
            <Avatar
              size={44}
              src={studentToDelete?.photo || undefined}
              icon={<UserOutlined />}
            />
            <div>
              <span>Élève à supprimer</span>
              <strong>{studentToDelete?.name}</strong>
              <small>{studentToDelete?.matricule}</small>
            </div>
          </div>
          <p>
            L’élève sera retiré des listes actives, mais son historique scolaire
            restera conservé.
          </p>
          {deleteError && (
            <Alert
              showIcon
              type="error"
              message={deleteError}
              closable
              onClose={() => setDeleteError(null)}
            />
          )}
          <label htmlFor="delete-student-password">
            Mot de passe de la session
          </label>
          <Input.Password
            id="delete-student-password"
            autoFocus
            status={deleteError ? "error" : undefined}
            prefix={<LockOutlined />}
            value={deletePassword}
            disabled={isDeleting}
            onChange={(event) => {
              setDeletePassword(event.target.value);
              if (deleteError) setDeleteError(null);
            }}
            onPressEnter={() => {
              if (deletePassword && !isDeleting) void deleteStudent();
            }}
            placeholder="Saisissez votre mot de passe"
          />
        </div>
      </Modal>
    </section>
  );
};

export default StudentsPage;
