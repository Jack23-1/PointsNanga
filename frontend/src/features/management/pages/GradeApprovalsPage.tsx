import { useEffect, useMemo, useState } from "react";
import { AuditOutlined, CheckCircleOutlined, ReloadOutlined, UnlockOutlined } from "@ant-design/icons";
import { Button, Card, Input, Modal, Space, Table, Tag, Typography, message } from "antd";
import axios from "axios";
import { api } from "../../../lib/api";

type SubmissionStatus = "SUBMITTED" | "APPROVED" | "REOPENED";

interface GradeSubmission {
  id: string;
  className: string;
  teacherName: string;
  periodName: string;
  submittedAt: string;
  status: SubmissionStatus;
}

const getError = (error: unknown) =>
  axios.isAxiosError(error) && typeof error.response?.data?.message === "string"
    ? error.response.data.message
    : "Opération impossible.";

export default function GradeApprovalsPage() {
  const [items, setItems] = useState<GradeSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try { setItems((await api.get<GradeSubmission[]>("/grade-submissions")).data); }
    catch (error) { message.error(getError(error)); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener("grade-submissions-updated", refresh);
    return () => window.removeEventListener("grade-submissions-updated", refresh);
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    return items.filter((item) => !query || `${item.teacherName} ${item.className} ${item.periodName}`.toLocaleLowerCase("fr").includes(query));
  }, [items, search]);

  const act = (item: GradeSubmission, action: "approve" | "reopen") => {
    const approve = action === "approve";
    Modal.confirm({
      centered: true,
      icon: approve ? <CheckCircleOutlined /> : <UnlockOutlined />,
      title: approve ? `Approuver les cotes de ${item.className} ?` : `Ouvrir la grille de ${item.className} ?`,
      content: approve
        ? `Les cotes de ${item.periodName} seront officiellement approuvées et resteront verrouillées.`
        : `Le titulaire pourra de nouveau modifier les cotes de ${item.periodName}, puis devra les soumettre à nouveau.`,
      okText: approve ? "Approuver la grille" : "Ouvrir la grille",
      cancelText: "Annuler",
      async onOk() {
        try {
          await api.patch(`/grade-submissions/${item.id}/${action}`);
          message.success(approve ? "Grille approuvée." : "Grille ouverte pour correction.");
          await load();
        } catch (error) { message.error(getError(error)); throw error; }
      },
    });
  };

  return (
    <section className="grade-approvals-page">
      <Card
        title={<Space><AuditOutlined /><span>Cotes et approbation</span></Space>}
        extra={<Button icon={<ReloadOutlined />} onClick={() => void load()}>Actualiser</Button>}
      >
        <Typography.Paragraph type="secondary">
          Approuvez les grilles envoyées par les titulaires ou rouvrez une grille approuvée pour permettre une correction.
        </Typography.Paragraph>
        <Input.Search value={search} onChange={(event) => setSearch(event.target.value)} allowClear placeholder="Titulaire, classe ou période..." style={{ maxWidth: 420, marginBottom: 18 }} />
        <Table
          rowKey="id"
          loading={loading}
          dataSource={filtered}
          pagination={false}
          columns={[
            { title: "N°", width: 65, render: (_value, _item, index) => index + 1 },
            { title: "Titulaire", dataIndex: "teacherName" },
            { title: "Classe", dataIndex: "className" },
            { title: "Période", dataIndex: "periodName" },
            { title: "Envoyée le", render: (_, item) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.submittedAt)) },
            { title: "Statut", render: (_, item) => <Tag color={item.status === "SUBMITTED" ? "gold" : item.status === "APPROVED" ? "green" : "blue"}>{item.status === "SUBMITTED" ? "À APPROUVER" : item.status === "APPROVED" ? "APPROUVÉE" : "OUVERTE"}</Tag> },
            { title: "Action", align: "right", render: (_, item) => item.status === "SUBMITTED" ? <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => act(item, "approve")}>Approuver</Button> : item.status === "APPROVED" ? <Button icon={<UnlockOutlined />} onClick={() => act(item, "reopen")}>Ouvrir la grille</Button> : <Tag color="processing">Correction autorisée</Tag> },
          ]}
        />
      </Card>
    </section>
  );
}
