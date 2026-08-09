import React from "react";
import { Layout } from "antd";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useAuth } from "../../hooks/useAuth";

const { Content } = Layout;

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const isStudentSpace = user?.role === "student";

  return (
    <Layout
      style={{ minHeight: "100vh" }}
      className={`main-layout${isStudentSpace ? " main-layout--student" : ""}`}
    >
      {!isStudentSpace && <Sidebar />}
      <Layout>
        <Header />
        <Content className="main-layout-content">
          <div className="main-layout-content__inner">
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
