import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Layout, Menu, Button } from "antd";
import { MenuOutlined } from "@ant-design/icons";
import {
  DashboardOutlined,
  BankOutlined,
  UserOutlined,
  BookOutlined,
  FileTextOutlined,
  PlusCircleOutlined,
  TeamOutlined,
  SettingOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../hooks/useAuth";
import { ROUTES } from "../../config/constants";

const { Sider } = Layout;

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate(ROUTES.LOGIN);
  };

  const getMenuItems = () => {
    const isStudentManagementArea = location.pathname === ROUTES.STUDENTS;
    const isSchoolManagementArea = location.pathname === ROUTES.SCHOOLS;
    const isAdministrationArea = isStudentManagementArea || isSchoolManagementArea;
    const items: any[] = isStudentManagementArea
      ? [
          {
            key: "add-student",
            icon: <PlusCircleOutlined />,
            label: "Ajouter un élève",
            onClick: () => navigate(ROUTES.STUDENTS),
          },
          {
            key: "manage-students",
            icon: <TeamOutlined />,
            label: "Gestion des élèves",
            onClick: () => navigate(`${ROUTES.STUDENTS}?view=manage`),
          },
        ]
      : [
          {
            key: ROUTES.DASHBOARD,
            icon: <DashboardOutlined />,
            label: "Tableau de bord",
            onClick: () => navigate(ROUTES.DASHBOARD),
          },
        ];

    if ((user?.role === "super_admin" || isSchoolManagementArea) && !isStudentManagementArea) {
      items.push(
        {
          key: ROUTES.SCHOOLS,
          icon: <BankOutlined />,
          label: "Écoles",
          onClick: () => navigate(ROUTES.SCHOOLS),
        },
        {
          key: "add-school",
          icon: <PlusCircleOutlined />,
          label: "Ajouter une école",
          onClick: () => navigate(`${ROUTES.SCHOOLS}?create=1`),
        },
        {
          key: "settings",
          icon: <SettingOutlined />,
          label: "Paramètres",
          onClick: () => navigate(ROUTES.SETTINGS),
        },
      );
    }

    if (user?.role === "director" && !isAdministrationArea) {
      items.push(
        {
          key: "students",
          icon: <UserOutlined />,
          label: "Élèves",
          onClick: () => navigate(ROUTES.STUDENTS),
        },
        {
          key: "results",
          icon: <FileTextOutlined />,
          label: "Résultats",
          onClick: () => navigate(ROUTES.RESULTS),
        },
        {
          key: "director-settings",
          icon: <SettingOutlined />,
          label: "Paramètres",
          onClick: () => navigate(ROUTES.SETTINGS),
        },
      );
    }

    if (user?.role === "teacher" && !isAdministrationArea) {
      items.push(
        {
          key: "grades",
          icon: <BookOutlined />,
          label: "Notes",
          onClick: () => navigate(ROUTES.GRADES),
        },
        {
          key: "teacher-results",
          icon: <FileTextOutlined />,
          label: "Résultats",
          onClick: () => navigate(ROUTES.RESULTS),
        },
      );
    }

    if (user?.role === "student" && !isAdministrationArea) {
      items.push(
        {
          key: "student-results",
          icon: <FileTextOutlined />,
          label: "Résultats",
          onClick: () => navigate(ROUTES.RESULTS),
        },
        {
          key: "bulletins",
          icon: <FileTextOutlined />,
          label: "Bulletins",
          onClick: () => navigate(ROUTES.BULLETINS),
        },
      );
    }

    items.push({
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Déconnexion",
      onClick: handleLogout,
      danger: true,
    });

    return items;
  };

  return (
    <>
      <Sider
        width={250}
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        collapsedWidth={0}
        style={{
          overflow: "auto",
          minHeight: "100vh",
        }}
        theme="light"
      >
        <div
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <h2
            style={{
              margin: 0,
              color: "#1890ff",
              fontWeight: "bold",
              fontSize: collapsed ? "16px" : "20px",
            }}
          >
            {collapsed ? "PN" : "PointsNanga"}
          </h2>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[
            location.pathname === ROUTES.STUDENTS
              ? location.search === "?view=manage"
                ? "manage-students"
                : "add-student"
              : location.search === "?create=1"
                ? "add-school"
                : location.pathname,
          ]}
          items={getMenuItems()}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Button
        type="text"
        icon={<MenuOutlined />}
        onClick={() => setCollapsed(!collapsed)}
        className="sidebar-toggle-btn"
        style={{
          position: "fixed",
          left: 16,
          top: 16,
          zIndex: 1001,
          transition: "left 0.2s",
        }}
      />
    </>
  );
};

export default Sidebar;
