import { useEffect, useMemo, useState } from "react";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  EditOutlined,
  LockOutlined,
  UnlockOutlined,
  PlusOutlined,
  ReloadOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Button, Card, DatePicker, Form, Input, Modal, Switch, Tag, message } from "antd";
import axios from "axios";
import dayjs, { type Dayjs } from "dayjs";
import { api } from "../../../lib/api";
import { useAuth } from "../../../hooks/useAuth";

interface SchoolYear {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  status: "PLANIFIEE" | "EN_COURS" | "CLOTUREE" | "ARCHIVEE";
  students: number;
  courses: number;
  homerooms: number;
  periods: number;
  periodItems: {
    id: string;
    name: string;
    number: number;
    isOpen: boolean;
  }[];
}

interface SchoolYearForm {
  label: string;
  startDate: Dayjs;
  endDate: Dayjs;
  isActive?: boolean;
}

const getError = (error: unknown) => {
  if (!axios.isAxiosError(error)) return "Opération impossible.";
  const value = error.response?.data?.message;
  return Array.isArray(value)
    ? value.join(" ")
    : typeof value === "string"
      ? value
      : "Opération impossible.";
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));

const SchoolYearsPage = () => {
  const { user } = useAuth();
  const [form] = Form.useForm<SchoolYearForm>();
  const [years, setYears] = useState<SchoolYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<SchoolYear | null>(null);
  const [periodYear, setPeriodYear] = useState<SchoolYear | null>(null);
  const [periodSavingId, setPeriodSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get<SchoolYear[]>("/school-years");
      setYears(response.data);
    } catch (error) {
      message.error(getError(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const activeYear = useMemo(
    () => years.find((year) => year.isActive),
    [years],
  );

  const createYear = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editingYear) {
        await api.patch(`/school-years/${editingYear.id}`, {
          label: values.label,
          startDate: values.startDate.format("YYYY-MM-DD"),
          endDate: values.endDate.format("YYYY-MM-DD"),
        });
        message.success("Année scolaire modifiée.");
      } else {
        await api.post("/school-years", {
          ...values,
          startDate: values.startDate.format("YYYY-MM-DD"),
          endDate: values.endDate.format("YYYY-MM-DD"),
          schoolId: Number(user?.schoolId),
          isActive: Boolean(values.isActive),
        });
        message.success("Année scolaire créée avec ses six périodes.");
      }
      setOpen(false);
      setEditingYear(null);
      form.resetFields();
      await load();
    } catch (error) {
      message.error(getError(error));
    } finally {
      setSaving(false);
    }
  };

  const editYear = (year: SchoolYear) => {
    setEditingYear(year);
    form.setFieldsValue({
      label: year.label,
      startDate: dayjs(year.startDate),
      endDate: dayjs(year.endDate),
    });
    setOpen(true);
  };

  const deleteYear = (year: SchoolYear) => {
    Modal.confirm({
      centered: true,
      className: "school-years__confirm-modal school-years__confirm-modal--danger",
      icon: <DeleteOutlined />,
      title: `Supprimer ${year.label} ?`,
      content:
        "La suppression est possible uniquement si cette année ne contient aucune donnée académique.",
      okText: "Supprimer",
      okButtonProps: { danger: true },
      cancelText: "Annuler",
      async onOk() {
        try {
          const response = await api.delete<{ deleted: boolean; requested: boolean }>(`/school-years/${year.id}`);
          message.success(
            response.data.requested
              ? "Cette année contient des données. La demande a été envoyée au super administrateur."
              : `${year.label} a été supprimée.`,
          );
          await load();
        } catch (error) {
          message.error(getError(error));
          throw error;
        }
      },
    });
  };

  const activate = (year: SchoolYear) => {
    const isReopening = year.status === "CLOTUREE";
    Modal.confirm({
      centered: true,
      className: "school-years__confirm-modal",
      icon: isReopening ? <UnlockOutlined /> : <ClockCircleOutlined />,
      title: `${isReopening ? "Rouvrir" : "Activer"} ${year.label} ?`,
      content:
        `L’année actuellement active sera clôturée. La première période de ${year.label} sera ouverte${isReopening ? " et les données existantes seront conservées" : ""}.`,
      okText: isReopening ? "Rouvrir l’année" : "Activer l’année",
      cancelText: "Annuler",
      async onOk() {
        try {
          await api.patch(`/school-years/${year.id}/activate`);
          message.success(`${year.label} est maintenant l’année active.`);
          await load();
        } catch (error) {
          message.error(getError(error));
          throw error;
        }
      },
    });
  };

  const closeYear = (year: SchoolYear) => {
    Modal.confirm({
      centered: true,
      className: "school-years__confirm-modal school-years__confirm-modal--danger",
      icon: <LockOutlined />,
      title: `Clôturer ${year.label} ?`,
      content:
        "Les périodes seront fermées et les données resteront disponibles en consultation. Cette action est définitive.",
      okText: "Clôturer définitivement",
      okButtonProps: { danger: true },
      cancelText: "Annuler",
      async onOk() {
        try {
          await api.patch(`/school-years/${year.id}/close`);
          message.success(`${year.label} a été clôturée.`);
          await load();
        } catch (error) {
          message.error(getError(error));
          throw error;
        }
      },
    });
  };

  const archiveYear = (year: SchoolYear) => {
    Modal.confirm({
      centered: true,
      className: "school-years__confirm-modal",
      icon: <DatabaseOutlined />,
      title: `Archiver ${year.label} ?`,
      content:
        "Cette année deviendra une archive consultable dans la bibliothèque académique. Elle ne pourra plus être modifiée.",
      okText: "Archiver l’année",
      cancelText: "Annuler",
      async onOk() {
        try {
          await api.patch(`/school-years/${year.id}/archive`);
          message.success(`${year.label} est maintenant archivée.`);
          await load();
        } catch (error) {
          message.error(getError(error));
          throw error;
        }
      },
    });
  };

  const togglePeriod = async (periodId: string, isOpen: boolean) => {
    if (!periodYear) return;
    setPeriodSavingId(periodId);
    try {
      await api.patch(
        `/school-years/${periodYear.id}/periods/${periodId}`,
        { isOpen },
      );
      setPeriodYear((current) =>
        current
          ? {
              ...current,
              periodItems: current.periodItems.map((period) => ({
                ...period,
                isOpen: period.id === periodId ? isOpen : period.isOpen,
              })),
            }
          : current,
      );
      message.success(isOpen ? "Période ouverte." : "Période fermée.");
      await load();
    } catch (error) {
      message.error(getError(error));
    } finally {
      setPeriodSavingId(null);
    }
  };

  return (
    <section className="school-years">
      <header className="school-years__hero">
        <div className="school-years__hero-icon"><CalendarOutlined /></div>
        <div>
          <span>Configuration académique</span>
          <h1>Années scolaires</h1>
          <p>Créez, activez et clôturez les cycles scolaires de l’établissement.</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingYear(null); form.resetFields(); setOpen(true); }}>
          Nouvelle année
        </Button>
      </header>

      <div className="school-years__summary">
        <Card><strong>{activeYear?.label ?? "Aucune"}</strong><span>Année active</span></Card>
        <Card><strong>{years.length}</strong><span>Années enregistrées</span></Card>
        <Card><strong>{activeYear?.students ?? 0}</strong><span>Élèves inscrits</span></Card>
        <Card><strong>{activeYear?.periods ?? 0}/6</strong><span>Périodes configurées</span></Card>
      </div>

      <div className="school-years__heading">
        <div><h2>Historique académique</h2><p>Une seule année peut être active à la fois.</p></div>
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>Actualiser</Button>
      </div>

      <div className="school-years__grid">
        {years.map((year) => (
          <Card key={year.id} className={`school-years__card${year.isActive ? " is-active" : ""}`}>
            <div className="school-years__card-top">
              <div className="school-years__calendar"><CalendarOutlined /></div>
              <Tag className={`school-years__status school-years__status--${year.status.toLowerCase()}`}>
                {year.status === "EN_COURS"
                  ? "En cours"
                  : year.status === "CLOTUREE"
                    ? "Clôturée"
                    : year.status === "ARCHIVEE"
                      ? "Archivée"
                      : "Planifiée"}
              </Tag>
            </div>
            <h3>{year.label}</h3>
            <p>{formatDate(year.startDate)} — {formatDate(year.endDate)}</p>
            <div className="school-years__counts">
              <span><TeamOutlined /><b>{year.students}</b> élèves</span>
              <span><CalendarOutlined /><b>{year.periods}</b> périodes</span>
              <span><CheckCircleOutlined /><b>{year.courses}</b> cours</span>
            </div>
            <div className="school-years__actions">
              <Button icon={<CalendarOutlined />} onClick={() => setPeriodYear(year)}>
                Périodes
              </Button>
              {year.status !== "ARCHIVEE" && (
                <Button type="text" icon={<EditOutlined />} onClick={() => editYear(year)}>
                  Modifier
                </Button>
              )}
              {year.status === "PLANIFIEE" && (
                <Button type="primary" icon={<ClockCircleOutlined />} onClick={() => activate(year)}>Activer</Button>
              )}
              {year.isActive && (
                <Button danger icon={<LockOutlined />} onClick={() => closeYear(year)}>Clôturer</Button>
              )}
              {year.status === "CLOTUREE" && (
                <>
                  <Button icon={<UnlockOutlined />} onClick={() => activate(year)}>
                    Rouvrir
                  </Button>
                  <Button icon={<DatabaseOutlined />} onClick={() => archiveYear(year)}>
                    Archiver
                  </Button>
                </>
              )}
              {!year.isActive && year.status !== "ARCHIVEE" && (
                <Button danger type="text" icon={<DeleteOutlined />} onClick={() => deleteYear(year)}>
                  Supprimer
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Modal
        centered
        className="school-years__editor-modal"
        title={editingYear ? "Modifier l’année scolaire" : "Créer une année scolaire"}
        open={open}
        onCancel={() => { setOpen(false); setEditingYear(null); form.resetFields(); }}
        onOk={() => void createYear()}
        confirmLoading={saving}
        okText={editingYear ? "Enregistrer" : "Créer l’année"}
        cancelText="Annuler"
      >
        <Form form={form} layout="vertical" className="school-years__form">
          <Form.Item name="label" label="Libellé" rules={[{ required: true, message: "Indiquez le libellé." }]}>
            <Input placeholder="2026-2027" />
          </Form.Item>
          <div className="school-years__date-grid">
            <Form.Item name="startDate" label="Date de début" rules={[{ required: true, message: "Date requise." }]}>
              <DatePicker
                format="DD/MM/YYYY"
                placeholder="Choisir la date"
                popupClassName="school-years__calendar-popup"
              />
            </Form.Item>
            <Form.Item name="endDate" label="Date de fin" rules={[{ required: true, message: "Date requise." }]}>
              <DatePicker
                format="DD/MM/YYYY"
                placeholder="Choisir la date"
                popupClassName="school-years__calendar-popup"
              />
            </Form.Item>
          </div>
          {!editingYear && (
            <>
              <Form.Item name="isActive" valuePropName="checked" label="Activation">
                <Switch checkedChildren="Activer maintenant" unCheckedChildren="Planifier" />
              </Form.Item>
              <p className="school-years__form-note">Les six périodes scolaires seront créées automatiquement.</p>
            </>
          )}
        </Form>
      </Modal>

      <Modal
        centered
        width={560}
        className="school-years__period-modal"
        title={periodYear ? `Périodes · ${periodYear.label}` : "Périodes"}
        open={Boolean(periodYear)}
        onCancel={() => setPeriodYear(null)}
        footer={<Button onClick={() => setPeriodYear(null)}>Fermer</Button>}
      >
        <div className="school-years__period-intro">
          <CalendarOutlined />
          <div>
            <strong>Calendrier des saisies</strong>
            <p>
              {periodYear?.isActive
                ? "Ouvrez la période pendant laquelle les titulaires peuvent saisir les cotes."
                : "Cette année doit être active pour permettre l’ouverture d’une période."}
            </p>
          </div>
        </div>
        <div className="school-years__period-list">
          {periodYear?.periodItems.map((period) => (
            <div key={period.id} className={`school-years__period-row${period.isOpen ? " is-open" : ""}`}>
              <span>{period.number}</span>
              <div>
                <strong>{period.name}</strong>
                <small>{period.isOpen ? "Saisie des cotes autorisée" : "Saisie fermée"}</small>
              </div>
              <Button
                type={period.isOpen ? "default" : "primary"}
                danger={period.isOpen}
                icon={period.isOpen ? <LockOutlined /> : <UnlockOutlined />}
                disabled={!period.isOpen && !periodYear.isActive}
                loading={periodSavingId === period.id}
                onClick={() => void togglePeriod(period.id, !period.isOpen)}
              >
                {period.isOpen ? "Fermer" : "Ouvrir"}
              </Button>
            </div>
          ))}
        </div>
      </Modal>
    </section>
  );
};

export default SchoolYearsPage;
