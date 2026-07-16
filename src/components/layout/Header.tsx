import React from "react";
import { Layout, Dropdown, Avatar, Space, Typography } from "antd";
import { UserOutlined, LogoutOutlined } from "@ant-design/icons";
import { useAuth } from "../../hooks/useAuth";

const { Header: AntHeader } = Layout;
const { Text } = Typography;

const Header: React.FC = () => {
  const { user, logout } = useAuth();

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
      className="responsive-header"
    >
      <Dropdown menu={{ items: menuItems }} placement="bottomRight">
        <Space style={{ cursor: "pointer" }}>
          <Avatar icon={<UserOutlined />} />
          <Text className="hide-on-mobile">{user?.email}</Text>
        </Space>
      </Dropdown>
    </AntHeader>
  );
};

export default Header;
