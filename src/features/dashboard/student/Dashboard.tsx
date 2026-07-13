import { Card, Row, Col, Statistic, Typography, Table, Button, Tag, Progress, Descriptions } from 'antd';
import { 
  TrophyOutlined, 
  BookOutlined, 
  ClockCircleOutlined,
  DownloadOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

const StudentDashboard = () => {
  const columns = [
    {
      title: 'Matière',
      dataIndex: 'subject',
      key: 'subject',
    },
    {
      title: 'Note',
      dataIndex: 'grade',
      key: 'grade',
      render: (grade: number) => (
        <Tag color={grade >= 10 ? 'green' : 'red'}>{grade}/20</Tag>
      ),
    },
    {
      title: 'Rang',
      dataIndex: 'rank',
      key: 'rank',
    },
    {
      title: 'Moyenne Classe',
      dataIndex: 'classAverage',
      key: 'classAverage',
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'published' ? 'green' : 'orange'}>
          {status === 'published' ? 'Publié' : 'En attente'}
        </Tag>
      ),
    },
  ];

  const gradesData = [
    { key: '1', subject: 'Mathématiques', grade: 14, rank: '5/45', classAverage: 12.5, status: 'published' },
    { key: '2', subject: 'Français', grade: 16, rank: '3/45', classAverage: 13.2, status: 'published' },
    { key: '3', subject: 'Physique', grade: 12, rank: '12/45', classAverage: 11.8, status: 'published' },
    { key: '4', subject: 'Chimie', grade: 0, rank: '-', classAverage: '-', status: 'pending' },
    { key: '5', subject: 'Anglais', grade: 15, rank: '4/45', classAverage: 13.5, status: 'published' },
  ];

  return (
    <div>
      <Title level={2}>Tableau de bord Élève</Title>
      <Text type="secondary">Consultation de vos résultats scolaires</Text>

      <Card title="Informations Élève" style={{ marginTop: 16 }}>
        <Descriptions column={3}>
          <Descriptions.Item label="Nom">Jean Mukendi</Descriptions.Item>
          <Descriptions.Item label="Classe">6ème A</Descriptions.Item>
          <Descriptions.Item label="Matricule">ELV20260001</Descriptions.Item>
          <Descriptions.Item label="École">Lycée Saint-Michel</Descriptions.Item>
          <Descriptions.Item label="Année Scolaire">2025-2026</Descriptions.Item>
          <Descriptions.Item label="Moyenne Générale">14.2/20</Descriptions.Item>
        </Descriptions>
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={8} md={8} lg={8}>
          <Card>
            <Statistic
              title="Moyenne Générale"
              value={14.2}
              suffix="/20"
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8} md={8} lg={8}>
          <Card>
            <Statistic
              title="Matières Validées"
              value={4}
              suffix="/5"
              prefix={<BookOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8} md={8} lg={8}>
          <Card>
            <Statistic
              title="Rang Classe"
              value={4}
              suffix="/45"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Card 
        title="Notes du Trimestre" 
        style={{ marginTop: 24 }}
        extra={
          <Button type="primary" icon={<DownloadOutlined />}>
            Télécharger Bulletin
          </Button>
        }
      >
        <Table 
          columns={columns} 
          dataSource={gradesData} 
          pagination={false}
        />
      </Card>

      <Card title="Progression Annuelle" style={{ marginTop: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <Text>Mathématiques</Text>
          <Progress percent={85} status="active" />
        </div>
        <div style={{ marginBottom: 16 }}>
          <Text>Français</Text>
          <Progress percent={92} status="active" />
        </div>
        <div style={{ marginBottom: 16 }}>
          <Text>Physique</Text>
          <Progress percent={78} status="active" />
        </div>
        <div>
          <Text>Anglais</Text>
          <Progress percent={88} status="active" />
        </div>
      </Card>
    </div>
  );
};

export default StudentDashboard;
