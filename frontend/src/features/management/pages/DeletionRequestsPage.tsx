import { useEffect, useState } from "react";
import { CheckOutlined, CloseOutlined, DeleteOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Card, Input, Modal, Space, Table, Tag, Typography, message } from "antd";
import axios from "axios";
import { api } from "../../../lib/api";

interface DeletionRequest {
  id: string;
  entityType: "CLASS" | "SCHOOL_YEAR";
  entityLabel: string;
  schoolName: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  dataSummary?: Record<string, number>;
  createdAt: string;
}

const errorMessage = (error: unknown) =>
  axios.isAxiosError(error) && typeof error.response?.data?.message === "string"
    ? error.response.data.message
    : "Opération impossible.";

export default function DeletionRequestsPage() {
  const [items, setItems] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setItems((await api.get<DeletionRequest[]>("/deletion-requests")).data);
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const review = (item: DeletionRequest, approved: boolean) => {
    let comment = "";
    Modal.confirm({
      centered: true,
      icon: approved ? <DeleteOutlined style={{ color: "#d4380d" }} /> : <CloseOutlined />,
      title: approved ? `Confirmer la suppression de ${item.entityLabel} ?` : `Refuser la demande ?`,
      content: (
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Typography.Text>
            {approved
              ? "Cette action supprimera définitivement toutes les données liées."
              : "L’élément et toutes ses données seront conservés."}
          </Typography.Text>
          <Input.TextArea placeholder="Commentaire (facultatif)" onChange={(event) => { comment = event.target.value; }} />
        </Space>
      ),
      okText: approved ? "Confirmer la suppression" : "Refuser",
      okButtonProps: approved ? { danger: true } : {},
      cancelText: "Annuler",
      async onOk() {
        try {
          await api.patch(`/deletion-requests/${item.id}/${approved ? "approve" : "reject"}`, { comment });
          message.success(approved ? "Suppression confirmée." : "Demande refusée.");
          await load();
        } catch (error) {
          message.error(errorMessage(error));
          throw error;
        }
      },
    });
  };

  return (
    <div className="deletion-requests-page">
      <Card
        title={<Space><DeleteOutlined /><span>Demandes de suppression</span></Space>}
        extra={<Button icon={<ReloadOutlined />} onClick={() => void load()}>Actualiser</Button>}
      >
        <Table
          rowKey="id"
          loading={loading}
          dataSource={items}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: "Élément", render: (_, row) => <><strong>{row.entityLabel}</strong><br /><Typography.Text type="secondary">{row.entityType === "CLASS" ? "Classe" : "Année scolaire"}</Typography.Text></> },
            { title: "École", dataIndex: "schoolName" },
            { title: "Données liées", render: (_, row) => Object.entries(row.dataSummary ?? {}).filter(([, value]) => value > 0).map(([key, value]) => `${key}: ${value}`).join(" · ") || "Aucune" },
            { title: "Date", render: (_, row) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.createdAt)) },
            { title: "Statut", render: (_, row) => <Tag color={row.status === "PENDING" ? "gold" : row.status === "APPROVED" ? "green" : "red"}>{row.status === "PENDING" ? "EN ATTENTE" : row.status === "APPROVED" ? "APPROUVÉE" : "REFUSÉE"}</Tag> },
            { title: "Actions", align: "right", render: (_, row) => row.status === "PENDING" ? <Space><Button icon={<CloseOutlined />} onClick={() => review(row, false)}>Refuser</Button><Button danger type="primary" icon={<CheckOutlined />} onClick={() => review(row, true)}>Confirmer</Button></Space> : null },
          ]}
        />
      </Card>
    </div>
  );
}
