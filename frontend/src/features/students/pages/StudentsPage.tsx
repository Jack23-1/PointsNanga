import { useEffect, useMemo, useState } from "react";
import {
  EyeOutlined,
  CalendarOutlined,
  FilterOutlined,
  HomeOutlined,
  IdcardOutlined,
  MoreOutlined,
  PlusOutlined,
  SearchOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  PhoneOutlined,
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
  Modal,
  Row,
  Select,
  Table,
  Tag,
  Upload,
  message,
} from "antd";
import { api } from "../../../lib/api";

interface StudentRow {
  id?: string;
  key: string;
  matricule: string;
  name: string;
  detail: string;
  className: string;
  gender: "Fille" | "Garçon";
  status: "Actif" | "En attente";
  photo: string;
}

interface SchoolOption {
  id: string;
  name: string;
}

const initialStudents: StudentRow[] = [];

interface StudentFormValues {
  schoolId: string;
  matricule: string;
  lastName: string;
  middleName: string;
  firstName: string;
  gender: "Fille" | "Garçon";
  className: string;
  birthDate: string;
  address: string;
  phone?: string;
}

const classOptions = ["Toutes les classes", "6ème A", "6ème B", "5ème A", "5ème B", "4ème A", "4ème B"];

const StudentsPage = () => {
  const [students, setStudents] = useState(initialStudents);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("Toutes les classes");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm<StudentFormValues>();
  const [studentPhoto, setStudentPhoto] = useState<string | null>(null);

  const loadStudents = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const response = await api.get<StudentRow[]>("/students");
      setStudents(response.data);
    } catch {
      setStudents([]);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadSchools = () => {
      api
        .get<SchoolOption[]>("/schools")
        .then((response) => setSchools(response.data))
        .catch(() => setSchools([]));
    };

    loadStudents(true);
    loadSchools();

    const intervalId = window.setInterval(() => {
      loadStudents();
      loadSchools();
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

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

  const addStudent = async () => {
    const values = await form.validateFields();
    setIsSaving(true);
    try {
      await api.post("/students", {
        schoolId: Number(values.schoolId),
        matricule: values.matricule,
        lastName: values.lastName,
        postName: values.middleName,
        firstName: values.firstName,
        gender: values.gender,
        birthDate: values.birthDate,
        address: values.address,
        guardianPhone: values.phone,
        photo: studentPhoto ?? undefined,
      });
      await loadStudents();
      form.resetFields();
      setStudentPhoto(null);
      setIsModalOpen(false);
      message.success("Élève ajouté dans la base.");
    } catch {
      message.error("Ajout impossible. Vérifiez l'école, le matricule et les champs.");
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    {
      title: "Élève",
      key: "student",
      render: (_: unknown, student: StudentRow) => (
        <div className="students-directory__identity">
          <Avatar size={48} src={student.photo} icon={<UserOutlined />} />
          <div>
            <strong>{student.name}</strong>
            <span><HomeOutlined /> {student.detail}</span>
          </div>
        </div>
      ),
    },
    { title: "Matricule", dataIndex: "matricule", key: "matricule", render: (value: string) => <code className="students-directory__matricule">{value}</code> },
    { title: "Classe", dataIndex: "className", key: "className", render: (value: string) => <Tag className="students-directory__class-tag">{value}</Tag> },
    { title: "Genre", dataIndex: "gender", key: "gender" },
    {
      title: "Statut",
      dataIndex: "status",
      key: "status",
      render: (status: StudentRow["status"]) => (
        <Tag className={`students-directory__status students-directory__status--${status === "Actif" ? "active" : "pending"}`}>
          <i /> {status}
        </Tag>
      ),
    },
    {
      title: "",
      key: "actions",
      render: () => (
        <div className="students-directory__actions">
          <Button type="text" icon={<EyeOutlined />} aria-label="Voir le dossier" />
          <Button type="text" icon={<MoreOutlined />} aria-label="Plus d’actions" />
        </div>
      ),
    },
  ];

  return (
    <section className="students-directory">
      <header className="students-directory__hero">
        <div className="students-directory__hero-seal" aria-hidden="true">
          <SafetyCertificateOutlined />
          <span>PN</span>
        </div>
        <div className="students-directory__hero-copy">
          <span className="students-directory__official-label">
            Registre officiel de l’établissement
          </span>
          <h1>Répertoire des élèves</h1>
          <p>Administration, suivi et consultation des dossiers scolaires.</p>
          <div className="students-directory__registry-meta">
            <span>Année académique <strong>2025 — 2026</strong></span>
            <i />
            <span>Registre <strong>actif et sécurisé</strong></span>
          </div>
        </div>
        <div className="students-directory__hero-action">
          <span><i /> Dernière synchronisation : aujourd’hui</span>
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setIsModalOpen(true)}
            className="students-directory__add"
          >
            Ajouter un élève
          </Button>
        </div>
      </header>

      <Row gutter={[14, 14]} className="students-directory__summary">
        <Col xs={12} md={6}><Card><strong>{students.length}</strong><span>Élèves affichés</span></Card></Col>
        <Col xs={12} md={6}><Card><strong>24</strong><span>Classes actives</span></Card></Col>
        <Col xs={12} md={6}><Card><strong>51%</strong><span>Filles</span></Card></Col>
        <Col xs={12} md={6}><Card><strong>98%</strong><span>Dossiers complets</span></Card></Col>
      </Row>

      <Card className="students-directory__card">
        <div className="students-directory__card-title">
          <div>
            <span>Registre central</span>
            <h2>Liste nominative</h2>
          </div>
          <small>Document administratif numérique</small>
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
            options={classOptions.map((value) => ({ value, label: value }))}
          />
          <span className="students-directory__count"><TeamOutlined /> {filteredStudents.length} élèves</span>
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
            <span><IdcardOutlined /></span>
            <div>
              <strong>Nouveau dossier élève</strong>
              <small>Registre officiel de l’établissement</small>
            </div>
          </div>
        }
        open={isModalOpen}
        onCancel={() => { setIsModalOpen(false); setStudentPhoto(null); form.resetFields(); }}
        onOk={addStudent}
        confirmLoading={isSaving}
        okText="Ajouter"
        cancelText="Annuler"
        className="students-directory__modal"
      >
        <Form form={form} layout="vertical" className="students-directory__student-form">
          <div className="students-directory__form-banner">
            <SafetyCertificateOutlined />
            <div>
              <strong>Fiche d’identification scolaire</strong>
              <span>Complétez les informations officielles de l’élève.</span>
            </div>
            <b>2025—2026</b>
          </div>
          <div className="students-directory__photo-field">
            <Avatar size={78} src={studentPhoto || undefined} icon={<UserOutlined />} />
            <div>
              <strong>Photo de l’élève</strong>
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={(file) => {
                  const reader = new FileReader();
                  reader.onload = () => setStudentPhoto(String(reader.result));
                  reader.readAsDataURL(file);
                  return false;
                }}
              >
                <Button size="small" icon={<UploadOutlined />}>Choisir une photo</Button>
              </Upload>
            </div>
          </div>
          <div className="students-directory__form-section-title">
            <span>01</span><div><strong>Identité de l’élève</strong><small>Informations figurant sur les documents officiels</small></div>
          </div>
          <Row gutter={14}>
            <Col span={12}>
              <Form.Item name="schoolId" label="École" rules={[{ required: true, message: "Choisissez l'école." }]}>
                <Select options={schools.map((school) => ({ value: school.id, label: school.name }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="matricule" label="Matricule" rules={[{ required: true, message: "Champ requis." }]}>
                <Input prefix={<IdcardOutlined />} placeholder="Matricule officiel" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={14}>
            <Col span={8}><Form.Item name="lastName" label="Nom" rules={[{ required: true, message: "Champ requis." }]}><Input prefix={<UserOutlined />} placeholder="Nom" /></Form.Item></Col>
            <Col span={8}><Form.Item name="middleName" label="Postnom" rules={[{ required: true, message: "Champ requis." }]}><Input prefix={<UserOutlined />} placeholder="Postnom" /></Form.Item></Col>
            <Col span={8}><Form.Item name="firstName" label="Prénom" rules={[{ required: true, message: "Champ requis." }]}><Input prefix={<UserOutlined />} placeholder="Prénom" /></Form.Item></Col>
          </Row>
          <div className="students-directory__form-section-title">
            <span>02</span><div><strong>Scolarité et naissance</strong><small>Classe, sexe et date de naissance</small></div>
          </div>
          <Row gutter={14}>
            <Col span={12}>
              <Form.Item name="className" label="Classe" rules={[{ required: true, message: "Choisissez une classe." }]}>
                <Select options={classOptions.slice(1).map((value) => ({ value, label: value }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="gender" label="Sexe" rules={[{ required: true, message: "Choisissez le sexe." }]}>
                <Select options={[{ value: "Fille", label: "Fille" }, { value: "Garçon", label: "Garçon" }]} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={14}>
            <Col span={12}><Form.Item name="birthDate" label="Date de naissance" rules={[{ required: true, message: "Champ requis." }]}><Input prefix={<CalendarOutlined />} type="date" /></Form.Item></Col>
            <Col span={12}><Form.Item name="phone" label="Téléphone (facultatif)"><Input prefix={<PhoneOutlined />} placeholder="+243..." /></Form.Item></Col>
          </Row>
          <div className="students-directory__form-section-title">
            <span>03</span><div><strong>Coordonnées</strong><small>Adresse physique et contact</small></div>
          </div>
          <Form.Item name="address" label="Adresse physique" rules={[{ required: true, message: "Saisissez l’adresse." }]}>
            <Input prefix={<HomeOutlined />} placeholder="Quartier, commune, ville" />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
};

export default StudentsPage;
