import { useEffect, useState } from "react";
import {
  BookOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Button, Card, Empty, Skeleton, message } from "antd";
import axios from "axios";
import { api } from "../../../lib/api";
import GradesPage from "../../grades/pages/GradesPage";

interface HomeroomDashboardData {
  titular: { name: string; code: string };
  school: { name: string; logo?: string | null };
  class: { id: string; name: string };
  schoolYear: string;
  openPeriod: string | null;
  stats: { students: number; courses: number; gradesEntered: number };
}

const getErrorMessage = (error: unknown) => {
  if (!axios.isAxiosError(error))
    return "Chargement du tableau de bord impossible.";
  const value = error.response?.data?.message;
  return typeof value === "string"
    ? value
    : "Chargement du tableau de bord impossible.";
};

const TeacherDashboard = () => {
  const [data, setData] = useState<HomeroomDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await api.get<HomeroomDashboardData>(
        "/dashboard/homeroom",
      );
      setData(response.data);
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  if (loading && !data) {
    return (
      <section className="homeroom-dashboard">
        <Skeleton active paragraph={{ rows: 12 }} />
      </section>
    );
  }

  if (!data) {
    return (
      <Card>
        <Empty description="Les informations du titulaire sont indisponibles.">
          <Button onClick={loadDashboard}>Réessayer</Button>
        </Empty>
      </Card>
    );
  }

  const statCards = [
    {
      label: "Élèves dans ma classe",
      value: data.stats.students,
      icon: <TeamOutlined />,
    },
    {
      label: "Cours de la classe",
      value: data.stats.courses,
      icon: <BookOutlined />,
    },
    {
      label: "Notes enregistrées",
      value: data.stats.gradesEntered,
      icon: <CheckCircleOutlined />,
    },
  ];

  return (
    <section className="homeroom-dashboard">
      <header className="homeroom-dashboard__hero">
        <div>
          <span>Espace titulaire · {data.schoolYear}</span>
          <h1>Bienvenue, {data.titular.name}</h1>
          <p>
            Vous êtes titulaire de la classe <strong>{data.class.name}</strong>
            {data.openPeriod
              ? ` · Période ouverte : ${data.openPeriod}`
              : " · Aucune période n’est ouverte actuellement"}
          </p>
        </div>
        <Button icon={<ReloadOutlined />} onClick={loadDashboard}>
          Actualiser
        </Button>
      </header>

      <div className="homeroom-dashboard__stats">
        {statCards.map((item) => (
          <Card key={item.label}>
            <span className="homeroom-dashboard__stat-icon">{item.icon}</span>
            <div>
              <strong>{item.value}</strong>
              <small>{item.label}</small>
            </div>
          </Card>
        ))}
      </div>

      <GradesPage />
    </section>
  );
};

export default TeacherDashboard;
