import React from "react";
import { Layout, Dropdown, Avatar, Space, Typography } from "antd";
import {
  BankOutlined,
  UserOutlined,
  LogoutOutlined,
  DownOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../hooks/useAuth";
import { getLoginRouteForRole } from "../../config/constants";

const { Header: AntHeader } = Layout;
const { Text } = Typography;

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const isDirector = user?.role === "director";
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
      className={`responsive-header${isDirector ? " director-header" : ""}`}
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
        </div>
      ) : (
        <Dropdown menu={{ items: menuItems }} placement="bottomRight">
          <Space style={{ cursor: "pointer" }}>
            <Avatar icon={<UserOutlined />} />
            <Text className="hide-on-mobile">{user?.email}</Text>
          </Space>
        </Dropdown>
      )}
    </AntHeader>
  );
};

export default Header;
