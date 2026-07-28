import {
  Button,
  Card,
  Col,
  Progress,
  Row,
  Space,
  Table,
  Tag,
} from "antd";
import {
  BookOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  EditOutlined,
  FileDoneOutlined,
  NotificationOutlined,
  PlusOutlined,
  RiseOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../../hooks/useAuth";

interface ClassRecord {
  key: string;
  class: string;
  students: number;
  progress: number;
  status: "completed" | "in_progress" | "not_started";
}

const classData: ClassRecord[] = [
  { key: "1", class: "6ème A", students: 45, progress: 100, status: "completed" },
  { key: "2", class: "6ème B", students: 42, progress: 85, status: "in_progress" },
  { key: "3", class: "5ème A", students: 38, progress: 60, status: "in_progress" },
  { key: "4", class: "5ème B", students: 40, progress: 0, status: "not_started" },
];

const DirectorDashboard = () => {
  const { user } = useAuth();
  const schoolName = user?.lastName || "votre établissement";

  const columns = [
    {
      title: "Classe",
      dataIndex: "class",
      key: "class",
      render: (className: string) => (
        <div className="director-class">
          <span>{className.slice(0, 1)}</span>
          <strong>{className}</strong>
        </div>
      ),
    },
    {
      title: "Effectif",
      dataIndex: "students",
      key: "students",
      render: (students: number) => (
        <span className="director-student-count">{students} élèves</span>
      ),
    },
    {
      title: "Progression des notes",
      dataIndex: "progress",
      key: "progress",
      render: (progress: number) => (
        <Progress
          percent={progress}
          size="small"
          strokeColor={{ "0%": "#1467c3", "100%": "#22a06b" }}
        />
      ),
    },
    {
      title: "Statut",
      dataIndex: "status",
      key: "status",
      render: (status: ClassRecord["status"]) => {
        const label = {
          completed: "Terminé",
          in_progress: "En cours",
          not_started: "À démarrer",
        }[status];
        return (
          <Tag className={`director-status director-status--${status}`}>
            <i />
            {label}
          </Tag>
        );
      },
    },
    {
      title: "",
      key: "actions",
      render: () => (
        <Space>
          <Button className="director-manage-button" icon={<EditOutlined />}>
            Gérer
          </Button>
        </Space>
      ),
    },
  ];

  const metrics = [
    {
      label: "Total élèves",
      value: "1 250",
      detail: "+42 cette année",
      icon: <UserOutlined />,
      tone: "blue",
    },
    {
      label: "Total classes",
      value: "24",
      detail: "6 niveaux actifs",
      icon: <BookOutlined />,
      tone: "green",
    },
    {
      label: "Enseignants",
      value: "45",
      detail: "92 % présents",
      icon: <TeamOutlined />,
      tone: "violet",
    },
    {
      label: "Bulletins prêts",
      value: "18",
      detail: "75 % finalisés",
      icon: <CheckCircleOutlined />,
      tone: "amber",
    },
  ];

  return (
    <div className="director-dashboard">
      <section className="director-dashboard__welcome">
        <span className="director-dashboard__welcome-orb" aria-hidden="true" />
        <div>
          <div className="director-dashboard__welcome-meta">
            <span className="director-dashboard__eyebrow">Vue d’ensemble</span>
            <span className="director-dashboard__live"><i /> Données à jour</span>
          </div>
          <h1>Bonjour, Direction</h1>
          <p>
            Voici les informations essentielles de <strong>{schoolName}</strong>.
          </p>
        </div>
        <div className="director-dashboard__period">
          <RiseOutlined />
          <span>
            Année scolaire
            <strong>2025 — 2026</strong>
          </span>
        </div>
      </section>

      <Row gutter={[16, 16]} className="director-dashboard__metrics">
        {metrics.map((metric) => (
          <Col xs={24} sm={12} xl={6} key={metric.label}>
            <Card className={`director-metric director-metric--${metric.tone}`}>
              <div className="director-metric__top">
                <span className="director-metric__icon">{metric.icon}</span>
                <span className="director-metric__trend">Actif</span>
              </div>
              <span className="director-metric__label">{metric.label}</span>
              <strong className="director-metric__value">{metric.value}</strong>
              <small>{metric.detail}</small>
            </Card>
          </Col>
        ))}
      </Row>

      <section className="director-performance">
        <div className="director-performance__intro">
          <span className="director-dashboard__eyebrow">Performance générale</span>
          <h2>Une école en bonne progression</h2>
          <p>
            La complétion académique progresse de <strong>8,4 %</strong> par
            rapport au mois dernier.
          </p>
          <div className="director-performance__legend">
            <span><i className="is-current" /> Cette semaine</span>
            <span><i /> Semaine passée</span>
          </div>
        </div>

        <div className="director-performance__chart" aria-label="Progression hebdomadaire">
          {[42, 58, 51, 72, 67, 84, 92].map((value, index) => (
            <div className="director-performance__bar" key={value}>
              <span style={{ height: `${value}%` }} />
              <small>{["L", "M", "M", "J", "V", "S", "D"][index]}</small>
            </div>
          ))}
        </div>

        <div className="director-performance__scores">
          <div>
            <span className="director-score-ring director-score-ring--green">
              <b>92%</b>
            </span>
            <small>Présence</small>
          </div>
          <div>
            <span className="director-score-ring director-score-ring--blue">
              <b>84%</b>
            </span>
            <small>Encodage</small>
          </div>
          <div>
            <span className="director-score-ring director-score-ring--gold">
              <b>75%</b>
            </span>
            <small>Bulletins</small>
          </div>
        </div>
      </section>

      <Card className="director-classes-card">
        <div className="director-classes-card__heading">
          <div>
            <span className="director-dashboard__eyebrow">Suivi académique</span>
            <h2>Progression des classes</h2>
            <p>Suivez l’encodage des notes pour chaque classe.</p>
          </div>
          <Button type="primary" icon={<PlusOutlined />}>
            Nouvelle classe
          </Button>
        </div>
        <Table<ClassRecord>
          columns={columns}
          dataSource={classData}
          pagination={false}
          scroll={{ x: 760 }}
        />
      </Card>

      <section className="director-dashboard__lower-grid">
        <Card className="director-insight-card">
          <div className="director-panel-heading">
            <div>
              <span className="director-dashboard__eyebrow">À surveiller</span>
              <h2>Activité récente</h2>
            </div>
            <Button type="link">Tout afficher</Button>
          </div>
          <div className="director-activity-list">
            <div className="director-activity">
              <span className="director-activity__icon director-activity__icon--blue">
                <FileDoneOutlined />
              </span>
              <div>
                <strong>Bulletins du premier semestre</strong>
                <p>18 classes sur 24 ont finalisé leurs résultats.</p>
              </div>
              <time>Il y a 20 min</time>
            </div>
            <div className="director-activity">
              <span className="director-activity__icon director-activity__icon--green">
                <CheckCircleOutlined />
              </span>
              <div>
                <strong>Encodage validé</strong>
                <p>La classe de 6ème A a terminé l’encodage des notes.</p>
              </div>
              <time>Aujourd’hui</time>
            </div>
            <div className="director-activity">
              <span className="director-activity__icon director-activity__icon--amber">
                <NotificationOutlined />
              </span>
              <div>
                <strong>Validation en attente</strong>
                <p>Trois classes nécessitent encore votre attention.</p>
              </div>
              <time>Hier</time>
            </div>
          </div>
        </Card>

        <Card className="director-quick-card">
          <span className="director-dashboard__eyebrow">Raccourcis</span>
          <h2>Actions rapides</h2>
          <p>Accédez rapidement aux tâches les plus fréquentes.</p>
          <div className="director-quick-actions">
            <button type="button">
              <span><UserOutlined /></span>
              Ajouter un élève
            </button>
            <button type="button">
              <span><CalendarOutlined /></span>
              Gérer les classes
            </button>
            <button type="button">
              <span><FileDoneOutlined /></span>
              Voir les résultats
            </button>
          </div>
        </Card>
      </section>
    </div>
  );
};

export default DirectorDashboard;
