import { useMemo, useState } from "react";
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

type DirectoryKind = "classes" | "teachers" | "courses" | "homeroom" | "assignments";

interface DirectoryRow {
  key: string;
  primary: string;
  secondary: string;
  code: string;
  category: string;
  count: string;
  status: "Actif" | "Complet" | "Disponible";
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
}

const directoryContent = {
  classes: {
    eyebrow: "Registre académique officiel",
    title: "Répertoire des classes",
    description: "Organisation des classes, effectifs et titulaires de l’établissement.",
    icon: <TeamOutlined />,
    addLabel: "Ajouter une classe",
    search: "Rechercher une classe ou un titulaire...",
    categoryLabel: "Niveau",
    countLabel: "Effectif",
    options: ["Tous les niveaux", "6ème", "5ème", "4ème"],
    stats: [["24", "Classes actives"], ["1 250", "Élèves répartis"], ["42", "Élèves par classe"], ["96%", "Capacité utilisée"]],
    rows: [
      ["6ème A", "Titulaire : Mme Kabamba", "CLS-6A", "6ème", "45 élèves", "Complet"],
      ["6ème B", "Titulaire : M. Tshibangu", "CLS-6B", "6ème", "42 élèves", "Actif"],
      ["5ème A", "Titulaire : Mme Mutombo", "CLS-5A", "5ème", "38 élèves", "Actif"],
      ["5ème B", "Titulaire : M. Ilunga", "CLS-5B", "5ème", "40 élèves", "Actif"],
      ["4ème A", "Titulaire : Mme Kanku", "CLS-4A", "4ème", "41 élèves", "Actif"],
    ],
  },
  teachers: {
    eyebrow: "Corps professoral officiel",
    title: "Répertoire des professeurs",
    description: "Dossiers, affectations et disponibilité du personnel enseignant.",
    icon: <UserOutlined />,
    addLabel: "Ajouter un professeur",
    search: "Rechercher un professeur ou une matière...",
    categoryLabel: "Matière",
    countLabel: "Charge horaire",
    options: ["Toutes les matières", "Mathématiques", "Français", "Sciences", "Histoire"],
    stats: [["45", "Professeurs actifs"], ["12", "Départements"], ["18h", "Charge moyenne"], ["92%", "Présence"]],
    rows: [
      ["Mireille Kabamba", "m.kabamba@ecole.cd", "PROF-018", "Mathématiques", "20 h / sem.", "Actif"],
      ["Patrick Tshibangu", "p.tshibangu@ecole.cd", "PROF-024", "Français", "18 h / sem.", "Actif"],
      ["Sarah Mutombo", "s.mutombo@ecole.cd", "PROF-031", "Sciences", "21 h / sem.", "Actif"],
      ["Joseph Ilunga", "j.ilunga@ecole.cd", "PROF-036", "Histoire", "16 h / sem.", "Disponible"],
      ["Rachel Kanku", "r.kanku@ecole.cd", "PROF-042", "Mathématiques", "19 h / sem.", "Actif"],
    ],
  },
  courses: {
    eyebrow: "Programme d’enseignement officiel",
    title: "Catalogue des cours",
    description: "Matières enseignées, volumes horaires et niveaux concernés.",
    icon: <ReadOutlined />,
    addLabel: "Ajouter un cours",
    search: "Rechercher un cours ou un code...",
    categoryLabel: "Département",
    countLabel: "Volume horaire",
    options: ["Tous les départements", "Sciences", "Langues", "Sciences humaines"],
    stats: [["32", "Cours programmés"], ["12", "Départements"], ["684h", "Volume annuel"], ["100%", "Cours affectés"]],
    rows: [
      ["Mathématiques", "Niveaux : 4ème à 6ème", "MAT-601", "Sciences", "6 h / sem.", "Actif"],
      ["Français", "Niveaux : 4ème à 6ème", "FRA-602", "Langues", "5 h / sem.", "Actif"],
      ["Sciences physiques", "Niveaux : 5ème et 6ème", "PHY-510", "Sciences", "4 h / sem.", "Actif"],
      ["Histoire", "Niveaux : 4ème à 6ème", "HIS-420", "Sciences humaines", "3 h / sem.", "Actif"],
      ["Anglais", "Niveaux : 4ème à 6ème", "ANG-405", "Langues", "3 h / sem.", "Disponible"],
    ],
  },
  homeroom: {
    eyebrow: "Encadrement pédagogique officiel",
    title: "Gestion des titulaires",
    description: "Affectation des professeurs titulaires et suivi des classes encadrées.",
    icon: <TeamOutlined />,
    addLabel: "Affecter un titulaire",
    search: "Rechercher un titulaire ou une classe...",
    categoryLabel: "Classe",
    countLabel: "Effectif encadré",
    options: ["Toutes les classes", "6ème A", "6ème B", "5ème A", "5ème B"],
    stats: [["24", "Classes encadrées"], ["24", "Titulaires affectés"], ["1 250", "Élèves suivis"], ["100%", "Couverture"]],
    rows: [
      ["Mireille Kabamba", "Titulaire principale", "TIT-6A", "6ème A", "45 élèves", "Actif"],
      ["Patrick Tshibangu", "Titulaire principal", "TIT-6B", "6ème B", "42 élèves", "Actif"],
      ["Sarah Mutombo", "Titulaire principale", "TIT-5A", "5ème A", "38 élèves", "Actif"],
      ["Joseph Ilunga", "Titulaire principal", "TIT-5B", "5ème B", "40 élèves", "Actif"],
    ],
  },
  assignments: {
    eyebrow: "Planification pédagogique officielle",
    title: "Attributions des cours",
    description: "Répartition officielle des cours entre professeurs, classes et volumes horaires.",
    icon: <ReadOutlined />,
    addLabel: "Nouvelle attribution",
    search: "Rechercher un cours, un professeur ou une classe...",
    categoryLabel: "Classe",
    countLabel: "Volume attribué",
    options: ["Toutes les classes", "6ème A", "6ème B", "5ème A", "5ème B"],
    stats: [["128", "Attributions actives"], ["45", "Professeurs affectés"], ["32", "Cours couverts"], ["100%", "Couverture"]],
    rows: [
      ["Mathématiques", "Prof. Mireille Kabamba", "ATT-601", "6ème A", "6 h / sem.", "Actif"],
      ["Français", "Prof. Patrick Tshibangu", "ATT-602", "6ème B", "5 h / sem.", "Actif"],
      ["Sciences physiques", "Prof. Sarah Mutombo", "ATT-510", "5ème A", "4 h / sem.", "Actif"],
      ["Histoire", "Prof. Joseph Ilunga", "ATT-520", "5ème B", "3 h / sem.", "Actif"],
    ],
  },
} as const;

const AcademicDirectoryPage = ({ kind }: { kind: DirectoryKind }) => {
  const content = directoryContent[kind];
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(content.options[0] as string);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm<DirectoryFormValues>();

  const [rows, setRows] = useState<DirectoryRow[]>(() => content.rows.map((row, index) => ({
    key: `${kind}-${index}`,
    primary: row[0],
    secondary: row[1],
    code: row[2],
    category: row[3],
    count: row[4],
    status: row[5],
  })));

  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    return rows.filter((row) => {
      const matchesSearch = !query || `${row.primary} ${row.secondary} ${row.code}`.toLocaleLowerCase("fr").includes(query);
      const matchesCategory = category === content.options[0] || row.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [category, content.options, rows, search]);

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

  const createEntry = async () => {
    if (!["classes", "teachers", "courses"].includes(kind)) {
      setIsModalOpen(false);
      message.success("Ouverture du nouveau dossier confirmée.");
      return;
    }
    const values = await form.validateFields();
    const primary =
      kind === "teachers"
        ? `${values.firstName || ""} ${values.name}`.trim()
        : values.name;
    setRows((current) => [
      {
        key: `${kind}-${Date.now()}`,
        primary,
        secondary: values.secondary,
        code: values.code,
        category: values.category,
        count: values.count,
        status: "Actif",
      },
      ...current,
    ]);
    form.resetFields();
    setIsModalOpen(false);
    message.success(`${primary} a été ajouté(e) au registre.`);
  };

  return (
    <section className={`academic-directory academic-directory--${kind}`}>
      <header className="academic-directory__hero">
        <div className="academic-directory__seal"><SafetyCertificateOutlined /><b>PN</b></div>
        <div>
          <span>{content.eyebrow}</span>
          <h1>{content.title}</h1>
          <p>{content.description}</p>
          <small>Année académique 2025 — 2026 · Registre sécurisé</small>
        </div>
        <Button icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>{content.addLabel}</Button>
      </header>

      <div className="academic-directory__stats">
        {content.stats.map(([value, label]) => <Card key={label}><strong>{value}</strong><span>{label}</span></Card>)}
      </div>

      <Card className="academic-directory__registry">
        <div className="academic-directory__registry-title">
          <div><span>Registre central</span><h2>Liste administrative</h2></div>
          <small>{filteredRows.length} entrées enregistrées</small>
        </div>
        <div className="academic-directory__toolbar">
          <Input prefix={<SearchOutlined />} placeholder={content.search} value={search} onChange={(event) => setSearch(event.target.value)} allowClear />
          <Select value={category} onChange={setCategory} options={content.options.map((value) => ({ value, label: value }))} />
        </div>
        <Table<DirectoryRow> columns={columns} dataSource={filteredRows} pagination={false} scroll={{ x: 760 }} />
      </Card>

      <Modal
        width={680}
        title={<div className="academic-directory__modal-title"><span>{content.icon}</span><div><strong>{content.addLabel}</strong><small>Registre administratif officiel</small></div></div>}
        open={isModalOpen}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); }}
        onOk={createEntry}
        okText="Enregistrer"
        cancelText="Annuler"
        className="academic-directory__modal"
      >
        {["classes", "teachers", "courses"].includes(kind) ? (
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
              <Form.Item name="name" label={kind === "classes" ? "Nom de la classe" : "Intitulé du cours"} rules={[{ required: true, message: "Champ requis." }]}>
                <Input prefix={kind === "classes" ? <TeamOutlined /> : <BookOutlined />} placeholder={kind === "classes" ? "Ex. 3ème A" : "Ex. Géographie"} />
              </Form.Item>
            )}
            <Row gutter={14}>
              <Col span={12}><Form.Item name="code" label="Code officiel" rules={[{ required: true, message: "Champ requis." }]}><Input prefix={<IdcardOutlined />} placeholder="Référence unique" /></Form.Item></Col>
              <Col span={12}><Form.Item name="category" label={content.categoryLabel} rules={[{ required: true, message: "Champ requis." }]}><Select options={content.options.slice(1).map((value) => ({ value, label: value }))} /></Form.Item></Col>
            </Row>
            <div className="academic-directory__form-section"><span>02</span><div><strong>Affectation et charge</strong><small>Organisation académique</small></div></div>
            <Row gutter={14}>
              <Col span={12}><Form.Item name="secondary" label={kind === "classes" ? "Professeur titulaire" : kind === "teachers" ? "Adresse e-mail" : "Niveaux concernés"} rules={[{ required: true, message: "Champ requis." }]}><Input prefix={kind === "teachers" ? <MailOutlined /> : <UserOutlined />} /></Form.Item></Col>
              <Col span={12}><Form.Item name="count" label={content.countLabel} rules={[{ required: true, message: "Champ requis." }]}><Input prefix={<ClockCircleOutlined />} placeholder={kind === "classes" ? "Ex. 40 élèves" : "Ex. 6 h / sem."} /></Form.Item></Col>
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
