import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BankOutlined,
  CheckCircleOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Input,
  Row,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { School, SchoolFormData } from "../../../types";

const { Title, Text } = Typography;

const initialSchools: School[] = [
  { id: "school-1", name: "Lycée Saint-Michel", code: "LSM-001", address: "Avenue des Écoles, Gombe", phone: "+243 810 000 001", email: "contact@saintmichel.cd", directorId: "director-1", city: "Kinshasa", country: "RDC", isActive: true, createdAt: "2026-01-10", updatedAt: "2026-01-10" },
  { id: "school-2", name: "Collège Notre-Dame", code: "CND-002", address: "Boulevard Lumumba", phone: "+243 810 000 002", email: "contact@notredame.cd", directorId: "director-2", city: "Lubumbashi", country: "RDC", isActive: true, createdAt: "2026-02-14", updatedAt: "2026-02-14" },
  { id: "school-3", name: "Institut Technique Matadi", code: "ITM-003", address: "Quartier Ville Haute", phone: "+243 810 000 003", email: "contact@itm.cd", directorId: "director-3", city: "Matadi", country: "RDC", isActive: false, createdAt: "2026-03-02", updatedAt: "2026-03-02" },
];

const SchoolsPage = () => {
  const [schools, setSchools] = useState<School[]>(initialSchools);
  const [query, setQuery] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [form] = Form.useForm<SchoolFormData>();

  useEffect(() => {
    setIsDrawerOpen(searchParams.get("create") === "1");
  }, [searchParams]);

  const filteredSchools = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return schools;
    return schools.filter((school) =>
      [school.name, school.code, school.city].some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [query, schools]);

  const handleCreateSchool = (values: SchoolFormData) => {
    const now = new Date().toISOString();
    const school: School = {
      ...values,
      id: `school-${Date.now()}`,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    setSchools((currentSchools) => [school, ...currentSchools]);
    form.resetFields();
    setIsDrawerOpen(false);
    setSearchParams({});
    message.success(`${school.name} a été créée avec succès.`);
  };

  const columns: ColumnsType<School> = [
    {
      title: "Établissement",
      key: "school",
      render: (_, school) => (
        <div className="schools-page__school-name">
          <span><BankOutlined /></span>
          <div><strong>{school.name}</strong><Text type="secondary">{school.code}</Text></div>
        </div>
      ),
    },
    { title: "Ville", dataIndex: "city", key: "city", responsive: ["sm"] },
    { title: "Contact", dataIndex: "email", key: "email", responsive: ["lg"] },
    {
      title: "Statut",
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive: boolean) => <Tag color={isActive ? "success" : "default"}>{isActive ? "Active" : "Inactive"}</Tag>,
    },
  ];

  return (
    <section className="schools-page">
      <div className="schools-page__hero">
        <div>
          <span className="schools-page__eyebrow">Administration centrale</span>
          <Title level={1}>Gestion des écoles</Title>
          <Text>Créez et pilotez les espaces de chaque établissement de la plateforme.</Text>
        </div>
        <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setIsDrawerOpen(true)}>
          Créer une école
        </Button>
      </div>

      <Row gutter={[16, 16]} className="schools-page__stats">
        <Col xs={24} sm={12} lg={8}><Card><Statistic title="Écoles enregistrées" value={schools.length} prefix={<BankOutlined />} /></Card></Col>
        <Col xs={24} sm={12} lg={8}><Card><Statistic title="Écoles actives" value={schools.filter((school) => school.isActive).length} prefix={<CheckCircleOutlined />} valueStyle={{ color: "#389e0d" }} /></Card></Col>
        <Col xs={24} sm={12} lg={8}><Card><Statistic title="Villes couvertes" value={new Set(schools.map((school) => school.city)).size} prefix={<EnvironmentOutlined />} valueStyle={{ color: "#1565c0" }} /></Card></Col>
      </Row>

      <Card className="schools-page__list-card" title="Établissements" bordered={false} extra={<Input allowClear prefix={<SearchOutlined />} placeholder="Rechercher une école" value={query} onChange={(event) => setQuery(event.target.value)} />}>
        <Table rowKey="id" columns={columns} dataSource={filteredSchools} pagination={{ pageSize: 6, showSizeChanger: false }} scroll={{ x: 680 }} />
      </Card>

      <Drawer title="Créer une école" width={520} open={isDrawerOpen} onClose={() => { setIsDrawerOpen(false); setSearchParams({}); }} destroyOnClose extra={<Button type="primary" onClick={() => form.submit()}>Enregistrer</Button>}>
        <Text type="secondary">Renseignez les informations de l’établissement. Il sera activé dès sa création.</Text>
        <Form form={form} layout="vertical" onFinish={handleCreateSchool} initialValues={{ country: "RDC" }} className="schools-page__form">
          <Form.Item label="Nom de l'école" name="name" rules={[{ required: true, message: "Le nom de l'école est requis." }]}><Input placeholder="Ex. Lycée Saint-Michel" /></Form.Item>
          <Row gutter={16}>
            <Col span={12}><Form.Item label="Code établissement" name="code" rules={[{ required: true, message: "Le code est requis." }]}><Input placeholder="Ex. LSM-001" /></Form.Item></Col>
            <Col span={12}><Form.Item label="Ville" name="city" rules={[{ required: true, message: "La ville est requise." }]}><Input placeholder="Ex. Kinshasa" /></Form.Item></Col>
          </Row>
          <Form.Item label="Adresse" name="address" rules={[{ required: true, message: "L'adresse est requise." }]}><Input placeholder="Avenue, quartier, commune" /></Form.Item>
          <Row gutter={16}>
            <Col span={12}><Form.Item label="Téléphone" name="phone" rules={[{ required: true, message: "Le téléphone est requis." }]}><Input placeholder="+243 ..." /></Form.Item></Col>
            <Col span={12}><Form.Item label="E-mail" name="email" rules={[{ required: true, type: "email", message: "Saisissez un e-mail valide." }]}><Input placeholder="contact@ecole.cd" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item label="Identifiant directeur" name="directorId" rules={[{ required: true, message: "Le directeur est requis." }]}><Input placeholder="Ex. director-1" /></Form.Item></Col>
            <Col span={12}><Form.Item label="Pays" name="country" rules={[{ required: true, message: "Le pays est requis." }]}><Input /></Form.Item></Col>
          </Row>
        </Form>
      </Drawer>
    </section>
  );
};

export default SchoolsPage;
