import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layout, Menu, Button } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import {
  DashboardOutlined,
  BankOutlined,
  UserOutlined,
  BookOutlined,
  FileTextOutlined,
  SettingOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../config/constants';

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
    const items: any[] = [
      {
        key: ROUTES.DASHBOARD,
        icon: <DashboardOutlined />,
        label: 'Tableau de bord',
        onClick: () => navigate(ROUTES.DASHBOARD),
      },
    ];

    if (user?.role === 'super_admin') {
      items.push(
        {
          key: 'schools',
          icon: <BankOutlined />,
          label: 'Écoles',
          onClick: () => navigate(ROUTES.SCHOOLS),
        },
        {
          key: 'settings',
          icon: <SettingOutlined />,
          label: 'Paramètres',
          onClick: () => navigate(ROUTES.SETTINGS),
        }
      );
    }

    if (user?.role === 'director') {
      items.push(
        {
          key: 'students',
          icon: <UserOutlined />,
          label: 'Élèves',
          onClick: () => navigate(ROUTES.STUDENTS),
        },
        {
          key: 'results',
          icon: <FileTextOutlined />,
          label: 'Résultats',
          onClick: () => navigate(ROUTES.RESULTS),
        },
        {
          key: 'director-settings',
          icon: <SettingOutlined />,
          label: 'Paramètres',
          onClick: () => navigate(ROUTES.SETTINGS),
        }
      );
    }

    if (user?.role === 'teacher') {
      items.push(
        {
          key: 'grades',
          icon: <BookOutlined />,
          label: 'Notes',
          onClick: () => navigate(ROUTES.GRADES),
        },
        {
          key: 'teacher-results',
          icon: <FileTextOutlined />,
          label: 'Résultats',
          onClick: () => navigate(ROUTES.RESULTS),
        }
      );
    }

    if (user?.role === 'student') {
      items.push(
        {
          key: 'student-results',
          icon: <FileTextOutlined />,
          label: 'Résultats',
          onClick: () => navigate(ROUTES.RESULTS),
        },
        {
          key: 'bulletins',
          icon: <FileTextOutlined />,
          label: 'Bulletins',
          onClick: () => navigate(ROUTES.BULLETINS),
        }
      );
    }

    items.push({
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Déconnexion',
      onClick: handleLogout,
      danger: true,
    });

    return items;
  };

  return (
    <>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        collapsedWidth={0}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 1000,
        }}
        theme="light"
      >
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #f0f0f0' }}>
          <h2 style={{ margin: 0, color: '#1890ff', fontWeight: 'bold', fontSize: collapsed ? '16px' : '20px' }}>
            {collapsed ? 'PN' : 'PointsNanga'}
          </h2>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={getMenuItems()}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Button
        type="text"
        icon={<MenuOutlined />}
        onClick={() => setCollapsed(!collapsed)}
        style={{
          position: 'fixed',
          left: collapsed ? 16 : 266,
          top: 16,
          zIndex: 1001,
          display: collapsed ? 'block' : 'none',
          transition: 'left 0.2s',
        }}
      />
    </>
  );
};

export default Sidebar;
