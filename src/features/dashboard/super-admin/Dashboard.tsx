import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  Checkbox,
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
  CalendarOutlined,
  CheckCircleFilled,
  DownloadOutlined,
  EllipsisOutlined,
  ExportOutlined,
  FileTextOutlined,
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
import educationPartnerAd from "../../../assets/education-partner-ad.png";
import studentsPhoto from "../../../assets/eleves.jpeg";
import classroomPhoto from "../../../assets/student-login-background.jpg";

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

type GradeManagementRecord = {
  key: string;
  matricule: string;
  lastName: string;
  postName: string;
  firstName: string;
  school: string;
  className: string;
  isValidated: boolean;
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

const gradeManagementRecords: GradeManagementRecord[] = [
  {
    key: "1",
    matricule: "ELV-2026-0042",
    lastName: "Mukendi",
    postName: "Kanku",
    firstName: "Naomi",
    school: "Lycée Saint-Michel",
    className: "6e A",
    isValidated: true,
  },
  {
    key: "2",
    matricule: "ELV-2026-0198",
    lastName: "Kabasele",
    postName: "Tshibangu",
    firstName: "David",
    school: "Collège Notre-Dame",
    className: "5e B",
    isValidated: true,
  },
  {
    key: "3",
    matricule: "ELV-2026-0315",
    lastName: "Nsimba",
    postName: "Lukusa",
    firstName: "Esther",
    school: "Institut Technique Matadi",
    className: "3e TS",
    isValidated: false,
  },
  {
    key: "4",
    matricule: "ELV-2026-0066",
    lastName: "Nzambe",
    postName: "Mbuyi",
    firstName: "Moïse",
    school: "Complexe Scolaire Lumière",
    className: "4e A",
    isValidated: true,
  },
  {
    key: "5",
    matricule: "ELV-2026-0051",
    lastName: "Ilunga",
    postName: "Kalala",
    firstName: "Grâce",
    school: "Lycée Saint-Michel",
    className: "6e B",
    isValidated: false,
  },
  {
    key: "6",
    matricule: "ELV-2026-0216",
    lastName: "Mbuyi",
    postName: "Kabongo",
    firstName: "Junior",
    school: "Collège Notre-Dame",
    className: "5e A",
    isValidated: true,
  },
];

const gradePeriods = [
  "1ère",
  "2ème",
  "1er Semestre",
  "3ème",
  "4ème",
  "2ème semestre",
];

const gradeAdvertisementSlides = [
  {
    image: educationPartnerAd,
    alt: "Élèves découvrant des outils numériques en classe",
  },
  {
    image: studentsPhoto,
    alt: "Élèves réunis dans leur établissement scolaire",
  },
  {
    image: classroomPhoto,
    alt: "Salle de classe d'un établissement partenaire",
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
  const [gradeSearch, setGradeSearch] = useState("");
  const [gradeSchoolFilter, setGradeSchoolFilter] = useState<
    string | undefined
  >();
  const [gradeClassFilter, setGradeClassFilter] = useState<
    string | undefined
  >();
  const [gradePeriodFilter, setGradePeriodFilter] = useState<
    string | undefined
  >();
  const [gradeValidationStatus, setGradeValidationStatus] = useState<
    Record<string, boolean>
  >(() =>
    Object.fromEntries(
      gradeManagementRecords.map((record) => [record.key, record.isValidated]),
    ),
  );

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

  const availableGradeClasses = useMemo(() => {
    if (!gradeSchoolFilter) return [];

    return Array.from(
      new Set(
        gradeManagementRecords
          .filter((record) => record.school === gradeSchoolFilter)
          .map((record) => record.className),
      ),
    ).sort();
  }, [gradeSchoolFilter]);

  const filteredGradeManagementRecords = useMemo(() => {
    const normalizedSearch = gradeSearch.trim().toLocaleLowerCase();

    return gradeManagementRecords.filter((record) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          record.matricule,
          record.lastName,
          record.postName,
          record.firstName,
        ].some((value) => value.toLocaleLowerCase().includes(normalizedSearch));

      return (
        matchesSearch &&
        (!gradeSchoolFilter || record.school === gradeSchoolFilter) &&
        (!gradeClassFilter || record.className === gradeClassFilter)
      );
    });
  }, [gradeClassFilter, gradeSchoolFilter, gradeSearch]);

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

  const gradeManagementColumns: ColumnsType<GradeManagementRecord> = [
    {
      title: "Matricule",
      dataIndex: "matricule",
      fixed: "left",
      width: 160,
      sorter: (a, b) => a.matricule.localeCompare(b.matricule),
      render: (value: string) => <strong>{value}</strong>,
    },
    {
      title: "Nom",
      dataIndex: "lastName",
      width: 135,
      sorter: (a, b) => a.lastName.localeCompare(b.lastName),
    },
    {
      title: "Post-nom",
      dataIndex: "postName",
      width: 145,
    },
    {
      title: "Prénom",
      dataIndex: "firstName",
      width: 135,
    },
    {
      title: "École",
      dataIndex: "school",
      width: 210,
    },
    {
      title: "Classe",
      dataIndex: "className",
      width: 110,
      align: "center",
    },
    {
      title: "Statut",
      key: "status",
      width: 100,
      align: "center",
      render: (_, record) => (
        <Checkbox
          checked={gradeValidationStatus[record.key]}
          className="super-admin-dashboard__grade-status-checkbox"
          aria-label={`Valider le statut de ${record.firstName} ${record.lastName}`}
          onChange={(event) =>
            setGradeValidationStatus((currentStatus) => ({
              ...currentStatus,
              [record.key]: event.target.checked,
            }))
          }
        />
      ),
    },
  ];

  const renderOverview = () => (
    <>
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
              <div
                className="super-admin-dashboard__map-pin super-admin-dashboard__map-pin--kinshasa"
              >
                <span /> <strong>Kinshasa</strong>
                <small>1 école</small>
              </div>
              <div
                className="super-admin-dashboard__map-pin super-admin-dashboard__map-pin--kongo"
              >
                <span /> <strong>Kongo-Central</strong>
                <small>1 école</small>
              </div>
              <div
                className="super-admin-dashboard__map-pin super-admin-dashboard__map-pin--katanga"
              >
                <span /> <strong>Haut-Katanga</strong>
                <small>1 école</small>
              </div>
              <div
                className="super-admin-dashboard__map-pin super-admin-dashboard__map-pin--kivu"
              >
                <span /> <strong>Nord-Kivu</strong>
                <small>1 école</small>
              </div>
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
          <Card className="super-admin-dashboard__card super-admin-dashboard__ad-card">
            <aside className="super-admin-dashboard__ad-slot" aria-label="Emplacement publicitaire">
              <img src={educationPartnerAd} alt="Élèves découvrant des outils numériques en classe" />
              <span className="super-admin-dashboard__ad-label">Publicité</span>
              <div className="super-admin-dashboard__ad-content">
                <strong>Apprendre autrement</strong>
                <p>Des outils numériques pour chaque classe.</p>
                <span>Découvrir le partenaire →</span>
              </div>
            </aside>
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
        className="super-admin-dashboard__academic-counters super-admin-dashboard__grade-highlights"
      >
        <Col xs={24} sm={12} lg={8} xl={8}>
          <Card className="super-admin-dashboard__metric super-admin-dashboard__metric--blue super-admin-dashboard__grade-students-card">
            <span className="super-admin-dashboard__metric-icon">
              <TeamOutlined />
            </span>
            <Statistic
              title="Total élèves"
              value={schools.reduce((total, school) => total + school.students, 0)}
              formatter={(value) => Number(value).toLocaleString("fr-FR")}
            />
            <small>
              <RiseOutlined /> Toutes les écoles actives
            </small>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8} xl={8}>
          <Card
            bordered={false}
            className="super-admin-dashboard__card super-admin-dashboard__grade-ad-card"
          >
            <aside
              className="super-admin-dashboard__grade-ad-carousel"
              aria-label="Espace publicitaire"
            >
              {gradeAdvertisementSlides.map((slide, index) => (
                <img
                  key={slide.image}
                  src={slide.image}
                  alt={slide.alt}
                  className="super-admin-dashboard__grade-ad-slide"
                  style={{ animationDelay: `${index * 4}s` }}
                />
              ))}
            </aside>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8} xl={8}>
          <Card className="super-admin-dashboard__metric super-admin-dashboard__grade-readiness-card">
            <div className="super-admin-dashboard__grade-readiness-ring" aria-hidden="true">
              <strong>97%</strong>
            </div>
            <div className="super-admin-dashboard__grade-readiness-copy">
              <span>Publication</span>
              <strong>Prête à valider</strong>
              <Text>37 218 cotes contrôlées</Text>
              <small><CheckCircleFilled /> Contrôle national conforme</small>
            </div>
          </Card>
        </Col>
      </Row>
      <Card className="super-admin-dashboard__card">
        <div className="super-admin-dashboard__table-tools super-admin-dashboard__grade-table-tools">
          <Input.Search
            placeholder="Matricule, nom ou prénom..."
            allowClear
            value={gradeSearch}
            onChange={(event) => setGradeSearch(event.target.value)}
          />
          <Select
            className="super-admin-dashboard__grade-filter"
            classNames={{
              popup: { root: "super-admin-dashboard__grade-filter-popup" },
            }}
            placeholder="École"
            allowClear
            showSearch
            optionFilterProp="label"
            prefix={<BankOutlined />}
            style={{ width: 240 }}
            value={gradeSchoolFilter}
            onChange={(value) => {
              setGradeSchoolFilter(value);
              setGradeClassFilter(undefined);
            }}
            options={schools.map((school) => ({ label: school.name, value: school.name }))}
          />
          <Select
            className="super-admin-dashboard__grade-filter"
            classNames={{
              popup: { root: "super-admin-dashboard__grade-filter-popup" },
            }}
            placeholder={gradeSchoolFilter ? "Classe" : "Choisissez une école"}
            allowClear
            showSearch
            optionFilterProp="label"
            prefix={<BookOutlined />}
            style={{ width: 240 }}
            disabled={!gradeSchoolFilter}
            value={gradeClassFilter}
            onChange={setGradeClassFilter}
            options={availableGradeClasses.map((className) => ({
              label: className,
              value: className,
            }))}
          />
          <Select
            className="super-admin-dashboard__grade-filter"
            classNames={{
              popup: { root: "super-admin-dashboard__grade-filter-popup" },
            }}
            placeholder="Période"
            allowClear
            prefix={<CalendarOutlined />}
            style={{ width: 210 }}
            value={gradePeriodFilter}
            onChange={setGradePeriodFilter}
            options={gradePeriods.map((period) => ({
              label: period,
              value: period,
            }))}
          />
        </div>
        <Table
          columns={gradeManagementColumns}
          dataSource={filteredGradeManagementRecords}
          pagination={{ pageSize: 8 }}
          scroll={{ x: 995 }}
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
      className={`super-admin-dashboard__metric super-admin-dashboard__metric--${tone}${compact ? " super-admin-dashboard__metric--compact" : ""}`}
    >
      <span className="super-admin-dashboard__metric-icon">{icon}</span>
      <Statistic title={label} value={value} />
      <small>
        <RiseOutlined /> {trend}
      </small>
    </Card>
  </Col>
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
