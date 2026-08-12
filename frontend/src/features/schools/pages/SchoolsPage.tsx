import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BankOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EnvironmentOutlined,
  KeyOutlined,
  PlusOutlined,
  SearchOutlined,
  StopOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Input,
  Modal,
  Row,
  Statistic,
  Switch,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { api } from "../../../lib/api";
import type { School, SchoolFormData } from "../../../types";

const { Title, Text } = Typography;

const initialSchools: School[] = [];

type CreatedSchoolCredentials = {
  name: string;
  code: string;
  initialPassword: string;
};

type ResetPasswordForm = {
  password: string;
  confirmation: string;
};

const SchoolsPage = () => {
  const [schools, setSchools] = useState<School[]>(initialSchools);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [logoData, setLogoData] = useState<string | undefined>();
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [schoolToDelete, setSchoolToDelete] = useState<School | null>(null);
  const [schoolToReset, setSchoolToReset] = useState<School | null>(null);
  const [statusChangingSchoolId, setStatusChangingSchoolId] = useState<
    string | null
  >(null);
  const [createdCredentials, setCreatedCredentials] =
    useState<CreatedSchoolCredentials | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [form] = Form.useForm<SchoolFormData>();
  const [resetPasswordForm] = Form.useForm<ResetPasswordForm>();

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
    let active = true;

    const refreshSchools = () => {
      if (active) {
        void loadSchools();
      }
    };

    void loadSchools(true);
    window.addEventListener("focus", refreshSchools);
    document.addEventListener("visibilitychange", refreshSchools);

    return () => {
      active = false;
      window.removeEventListener("focus", refreshSchools);
      document.removeEventListener("visibilitychange", refreshSchools);
    };
  }, []);

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setEditingSchool(null);
      form.resetFields();
      setLogoData(undefined);
      setIsDrawerOpen(true);
    }
  }, [searchParams]);

  const filteredSchools = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return schools;
    return schools.filter((school) =>
      [school.name, school.code, school.establishmentCode, school.city].some((value) =>
        value &&
        value.toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [query, schools]);

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditingSchool(null);
    form.resetFields();
    setLogoData(undefined);
    setSearchParams({});
  };

  const openCreateDrawer = () => {
    setEditingSchool(null);
    form.resetFields();
    setLogoData(undefined);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (school: School) => {
    setEditingSchool(school);
    form.setFieldsValue({
      name: school.name,
      establishmentCode: school.establishmentCode ?? undefined,
      address: school.address,
      city: school.city,
      phone: school.phone,
      isActive: school.isActive,
    });
    setLogoData(school.logo ?? undefined);
    setIsDrawerOpen(true);
  };

  const handleSubmitSchool = async (values: SchoolFormData) => {
    const payload = {
      name: values.name,
      establishmentCode: values.establishmentCode,
      address: values.address,
      city: values.city,
      phone: values.phone,
      logo: logoData,
      isActive: editingSchool ? values.isActive !== false : true,
      ...(!editingSchool && values.password
        ? { password: values.password }
        : {}),
    };

    setIsSaving(true);
    try {
      if (editingSchool) {
        await api.patch(`/schools/${editingSchool.id}`, payload);
        message.success(`${values.name} a été modifiée avec succès.`);
      } else {
        const response = await api.post<School & { initialPassword: string }>(
          "/schools",
          payload,
        );
        setCreatedCredentials({
          name: response.data.name,
          code: response.data.code,
          initialPassword: response.data.initialPassword,
        });
        message.success(`${values.name} a été créée avec succès.`);
      }
      await loadSchools();
      closeDrawer();
    } catch (error) {
      const apiMessage = (
        error as {
          response?: {
            data?: { message?: string | string[] };
          };
        }
      ).response?.data?.message;
      message.error(
        Array.isArray(apiMessage)
          ? apiMessage.join(" ")
          : apiMessage ||
              "Enregistrement impossible. Vérifiez les champs renseignés.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoSelection = (file: File) => {
    if (!file.type.startsWith("image/")) {
      message.error("Le logo doit être une image.");
      return Upload.LIST_IGNORE;
    }
    if (file.size > 2 * 1024 * 1024) {
      message.error("Le logo ne doit pas dépasser 2 Mo.");
      return Upload.LIST_IGNORE;
    }

    const reader = new FileReader();
    reader.onload = () => setLogoData(String(reader.result));
    reader.readAsDataURL(file);
    return false;
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

  const confirmPasswordReset = async () => {
    if (!schoolToReset) return;
    const values = await resetPasswordForm.validateFields();
    setIsSaving(true);
    try {
      await api.post(
        `/schools/${schoolToReset.id}/reset-password`,
        { password: values.password },
      );
      setSchoolToReset(null);
      resetPasswordForm.resetFields();
      message.success("Le mot de passe a été réinitialisé.");
    } catch {
      message.error("La réinitialisation du mot de passe a échoué.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSchoolStatus = (school: School) => {
    const willActivate = !school.isActive;
    Modal.confirm({
      title: willActivate ? "Réouvrir cette école ?" : "Suspendre cette école ?",
      content: willActivate
        ? `${school.name} pourra de nouveau accéder à ses données et ses utilisateurs pourront se connecter.`
        : `${school.name} n’aura plus accès à ses données et ses utilisateurs seront bloqués.`,
      okText: willActivate ? "Réouvrir" : "Suspendre",
      cancelText: "Annuler",
      centered: true,
      okButtonProps: willActivate ? undefined : { danger: true },
      onOk: async () => {
        setStatusChangingSchoolId(school.id);
        try {
          const response = await api.patch<School>(
            `/schools/${school.id}/status`,
            {
              isActive: willActivate,
            },
          );
          setSchools((currentSchools) =>
            currentSchools.map((item) =>
              item.id === school.id ? { ...item, ...response.data } : item,
            ),
          );
          message.success(
            willActivate
              ? "École réouverte avec succès."
              : "École suspendue avec succès.",
          );
        } catch {
          message.error("Impossible de modifier le statut de cette école.");
        } finally {
          setStatusChangingSchoolId(null);
        }
      },
    });
  };

  const columns: ColumnsType<School> = [
    {
      title: "École",
      key: "school",
      render: (_, school) => (
        <div className="schools-page__school-name">
          <Avatar
            src={school.logo || undefined}
            icon={!school.logo ? <BankOutlined /> : undefined}
            shape="square"
          />
          <div>
            <strong>{school.name}</strong>
            <Text type="secondary">{school.code}</Text>
          </div>
        </div>
      ),
    },
    { title: "Ville", dataIndex: "city", key: "city", responsive: ["sm"] },
    {
      title: "Contact",
      dataIndex: "phone",
      key: "phone",
      responsive: ["md"],
    },
    {
      title: "Statut",
      key: "status",
      responsive: ["md"],
      render: (_, school) => (
        <Tag color={school.isActive ? "green" : "red"}>
          {school.isActive ? "Active" : "Suspendue"}
        </Tag>
      ),
    },
    {
      title: "Identifiants",
      key: "credentials",
      responsive: ["lg"],
      render: (_, school) => (
        <div>
          <Text copyable>{school.code}</Text>
        </div>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 150,
      align: "right",
      render: (_, school) => (
        <div className="schools-page__actions">
          <Button
            type="text"
            danger={school.isActive}
            shape="circle"
            loading={statusChangingSchoolId === school.id}
            aria-label={
              school.isActive
                ? `Suspendre ${school.name}`
                : `Réouvrir ${school.name}`
            }
            title={school.isActive ? "Suspendre l’école" : "Réouvrir l’école"}
            icon={
              school.isActive ? <StopOutlined /> : <CheckCircleOutlined />
            }
            onClick={() => toggleSchoolStatus(school)}
          />
          <Button
            type="text"
            shape="circle"
            aria-label={`Réinitialiser le mot de passe de ${school.name}`}
            title="Réinitialiser le mot de passe"
            icon={<KeyOutlined />}
            onClick={() => setSchoolToReset(school)}
          />
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
                  name="establishmentCode"
                >
                  <Input placeholder="Facultatif" />
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
            <Form.Item
              label="Contact de l’école"
              name="phone"
              rules={[
                {
                  required: true,
                  message: "Le numéro de téléphone est requis.",
                },
                {
                  pattern: /^[+]?[\d\s()-]{7,30}$/,
                  message: "Saisissez un numéro de téléphone valide.",
                },
              ]}
            >
              <Input placeholder="Ex. +243 000 000 000" />
            </Form.Item>
            {!editingSchool && (
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="Mot de passe de l’école"
                    name="password"
                    extra="Ce mot de passe servira à la connexion de la direction."
                    rules={[
                      {
                        required: true,
                        message: "Définissez le mot de passe de l’école.",
                      },
                      {
                        min: 8,
                        message: "Utilisez au moins 8 caractères.",
                      },
                      {
                        max: 72,
                        message: "Utilisez 72 caractères maximum.",
                      },
                    ]}
                  >
                    <Input.Password
                      autoComplete="new-password"
                      placeholder="Au moins 8 caractères"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="Confirmer le mot de passe"
                    name="passwordConfirmation"
                    dependencies={["password"]}
                    rules={[
                      {
                        required: true,
                        message: "Confirmez le mot de passe.",
                      },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          return !value || getFieldValue("password") === value
                            ? Promise.resolve()
                            : Promise.reject(
                                new Error("Les mots de passe ne correspondent pas."),
                              );
                        },
                      }),
                    ]}
                  >
                    <Input.Password
                      autoComplete="new-password"
                      placeholder="Retapez le mot de passe"
                    />
                  </Form.Item>
                </Col>
              </Row>
            )}
            {editingSchool && (
              <Form.Item
                label="Statut de l’école"
                name="isActive"
                valuePropName="checked"
                extra="Si l’école est suspendue, la direction, les titulaires et les élèves n’auront plus accès aux données de cette école."
              >
                <Switch
                  checkedChildren="Active"
                  unCheckedChildren="Suspendue"
                />
              </Form.Item>
            )}
            <Form.Item label="Logo de l’école (facultatif)">
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={handleLogoSelection}
              >
                <Button icon={<UploadOutlined />}>
                  {logoData ? "Changer le logo" : "Charger un logo"}
                </Button>
              </Upload>
              {logoData && (
                <div style={{ marginTop: 12 }}>
                  <Avatar src={logoData} shape="square" size={72} />
                  <Button
                    type="link"
                    danger
                    onClick={() => setLogoData(undefined)}
                  >
                    Retirer
                  </Button>
                </div>
              )}
            </Form.Item>
          </Form>
        </Drawer>

        <Modal
          open={Boolean(createdCredentials)}
          title="Identifiants de l’école"
          okText="J’ai enregistré les identifiants"
          cancelButtonProps={{ style: { display: "none" } }}
          closable={false}
          maskClosable={false}
          onOk={() => setCreatedCredentials(null)}
        >
          <Text>
            Conservez ces informations : le mot de passe ne sera plus affiché
            après la fermeture.
          </Text>
          <div style={{ marginTop: 20 }}>
            <Text type="secondary">École</Text>
            <Title level={5} copyable>
              {createdCredentials?.name}
            </Title>
            <Text type="secondary">Code établissement</Text>
            <Title level={4} copyable>
              {createdCredentials?.code}
            </Title>
            <Text type="secondary">Mot de passe initial</Text>
            <Title level={4} copyable>
              {createdCredentials?.initialPassword}
            </Title>
          </div>
        </Modal>

        <Modal
          open={Boolean(schoolToReset)}
          title="Définir un nouveau mot de passe"
          okText="Enregistrer le mot de passe"
          cancelText="Annuler"
          confirmLoading={isSaving}
          onCancel={() => {
            setSchoolToReset(null);
            resetPasswordForm.resetFields();
          }}
          onOk={confirmPasswordReset}
        >
          <Text>L’ancien mot de passe de <strong>{schoolToReset?.name}</strong> ne fonctionnera plus.</Text>
          <Form form={resetPasswordForm} layout="vertical" style={{ marginTop: 18 }}>
            <Form.Item name="password" label="Nouveau mot de passe" rules={[{ required: true, message: "Saisissez le nouveau mot de passe." }, { min: 8, message: "Utilisez au moins 8 caractères." }]}>
              <Input.Password autoComplete="new-password" placeholder="Au moins 8 caractères" />
            </Form.Item>
            <Form.Item
              name="confirmation"
              label="Confirmer le mot de passe"
              dependencies={["password"]}
              rules={[
                { required: true, message: "Confirmez le mot de passe." },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    return !value || getFieldValue("password") === value
                      ? Promise.resolve()
                      : Promise.reject(new Error("Les mots de passe ne correspondent pas."));
                  },
                }),
              ]}
            >
              <Input.Password autoComplete="new-password" placeholder="Retapez le mot de passe" />
            </Form.Item>
          </Form>
        </Modal>

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
