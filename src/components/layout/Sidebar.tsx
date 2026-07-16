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
import LogoLoader from "../common/LogoLoader";
import brandLogo from "../../assets/logosbg.png";

const { Sider } = Layout;

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);

  const handleNavigation = (route: string) => {
    if (`${location.pathname}${location.search}` === route) return;
    setPendingRoute(route);
  };

  const handleLogout = () => {
    logout();
    handleNavigation(ROUTES.LOGIN);
  };

  const getMenuItems = () => {
    const isStudentManagementArea = location.pathname === ROUTES.STUDENTS;
    const isSchoolManagementArea = location.pathname === ROUTES.SCHOOLS;
    const isAdministrationArea =
      isStudentManagementArea || isSchoolManagementArea;
    const items: any[] = isStudentManagementArea
      ? [
          {
            key: "add-student",
            icon: <PlusCircleOutlined />,
            label: "Ajouter un élève",
            onClick: () => handleNavigation(ROUTES.STUDENTS),
          },
          {
            key: "manage-students",
            icon: <TeamOutlined />,
            label: "Gestion des élèves",
            onClick: () => handleNavigation(`${ROUTES.STUDENTS}?view=manage`),
          },
        ]
      : [
          {
            key: ROUTES.DASHBOARD,
            icon: <DashboardOutlined />,
            label: "Tableau de bord",
            onClick: () => handleNavigation(ROUTES.DASHBOARD),
          },
        ];

    if (
      (user?.role === "super_admin" || isSchoolManagementArea) &&
      !isStudentManagementArea
    ) {
      items.push({
        key: ROUTES.SCHOOLS,
        icon: <BankOutlined />,
        label: "Écoles",
        onClick: () => handleNavigation(ROUTES.SCHOOLS),
      });
    }

    if (user?.role === "super_admin" && !isAdministrationArea) {
      items.push({
        key: "super-admin-grades",
        icon: <BookOutlined />,
        label: "Gestion de cotes",
        onClick: () => handleNavigation(`${ROUTES.DASHBOARD}?workspace=grades`),
      });
    }

    if (user?.role === "director" && !isAdministrationArea) {
      items.push(
        {
          key: "students",
          icon: <UserOutlined />,
          label: "Élèves",
          onClick: () => handleNavigation(ROUTES.STUDENTS),
        },
        {
          key: "results",
          icon: <FileTextOutlined />,
          label: "Résultats",
          onClick: () => handleNavigation(ROUTES.RESULTS),
        },
        {
          key: "director-settings",
          icon: <SettingOutlined />,
          label: "Paramètres",
          onClick: () => handleNavigation(ROUTES.SETTINGS),
        },
      );
    }

    if (user?.role === "teacher" && !isAdministrationArea) {
      items.push(
        {
          key: "grades",
          icon: <BookOutlined />,
          label: "Notes",
          onClick: () => handleNavigation(ROUTES.GRADES),
        },
        {
          key: "teacher-results",
          icon: <FileTextOutlined />,
          label: "Résultats",
          onClick: () => handleNavigation(ROUTES.RESULTS),
        },
      );
    }

    if (user?.role === "student" && !isAdministrationArea) {
      items.push(
        {
          key: "student-results",
          icon: <FileTextOutlined />,
          label: "Résultats",
          onClick: () => handleNavigation(ROUTES.RESULTS),
        },
        {
          key: "bulletins",
          icon: <FileTextOutlined />,
          label: "Bulletins",
          onClick: () => handleNavigation(ROUTES.BULLETINS),
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
      {pendingRoute && (
        <LogoLoader
          onComplete={() => {
            navigate(pendingRoute);
            setPendingRoute(null);
          }}
        />
      )}
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
        <div className="sidebar-brand">
          <img src={brandLogo} alt="Points Nanga" />
        </div>
        <Menu
          mode="inline"
          selectedKeys={[
            location.pathname === ROUTES.STUDENTS
              ? location.search === "?view=manage"
                ? "manage-students"
                : "add-student"
              : location.pathname === ROUTES.DASHBOARD &&
                  location.search === "?workspace=grades"
                ? "super-admin-grades"
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
