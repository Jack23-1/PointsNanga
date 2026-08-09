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
  message,
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
  DeleteOutlined,
  EditOutlined,
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
import { api } from "../../../lib/api";
import educationPartnerAd from "../../../assets/education-partner-ad.png";
import { useAuth } from "../../../hooks/useAuth";

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
  logo?: string | null;
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
  enrollmentId: string | null;
  periods: { id: string; name: string; isOpen: boolean }[];
  periodStatuses: Record<string, boolean>;
};

type SuperAdminRecord = {
  key: string;
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  hasFullAccess: boolean;
  status: "Actif" | "Suspendu";
};

type SuperAdminApiRecord = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  hasFullAccess: boolean;
};

type SchoolApiRecord = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  logo?: string | null;
  isActive: boolean;
  createdAt: string;
};

type UserConfirmAction =
  | { type: "create" }
  | { type: "update" }
  | { type: "delete"; admin: SuperAdminRecord };

const { Title, Text } = Typography;

const academicRecords: AcademicRecord[] = [];

const chartData: number[] = [];

const mapSuperAdminFromApi = (
  superAdmin: SuperAdminApiRecord,
): SuperAdminRecord => ({
  key: superAdmin.id,
  id: superAdmin.id,
  firstName: superAdmin.firstName,
  lastName: superAdmin.lastName,
  email: superAdmin.email,
  hasFullAccess: superAdmin.hasFullAccess,
  status: superAdmin.isActive ? "Actif" : "Suspendu",
});

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter((word) => word.length > 2)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "PN";

const mapSchoolFromApi = (school: SchoolApiRecord): School => ({
  key: school.id,
  name: school.name,
  province: "—",
  address: school.address ?? "—",
  director: "—",
  phone: school.phone ?? "—",
  students: 0,
  teachers: 0,
  joined: new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(school.createdAt)),
  status: school.isActive ? "active" : "suspended",
  initials: getInitials(school.name),
  logo: school.logo,
});

const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const canCreateSuperAdmin = Boolean(user?.hasFullAccess);
  const navigate = useNavigate();
  const location = useLocation();
  const [workspace, setWorkspace] = useState<Workspace>("Aperçu");
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);
  const [schoolQuery, setSchoolQuery] = useState("");
  const [province, setProvince] = useState<string | undefined>();
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [superAdmins, setSuperAdmins] = useState<SuperAdminRecord[]>([]);
  const [isLoadingSuperAdmins, setIsLoadingSuperAdmins] = useState(false);
  const [isSavingSuperAdmin, setIsSavingSuperAdmin] = useState(false);
  const [superAdminSearch, setSuperAdminSearch] = useState("");
  const [superAdminModalOpen, setSuperAdminModalOpen] = useState(false);
  const [editingSuperAdmin, setEditingSuperAdmin] =
    useState<SuperAdminRecord | null>(null);
  const [confirmUserAction, setConfirmUserAction] =
    useState<UserConfirmAction | null>(null);
  const [superAdminForm, setSuperAdminForm] = useState<
    Pick<
      SuperAdminRecord,
      "firstName" | "lastName" | "email" | "status" | "hasFullAccess"
    > & {
      password: string;
    }
  >({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    status: "Actif",
    hasFullAccess: false,
  });
  const [gradeSearch, setGradeSearch] = useState("");
  const [gradeManagementRecords, setGradeManagementRecords] = useState<GradeManagementRecord[]>([]);
  const [gradeSummary, setGradeSummary] = useState({
    totalStudents: 0,
    activeStudents: 0,
    totalGrades: 0,
  });
  const [academicSchoolFilter, setAcademicSchoolFilter] = useState<
    string | undefined
  >();
  const [gradeSchoolFilter, setGradeSchoolFilter] = useState<string | undefined>();
  const [gradeClassFilter, setGradeClassFilter] = useState<
    string | undefined
  >();
  const [gradePeriodFilter, setGradePeriodFilter] = useState<string | undefined>(
    () => localStorage.getItem("superadmin_grade_period") || undefined,
  );
  const selectedGradeSchool = schools.find(
    (school) => school.name === gradeSchoolFilter,
  );
  const selectedAcademicSchool = schools.find(
    (school) => school.name === academicSchoolFilter,
  );
  const gradePeriods = useMemo(
    () => Array.from(
      new Map(
        gradeManagementRecords
          .filter((record) => record.school === gradeSchoolFilter)
          .flatMap((record) => record.periods)
          .map((period) => [period.id, period]),
      ).values(),
    ),
    [gradeManagementRecords, gradeSchoolFilter],
  );
  const selectedGradePeriodIsOpen = Boolean(
    gradePeriods.find((period) => period.id === gradePeriodFilter)?.isOpen,
  );

  useEffect(() => {
    const requestedWorkspace = new URLSearchParams(location.search).get(
      "workspace",
    );
    if (!canCreateSuperAdmin) {
      if (requestedWorkspace !== "grades" && requestedWorkspace !== "users") {
        navigate(`${ROUTES.DASHBOARD}?workspace=grades`, { replace: true });
        return;
      }
      setWorkspace(
        requestedWorkspace === "users" ? "Utilisateurs" : "Gestion de cotes",
      );
      return;
    }
    setWorkspace(
      requestedWorkspace === "grades"
        ? "Gestion de cotes"
        : requestedWorkspace === "results"
          ? "Résultats"
        : requestedWorkspace === "users"
          ? "Utilisateurs"
          : "Aperçu",
    );
  }, [location.search, canCreateSuperAdmin, navigate]);

  const loadSuperAdmins = async () => {
    setIsLoadingSuperAdmins(true);
    try {
      const response = await api.get<SuperAdminApiRecord[]>("/superadmins");
      setSuperAdmins(response.data.map(mapSuperAdminFromApi));
    } catch {
      message.error("Impossible de charger les superadmins depuis la base.");
    } finally {
      setIsLoadingSuperAdmins(false);
    }
  };

  const loadSchools = async (showLoading = false) => {
    if (showLoading) setIsLoadingSchools(true);
    try {
      const response = await api.get<SchoolApiRecord[]>("/schools");
      setSchools(response.data.map(mapSchoolFromApi));
    } catch {
      setSchools([]);
    } finally {
      if (showLoading) setIsLoadingSchools(false);
    }
  };

  const loadGradeSummary = async () => {
    try {
      const response = await api.get<{
        totalStudents: number;
        activeStudents: number;
        totalGrades: number;
      }>("/grades/admin/summary");
      setGradeSummary(response.data);
    } catch {
      setGradeSummary({ totalStudents: 0, activeStudents: 0, totalGrades: 0 });
    }
  };

  const loadGradeStudents = async () => {
    try {
      const response = await api.get<Array<{
        id: string;
        matricule: string;
        lastName: string;
        postName: string;
        firstName: string;
        school: string;
        className: string;
        enrollmentId: string | null;
        periods: { id: string; name: string; isOpen: boolean }[];
        periodStatuses: Record<string, boolean>;
        hasGrades: boolean;
      }>>("/grades/admin/students");
      setGradeManagementRecords(response.data.map((record) => ({
        ...record,
        key: record.id,
        isValidated: Object.values(record.periodStatuses).some(Boolean),
      })));
    } catch {
      setGradeManagementRecords([]);
    }
  };

  useEffect(() => {
    let active = true;

    const refreshSchools = () => {
      if (active) {
        void loadSchools();
      }
    };

    void loadSchools(true);
    void loadGradeSummary();
    void loadGradeStudents();
    window.addEventListener("focus", refreshSchools);
    document.addEventListener("visibilitychange", refreshSchools);

    return () => {
      active = false;
      window.removeEventListener("focus", refreshSchools);
      document.removeEventListener("visibilitychange", refreshSchools);
    };
  }, []);

  useEffect(() => {
    if (workspace === "Utilisateurs") {
      loadSuperAdmins();
    }
  }, [workspace]);

  const filteredSuperAdmins = useMemo(() => {
    const query = superAdminSearch.trim().toLocaleLowerCase();

    return superAdmins.filter((admin) => {
      const fullName = `${admin.firstName} ${admin.lastName}`.toLocaleLowerCase();

      return (
        !query ||
        fullName.includes(query) ||
        admin.email.toLocaleLowerCase().includes(query)
      );
    });
  }, [superAdminSearch, superAdmins]);

  const openSuperAdminModal = (admin?: SuperAdminRecord) => {
    if (!canCreateSuperAdmin) {
      message.warning(
        "Seul le superadmin principal peut gérer les comptes superadmins.",
      );
      return;
    }
    setEditingSuperAdmin(admin ?? null);
    setSuperAdminForm(
      admin
        ? {
            firstName: admin.firstName,
            lastName: admin.lastName,
            email: admin.email,
            password: "",
            status: admin.status,
            hasFullAccess: admin.hasFullAccess,
          }
        : {
            firstName: "",
            lastName: "",
            email: "",
            password: "",
            status: "Actif",
            hasFullAccess: false,
          },
    );
    setSuperAdminModalOpen(true);
  };

  const requestSaveSuperAdmin = () => {
    if (!editingSuperAdmin && !canCreateSuperAdmin) {
      message.warning(
        "Seul le superadmin principal peut ajouter un autre superadmin.",
      );
      return;
    }
    if (
      !superAdminForm.firstName.trim() ||
      !superAdminForm.lastName.trim() ||
      !superAdminForm.email.trim() ||
      (!editingSuperAdmin && !superAdminForm.password.trim())
    ) {
      message.warning("Complétez les champs obligatoires avant de continuer.");
      return;
    }

    setSuperAdminModalOpen(false);
    setConfirmUserAction({ type: editingSuperAdmin ? "update" : "create" });
  };

  const saveSuperAdmin = async () => {
    setIsSavingSuperAdmin(true);
    try {
      if (editingSuperAdmin) {
        await api.patch<SuperAdminApiRecord>(`/superadmins/${editingSuperAdmin.id}`, {
          firstName: superAdminForm.firstName,
          lastName: superAdminForm.lastName,
          email: superAdminForm.email,
          isActive: superAdminForm.status === "Actif",
          hasFullAccess: superAdminForm.hasFullAccess,
          ...(superAdminForm.password.trim()
            ? { password: superAdminForm.password }
            : {}),
        });
        message.success("Superadmin modifié dans la base.");
      } else {
        await api.post<SuperAdminApiRecord>("/superadmins", {
          firstName: superAdminForm.firstName,
          lastName: superAdminForm.lastName,
          email: superAdminForm.email,
          password: superAdminForm.password,
          isActive: superAdminForm.status === "Actif",
          hasFullAccess: superAdminForm.hasFullAccess,
        });
        message.success("Superadmin ajouté dans la base.");
      }
      await loadSuperAdmins();
      setSuperAdminModalOpen(false);
      setEditingSuperAdmin(null);
    } catch {
      message.error(
        "Enregistrement impossible. Vérifiez que le backend est lancé et que l'e-mail n'existe pas déjà.",
      );
      setSuperAdminModalOpen(true);
    } finally {
      setIsSavingSuperAdmin(false);
    }
  };

  const deleteSuperAdmin = async (adminId: string) => {
    if (!canCreateSuperAdmin) {
      message.warning(
        "Seul le superadmin principal peut supprimer un superadmin.",
      );
      return;
    }
    try {
      await api.delete(`/superadmins/${adminId}`);
      await loadSuperAdmins();
      message.success("Superadmin supprimé de la base.");
    } catch {
      message.error("Suppression impossible depuis la base.");
    }
  };

  const confirmUserActionText = useMemo(() => {
    if (!confirmUserAction) {
      return null;
    }

    if (confirmUserAction.type === "delete") {
      return {
        title: "Confirmer la suppression",
        actionLabel: "Supprimer définitivement",
        tone: "danger" as const,
        icon: <WarningFilled />,
        description:
          "Ce compte superadmin sera supprimé de la base de données. Cette action ne pourra pas être annulée.",
        name: `${confirmUserAction.admin.firstName} ${confirmUserAction.admin.lastName}`,
        email: confirmUserAction.admin.email,
      };
    }

    const isUpdate = confirmUserAction.type === "update";

    return {
      title: isUpdate ? "Confirmer la modification" : "Confirmer l’ajout",
      actionLabel: isUpdate ? "Confirmer la modification" : "Créer le compte",
      tone: "success" as const,
      icon: <CheckCircleFilled />,
      description: isUpdate
        ? "Les informations de ce superadmin seront mises à jour dans la base de données."
        : "Un nouveau compte superadmin sera enregistré dans la base de données.",
      name: `${superAdminForm.firstName.trim()} ${superAdminForm.lastName.trim()}`,
      email: superAdminForm.email.trim(),
    };
  }, [confirmUserAction, superAdminForm]);

  const handleConfirmUserAction = async () => {
    if (!confirmUserAction) return;

    if (confirmUserAction.type === "delete") {
      await deleteSuperAdmin(confirmUserAction.admin.id);
    } else {
      await saveSuperAdmin();
    }

    setConfirmUserAction(null);
  };

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
        (!gradeClassFilter || record.className === gradeClassFilter) &&
        (!gradePeriodFilter || record.periods.some((period) => period.id === gradePeriodFilter))
      );
    });
  }, [gradeClassFilter, gradePeriodFilter, gradeSchoolFilter, gradeSearch, gradeManagementRecords]);

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
      title: "N°",
      key: "number",
      width: 64,
      fixed: "left",
      align: "center",
      render: (_value, _record, index) => <strong>{index + 1}</strong>,
    },
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
          checked={gradePeriodFilter ? Boolean(record.periodStatuses[gradePeriodFilter]) : record.isValidated}
          disabled={
            !gradePeriodFilter ||
            !record.enrollmentId ||
            !selectedGradePeriodIsOpen
          }
          className="super-admin-dashboard__grade-status-checkbox"
          aria-label={`Autoriser les résultats de ${record.firstName} ${record.lastName}`}
          onChange={async (event) => {
            if (
              !gradePeriodFilter ||
              !record.enrollmentId ||
              !selectedGradePeriodIsOpen
            ) return;
            const isVisible = event.target.checked;
            setGradeManagementRecords((current) => current.map((item) =>
              item.key === record.key
                ? { ...item, periodStatuses: { ...item.periodStatuses, [gradePeriodFilter]: isVisible } }
                : item,
            ));
            try {
              await api.patch(`/grades/admin/students/${record.enrollmentId}/periods/${gradePeriodFilter}`, { isVisible });
              message.success(isVisible ? "Résultats rendus disponibles pour cet élève." : "Accès aux résultats retiré pour cette période.");
            } catch {
              setGradeManagementRecords((current) => current.map((item) =>
                item.key === record.key
                  ? { ...item, periodStatuses: { ...item.periodStatuses, [gradePeriodFilter]: !isVisible } }
                  : item,
              ));
              message.error("Impossible de modifier la disponibilité des résultats.");
            }
          }}
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
          value={schools.length}
          trend="Base réelle"
          tone="blue"
        />
        <Metric
          icon={<UserSwitchOutlined />}
          label="Enseignants"
          value={schools.reduce((total, school) => total + school.teachers, 0)}
          trend="À connecter"
          tone="violet"
        />
        <Metric
          icon={<TeamOutlined />}
          label="Élèves"
          value={schools.reduce((total, school) => total + school.students, 0)}
          trend="À connecter"
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
                Base réelle
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
              loading={isLoadingSchools}
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
          loading={isLoadingSchools}
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
            className="super-admin-dashboard__grade-filter super-admin-dashboard__school-filter"
            classNames={{
              popup: {
                root: "super-admin-dashboard__grade-filter-popup super-admin-dashboard__school-filter-popup",
              },
            }}
            placeholder="Choisir une école"
            allowClear
            showSearch
            optionFilterProp="label"
            value={academicSchoolFilter}
            onChange={setAcademicSchoolFilter}
            prefix={
              selectedAcademicSchool ? (
                <span className="super-admin-dashboard__school-filter-prefix">
                  {selectedAcademicSchool.logo ? (
                    <img src={selectedAcademicSchool.logo} alt="" />
                  ) : (
                    selectedAcademicSchool.initials
                  )}
                </span>
              ) : (
                <BankOutlined />
              )
            }
            options={schools.map((school) => ({
              label: school.name,
              value: school.name,
            }))}
            optionRender={(option) => {
              const school = schools.find(
                (item) => item.name === option.value,
              );
              return (
                <div className="super-admin-dashboard__school-filter-option">
                  <span className="super-admin-dashboard__school-filter-logo">
                    {school?.logo ? (
                      <img src={school.logo} alt="" />
                    ) : (
                      school?.initials ?? "ÉC"
                    )}
                  </span>
                  <span>
                    <strong>{school?.name ?? String(option.label)}</strong>
                    <small>{school?.address ?? "Établissement autorisé"}</small>
                  </span>
                </div>
              );
            }}
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
      </div>
      <Row
        gutter={[18, 18]}
        className="super-admin-dashboard__academic-counters super-admin-dashboard__grade-highlights"
      >
        <Col xs={24} sm={12} lg={8}>
          <Card className="super-admin-dashboard__metric super-admin-dashboard__metric--blue super-admin-dashboard__grade-students-card">
            <span className="super-admin-dashboard__metric-icon">
              <TeamOutlined />
            </span>
            <Statistic
              title="Total élèves"
              value={gradeSummary.totalStudents}
              formatter={(value) => Number(value).toLocaleString("fr-FR")}
            />
            <small>
              {gradeSummary.activeStudents.toLocaleString("fr-FR")} élèves actifs
            </small>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card className="super-admin-dashboard__metric super-admin-dashboard__metric--green">
            <span className="super-admin-dashboard__metric-icon"><CheckCircleFilled /></span>
            <Statistic title="Élèves avec cotes" value={gradeManagementRecords.filter((record) => record.isValidated).length} />
            <small>Données réellement validées</small>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card className="super-admin-dashboard__metric super-admin-dashboard__metric--orange">
            <span className="super-admin-dashboard__metric-icon"><FileTextOutlined /></span>
            <Statistic title="Cotes enregistrées" value={gradeSummary.totalGrades} />
            <small>Données enregistrées dans la base</small>
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
            className="super-admin-dashboard__grade-filter super-admin-dashboard__school-filter"
            classNames={{
              popup: {
                root: "super-admin-dashboard__grade-filter-popup super-admin-dashboard__school-filter-popup",
              },
            }}
            placeholder="Toutes les écoles"
            allowClear
            showSearch
            optionFilterProp="label"
            prefix={
              selectedGradeSchool ? (
                <span className="super-admin-dashboard__school-filter-prefix">
                  {selectedGradeSchool.logo ? (
                    <img src={selectedGradeSchool.logo} alt="" />
                  ) : (
                    selectedGradeSchool.initials
                  )}
                </span>
              ) : (
                <BankOutlined />
              )
            }
            style={{ width: 285 }}
            value={gradeSchoolFilter}
            onChange={(value) => {
              setGradeSchoolFilter(value);
              setGradeClassFilter(undefined);
              setGradePeriodFilter(undefined);
              localStorage.removeItem("superadmin_grade_period");
              localStorage.removeItem("superadmin_grade_school");
            }}
            options={schools.map((school) => ({ label: school.name, value: school.name }))}
            optionRender={(option) => {
              const school = schools.find(
                (item) => item.name === option.value,
              );
              return (
                <div className="super-admin-dashboard__school-filter-option">
                  <span className="super-admin-dashboard__school-filter-logo">
                    {school?.logo ? (
                      <img src={school.logo} alt="" />
                    ) : (
                      school?.initials ?? "ÉC"
                    )}
                  </span>
                  <span>
                    <strong>{school?.name ?? String(option.label)}</strong>
                    <small>
                      {school?.address && school.address !== "—"
                        ? school.address
                        : "Établissement autorisé"}
                    </small>
                  </span>
                </div>
              );
            }}
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
            placeholder={gradeSchoolFilter ? "Période" : "Choisissez une école"}
            allowClear
            prefix={<CalendarOutlined />}
            style={{ width: 210 }}
            disabled={!gradeSchoolFilter}
            value={gradePeriodFilter}
            onChange={(value) => {
              setGradePeriodFilter(value);
              if (value) localStorage.setItem("superadmin_grade_period", value);
              else localStorage.removeItem("superadmin_grade_period");
            }}
            options={gradePeriods.map((period) => ({
              label: period.isOpen ? period.name : `${period.name} — Fermée`,
              value: period.id,
              disabled: !period.isOpen,
            }))}
          />
        </div>
        <Table
          columns={gradeManagementColumns}
          dataSource={filteredGradeManagementRecords}
          pagination={false}
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
            Consultez, ajoutez, modifiez et supprimez les comptes superadmins.
          </Text>
        </div>
        <Tooltip
          title={
            canCreateSuperAdmin
              ? ""
              : "Seul le superadmin principal peut ajouter un compte"
          }
        >
          <span>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              disabled={!canCreateSuperAdmin}
              onClick={() => openSuperAdminModal()}
            >
              Ajouter un superadmin
            </Button>
          </span>
        </Tooltip>
      </div>
      <Row
        gutter={[18, 18]}
        className="super-admin-dashboard__academic-counters"
      >
        <Metric
          icon={<UserSwitchOutlined />}
          label="Superadmins actifs"
          value={superAdmins.filter((admin) => admin.status === "Actif").length}
          trend="Accès autorisé"
          tone="blue"
          compact
        />
        <Metric
          icon={<UserOutlined />}
          label="Comptes suspendus"
          value={
            superAdmins.filter((admin) => admin.status === "Suspendu").length
          }
          trend="À surveiller"
          tone="green"
          compact
        />
        <Metric
          icon={<SafetyCertificateOutlined />}
          label="Super administrateurs"
          value={superAdmins.length}
          trend="Accès restreint"
          tone="violet"
          compact
        />
      </Row>
      <Card className="super-admin-dashboard__card">
        <div className="super-admin-dashboard__table-tools">
          <Input.Search
            placeholder="Rechercher un superadmin"
            allowClear
            value={superAdminSearch}
            onChange={(event) => setSuperAdminSearch(event.target.value)}
          />
        </div>
        <Table
          dataSource={filteredSuperAdmins}
          loading={isLoadingSuperAdmins}
          pagination={false}
          scroll={{ x: 780 }}
          columns={[
            {
              title: "Superadmin",
              key: "user",
              render: (_, user: SuperAdminRecord) => (
                <Space>
                  <Avatar>
                    {user.firstName.charAt(0)}
                    {user.lastName.charAt(0)}
                  </Avatar>
                  <span>
                    <strong>
                      {user.firstName} {user.lastName}
                    </strong>
                    <small>{user.email}</small>
                  </span>
                </Space>
              ),
            },
            { title: "E-mail", dataIndex: "email" },
            {
              title: "Niveau d’accès",
              dataIndex: "hasFullAccess",
              render: (hasFullAccess: boolean) => (
                <Tag
                  color={hasFullAccess ? "green" : "blue"}
                  icon={
                    hasFullAccess ? (
                      <SafetyCertificateOutlined />
                    ) : (
                      <UserOutlined />
                    )
                  }
                >
                  {hasFullAccess ? "Accès complet" : "Accès limité"}
                </Tag>
              ),
            },
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
              render: (_, user: SuperAdminRecord) => (
                <Space>
                  <Button
                    type="link"
                    icon={<EditOutlined />}
                    disabled={!canCreateSuperAdmin}
                    onClick={() => openSuperAdminModal(user)}
                  >
                    Modifier
                  </Button>
                  <Button
                    type="link"
                    danger
                    icon={<DeleteOutlined />}
                    disabled={!canCreateSuperAdmin}
                    onClick={() =>
                      setConfirmUserAction({ type: "delete", admin: user })
                    }
                  >
                    Supprimer
                  </Button>
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
        open={superAdminModalOpen}
        onCancel={() => {
          setSuperAdminModalOpen(false);
          setEditingSuperAdmin(null);
        }}
        onOk={requestSaveSuperAdmin}
        confirmLoading={isSavingSuperAdmin}
        okText={editingSuperAdmin ? "Enregistrer" : "Ajouter"}
        cancelText="Annuler"
        title={null}
        centered
        width={620}
        className="super-admin-dashboard__user-modal"
      >
        <div className="super-admin-dashboard__user-form-heading">
          <div className="super-admin-dashboard__user-form-icon">
            <UserSwitchOutlined />
          </div>
          <div>
            <span>Comptes et permissions</span>
            <Title level={3}>
              {editingSuperAdmin
                ? "Modifier le superadmin"
                : "Ajouter un superadmin"}
            </Title>
            <Text>
              Renseignez les informations du compte et choisissez précisément
              son niveau d’accès.
            </Text>
          </div>
        </div>
        <div className="super-admin-dashboard__user-form">
          <label className="super-admin-dashboard__user-field">
            <span>Prénom <b>*</b></span>
            <Input
              placeholder="Ex. Jacques"
              value={superAdminForm.firstName}
              onChange={(event) =>
                setSuperAdminForm((currentForm) => ({
                  ...currentForm,
                  firstName: event.target.value,
                }))
              }
            />
          </label>
          <label className="super-admin-dashboard__user-field">
            <span>Nom <b>*</b></span>
            <Input
              placeholder="Ex. Bakole"
              value={superAdminForm.lastName}
              onChange={(event) =>
                setSuperAdminForm((currentForm) => ({
                  ...currentForm,
                  lastName: event.target.value,
                }))
              }
            />
          </label>
          <label className="super-admin-dashboard__user-field super-admin-dashboard__user-field--wide">
            <span>Adresse e-mail <b>*</b></span>
            <Input
              type="email"
              placeholder="administrateur@exemple.com"
              value={superAdminForm.email}
              onChange={(event) =>
                setSuperAdminForm((currentForm) => ({
                  ...currentForm,
                  email: event.target.value,
                }))
              }
            />
          </label>
          <label className="super-admin-dashboard__user-field">
            <span>
              {editingSuperAdmin
                ? "Nouveau mot de passe"
                : "Mot de passe *"}
            </span>
            <Input.Password
              value={superAdminForm.password}
              onChange={(event) =>
                setSuperAdminForm((currentForm) => ({
                  ...currentForm,
                  password: event.target.value,
                }))
              }
              placeholder={
                editingSuperAdmin
                  ? "Laisser vide pour conserver l'actuel"
                  : "Mot de passe du superadmin"
              }
            />
          </label>
          <label className="super-admin-dashboard__user-field">
            <span>Statut</span>
            <Select
              value={superAdminForm.status}
              onChange={(value) =>
                setSuperAdminForm((currentForm) => ({
                  ...currentForm,
                  status: value,
                }))
              }
              options={["Actif", "Suspendu"].map((value) => ({
                label: value,
                value,
              }))}
            />
          </label>
          <label className="super-admin-dashboard__access-card">
            <Checkbox
              checked={superAdminForm.hasFullAccess}
              disabled={
                editingSuperAdmin?.email === "elpulgabakole@gmail.com"
              }
              onChange={(event) =>
                setSuperAdminForm((currentForm) => ({
                  ...currentForm,
                  hasFullAccess: event.target.checked,
                }))
              }
            />
            <span className="super-admin-dashboard__access-card-icon">
              <SafetyCertificateOutlined />
            </span>
            <span className="super-admin-dashboard__access-card-copy">
              <strong>Accès complet à la plateforme</strong>
              <small>
                Autorise la gestion des écoles, des comptes et des paramètres
                sensibles, comme le superadmin principal.
              </small>
            </span>
          </label>
        </div>
      </Modal>
      <Modal
        open={Boolean(confirmUserActionText)}
        onCancel={() => {
          if (
            confirmUserAction?.type === "create" ||
            confirmUserAction?.type === "update"
          ) {
            setSuperAdminModalOpen(true);
          }
          setConfirmUserAction(null);
        }}
        onOk={handleConfirmUserAction}
        confirmLoading={isSavingSuperAdmin}
        okText={confirmUserActionText?.actionLabel}
        okButtonProps={{
          danger: confirmUserActionText?.tone === "danger",
          className: "super-admin-dashboard__confirm-ok",
        }}
        cancelText="Annuler"
        centered
        className="super-admin-dashboard__confirm-modal"
        title={null}
      >
        {confirmUserActionText && (
          <div
            className={`super-admin-dashboard__confirm super-admin-dashboard__confirm--${confirmUserActionText.tone}`}
          >
            <div className="super-admin-dashboard__confirm-icon">
              {confirmUserActionText.icon}
            </div>
            <div>
              <h3>{confirmUserActionText.title}</h3>
              <p>{confirmUserActionText.description}</p>
              <div className="super-admin-dashboard__confirm-user">
                <Avatar>
                  {confirmUserActionText.name.charAt(0)}
                </Avatar>
                <span>
                  <strong>{confirmUserActionText.name}</strong>
                  <small>{confirmUserActionText.email}</small>
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
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
