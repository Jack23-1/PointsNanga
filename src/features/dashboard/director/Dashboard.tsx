import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Table,
  Button,
  Space,
  Tag,
  Progress,
} from "antd";
import {
  UserOutlined,
  BookOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  PlusOutlined,
  EditOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

const DirectorDashboard = () => {
  const columns = [
    {
      title: "Classe",
      dataIndex: "class",
      key: "class",
    },
    {
      title: "Effectif",
      dataIndex: "students",
      key: "students",
    },
    {
      title: "Progression",
      dataIndex: "progress",
      key: "progress",
      render: (progress: number) => (
        <Progress percent={progress} size="small" />
      ),
    },
    {
      title: "Statut",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag
          color={
            status === "completed"
              ? "green"
              : status === "in_progress"
                ? "blue"
                : "orange"
          }
        >
          {status === "completed"
            ? "Terminé"
            : status === "in_progress"
              ? "En cours"
              : "Non commencé"}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: () => (
        <Space>
          <Button type="link" icon={<EditOutlined />}>
            Gérer
          </Button>
        </Space>
      ),
    },
  ];

  const classData = [
    {
      key: "1",
      class: "6ème A",
      students: 45,
      progress: 100,
      status: "completed",
    },
    {
      key: "2",
      class: "6ème B",
      students: 42,
      progress: 85,
      status: "in_progress",
    },
    {
      key: "3",
      class: "5ème A",
      students: 38,
      progress: 60,
      status: "in_progress",
    },
    {
      key: "4",
      class: "5ème B",
      students: 40,
      progress: 0,
      status: "not_started",
    },
  ];

  return (
    <div>
      <Title level={2}>Tableau de bord Direction</Title>
      <Text type="secondary">Gestion de l'établissement</Text>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={12} sm={12} md={6} lg={6}>
          <Card>
            <Statistic
              title="Total Élèves"
              value={1250}
              prefix={<UserOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6} lg={6}>
          <Card>
            <Statistic
              title="Total Classes"
              value={24}
              prefix={<BookOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6} lg={6}>
          <Card>
            <Statistic
              title="Enseignants"
              value={45}
              prefix={<TeamOutlined />}
              valueStyle={{ color: "#722ed1" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6} lg={6}>
          <Card>
            <Statistic
              title="Bulletins Prêts"
              value={18}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="Classes"
        style={{ marginTop: 24 }}
        extra={
          <Button type="primary" icon={<PlusOutlined />}>
            Nouvelle Classe
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={classData}
          pagination={false}
          scroll={{ x: "max-content" }}
        />
      </Card>
    </div>
  );
};

export default DirectorDashboard;
