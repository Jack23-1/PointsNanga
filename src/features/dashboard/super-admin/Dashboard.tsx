import { Card, Row, Col, Statistic, Typography, Table, Button, Space, Tag } from 'antd';
import { 
  BankOutlined, 
  UserOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  PlusOutlined,
  EyeOutlined 
} from '@ant-design/icons';

const { Title, Text } = Typography;

const SuperAdminDashboard = () => {
  const columns = [
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: 'Ville',
      dataIndex: 'city',
      key: 'city',
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? 'Actif' : 'Inactif'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: () => (
        <Space>
          <Button type="link" icon={<EyeOutlined />}>Voir</Button>
        </Space>
      ),
    },
  ];

  const schoolData = [
    { key: '1', name: 'Lycée Saint-Michel', code: 'LYC001', city: 'Kinshasa', status: 'active' },
    { key: '2', name: 'Collège Notre-Dame', code: 'COL002', city: 'Lubumbashi', status: 'active' },
    { key: '3', name: 'Institut technique', code: 'INS003', city: 'Matadi', status: 'inactive' },
  ];

  return (
    <div>
      <Title level={2}>Tableau de bord Super Admin</Title>
      <Text type="secondary">Vue d'ensemble du système PointsNanga</Text>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={12} sm={12} md={6} lg={6}>
          <Card>
            <Statistic
              title="Total Écoles"
              value={156}
              prefix={<BankOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6} lg={6}>
          <Card>
            <Statistic
              title="Total Élèves"
              value={45230}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6} lg={6}>
          <Card>
            <Statistic
              title="Résultats Publiés"
              value={38450}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6} lg={6}>
          <Card>
            <Statistic
              title="En Attente"
              value={6780}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <Card 
        title="Écoles Récentes" 
        style={{ marginTop: 24 }}
        extra={
          <Button type="primary" icon={<PlusOutlined />}>
            Nouvelle École
          </Button>
        }
      >
        <Table 
          columns={columns} 
          dataSource={schoolData} 
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default SuperAdminDashboard;
