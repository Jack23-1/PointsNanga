import React, { useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Input,
  Row,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  BookOutlined,
  CheckCircleFilled,
  DownloadOutlined,
  WarningFilled,
} from "@ant-design/icons";

const { Title, Text } = Typography;

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

const initialRecords: AcademicRecord[] = [];

const Metric = ({
  icon,
  label,
  value,
  compact = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  compact?: boolean;
}) => (
  <Col xs={24} sm={12} lg={8} xl={8}>
    <Card
      className={`super-admin-dashboard__metric${compact ? " super-admin-dashboard__metric--compact" : ""}`}
    >
      <span className="super-admin-dashboard__metric-icon">{icon}</span>
      <Statistic title={label} value={value} />
    </Card>
  </Col>
);

const GradesPage: React.FC = () => {
  const [query, setQuery] = useState("");
  const [records] = useState<AcademicRecord[]>(initialRecords);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) =>
      [r.student, r.matricule, r.school, r.subject].some((v) =>
        v.toLowerCase().includes(q),
      ),
    );
  }, [query, records]);

  const columns: ColumnsType<AcademicRecord> = [
    {
      title: "Élève",
      key: "student",
      render: (_, record) => (
        <span>
          <strong>{record.student}</strong>
          <small>{record.matricule}</small>
        </span>
      ),
    },
    { title: "École", dataIndex: "school", key: "school" },
    { title: "Classe", dataIndex: "className", key: "class" },
    { title: "Enseignant", dataIndex: "teacher", key: "teacher" },
    { title: "Matière", dataIndex: "subject", key: "subject" },
    { title: "Note", dataIndex: "grade", key: "grade" },
    {
      title: "Moyenne",
      dataIndex: "average",
      key: "average",
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
      key: "rank",
      render: (rank: number) => (
        <span className="super-admin-dashboard__rank">#{rank}</span>
      ),
    },
    {
      title: "Statut",
      dataIndex: "status",
      key: "status",
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

  return (
    <div className="super-admin-page-shell">
      <section className="super-admin-dashboard__hero super-admin-dashboard__hero--command">
        <div className="super-admin-dashboard__hero-copy">
          <Title level={1}>Gestion de cotes</Title>
          <Text>Contrôlez les cotes saisies par les enseignants.</Text>
        </div>
        <div className="super-admin-dashboard__hero-actions">
          <Button icon={<DownloadOutlined />}>Exporter les cotes</Button>
          <Button
            type="primary"
            icon={<BookOutlined />}
            style={{ marginLeft: 8 }}
          >
            Valider la publication
          </Button>
        </div>
      </section>

      <section
        className="super-admin-dashboard__workspace"
        style={{ marginTop: 18 }}
      >
        <Row
          gutter={[18, 18]}
          className="super-admin-dashboard__academic-counters"
        >
          <Metric
            icon={<BookOutlined />}
            label="Cotes encodées"
            value={38450}
            compact
          />
          <Metric
            icon={<CheckCircleFilled />}
            label="Cotes validées"
            value={37218}
            compact
          />
          <Metric
            icon={<WarningFilled />}
            label="Cotes à vérifier"
            value={1232}
            compact
          />
        </Row>

        <Card className="super-admin-dashboard__card" style={{ marginTop: 18 }}>
          <div className="super-admin-dashboard__table-tools">
            <Input.Search
              placeholder="Élève, matricule, enseignant..."
              allowClear
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Table
            columns={columns}
            dataSource={filtered}
            pagination={{ pageSize: 8 }}
            scroll={{ x: 1150 }}
          />
        </Card>
      </section>
    </div>
  );
};

export default GradesPage;
