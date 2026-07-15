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
  Alert,
} from "antd";
import {
  BookOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  SendOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

const TeacherDashboard = () => {
  const columns = [
    {
      title: "Matière",
      dataIndex: "subject",
      key: "subject",
    },
    {
      title: "Classe",
      dataIndex: "class",
      key: "class",
    },
    {
      title: "Élèves Notés",
      dataIndex: "graded",
      key: "graded",
      render: (graded: number, record: any) => (
        <Text>
          {graded} / {record.total}
        </Text>
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
            Encoder
          </Button>
        </Space>
      ),
    },
  ];

  const subjectData = [
    {
      key: "1",
      subject: "Mathématiques",
      class: "6ème A",
      graded: 45,
      total: 45,
      status: "completed",
    },
    {
      key: "2",
      subject: "Mathématiques",
      class: "6ème B",
      graded: 38,
      total: 42,
      status: "in_progress",
    },
    {
      key: "3",
      subject: "Physique",
      class: "5ème A",
      graded: 0,
      total: 38,
      status: "not_started",
    },
    {
      key: "4",
      subject: "Physique",
      class: "5ème B",
      graded: 0,
      total: 40,
      status: "not_started",
    },
  ];

  return (
    <div>
      <Title level={2}>Tableau de bord Enseignant</Title>
      <Text type="secondary">Gestion des notes et évaluations</Text>

      <Alert
        message="Attention"
        description="3 classes ont encore des notes à encoder avant la date limite du 20 juillet."
        type="warning"
        showIcon
        style={{ marginTop: 16 }}
      />

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={8} md={8} lg={8}>
          <Card>
            <Statistic
              title="Classes Assignées"
              value={4}
              prefix={<BookOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8} md={8} lg={8}>
          <Card>
            <Statistic
              title="Notes Encodées"
              value={83}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8} md={8} lg={8}>
          <Card>
            <Statistic
              title="En Attente"
              value={82}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="Mes Classes"
        style={{ marginTop: 24 }}
        extra={
          <Button type="primary" icon={<SendOutlined />}>
            Soumettre Tout
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={subjectData}
          pagination={false}
          scroll={{ x: "max-content" }}
        />
      </Card>
    </div>
  );
};

export default TeacherDashboard;
