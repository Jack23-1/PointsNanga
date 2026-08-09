import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout, Dropdown, Avatar, Badge, Button, Empty, Popover, Space, Spin, Typography } from "antd";
import {
  BankOutlined,
  UserOutlined,
  LogoutOutlined,
  DownOutlined,
  BellFilled,
  DeleteOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../hooks/useAuth";
import { API_URL, getLoginRouteForRole, ROUTES } from "../../config/constants";
import { api } from "../../lib/api";

const { Header: AntHeader } = Layout;
const { Text } = Typography;

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [deletionRequests, setDeletionRequests] = useState<Array<{
    id: string;
    entityLabel: string;
    entityType: "CLASS" | "SCHOOL_YEAR";
    schoolName: string;
    status: string;
    createdAt: string;
  }>>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [gradeSubmissions, setGradeSubmissions] = useState<Array<{
    id: string; className: string; teacherName: string; periodName: string; submittedAt: string; status: string;
  }>>([]);
  const isDirector = user?.role === "director";
  const isSuperAdmin = user?.role === "super_admin";
  const isStudent = user?.role === "student";

  useEffect(() => {
    if (!isSuperAdmin) return;
    let active = true;
    const loadNotifications = async () => {
      setNotificationsLoading(true);
      try {
        const response = await api.get<typeof deletionRequests>("/deletion-requests");
        if (active) setDeletionRequests(response.data.filter((item) => item.status === "PENDING"));
      } finally {
        if (active) setNotificationsLoading(false);
      }
    };
    void loadNotifications();
    const interval = window.setInterval(() => void loadNotifications(), 30000);
    return () => { active = false; window.clearInterval(interval); };
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!isDirector) return;
    let active = true;
    const load = async () => {
      try {
        const response = await api.get<typeof gradeSubmissions>("/grade-submissions");
        if (active) setGradeSubmissions(response.data.filter((item) => item.status === "SUBMITTED"));
      } catch { if (active) setGradeSubmissions([]); }
    };
    void load();
    const events = new EventSource(`${API_URL}/grade-submissions/events`, {
      withCredentials: true,
    });
    events.onmessage = () => {
      void load();
      window.dispatchEvent(new Event("grade-submissions-updated"));
    };
    return () => { active = false; events.close(); };
  }, [isDirector]);
  const schoolName = isDirector
    ? user?.lastName || "Votre établissement"
    : "";
  const schoolInitials = schoolName
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
  const userName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  const userInitials = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .map((value) => value?.[0]?.toUpperCase())
    .join("");

  const handleLogout = () => {
    const loginRoute = getLoginRouteForRole(user?.role);
    logout();
    window.location.href = loginRoute;
  };

  const menuItems = [
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Déconnexion",
      onClick: handleLogout,
    },
  ];

  const notificationPanel = (
    <div className="admin-notifications">
      <div className="admin-notifications__heading">
        <strong>Notifications</strong>
        <span>{deletionRequests.length} en attente</span>
      </div>
      <div className="admin-notifications__list">
        {notificationsLoading && !deletionRequests.length ? (
          <div className="admin-notifications__state"><Spin size="small" /></div>
        ) : deletionRequests.length ? deletionRequests.slice(0, 6).map((item) => (
          <button
            type="button"
            className="admin-notifications__item"
            key={item.id}
            onClick={() => navigate(ROUTES.DELETION_REQUESTS)}
          >
            <span className="admin-notifications__icon"><DeleteOutlined /></span>
            <span className="admin-notifications__copy">
              <strong>Demande de suppression</strong>
              <span><b>{item.entityLabel}</b> · {item.schoolName}</span>
              <small>{item.entityType === "CLASS" ? "Classe" : "Année scolaire"} · à vérifier</small>
            </span>
            <i aria-label="Non lue" />
          </button>
        )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Aucune nouvelle demande" />}
      </div>
      {deletionRequests.length > 0 && (
        <Button type="link" block className="admin-notifications__all" onClick={() => navigate(ROUTES.DELETION_REQUESTS)}>
          Voir et traiter toutes les demandes
        </Button>
      )}
    </div>
  );

  const gradeSubmissionPanel = (
    <div className="admin-notifications">
      <div className="admin-notifications__heading"><strong>Cotes reçues</strong><span>{gradeSubmissions.length}</span></div>
      <div className="admin-notifications__list">
        {gradeSubmissions.length ? gradeSubmissions.map((item) => (
          <div className="admin-notifications__item" key={item.id}>
            <span className="admin-notifications__icon"><BellFilled /></span>
            <span className="admin-notifications__copy">
              <strong>{item.className} · {item.periodName}</strong>
              <span>{item.teacherName} a validé les cotes</span>
              <small>{new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.submittedAt))}</small>
              <Button
                type="link"
                size="small"
                onClick={() => navigate(ROUTES.GRADE_APPROVALS)}
              >
                Voir et approuver
              </Button>
            </span>
            <i aria-label="Notification" />
          </div>
        )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Aucun envoi de cotes" />}
      </div>
    </div>
  );

  return (
    <AntHeader
      style={{
        padding: "0 18px",
        background: "#fff",
        borderBottom: "1px solid #e8eff5",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginLeft: 0,
        transition: "margin-left 0.2s",
      }}
      className={`responsive-header${isDirector ? " director-header" : ""}${isStudent ? " student-header" : ""}`}
    >
      {isDirector ? (
        <div className="director-header__content">
          <div className="director-header__school">
            <div className="director-header__school-mark" aria-hidden="true">
              {user.schoolLogo ? (
                <img
                  src={user.schoolLogo}
                  alt={`Logo de ${schoolName}`}
                />
              ) : (
                <>
                  <BankOutlined />
                  <b>{schoolInitials || "ÉC"}</b>
                </>
              )}
            </div>
            <div className="director-header__school-copy">
              <span>Portail établissement</span>
              <strong>{schoolName}</strong>
              <small>Tableau de bord directeur</small>
            </div>
          </div>
          <Space size={14}>
            <Popover content={gradeSubmissionPanel} trigger="click" placement="bottomRight" arrow={false} overlayClassName="admin-notifications-popover">
              <Badge count={gradeSubmissions.length} size="small" overflowCount={99}>
                <button type="button" className="admin-notifications__bell" aria-label="Cotes validées"><BellFilled /></button>
              </Badge>
            </Popover>
            <Dropdown menu={{ items: menuItems }} placement="bottomRight">
              <button type="button" className="director-header__account">
              <Avatar
                className="director-header__avatar"
                icon={<UserOutlined />}
              >
                {userInitials}
              </Avatar>
              <span className="director-header__account-copy">
                <strong>{userName || "Mon compte"}</strong>
                <small>{user?.email}</small>
              </span>
              <DownOutlined className="director-header__chevron" />
              </button>
            </Dropdown>
          </Space>
        </div>
      ) : (
        <Space size={14}>
          {isSuperAdmin && (
            <Popover content={notificationPanel} trigger="click" placement="bottomRight" arrow={false} overlayClassName="admin-notifications-popover">
              <Badge count={deletionRequests.length} size="small" overflowCount={99}>
                <button type="button" className="admin-notifications__bell" aria-label="Demandes de suppression">
                  <BellFilled />
                </button>
              </Badge>
            </Popover>
          )}
          <Dropdown menu={{ items: menuItems }} placement="bottomRight">
            <Space style={{ cursor: "pointer" }}>
              {!isStudent && <Avatar icon={<UserOutlined />} />}
              <Text className="hide-on-mobile">{user?.email}</Text>
            </Space>
          </Dropdown>
        </Space>
      )}
    </AntHeader>
  );
};

export default Header;
