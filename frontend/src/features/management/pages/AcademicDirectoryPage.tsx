import { useEffect, useMemo, useState } from "react";
import {
  BookOutlined,
  ClockCircleOutlined,
  IdcardOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
  ReadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Button, Card, Col, Form, Input, Modal, Row, Select, Table, Tag, message } from "antd";
import { api } from "../../../lib/api";

type DirectoryKind = "classes" | "teachers" | "courses" | "homeroom" | "assignments";

interface DirectoryRow {
  key: string;
  primary: string;
  secondary: string;
  code: string;
  category: string;
  count: string;
  status: "Actif" | "Complet" | "Disponible";
  capacity?: number;
  students?: number;
}

interface DirectoryFormValues {
  name: string;
  firstName?: string;
  email?: string;
  phone?: string;
  code: string;
  category: string;
  count: string;
  secondary: string;
  capacity?: number;
}

interface ClassApiRow {
  id: string;
  label: string;
  code: string;
  capacity: number | null;
  students: number;
  option?: string | null;
  isActive: boolean;
}

const directoryContent = {
  classes: {
    eyebrow: "Gestion scolaire",
    title: "Classes",
    description: "Organisation des classes, effectifs et titulaires de l’établissement.",
    icon: <TeamOutlined />,
    addLabel: "Ajouter une classe",
    search: "Rechercher une classe ou un titulaire...",
    categoryLabel: "Niveau",
    countLabel: "Effectif",
    options: ["Toutes les classes"],
    stats: [["0", "Classes actives"], ["0", "Élèves répartis"], ["0", "Élèves par classe"], ["0%", "Capacité utilisée"]],
    rows: [],
  },
  teachers: {
    eyebrow: "Gestion scolaire",
    title: "Professeurs",
    description: "Dossiers, affectations et disponibilité du personnel enseignant.",
    icon: <UserOutlined />,
    addLabel: "Ajouter un professeur",
    search: "Rechercher un professeur ou une matière...",
    categoryLabel: "Matière",
    countLabel: "Charge horaire",
    options: ["Toutes les matières"],
    stats: [["0", "Professeurs actifs"], ["0", "Départements"], ["0h", "Charge moyenne"], ["0%", "Présence"]],
    rows: [],
  },
  courses: {
    eyebrow: "Gestion scolaire",
    title: "Cours",
    description: "Matières enseignées, volumes horaires et niveaux concernés.",
    icon: <ReadOutlined />,
    addLabel: "Ajouter un cours",
    search: "Rechercher un cours ou un code...",
    categoryLabel: "Département",
    countLabel: "Volume horaire",
    options: ["Tous les départements", "Sciences", "Langues", "Sciences humaines"],
    stats: [["0", "Cours programmés"], ["0", "Départements"], ["0h", "Volume annuel"], ["0%", "Cours affectés"]],
    rows: [],
  },
  homeroom: {
    eyebrow: "Gestion scolaire",
    title: "Titulaires",
    description: "Affectation des professeurs titulaires et suivi des classes encadrées.",
    icon: <TeamOutlined />,
    addLabel: "Affecter un titulaire",
    search: "Rechercher un titulaire ou une classe...",
    categoryLabel: "Classe",
    countLabel: "Effectif encadré",
    options: ["Toutes les classes"],
    stats: [["0", "Classes encadrées"], ["0", "Titulaires affectés"], ["0", "Élèves suivis"], ["0%", "Couverture"]],
    rows: [],
  },
  assignments: {
    eyebrow: "Gestion scolaire",
    title: "Attributions des cours",
    description: "Répartition officielle des cours entre professeurs, classes et volumes horaires.",
    icon: <ReadOutlined />,
    addLabel: "Nouvelle attribution",
    search: "Rechercher un cours, un professeur ou une classe...",
    categoryLabel: "Classe",
    countLabel: "Volume attribué",
    options: ["Toutes les classes"],
    stats: [["0", "Attributions actives"], ["0", "Professeurs affectés"], ["0", "Cours couverts"], ["0%", "Couverture"]],
    rows: [],
  },
} as const;

const AcademicDirectoryPage = ({ kind }: { kind: DirectoryKind }) => {
  const content = directoryContent[kind];
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(content.options[0] as string);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [form] = Form.useForm<DirectoryFormValues>();
  const [rows, setRows] = useState<DirectoryRow[]>([]);

  const loadClasses = async (showLoading = false) => {
    if (kind !== "classes") return;
    if (showLoading) setIsLoading(true);
    try {
      const classesResponse = await api.get<ClassApiRow[]>("/classes");
      setRows(
        classesResponse.data.map((schoolClass) => ({
          key: schoolClass.id,
          primary: schoolClass.label,
          secondary: schoolClass.option || "Sans option",
          code: schoolClass.code,
          category: "",
          count: String(schoolClass.students),
          capacity: schoolClass.capacity ?? undefined,
          students: schoolClass.students,
          status: schoolClass.isActive ? "Actif" : "Disponible",
        })),
      );
    } catch {
      message.error("Impossible de charger les classes de l’établissement.");
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadClasses(true);
  }, [kind]);

  const categoryOptions = [...content.options];

  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    return rows.filter((row) => {
      const matchesSearch = !query || `${row.primary} ${row.secondary} ${row.code}`.toLocaleLowerCase("fr").includes(query);
      const matchesCategory =
        kind === "classes" ||
        category === categoryOptions[0] ||
        row.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [category, categoryOptions, rows, search]);

  const columns = [
    {
      title: kind === "teachers" || kind === "homeroom" ? "Professeur" : kind === "classes" ? "Classe" : "Cours",
      key: "identity",
      render: (_: unknown, row: DirectoryRow) => (
        <div className="academic-directory__identity">
          <span>{kind === "courses" ? <BookOutlined /> : content.icon}</span>
          <div><strong>{row.primary}</strong><small>{row.secondary}</small></div>
        </div>
      ),
    },
    { title: "Référence", dataIndex: "code", key: "code", render: (value: string) => <code>{value}</code> },
    { title: content.categoryLabel, dataIndex: "category", key: "category", render: (value: string) => <Tag>{value}</Tag> },
    { title: content.countLabel, dataIndex: "count", key: "count" },
    { title: "Statut", dataIndex: "status", key: "status", render: (value: string) => <span className="academic-directory__status"><i />{value}</span> },
  ];
  const visibleColumns =
    kind === "classes"
      ? columns.filter((column) => column.key !== "category")
      : columns;

  const createEntry = async () => {
    const values = await form.validateFields();
    if (kind !== "classes") {
      message.info("Ce module sera relié aux données de l’établissement.");
      return;
    }

    setIsSaving(true);
    try {
      await api.post("/classes", {
        label: values.name,
      });
      await loadClasses();
      form.resetFields();
      setIsModalOpen(false);
      message.success("Classe ajoutée avec succès.");
    } catch {
      message.error(
        "Ajout impossible. Vérifiez le nom de la classe.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const classStats = useMemo(() => {
    const activeClasses = rows.filter((row) => row.status === "Actif");
    const students = rows.reduce((total, row) => total + (row.students ?? 0), 0);
    const occupiedClasses = rows.filter((row) => (row.students ?? 0) > 0).length;
    return [
      [String(activeClasses.length), "Classes actives"],
      [String(students), "Élèves répartis"],
      [
        activeClasses.length
          ? String(Math.round(students / activeClasses.length))
          : "0",
        "Élèves par classe",
      ],
      [
        String(occupiedClasses),
        "Classes avec élèves",
      ],
    ];
  }, [rows]);

  const displayedStats = kind === "classes" ? classStats : content.stats;

  return (
    <section className={`academic-directory academic-directory--${kind}`}>
      <header className="academic-directory__hero">
        <div className="academic-directory__seal">{content.icon}</div>
        <div>
          <span>{content.eyebrow}</span>
          <h1>{content.title}</h1>
          <p>{content.description}</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>{content.addLabel}</Button>
      </header>

      <div className="academic-directory__stats">
        {displayedStats.map(([value, label]) => <Card key={label}><strong>{value}</strong><span>{label}</span></Card>)}
      </div>

      <Card className="academic-directory__registry">
        <div className="academic-directory__registry-title">
          <div><span>Répertoire</span><h2>Liste administrative</h2></div>
          <small>{filteredRows.length} entrées enregistrées</small>
        </div>
        <div className="academic-directory__toolbar">
          <Input prefix={<SearchOutlined />} placeholder={content.search} value={search} onChange={(event) => setSearch(event.target.value)} allowClear />
          {kind !== "classes" && (
            <Select value={category} onChange={setCategory} options={categoryOptions.map((value) => ({ value, label: value }))} />
          )}
        </div>
        <Table<DirectoryRow> columns={visibleColumns} dataSource={filteredRows} loading={isLoading} pagination={false} scroll={{ x: 760 }} />
      </Card>

      <Modal
        width={680}
        title={<div className="academic-directory__modal-title"><span>{content.icon}</span><div><strong>{content.addLabel}</strong>{kind !== "classes" && <small>Registre administratif officiel</small>}</div></div>}
        open={isModalOpen}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); }}
        onOk={createEntry}
        confirmLoading={isSaving}
        okText="Enregistrer"
        cancelText="Annuler"
        className="academic-directory__modal"
      >
        {kind === "classes" ? (
          <Form form={form} layout="vertical" className="academic-directory__form academic-directory__form--simple">
            <Form.Item
              name="name"
              label="Nom de la classe"
              rules={[
                { required: true, message: "Saisissez le nom de la classe." },
              ]}
            >
              <Input
                autoFocus
                prefix={<TeamOutlined />}
                placeholder="Ex. 6ème A"
              />
            </Form.Item>
          </Form>
        ) : ["teachers", "courses"].includes(kind) ? (
          <Form form={form} layout="vertical" className="academic-directory__form">
            <div className="academic-directory__form-banner">
              <SafetyCertificateOutlined />
              <div><strong>Nouveau dossier officiel</strong><span>Les informations seront ajoutées au registre de l’établissement.</span></div>
              <b>2025—2026</b>
            </div>
            <div className="academic-directory__form-section"><span>01</span><div><strong>Identification</strong><small>Informations principales du dossier</small></div></div>
            {kind === "teachers" ? (
              <Row gutter={14}>
                <Col span={12}><Form.Item name="name" label="Nom" rules={[{ required: true, message: "Champ requis." }]}><Input prefix={<UserOutlined />} placeholder="Nom" /></Form.Item></Col>
                <Col span={12}><Form.Item name="firstName" label="Prénom" rules={[{ required: true, message: "Champ requis." }]}><Input prefix={<UserOutlined />} placeholder="Prénom" /></Form.Item></Col>
              </Row>
            ) : (
              <Form.Item
                name="name"
                label="Intitulé du cours"
                rules={[{ required: true, message: "Champ requis." }]}
              >
                <Input prefix={<BookOutlined />} placeholder="Ex. Géographie" />
              </Form.Item>
            )}
            <Row gutter={14}>
              <Col span={12}><Form.Item name="code" label="Code officiel" rules={[{ required: true, message: "Champ requis." }]}><Input prefix={<IdcardOutlined />} placeholder="Référence unique" /></Form.Item></Col>
              <Col span={12}>
                <Form.Item
                  name="category"
                  label={content.categoryLabel}
                  rules={[{ required: true, message: "Champ requis." }]}
                >
                  <Select
                    placeholder="Sélectionner"
                    options={content.options
                      .slice(1)
                      .map((value) => ({ value, label: value }))}
                  />
                </Form.Item>
              </Col>
            </Row>
            <div className="academic-directory__form-section"><span>02</span><div><strong>Affectation et charge</strong><small>Organisation académique</small></div></div>
            <Row gutter={14}>
              <Col span={12}>
                <Form.Item name="secondary" label={kind === "teachers" ? "Adresse e-mail" : "Niveaux concernés"} rules={[{ required: true, message: "Champ requis." }]}><Input prefix={kind === "teachers" ? <MailOutlined /> : <UserOutlined />} /></Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="count" label={content.countLabel} rules={[{ required: true, message: "Champ requis." }]}>
                  <Input prefix={<ClockCircleOutlined />} placeholder="Ex. 6 h / sem." />
                </Form.Item>
              </Col>
            </Row>
            {kind === "teachers" && (
              <Form.Item name="phone" label="Téléphone (facultatif)"><Input prefix={<PhoneOutlined />} placeholder="+243..." /></Form.Item>
            )}
          </Form>
        ) : (
          <div className="academic-directory__modal-placeholder">
            {content.icon}
            <strong>Nouveau dossier administratif</strong>
            <p>Le formulaire détaillé sera relié aux données de l’établissement.</p>
          </div>
        )}
      </Modal>
    </section>
  );
};

export default AcademicDirectoryPage;
