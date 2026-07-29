import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BankOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
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
  Modal,
  Row,
  Statistic,
  Table,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { api } from "../../../lib/api";
import type { School, SchoolFormData } from "../../../types";

const { Title, Text } = Typography;

const initialSchools: School[] = [];

const SchoolsPage = () => {
  const [schools, setSchools] = useState<School[]>(initialSchools);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [schoolToDelete, setSchoolToDelete] = useState<School | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [form] = Form.useForm<SchoolFormData>();

  const loadSchools = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const response = await api.get<School[]>("/schools");
      setSchools(response.data);
    } catch {
      setSchools([]);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSchools(true);
    const intervalId = window.setInterval(() => loadSchools(), 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setEditingSchool(null);
      form.resetFields();
      form.setFieldValue("country", "RDC");
      setIsDrawerOpen(true);
    }
  }, [searchParams]);

  const filteredSchools = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return schools;
    return schools.filter((school) =>
      [school.name, school.code, school.city].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [query, schools]);

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditingSchool(null);
    form.resetFields();
    setSearchParams({});
  };

  const openCreateDrawer = () => {
    setEditingSchool(null);
    form.resetFields();
    form.setFieldValue("country", "RDC");
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (school: School) => {
    setEditingSchool(school);
    form.setFieldsValue({
      name: school.name,
      code: school.code,
      address: school.address,
      phone: school.phone,
      email: school.email,
      directorId: school.directorId,
      city: school.city,
      country: school.country,
    });
    setIsDrawerOpen(true);
  };

  const handleSubmitSchool = async (values: SchoolFormData) => {
    const payload = {
      name: values.name,
      code: values.code,
      address: values.address,
      phone: values.phone,
      email: values.email,
      isActive: true,
    };

    setIsSaving(true);
    try {
      if (editingSchool) {
        await api.patch(`/schools/${editingSchool.id}`, payload);
        message.success(`${values.name} a été modifiée avec succès.`);
      } else {
        await api.post("/schools", payload);
        message.success(`${values.name} a été créée avec succès.`);
      }
      await loadSchools();
      closeDrawer();
    } catch {
      message.error("Enregistrement impossible. Vérifiez les doublons et les champs.");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!schoolToDelete) return;
    setIsSaving(true);
    try {
      await api.delete(`/schools/${schoolToDelete.id}`);
      await loadSchools();
      message.success(`${schoolToDelete.name} a été supprimée.`);
      setSchoolToDelete(null);
    } catch {
      message.error("Suppression impossible : cette école contient peut-être déjà des données liées.");
    } finally {
      setIsSaving(false);
    }
  };

  const columns: ColumnsType<School> = [
    {
      title: "École",
      key: "school",
      render: (_, school) => (
        <div className="schools-page__school-name">
          <span>
            <BankOutlined />
          </span>
          <div>
            <strong>{school.name}</strong>
            <Text type="secondary">{school.code}</Text>
          </div>
        </div>
      ),
    },
    { title: "Ville", dataIndex: "city", key: "city", responsive: ["sm"] },
    { title: "Contact", dataIndex: "email", key: "email", responsive: ["lg"] },
    {
      title: "Actions",
      key: "actions",
      width: 108,
      align: "right",
      render: (_, school) => (
        <div className="schools-page__actions">
          <Button
            type="text"
            shape="circle"
            aria-label={`Modifier ${school.name}`}
            title="Modifier l’école"
            icon={<EditOutlined />}
            onClick={() => openEditDrawer(school)}
          />
          <Button
            type="text"
            danger
            shape="circle"
            aria-label={`Supprimer ${school.name}`}
            title="Supprimer l’école"
            icon={<DeleteOutlined />}
            onClick={() => setSchoolToDelete(school)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="super-admin-page-shell">
      <section className="super-admin-dashboard__hero super-admin-dashboard__hero--command">
        <div className="super-admin-dashboard__hero-copy">
          <Title level={1}>Bonjour, Administrateur</Title>
        </div>
        <div className="super-admin-dashboard__hero-actions">
          <Button
            type="primary"
            className="super-admin-dashboard__add-school-button"
            icon={<PlusOutlined />}
            onClick={openCreateDrawer}
            style={{ marginRight: 8 }}
          >
            Ajouter une école
          </Button>
          <Button
            className="super-admin-dashboard__report-button"
            icon={<DownloadOutlined />}
          >
            Rapport
          </Button>
        </div>
      </section>

      <section className="schools-page">
        <Row gutter={[16, 16]} className="schools-page__stats">
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="Écoles enregistrées"
                value={schools.length}
                prefix={<BankOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="Écoles actives"
                value={schools.filter((school) => school.isActive).length}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: "#389e0d" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="Villes couvertes"
                value={new Set(schools.map((school) => school.city)).size}
                prefix={<EnvironmentOutlined />}
                valueStyle={{ color: "#1565c0" }}
              />
            </Card>
          </Col>
        </Row>

        <Card
          className="schools-page__list-card"
          title="Écoles"
          bordered={false}
          extra={
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Rechercher une école"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          }
        >
          <Table
            rowKey="id"
            columns={columns}
            dataSource={filteredSchools}
            loading={isLoading}
            pagination={{ pageSize: 6, showSizeChanger: false }}
            scroll={{ x: 680 }}
          />
        </Card>

        <Drawer
          title={editingSchool ? "Modifier l’école" : "Créer une école"}
          width={520}
          open={isDrawerOpen}
          onClose={closeDrawer}
          destroyOnClose
          extra={
            <Button type="primary" loading={isSaving} onClick={() => form.submit()}>
              Enregistrer
            </Button>
          }
        >
          <Text type="secondary">
            Renseignez les informations de l’établissement. Il sera activé dès
            sa création.
          </Text>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmitSchool}
            initialValues={{ country: "RDC" }}
            className="schools-page__form"
          >
            <Form.Item
              label="Nom de l'école"
              name="name"
              rules={[
                { required: true, message: "Le nom de l'école est requis." },
              ]}
            >
              <Input placeholder="Nom officiel de l'école" />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Code établissement"
                  name="code"
                  rules={[{ required: true, message: "Le code est requis." }]}
                >
                  <Input placeholder="Ex. LSM-001" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Ville"
                  name="city"
                  rules={[{ required: true, message: "La ville est requise." }]}
                >
                  <Input placeholder="Ex. Kinshasa" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              label="Adresse"
              name="address"
              rules={[{ required: true, message: "L'adresse est requise." }]}
            >
              <Input placeholder="Avenue, quartier, commune" />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Téléphone"
                  name="phone"
                  rules={[
                    { required: true, message: "Le téléphone est requis." },
                  ]}
                >
                  <Input placeholder="+243 ..." />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="E-mail"
                  name="email"
                  rules={[
                    {
                      required: true,
                      type: "email",
                      message: "Saisissez un e-mail valide.",
                    },
                  ]}
                >
                  <Input placeholder="contact@ecole.cd" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Identifiant directeur"
                  name="directorId"
                  rules={[
                    { required: true, message: "Le directeur est requis." },
                  ]}
                >
                  <Input placeholder="Ex. director-1" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Pays"
                  name="country"
                  rules={[{ required: true, message: "Le pays est requis." }]}
                >
                  <Input />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Drawer>

        <Modal
          open={Boolean(schoolToDelete)}
          title="Supprimer cette école ?"
          okText="Supprimer"
          cancelText="Annuler"
          okButtonProps={{ danger: true }}
          rootClassName="schools-page__delete-modal"
          onCancel={() => setSchoolToDelete(null)}
          confirmLoading={isSaving}
          onOk={confirmDelete}
        >
          <Text>
            Vous êtes sur le point de supprimer <strong>{schoolToDelete?.name}</strong>.
            Cette action est irréversible.
          </Text>
        </Modal>
      </section>
    </div>
  );
};

export default SchoolsPage;
