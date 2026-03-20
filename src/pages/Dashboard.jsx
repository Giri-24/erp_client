import React, { useState } from "react";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  DashboardOutlined,
  FileAddOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { Layout, Menu, Button, theme, Avatar, Dropdown } from "antd";

import logo from "../assets/logo.svg";
import AdmissionPage from "../modules/admission/pages/AdmissionPage";
import AdmissionView from "./AdmissionView";
import AdmissionEdit from "./AdmissionEdit";



const { Header, Sider, Content } = Layout;

const Dashboard = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKey, setSelectedKey] = useState("dashboard");

  const {
    token: { colorBgContainer },
  } = theme.useToken();

  // 🔹 User menu
  const userMenu = [
    {
      key: "1",
      label: "Profile",
      icon: <UserOutlined />,
    },
    {
      key: "2",
      label: "Logout",
      icon: <LogoutOutlined />,
    },
  ];

  // 🔥 Dynamic Renderer
  const renderContent = () => {
    switch (selectedKey) {
      case "dashboard":
        return "Welcome to the Dashboard!";
      case "admission":
        return <AdmissionPage />;
      case "admission-view":
        return <AdmissionView />;
      case "admission-edit":
        return <AdmissionEdit />;
      case "students":
        return <div>Students Page (placeholder)</div>;
      case "approval":
        return <div>Approvals Page (placeholder)</div>;
      default:
        return "Welcome to the Dashboard!";
    }
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      
      {/* 🔥 Sidebar */}
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <div style={{ textAlign: "center", padding: 16 }}>
          <img
            src={logo}
            alt="logo"
            style={{
              width: collapsed ? 40 : 80,
              transition: "0.3s",
            }}
          />
          {!collapsed && (
            <div style={{ color: "#fff", marginTop: 8, fontWeight: "bold" }}>
              School ERP
            </div>
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          onClick={(e) => setSelectedKey(e.key)}
          items={[
            {
              key: "dashboard",
              icon: <DashboardOutlined />,
              label: "Dashboard",
            },
            {
              key: "admission",
              icon: <FileAddOutlined />,
              label: "Admission Form",
            },
            {
              key: "admission-view",
              icon: <FileAddOutlined />,
              label: "Admission View",
            },
            {
              key: "admission-edit",
              icon: <FileAddOutlined />,
              label: "Admission Edit",
            },
            {
              key: "students",
              icon: <TeamOutlined />,
              label: "Students",
            },
            {
              key: "approval",
              icon: <CheckCircleOutlined />,
              label: "Approvals",
            },
          ]}
        />
      </Sider>

      {/* 🔥 Main Layout */}
      <Layout>
        
        {/* 🔹 Header */}
        <Header
          style={{
            padding: "0 16px",
            background: colorBgContainer,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 18 }}
          />

          <Dropdown menu={{ items: userMenu }}>
            <div style={{ cursor: "pointer", display: "flex", gap: 10 }}>
              <Avatar icon={<UserOutlined />} />
              {!collapsed && <span>Admin</span>}
            </div>
          </Dropdown>
        </Header>

        {/* 🔹 Content */}
        <Content
          style={{
            margin: "16px",
            padding: "20px",
            background: "#fff",
            borderRadius: 10,
            minHeight: 280,
          }}
        >
          {/* 🔥 Dynamic Content Here */}
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  );
};

export default Dashboard;