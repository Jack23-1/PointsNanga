import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  BankOutlined,
  BellOutlined,
  BookOutlined,
  CheckCircleFilled,
  DownloadOutlined,
  EllipsisOutlined,
  ExportOutlined,
  FileTextOutlined,
  FundOutlined,
  PlusOutlined,
  RiseOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TeamOutlined,
  TrophyOutlined,
  UserOutlined,
  UserSwitchOutlined,
  WarningFilled,
} from "@ant-design/icons";
import { ROUTES } from "../../../config/constants";
import { useLocation, useNavigate } from "react-router-dom";

type Workspace =
  | "Aperçu"
  | "Écoles"
  | "Gestion de cotes"
  | "Résultats"
  | "Utilisateurs";

type School = {
  key: string;
  name: string;
  province: string;
  address: string;
  director: string;
  phone: string;
  students: number;
  teachers: number;
  joined: string;
  status: "active" | "suspended";
  initials: string;
};

type AcademicRecord = {
  key: string;
  student: string;
  matricule: string;
  school: string;
  className: string;
  teacher: string;
  subject: string;
  grade: string;
  average: number;
  rank: number;
  status: "Réussi" | "À suivre";
};

const { Title, Text } = Typography;

const schools: School[] = [
  {
    key: "1",
    name: "Lycée Saint-Michel",
    province: "Kinshasa",
    address: "Gombe, av. de la Paix",
    director: "Sœur Marie Kanku",
    phone: "+243 812 345 678",
    students: 1284,
    teachers: 74,
    joined: "12 jan. 2026",
    status: "active",
    initials: "SM",
  },
  {
    key: "2",
    name: "Collège Notre-Dame",
    province: "Haut-Katanga",
    address: "Lubumbashi, Kenya",
    director: "Jean-Marc Kabeya",
    phone: "+243 998 141 223",
    students: 936,
    teachers: 51,
    joined: "08 jan. 2026",
    status: "active",
    initials: "ND",
  },
  {
    key: "3",
    name: "Institut Technique Matadi",
    province: "Kongo-Central",
    address: "Matadi, Nzanza",
    director: "Grâce Mavungu",
    phone: "+243 899 547 016",
    students: 741,
    teachers: 43,
    joined: "21 déc. 2025",
    status: "suspended",
    initials: "IT",
  },
  {
    key: "4",
    name: "Complexe Scolaire Lumière",
    province: "Nord-Kivu",
    address: "Goma, Katindo",
    director: "Patrick Bahati",
    phone: "+243 817 203 440",
    students: 1158,
    teachers: 69,
    joined: "18 déc. 2025",
    status: "active",
    initials: "CL",
  },
];

const academicRecords: AcademicRecord[] = [
  {
    key: "1",
    student: "Naomi Mukendi",
    matricule: "ELV-2026-0042",
    school: "Lycée Saint-Michel",
    className: "6e A",
    teacher: "Paul Ilunga",
    subject: "Mathématiques",
    grade: "18 / 20",
    average: 17.4,
    rank: 1,
    status: "Réussi",
  },
  {
    key: "2",
    student: "David Kabasele",
    matricule: "ELV-2026-0198",
    school: "Collège Notre-Dame",
    className: "5e B",
    teacher: "Clarisse Mbuyi",
    subject: "Français",
    grade: "15 / 20",
    average: 14.8,
    rank: 4,
    status: "Réussi",
  },
  {
    key: "3",
    student: "Esther Nsimba",
    matricule: "ELV-2026-0315",
    school: "Institut Technique Matadi",
    className: "3e TS",
    teacher: "Blaise Kanku",
    subject: "Physique",
    grade: "10 / 20",
    average: 10.6,
    rank: 19,
    status: "À suivre",
  },
  {
    key: "4",
    student: "Moïse Nzambe",
    matricule: "ELV-2026-0066",
    school: "Complexe Scolaire Lumière",
    className: "4e A",
    teacher: "Rachel Kihangi",
    subject: "Sciences",
    grade: "16 / 20",
    average: 15.9,
    rank: 3,
    status: "Réussi",
  },
];

const users = [
  {
    key: "1",
    name: "Sœur Marie Kanku",
    role: "Directrice",
    school: "Lycée Saint-Michel",
    status: "Actif",
    initials: "MK",
  },
  {
    key: "2",
    name: "Jean-Marc Kabeya",
    role: "Administrateur école",
    school: "Collège Notre-Dame",
    status: "Actif",
    initials: "JK",
  },
  {
    key: "3",
    name: "Patrick Bahati",
    role: "Directeur",
    school: "Complexe Scolaire Lumière",
    status: "Actif",
    initials: "PB",
  },
  {
    key: "4",
    name: "Anna Mbuyi",
    role: "Titulaire",
    school: "Lycée Saint-Michel",
    status: "Suspendu",
    initials: "AM",
  },
];

const chartData = [42, 53, 49, 66, 71, 79, 91, 88, 103, 112, 121, 138];

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [workspace, setWorkspace] = useState<Workspace>("Aperçu");
  const [schoolQuery, setSchoolQuery] = useState("");
  const [province, setProvince] = useState<string | undefined>();
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);

  useEffect(() => {
    setWorkspace(
      new URLSearchParams(location.search).get("workspace") === "grades"
        ? "Gestion de cotes"
        : "Aperçu",
    );
  }, [location.search]);

  const filteredSchools = useMemo(
    () =>
      schools.filter((school) => {
        const query = schoolQuery.toLocaleLowerCase();
        return (
          (!query ||
            school.name.toLocaleLowerCase().includes(query) ||
            school.director.toLocaleLowerCase().includes(query)) &&
          (!province || school.province === province)
        );
      }),
    [province, schoolQuery],
  );

  const schoolColumns: ColumnsType<School> = [
    {
      title: "Établissement",
      key: "school",
      fixed: "left",
      render: (_, school) => (
        <Space size={11}>
          <Avatar className="super-admin-dashboard__school-avatar">
            {school.initials}
          </Avatar>
          <span>
            <strong>{school.name}</strong>
            <small>{school.address}</small>
          </span>
        </Space>
      ),
    },
    {
      title: "Province",
      dataIndex: "province",
      sorter: (a, b) => a.province.localeCompare(b.province),
    },
    { title: "Directeur / Préfet", dataIndex: "director" },
    { title: "Téléphone", dataIndex: "phone" },
    {
      title: "Élèves",
      dataIndex: "students",
      sorter: (a, b) => a.students - b.students,
      render: (value: number) => value.toLocaleString("fr-FR"),
    },
    { title: "Enseignants", dataIndex: "teachers" },
    { title: "Inscription", dataIndex: "joined" },
    {
      title: "Statut",
      dataIndex: "status",
      render: (status: School["status"]) => (
        <Tag
          className={
            status === "active"
              ? "super-admin-dashboard__tag super-admin-dashboard__tag--active"
              : "super-admin-dashboard__tag super-admin-dashboard__tag--suspended"
          }
        >
          {status === "active" ? "Active" : "Suspendue"}
        </Tag>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 58,
      render: (_, school) => (
        <Tooltip title="Voir l'école">
          <Button
            type="text"
            shape="circle"
            icon={<EllipsisOutlined />}
            onClick={() => setSelectedSchool(school)}
          />
        </Tooltip>
      ),
    },
  ];

  const academicColumns: ColumnsType<AcademicRecord> = [
    {
      title: "Élève",
      key: "student",
      fixed: "left",
      render: (_, record) => (
        <span>
          <strong>{record.student}</strong>
          <small>{record.matricule}</small>
        </span>
      ),
    },
    { title: "École", dataIndex: "school" },
    { title: "Classe", dataIndex: "className" },
    { title: "Enseignant", dataIndex: "teacher" },
    { title: "Matière", dataIndex: "subject" },
    { title: "Note", dataIndex: "grade" },
    {
      title: "Moyenne",
      dataIndex: "average",
      sorter: (a, b) => a.average - b.average,
      render: (value: number) => (
        <strong className="super-admin-dashboard__average">
          {value.toFixed(1)} / 20
        </strong>
      ),
    },
    {
      title: "Rang",
      dataIndex: "rank",
      render: (rank: number) => (
        <span className="super-admin-dashboard__rank">#{rank}</span>
      ),
    },
    {
      title: "Statut",
      dataIndex: "status",
      render: (status: AcademicRecord["status"]) => (
        <Tag
          className={
            status === "Réussi"
              ? "super-admin-dashboard__tag super-admin-dashboard__tag--active"
              : "super-admin-dashboard__tag super-admin-dashboard__tag--warning"
          }
        >
          {status}
        </Tag>
      ),
    },
  ];

  const renderOverview = () => (
    <>
      <section className="super-admin-dashboard__hero super-admin-dashboard__hero--command">
        <div className="super-admin-dashboard__hero-copy">
          <Title level={1}>Bonjour, Administrateur</Title>
        </div>
        <div className="super-admin-dashboard__hero-actions">
          <Button
            className="super-admin-dashboard__report-button"
            icon={<DownloadOutlined />}
          >
            Rapport
          </Button>
        </div>
      </section>

      <Row gutter={[18, 18]} className="super-admin-dashboard__metrics">
        <Metric
          icon={<BankOutlined />}
          label="Écoles"
          value={156}
          trend="+12,4 %"
          tone="blue"
        />
        <Metric
          icon={<UserSwitchOutlined />}
          label="Enseignants"
          value={2984}
          trend="+5,1 %"
          tone="violet"
        />
        <Metric
          icon={<TeamOutlined />}
          label="Élèves"
          value={45230}
          trend="+8,2 %"
          tone="green"
        />
      </Row>

      <Row gutter={[18, 18]}>
        <Col xs={24} xl={15}>
          <Card
            className="super-admin-dashboard__card super-admin-dashboard__chart-card"
            title={
              <>
                <span>Évolution des inscriptions</span>
                <small>12 derniers mois</small>
              </>
            }
            extra={<Button type="link">Voir l’analyse</Button>}
          >
            <div className="super-admin-dashboard__line-chart">
              <div className="super-admin-dashboard__chart-grid" />{" "}
              <div className="super-admin-dashboard__chart-bars">
                {chartData.map((height, index) => (
                  <span
                    key={index}
                    style={{ height: `${height}%` }}
                    title={`${height * 12} inscriptions`}
                  />
                ))}
              </div>
              <div className="super-admin-dashboard__chart-months">
                {[
                  "Jan",
                  "Fév",
                  "Mar",
                  "Avr",
                  "Mai",
                  "Juin",
                  "Juil",
                  "Août",
                  "Sept",
                  "Oct",
                  "Nov",
                  "Déc",
                ].map((month) => (
                  <span key={month}>{month}</span>
                ))}
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} xl={9}>
          <Card
            className="super-admin-dashboard__card"
            title="Carte des établissements"
            extra={
              <Tag className="super-admin-dashboard__tag super-admin-dashboard__tag--active">
                4 provinces
              </Tag>
            }
          >
            <div
              className="super-admin-dashboard__map"
              role="img"
              aria-label="Carte des écoles par province en République démocratique du Congo"
            >
              <svg viewBox="0 0 420 250" aria-hidden="true">
                <path d="M77 45 128 27l59 15 35-18 50 25 47-2 27 29-18 32 25 23-16 27 12 37-34 18-25 34-47-2-32-20-38 12-38-21-53 3-30-36 14-40-19-37 29-36z" />
                <path
                  className="super-admin-dashboard__map-river"
                  d="M91 75c45 17 79 31 115 21 35-10 61 12 97 21 29 7 42 23 48 40"
                />
              </svg>
              <button
                type="button"
                className="super-admin-dashboard__map-pin super-admin-dashboard__map-pin--kinshasa"
                onClick={() => setWorkspace("Écoles")}
              >
                <span /> <strong>Kinshasa</strong>
                <small>1 école</small>
              </button>
              <button
                type="button"
                className="super-admin-dashboard__map-pin super-admin-dashboard__map-pin--kongo"
                onClick={() => setWorkspace("Écoles")}
              >
                <span /> <strong>Kongo-Central</strong>
                <small>1 école</small>
              </button>
              <button
                type="button"
                className="super-admin-dashboard__map-pin super-admin-dashboard__map-pin--katanga"
                onClick={() => setWorkspace("Écoles")}
              >
                <span /> <strong>Haut-Katanga</strong>
                <small>1 école</small>
              </button>
              <button
                type="button"
                className="super-admin-dashboard__map-pin super-admin-dashboard__map-pin--kivu"
                onClick={() => setWorkspace("Écoles")}
              >
                <span /> <strong>Nord-Kivu</strong>
                <small>1 école</small>
              </button>
            </div>
            <div className="super-admin-dashboard__map-footer">
              <span>
                <i /> Active
              </span>
              <Button type="link" onClick={() => setWorkspace("Écoles")}>
                Voir les écoles
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[18, 18]} className="super-admin-dashboard__lower-grid">
        <Col xs={24} xl={15}>
          <Card
            className="super-admin-dashboard__card"
            title="Écoles récemment enregistrées"
            extra={
              <Button type="link" onClick={() => setWorkspace("Écoles")}>
                Voir toutes
              </Button>
            }
          >
            <Table
              columns={schoolColumns.slice(0, 5)}
              dataSource={schools.slice(0, 3)}
              pagination={false}
              scroll={{ x: 720 }}
              size="middle"
            />
          </Card>
        </Col>
        <Col xs={24} xl={9}>
          <Card
            className="super-admin-dashboard__card"
            title={
              <Space>
                Centre de notifications <Badge count={4} size="small" />
              </Space>
            }
            extra={
              <BellOutlined className="super-admin-dashboard__title-icon" />
            }
          >
            <div className="super-admin-dashboard__notifications">
              <Notification
                icon={<BankOutlined />}
                color="blue"
                title="Nouvelle école enregistrée"
                description="Complexe Scolaire Lumière · il y a 12 min"
              />
              <Notification
                icon={<CheckCircleFilled />}
                color="green"
                title="Résultats publiés"
                description="1 248 nouveaux bulletins disponibles · il y a 48 min"
              />
              <Notification
                icon={<WarningFilled />}
                color="orange"
                title="École à vérifier"
                description="Institut Technique Matadi est suspendu · il y a 2 h"
              />
              <Notification
                icon={<FundOutlined />}
                color="violet"
                title="Paiement reçu"
                description="Abonnement annuel confirmé · aujourd’hui"
              />
            </div>
          </Card>
        </Col>
      </Row>
    </>
  );

  const renderSchools = () => (
    <section className="super-admin-dashboard__workspace">
      <div className="super-admin-dashboard__workspace-heading">
        <div>
          <span className="super-admin-dashboard__eyebrow">Administration</span>
          <Title level={2}>Gestion des écoles</Title>
          <Text>
            Supervisez les établissements, leurs accès et leurs données.
          </Text>
        </div>
        <Space wrap>
          <Button icon={<ExportOutlined />}>Exporter</Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate(`${ROUTES.SCHOOLS}?create=1`)}
          >
            Nouvelle école
          </Button>
        </Space>
      </div>
      <Card className="super-admin-dashboard__card">
        <div className="super-admin-dashboard__table-tools">
          <Input.Search
            placeholder="Rechercher une école ou un directeur"
            allowClear
            onChange={(event) => setSchoolQuery(event.target.value)}
          />
          <Select
            placeholder="Toutes les provinces"
            allowClear
            value={province}
            onChange={setProvince}
            options={[
              "Kinshasa",
              "Haut-Katanga",
              "Kongo-Central",
              "Nord-Kivu",
            ].map((value) => ({ label: value, value }))}
          />
          <Button icon={<SettingOutlined />}>Filtres</Button>
        </div>
        <Table
          columns={schoolColumns}
          dataSource={filteredSchools}
          pagination={{ pageSize: 6, showSizeChanger: false }}
          scroll={{ x: 1120 }}
        />
      </Card>
    </section>
  );

  const renderAcademic = () => (
    <section className="super-admin-dashboard__workspace">
      <div className="super-admin-dashboard__workspace-heading">
        <div>
          <span className="super-admin-dashboard__eyebrow">
            Supervision académique
          </span>
          <Title level={2}>Notes & résultats</Title>
          <Text>
            Consultez les performances de toutes les écoles, classes et élèves.
          </Text>
        </div>
        <Space wrap>
          <Button icon={<DownloadOutlined />}>Export Excel</Button>
          <Button type="primary" icon={<FileTextOutlined />}>
            Rapport national
          </Button>
        </Space>
      </div>
      <Row
        gutter={[18, 18]}
        className="super-admin-dashboard__academic-counters"
      >
        <Metric
          icon={<BookOutlined />}
          label="Matières évaluées"
          value={64}
          trend="Cette période"
          tone="blue"
          compact
        />
        <Metric
          icon={<TrophyOutlined />}
          label="Moyenne nationale"
          value={"13,8 / 20"}
          trend="+0,6 point"
          tone="green"
          compact
        />
        <Metric
          icon={<WarningFilled />}
          label="Élèves à suivre"
          value={784}
          trend="1,7 % du total"
          tone="orange"
          compact
        />
      </Row>
      <Card className="super-admin-dashboard__card">
        <div className="super-admin-dashboard__table-tools">
          <Input.Search placeholder="Élève, matricule, école..." allowClear />
          <Select
            placeholder="École"
            allowClear
            options={schools.map((school) => ({
              label: school.name,
              value: school.name,
            }))}
          />
          <Select
            placeholder="Période"
            allowClear
            options={["1er trimestre", "2e trimestre", "3e trimestre"].map(
              (value) => ({ label: value, value }),
            )}
          />
        </div>
        <Table
          columns={academicColumns}
          dataSource={academicRecords}
          pagination={{ pageSize: 8 }}
          scroll={{ x: 1150 }}
        />
      </Card>
    </section>
  );

  const renderGradeManagement = () => (
    <section className="super-admin-dashboard__workspace">
      <div className="super-admin-dashboard__workspace-heading">
        <div>
          <span className="super-admin-dashboard__eyebrow">
            Administration académique
          </span>
          <Title level={2}>Gestion de cotes</Title>
          <Text>
            Contrôlez les cotes saisies par les enseignants dans toutes les
            écoles.
          </Text>
        </div>
        <Space wrap>
          <Button icon={<DownloadOutlined />}>Exporter les cotes</Button>
          <Button type="primary" icon={<FileTextOutlined />}>
            Valider la publication
          </Button>
        </Space>
      </div>
      <Row
        gutter={[18, 18]}
        className="super-admin-dashboard__academic-counters"
      >
        <Metric
          icon={<BookOutlined />}
          label="Cotes encodées"
          value={38450}
          trend="Cette période"
          tone="blue"
          compact
        />
        <Metric
          icon={<CheckCircleFilled />}
          label="Cotes validées"
          value={37218}
          trend="96,8 % du total"
          tone="green"
          compact
        />
        <Metric
          icon={<WarningFilled />}
          label="Cotes à vérifier"
          value={1232}
          trend="Avant publication"
          tone="orange"
          compact
        />
      </Row>
      <Card className="super-admin-dashboard__card">
        <div className="super-admin-dashboard__table-tools">
          <Input.Search
            placeholder="Élève, matricule, enseignant..."
            allowClear
          />
          <Select
            placeholder="École"
            allowClear
            options={schools.map((school) => ({
              label: school.name,
              value: school.name,
            }))}
          />
          <Select
            placeholder="Période"
            allowClear
            options={["1er trimestre", "2e trimestre", "3e trimestre"].map(
              (value) => ({ label: value, value }),
            )}
          />
        </div>
        <Table
          columns={academicColumns}
          dataSource={academicRecords}
          pagination={{ pageSize: 8 }}
          scroll={{ x: 1150 }}
        />
      </Card>
    </section>
  );

  const renderUsers = () => (
    <section className="super-admin-dashboard__workspace">
      <div className="super-admin-dashboard__workspace-heading">
        <div>
          <span className="super-admin-dashboard__eyebrow">
            Comptes & permissions
          </span>
          <Title level={2}>Gestion des utilisateurs</Title>
          <Text>
            Administrateurs, directeurs, titulaires et rôles de la plateforme.
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />}>
          Ajouter un utilisateur
        </Button>
      </div>
      <Row
        gutter={[18, 18]}
        className="super-admin-dashboard__academic-counters"
      >
        <Metric
          icon={<UserSwitchOutlined />}
          label="Administrateurs écoles"
          value={156}
          trend="Tous actifs"
          tone="blue"
          compact
        />
        <Metric
          icon={<UserOutlined />}
          label="Directeurs"
          value={148}
          trend="8 comptes suspendus"
          tone="green"
          compact
        />
        <Metric
          icon={<SafetyCertificateOutlined />}
          label="Super administrateurs"
          value={4}
          trend="Accès restreint"
          tone="violet"
          compact
        />
      </Row>
      <Card className="super-admin-dashboard__card">
        <div className="super-admin-dashboard__table-tools">
          <Input.Search placeholder="Rechercher un utilisateur" allowClear />
          <Select
            defaultValue="Tous les rôles"
            options={[
              "Tous les rôles",
              "Administrateur école",
              "Directeur",
              "Titulaire",
              "Super administrateur",
            ].map((value) => ({ label: value, value }))}
          />
        </div>
        <Table
          dataSource={users}
          pagination={false}
          scroll={{ x: 780 }}
          columns={[
            {
              title: "Utilisateur",
              key: "user",
              render: (_, user) => (
                <Space>
                  <Avatar>{user.initials}</Avatar>
                  <strong>{user.name}</strong>
                </Space>
              ),
            },
            { title: "Rôle", dataIndex: "role" },
            { title: "École", dataIndex: "school" },
            {
              title: "Statut",
              dataIndex: "status",
              render: (status: string) => (
                <Tag
                  className={
                    status === "Actif"
                      ? "super-admin-dashboard__tag super-admin-dashboard__tag--active"
                      : "super-admin-dashboard__tag super-admin-dashboard__tag--suspended"
                  }
                >
                  {status}
                </Tag>
              ),
            },
            {
              title: "Actions",
              key: "action",
              render: () => (
                <Space>
                  <Button type="link">Modifier</Button>
                  <Button type="link">Réinitialiser accès</Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>
      <div className="super-admin-dashboard__module-grid">
        <Module
          icon={<BookOutlined />}
          title="Années scolaires"
          text="Activer, archiver et consulter les statistiques historiques."
          action="Gérer les années"
        />
        <Module
          icon={<BellOutlined />}
          title="Notifications"
          text="Configurez les alertes, incidents et communications système."
          action="Ouvrir le centre"
        />
        <Module
          icon={<FileTextOutlined />}
          title="Rapports"
          text="Générez les rapports écoles, résultats et finances."
          action="Créer un rapport"
        />
        <Module
          icon={<SettingOutlined />}
          title="Paramètres système"
          text="Identité, sécurité, rôles et permissions de la plateforme."
          action="Configurer"
        />
      </div>
    </section>
  );

  return (
    <div className="super-admin-dashboard">
      {workspace === "Aperçu" && renderOverview()}
      {workspace === "Écoles" && renderSchools()}
      {workspace === "Gestion de cotes" && renderGradeManagement()}
      {workspace === "Résultats" && renderAcademic()}
      {workspace === "Utilisateurs" && renderUsers()}
      <Modal
        open={Boolean(selectedSchool)}
        onCancel={() => setSelectedSchool(null)}
        footer={[
          <Button key="close" onClick={() => setSelectedSchool(null)}>
            Fermer
          </Button>,
          <Button key="edit" type="primary">
            Modifier l’école
          </Button>,
        ]}
        title="Détail de l’établissement"
        centered
      >
        {selectedSchool ? (
          <div className="super-admin-dashboard__school-detail">
            <div className="super-admin-dashboard__detail-header">
              <Avatar
                size={58}
                className="super-admin-dashboard__school-avatar"
              >
                {selectedSchool.initials}
              </Avatar>
              <div>
                <Title level={4}>{selectedSchool.name}</Title>
                <Text>
                  {selectedSchool.province} · {selectedSchool.address}
                </Text>
              </div>
            </div>
            <Row gutter={[12, 12]}>
              <Detail
                label="Directeur / Préfet"
                value={selectedSchool.director}
              />
              <Detail label="Téléphone" value={selectedSchool.phone} />
              <Detail label="Année active" value="2025–2026" />
              <Detail
                label="Statut"
                value={
                  selectedSchool.status === "active" ? "Active" : "Suspendue"
                }
              />
            </Row>
            <div className="super-admin-dashboard__detail-stats">
              <Statistic title="Élèves" value={selectedSchool.students} />
              <Statistic title="Enseignants" value={selectedSchool.teachers} />
              <Statistic title="Classes" value={28} />
              <Statistic title="Résultats publiés" value="96 %" />
            </div>
          </div>
        ) : (
          <Empty />
        )}
      </Modal>
    </div>
  );
};

const Metric = ({
  icon,
  label,
  value,
  trend,
  tone,
  compact = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  trend: string;
  tone: string;
  compact?: boolean;
}) => (
  <Col xs={24} sm={12} lg={8} xl={8}>
    <Card
      className={`super-admin-dashboard__metric super-admin-dashboard__metric--${tone}`}
    >
      <span className="super-admin-dashboard__metric-icon">{icon}</span>
      <Statistic title={label} value={value} />
      <small>
        <RiseOutlined /> {trend}
      </small>
    </Card>
  </Col>
);
const Notification = ({
  icon,
  color,
  title,
  description,
}: {
  icon: React.ReactNode;
  color: string;
  title: string;
  description: string;
}) => (
  <div className="super-admin-dashboard__notification">
    <span
      className={`super-admin-dashboard__notification-icon super-admin-dashboard__notification-icon--${color}`}
    >
      {icon}
    </span>
    <div>
      <strong>{title}</strong>
      <small>{description}</small>
    </div>
  </div>
);
const Module = ({
  icon,
  title,
  text,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  action: string;
}) => (
  <Card className="super-admin-dashboard__module">
    <span>{icon}</span>
    <Title level={4}>{title}</Title>
    <Text>{text}</Text>
    <Button type="link">{action} →</Button>
  </Card>
);
const Detail = ({ label, value }: { label: string; value: string }) => (
  <Col span={12}>
    <div className="super-admin-dashboard__detail-item">
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  </Col>
);

export default SuperAdminDashboard;
