import React from "react";
import { Layout, Dropdown, Avatar, Space, Typography } from "antd";
import { BankOutlined, UserOutlined, LogoutOutlined } from "@ant-design/icons";
import { useAuth } from "../../hooks/useAuth";

const { Header: AntHeader } = Layout;
const { Text } = Typography;

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const isDirector = user?.role === "director";
  const schoolName = isDirector
    ? user.lastName || "Votre établissement"
    : "";
  const schoolInitials = schoolName
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
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
        padding: "0 16px",
        background: "#fff",
        borderBottom: "1px solid #f0f0f0",
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        marginLeft: 0,
        transition: "margin-left 0.2s",
      }}
      className={`responsive-header${isDirector ? " director-header" : ""}`}
    >
      {isDirector ? (
        <div className="director-header__content">
          <Dropdown menu={{ items: menuItems }} placement="bottomRight">
            <Space className="director-header__account">
              <Avatar icon={<UserOutlined />} />
              <Text className="hide-on-mobile">{user?.email}</Text>
            </Space>
          </Dropdown>
          <div className="director-header__school">
            <div className="director-header__school-copy">
              <span>Portail de l’établissement</span>
              <strong>{schoolName}</strong>
              <small>Espace Direction</small>
            </div>
            <div
              className="director-header__school-logo"
              aria-label={`Logo de ${schoolName}`}
            >
              <BankOutlined aria-hidden="true" />
              <b>{schoolInitials || "ÉC"}</b>
            </div>
          </div>
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
