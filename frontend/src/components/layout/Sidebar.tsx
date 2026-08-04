import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Layout, Menu, Button, type MenuProps } from "antd";
import { MenuOutlined } from "@ant-design/icons";
import {
  DashboardOutlined,
  BankOutlined,
  UserOutlined,
  BookOutlined,
  FileTextOutlined,
  PlusCircleOutlined,
  TeamOutlined,
  ReadOutlined,
  LogoutOutlined,
  CalendarOutlined,
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
    const loginRoute =
      user?.role === "super_admin"
        ? ROUTES.SUPER_ADMIN_LOGIN
        : user?.role === "director"
          ? ROUTES.DIRECTOR_LOGIN
          : user?.role === "teacher"
            ? ROUTES.HOMEROOM_LOGIN
          : ROUTES.LOGIN;
    logout();
    handleNavigation(loginRoute);
  };

  const getMenuItems = () => {
    if (user?.role === "super_admin") {
      const isPrimarySuperAdmin = Boolean(user.hasFullAccess);
      if (!isPrimarySuperAdmin) {
        return [
          {
            key: "super-admin-grades",
            icon: <BookOutlined />,
            label: "Gestion de cotes",
            onClick: () =>
              handleNavigation(`${ROUTES.DASHBOARD}?workspace=grades`),
          },
          {
            key: "super-admin-users",
            icon: <TeamOutlined />,
            label: "Gestion des utilisateurs",
            onClick: () =>
              handleNavigation(`${ROUTES.DASHBOARD}?workspace=users`),
          },
          {
            key: "logout",
            icon: <LogoutOutlined />,
            label: "Déconnexion",
            onClick: handleLogout,
            danger: true,
          },
        ];
      }

      return [
        {
          key: ROUTES.DASHBOARD,
          icon: <DashboardOutlined />,
          label: "Tableau de bord",
          onClick: () => handleNavigation(ROUTES.DASHBOARD),
        },
        {
          key: ROUTES.SCHOOLS,
          icon: <BankOutlined />,
          label: "Écoles",
          onClick: () => handleNavigation(ROUTES.SCHOOLS),
        },
        {
          key: "super-admin-grades",
          icon: <BookOutlined />,
          label: "Gestion de cotes",
          onClick: () => handleNavigation(`${ROUTES.DASHBOARD}?workspace=grades`),
        },
        {
          key: "super-admin-users",
          icon: <TeamOutlined />,
          label: "Gestion des utilisateurs",
          onClick: () => handleNavigation(`${ROUTES.DASHBOARD}?workspace=users`),
        },
        {
          key: "logout",
          icon: <LogoutOutlined />,
          label: "Déconnexion",
          onClick: handleLogout,
          danger: true,
        },
      ];
    }

    if (user?.role === "director") {
      return [
        {
          key: ROUTES.DASHBOARD,
          icon: <DashboardOutlined />,
          label: "Tableau de bord",
          onClick: () => handleNavigation(ROUTES.DASHBOARD),
        },
        {
          key: ROUTES.STUDENTS,
          icon: <UserOutlined />,
          label: "Élèves",
          onClick: () => handleNavigation(ROUTES.STUDENTS),
        },
        {
          key: ROUTES.CLASSES,
          icon: <TeamOutlined />,
          label: "Classes",
          onClick: () => handleNavigation(ROUTES.CLASSES),
        },
        {
          key: ROUTES.TEACHERS,
          icon: <UserOutlined />,
          label: "Professeurs",
          onClick: () => handleNavigation(ROUTES.TEACHERS),
        },
        {
          key: ROUTES.COURSES,
          icon: <ReadOutlined />,
          label: "Cours",
          onClick: () => handleNavigation(ROUTES.COURSES),
        },
        {
          key: ROUTES.HOMEROOM_TEACHERS,
          icon: <TeamOutlined />,
          label: "Gestion des titulaires",
          onClick: () => handleNavigation(ROUTES.HOMEROOM_TEACHERS),
        },
        {
          key: ROUTES.SCHOOL_YEARS,
          icon: <CalendarOutlined />,
          label: "Années scolaires",
          onClick: () => handleNavigation(ROUTES.SCHOOL_YEARS),
        },
        {
          key: ROUTES.COURSE_ASSIGNMENTS,
          icon: <BookOutlined />,
          label: "Attributions cours",
          onClick: () => handleNavigation(ROUTES.COURSE_ASSIGNMENTS),
        },
        {
          key: "logout",
          icon: <LogoutOutlined />,
          label: "Déconnexion",
          onClick: handleLogout,
          danger: true,
        },
      ];
    }

    if (user?.role === "teacher") {
      return [
        {
          key: ROUTES.DASHBOARD,
          icon: <BookOutlined />,
          label: "Notes",
          onClick: () => handleNavigation(ROUTES.DASHBOARD),
        },
        {
          key: "logout",
          icon: <LogoutOutlined />,
          label: "Déconnexion",
          onClick: handleLogout,
          danger: true,
        },
      ];
    }

    const isStudentManagementArea = location.pathname === ROUTES.STUDENTS;
    const isSchoolManagementArea = location.pathname === ROUTES.SCHOOLS;
    const isAdministrationArea =
      isStudentManagementArea || isSchoolManagementArea;
    const items: NonNullable<MenuProps["items"]> = isStudentManagementArea
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

    if (isSchoolManagementArea && !isStudentManagementArea) {
      items.push({
        key: ROUTES.SCHOOLS,
        icon: <BankOutlined />,
        label: "Écoles",
        onClick: () => handleNavigation(ROUTES.SCHOOLS),
      });
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
          className="sidebar-route-loader"
          transparent
          duration={2000}
          label="Chargement..."
          onComplete={() => {
            navigate(pendingRoute);
            setPendingRoute(null);
          }}
        />
      )}
      <Sider
        className={`app-sidebar app-sidebar--${user?.role ?? "guest"}${
          user?.role === "director" ? " director-sidebar" : ""
        }`}
        width={285}
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
        <div className="sidebar-context">
          <span>Espace de travail</span>
          <strong>
            {user?.role === "super_admin"
              ? "Super administration"
              : user?.role === "director"
                ? "Direction"
                : user?.role === "teacher"
                  ? "Enseignement"
                  : "Portail étudiant"}
          </strong>
        </div>
        <Menu
          className="sidebar-navigation"
          mode="inline"
          selectedKeys={[
            user?.role !== "director" && location.pathname === ROUTES.STUDENTS
              ? location.search === "?view=manage"
                ? "manage-students"
                : "add-student"
              : location.pathname === ROUTES.DASHBOARD &&
                  location.search === "?workspace=grades"
                ? "super-admin-grades"
                : location.pathname === ROUTES.DASHBOARD &&
                    location.search === "?workspace=users"
                  ? "super-admin-users"
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
