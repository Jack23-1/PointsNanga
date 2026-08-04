import { useEffect, useState } from "react";
import {
  BookOutlined,
  CheckCircleOutlined,
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
      tone: "blue",
    },
    {
      label: "Cours de la classe",
      value: data.stats.courses,
      icon: <BookOutlined />,
      tone: "violet",
    },
    {
      label: "Notes enregistrées",
      value: data.stats.gradesEntered,
      icon: <CheckCircleOutlined />,
      tone: "green",
    },
  ];

  return (
    <section className="homeroom-dashboard">
      <div className="homeroom-dashboard__stats">
        {statCards.map((item) => (
          <Card key={item.label} className={`homeroom-dashboard__stat homeroom-dashboard__stat--${item.tone}`}>
            <span className="homeroom-dashboard__stat-icon">{item.icon}</span>
            <div>
              <strong>{item.value}</strong>
              <small>{item.label}</small>
            </div>
          </Card>
        ))}
      </div>

      <GradesPage
        titularName={data.titular.name}
        schoolLogo={data.school.logo}
      />
    </section>
  );
};

export default TeacherDashboard;
