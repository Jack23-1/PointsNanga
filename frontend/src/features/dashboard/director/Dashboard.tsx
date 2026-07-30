import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Progress,
  Row,
  Skeleton,
  Table,
  Tag,
} from "antd";
import {
  ArrowRightOutlined,
  BookOutlined,
  CheckCircleFilled,
  PlusOutlined,
  ReadOutlined,
  ReloadOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../../config/constants";
import { api } from "../../../lib/api";

interface DirectorDashboardData {
  school: {
    id: string;
    name: string;
    code: string;
    address: string | null;
    city: string;
    phone: string | null;
    logo: string | null;
  };
  activeSchoolYear: {
    id: string;
    label: string;
    startsAt: string;
    endsAt: string;
  } | null;
  counts: {
    students: number;
    classes: number;
    teachers: number;
    courses: number;
  };
  classes: Array<{
    id: string;
    name: string;
    code: string;
    option: string | null;
    capacity: number | null;
    students: number;
  }>;
}

const DirectorDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DirectorDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response =
        await api.get<DirectorDashboardData>("/dashboard/director");
      setData(response.data);
    } catch {
      setError(
        "Les informations de votre établissement n'ont pas pu être chargées.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="director-dashboard director-dashboard--loading">
        <Skeleton active paragraph={{ rows: 3 }} />
        <Row gutter={[16, 16]}>
          {[1, 2, 3, 4].map((item) => (
            <Col xs={24} sm={12} xl={6} key={item}>
              <Card><Skeleton active paragraph={{ rows: 1 }} /></Card>
            </Col>
          ))}
        </Row>
        <Card><Skeleton active paragraph={{ rows: 6 }} /></Card>
      </div>
    );
  }

  if (!data || error) {
    return (
      <div className="director-dashboard">
        <Alert
          showIcon
          type="error"
          message="Chargement impossible"
          description={error}
          action={
            <Button icon={<ReloadOutlined />} onClick={loadDashboard}>
              Réessayer
            </Button>
          }
        />
      </div>
    );
  }

  const metrics = [
    {
      label: "Élèves actifs",
      value: data.counts.students,
      icon: <UserOutlined />,
      route: ROUTES.STUDENTS,
    },
    {
      label: "Classes actives",
      value: data.counts.classes,
      icon: <BookOutlined />,
      route: ROUTES.CLASSES,
    },
    {
      label: "Enseignants actifs",
      value: data.counts.teachers,
      icon: <TeamOutlined />,
      route: ROUTES.TEACHERS,
    },
    {
      label: "Cours actifs",
      value: data.counts.courses,
      icon: <ReadOutlined />,
      route: ROUTES.COURSES,
    },
  ];

  const setupItems = [
    {
      label: "Créer les classes",
      ready: data.counts.classes > 0,
      route: ROUTES.CLASSES,
    },
    {
      label: "Enregistrer les enseignants",
      ready: data.counts.teachers > 0,
      route: ROUTES.TEACHERS,
    },
    {
      label: "Ajouter les cours",
      ready: data.counts.courses > 0,
      route: ROUTES.COURSES,
    },
    {
      label: "Inscrire les élèves",
      ready: data.counts.students > 0,
      route: ROUTES.STUDENTS,
    },
  ];
  const completedSetup = setupItems.filter((item) => item.ready).length;
  const setupProgress = Math.round(
    (completedSetup / setupItems.length) * 100,
  );

  return (
    <div className="director-dashboard director-overview">
      {!data.activeSchoolYear && (
        <Alert
          className="director-overview__notice"
          showIcon
          type="warning"
          message="Aucune année scolaire active"
          description="Activez une année scolaire pour afficher les effectifs actuels de chaque classe."
        />
      )}

      <Row gutter={[16, 16]} className="director-dashboard__metrics">
        {metrics.map((metric) => (
          <Col xs={24} sm={12} xl={6} key={metric.label}>
            <Card
              hoverable
              className="director-metric"
              onClick={() => navigate(metric.route)}
            >
              <div className="director-metric__top">
                <span className="director-metric__icon">{metric.icon}</span>
                <ArrowRightOutlined className="director-metric__arrow" />
              </div>
              <span className="director-metric__label">{metric.label}</span>
              <strong className="director-metric__value">
                {metric.value.toLocaleString("fr-FR")}
              </strong>
              <small>Données enregistrées dans votre école</small>
            </Card>
          </Col>
        ))}
      </Row>

      <section className="director-overview__grid">
        <Card className="director-classes-card director-overview__classes">
          <div className="director-classes-card__heading">
            <div>
              <span className="director-dashboard__eyebrow">
                Structure académique
              </span>
              <h2>Vos classes</h2>
              <p>
                Effectifs de l’année scolaire actuellement active
                {data.activeSchoolYear?.label ? ` · ${data.activeSchoolYear.label}` : ""}
              </p>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate(ROUTES.CLASSES)}
            >
              Gérer les classes
            </Button>
          </div>
          <Table
            rowKey="id"
            dataSource={data.classes}
            pagination={data.classes.length > 6 ? { pageSize: 6 } : false}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Aucune classe enregistrée"
                >
                  <Button
                    type="primary"
                    onClick={() => navigate(ROUTES.CLASSES)}
                  >
                    Créer la première classe
                  </Button>
                </Empty>
              ),
            }}
            columns={[
              {
                title: "Classe",
                dataIndex: "name",
                render: (name: string, record) => (
                  <div className="director-class">
                    <span>{name.slice(0, 1).toUpperCase()}</span>
                    <div>
                      <strong>{name}</strong>
                      <small>{record.code}</small>
                    </div>
                  </div>
                ),
              },
              {
                title: "Effectif",
                dataIndex: "students",
                render: (students: number) => (
                  <div className="director-class-capacity">
                    <strong>{students} élève{students !== 1 ? "s" : ""}</strong>
                  </div>
                ),
              },
              {
                title: "État",
                render: (_, record) => (
                  <Tag
                    className={`director-capacity-tag${
                      record.capacity && record.students >= record.capacity
                        ? " is-full"
                        : ""
                    }`}
                  >
                    {record.capacity && record.students >= record.capacity
                      ? "Capacité atteinte"
                      : "Active"}
                  </Tag>
                ),
              },
            ]}
          />
        </Card>

        <aside className="director-overview__aside">
          <Card className="director-overview__setup">
            <span className="director-dashboard__eyebrow">
              Mise en place
            </span>
            <div className="director-overview__setup-title">
              <div>
                <h2>Configuration</h2>
                <p>{completedSetup} étape{completedSetup !== 1 ? "s" : ""} sur 4</p>
              </div>
              <Progress
                type="circle"
                percent={setupProgress}
                size={62}
                strokeColor="#1769c2"
              />
            </div>
            <div className="director-overview__checklist">
              {setupItems.map((item) => (
                <button
                  type="button"
                  key={item.label}
                  className={item.ready ? "is-ready" : ""}
                  onClick={() => navigate(item.route)}
                >
                  {item.ready ? (
                    <CheckCircleFilled />
                  ) : (
                    <span className="director-overview__step-dot" />
                  )}
                  <span>{item.label}</span>
                  <ArrowRightOutlined />
                </button>
              ))}
            </div>
          </Card>

          <Card className="director-overview__quick">
            <div className="director-overview__quick-icon">
              <SettingOutlined />
            </div>
            <span>Accès rapide</span>
            <h2>Votre école, simplement organisée.</h2>
            <p>
              Accédez aux espaces de gestion sans quitter votre tableau de bord.
            </p>
            <div>
                <Button onClick={() => navigate(ROUTES.STUDENTS)}>
                  Élèves
                </Button>
              <Button onClick={() => navigate(ROUTES.TEACHERS)}>
                Enseignants
              </Button>
              <Button onClick={() => navigate(ROUTES.COURSES)}>
                Cours
              </Button>
            </div>
          </Card>
        </aside>
      </section>
    </div>
  );
};

export default DirectorDashboard;
