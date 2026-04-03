import React, { useState } from "react";
import { Avatar, Dropdown, Modal } from "antd";
import { useNavigate } from "react-router-dom";
import {
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
} from "@ant-design/icons";

import logo from "../assets/logo.jpeg";
import AdmissionPage from "../modules/admission/pages/AdmissionPage";
import AdmissionView from "./AdmissionView";
import AdmissionEdit from "./AdmissionEdit";
import StudentView from "./StudentView";
import DashboardSummary from "./DashboardSummary";
import ProfilePage from "../modules/profile/pages/ProfilePage";

import FeeStructurePage from "../modules/fees/pages/FeeStructurePage";
import AssignFeePage from "../modules/fees/pages/AssignFeePage";
import CollectPaymentPage from "../modules/fees/pages/CollectPaymentPage";
import FeesDashboardPage from "../modules/fees/pages/FeesDashboardPage";
import FeesViewPage from "../modules/fees/pages/FeesViewPage";
import RefundCancellationReportPage from "../modules/fees/pages/RefundCancellationReportPage";
import StudentFeeLedgerPage from "../modules/fees/pages/StudentFeeLedgerPage";
import ClassFeeSummaryPage from "../modules/fees/pages/ClassFeeSummaryPage";
import KitIssuePage from "../modules/fees/pages/KitIssuePage";

import RouteManagementPage from "../modules/transport/pages/RouteManagementPage";
import AssignTransportPage from "../modules/transport/pages/AssignTransportPage";
import TransportViewPage from "../modules/transport/pages/TransportViewPage";
import LiveTrackingPage from "../modules/transport/pages/LiveTrackingPage";

import StaffManagementPage from "../modules/staff/pages/StaffManagementPage";
import ApprovalsView from "./ApprovalsView";
import AdminSettings from "./AdminSettings";
import BulkUploadPage from "../modules/admission/pages/BulkUploadPage";
import PromotionPage from "../modules/admission/pages/PromotionPage";

import HRDashboardPage from "../modules/hr/pages/HRDashboardPage";
import AttendancePage from "../modules/hr/pages/AttendancePage";
import LeaveManagementPage from "../modules/hr/pages/LeaveManagementPage";
import PermissionPage from "../modules/hr/pages/PermissionPage";
import PFESIPage from "../modules/hr/pages/PFESIPage";
import ESSLSyncPage from "../modules/hr/pages/ESSLSyncPage";
import PayrollPage from "../modules/hr/pages/PayrollPage";
import AdvanceRequestPage from "../modules/hr/pages/AdvanceRequestPage";
import SalaryAbstractPage from "../modules/hr/pages/SalaryAbstractPage";

import POSDashboardPage from "../modules/pos/pages/POSDashboardPage";
import StoreItemsPage from "../modules/pos/pages/StoreItemsPage";
import SalesPage from "../modules/pos/pages/SalesPage";
import PurchasesPage from "../modules/pos/pages/PurchasesPage";
import StockTransferPage from "../modules/pos/pages/StockTransferPage";
import StaffAllowancePage from "../modules/pos/pages/StaffAllowancePage";
import IncomeExpensePage from "../modules/pos/pages/IncomeExpensePage";
import DocRequestPage from "../modules/doc-request/pages/DocRequestPage";
import HouseManagementPage from "../modules/house/pages/HouseManagementPage";
import StaffDashboard from "./StaffDashboard";

import { hasPermission, PERMISSIONS, getCurrentUser } from "../utils/permissions";

const Dashboard = () => {
  const navigate = useNavigate();
  const [selectedKey, setSelectedKey] = useState("dashboard");
  const [editData, setEditData] = useState(null);
  const [feeStudentId, setFeeStudentId] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const currentUser = getCurrentUser();
  const displayName = currentUser?.name || currentUser?.email || "User";
  const userRole = currentUser?.role || "STAFF";

  const canAdmissionRead = hasPermission(PERMISSIONS.ADMISSION_READ);
  const canStudentRead = hasPermission(PERMISSIONS.STUDENT_READ);
  const canFeesDashboard = hasPermission(PERMISSIONS.FEES_DASHBOARD);
  const canFeesStructureAccess = hasPermission(PERMISSIONS.FEES_STRUCTURE_READ);
  const canFeesAssign = hasPermission(PERMISSIONS.FEES_ASSIGN);
  const canFeesCollect = hasPermission(PERMISSIONS.FEES_COLLECT);
  const canFeesRead = hasPermission(PERMISSIONS.FEES_READ);
  const canReportsRead = hasPermission(PERMISSIONS.REPORTS_READ);
  const canTransportRouteAccess = hasPermission(PERMISSIONS.TRANSPORT_ROUTE_READ);
  const canTransportAssign = hasPermission(PERMISSIONS.TRANSPORT_ASSIGN);
  const canTransportRead = hasPermission(PERMISSIONS.TRANSPORT_READ);
  const canLocationRead = hasPermission(PERMISSIONS.LOCATION_READ);
  const canStaffAccess = hasPermission(PERMISSIONS.STAFF_READ);
  const canReadSettings = hasPermission(PERMISSIONS.SETTINGS_READ);

  const canHRDashboard = hasPermission(PERMISSIONS.HR_DASHBOARD);
  const canHRAttendance = hasPermission(PERMISSIONS.HR_ATTENDANCE_READ);
  const canHRLeave = hasPermission(PERMISSIONS.HR_LEAVE_READ);
  const canHRPermission = hasPermission(PERMISSIONS.HR_PERMISSION_READ);
  const canHRStatutory = hasPermission(PERMISSIONS.HR_STATUTORY_READ);
  const canHRESSL = hasPermission(PERMISSIONS.HR_ESSL_READ);
  const canHRPayroll = hasPermission(PERMISSIONS.HR_PAYROLL_READ);

  const canPOSDashboard = hasPermission(PERMISSIONS.POS_DASHBOARD);
  const canPOSRead = hasPermission(PERMISSIONS.POS_READ);
  const canPOSManage = hasPermission(PERMISSIONS.POS_MANAGE);
  const canPOSSell = hasPermission(PERMISSIONS.POS_SELL);
  const canPOSPurchase = hasPermission(PERMISSIONS.POS_PURCHASE);
  const canDocRequest = hasPermission(PERMISSIONS.DOC_REQUEST_READ);
  const canHouseRead = hasPermission(PERMISSIONS.HOUSE_READ);

  const onLogout = () => {
    Modal.confirm({
      title: "Confirm Logout",
      content: "Are you sure you want to logout?",
      okText: "Logout",
      okButtonProps: { danger: true },
      onOk: () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/");
      },
    });
  };

  const onUserMenuClick = ({ key }) => {
    if (key === "profile") setSelectedKey("profile");
    else if (key === "settings") setSelectedKey("admin-settings");
    else if (key === "logout") onLogout();
  };

  const userMenu = [
    { key: "profile", label: "My Profile", icon: <UserOutlined /> },
    { key: "settings", label: "Settings", icon: <SettingOutlined />, disabled: !canReadSettings },
    { type: "divider" },
    { key: "logout", label: "Logout", icon: <LogoutOutlined />, danger: true },
  ];

  const sidebarLinks = [
    { key: "dashboard", label: "Dashboard", icon: "dashboard", permission: true },
    {
      key: "admission-group",
      label: "Admissions",
      icon: "person_add",
      permission: canAdmissionRead,
      children: [
        { key: "admission-view", label: "All Admissions", icon: "list_alt", permission: canAdmissionRead },
        { key: "admission", label: "New Application", icon: "add_circle", permission: canAdmissionRead },
        { key: "approval", label: "Approvals Queue", icon: "rule", permission: canAdmissionRead },
        { key: "bulk-upload", label: "Bulk Upload", icon: "upload", permission: canAdmissionRead },
        { key: "promotion", label: "Student Promotion", icon: "swap_horiz", permission: canAdmissionRead },
      ],
    },
    { key: "students", label: "Students", icon: "group", permission: canStudentRead },
    {
      key: "fees-group",
      label: "Fees",
      icon: "payments",
      permission: canFeesDashboard,
      children: [
        { key: "fees-dashboard", label: "Dashboard", icon: "space_dashboard", permission: canFeesDashboard },
        { key: "fees-structure", label: "Fee Structure", icon: "list_alt", permission: canFeesStructureAccess },
        { key: "fees-assign", label: "Assign Fees", icon: "assignment", permission: canFeesAssign },
        { key: "fees-view", label: "All Fees", icon: "receipt_long", permission: canFeesRead },
        { key: "fees-collect", label: "Collect Payment", icon: "point_of_sale", permission: canFeesCollect },
        { key: "fees-refund-report", label: "Refund Report", icon: "undo", permission: canReportsRead },
        { key: "fees-ledger", label: "Student Ledger", icon: "menu_book", permission: canFeesDashboard },
        { key: "fees-class-summary", label: "Class Summary", icon: "analytics", permission: canFeesDashboard },
        { key: "fees-kit-issue", label: "Kit / Book Issue", icon: "inventory_2", permission: canFeesAssign },
      ],
    },
    {
      key: "transport-group",
      label: "Transport",
      icon: "directions_bus",
      permission: canTransportRouteAccess,
      children: [
        { key: "transport-routes", label: "Routes", icon: "route", permission: canTransportRouteAccess },
        { key: "transport-assign", label: "Assign Transport", icon: "transfer_within_a_station", permission: canTransportAssign },
        { key: "transport-view", label: "View Transport", icon: "manage_search", permission: canTransportRead },
        { key: "transport-live", label: "Live Tracking", icon: "location_on", permission: canLocationRead },
      ],
    },
    { key: "staff-management", label: "Staff", icon: "badge", permission: canStaffAccess },
    {
      key: "hr-group",
      label: "HR",
      icon: "work",
      permission: canHRDashboard,
      children: [
        { key: "hr-dashboard", label: "Dashboard", icon: "space_dashboard", permission: canHRDashboard },
        { key: "hr-attendance", label: "Attendance", icon: "schedule", permission: canHRAttendance },
        { key: "hr-leaves", label: "Leaves", icon: "event_busy", permission: canHRLeave },
        { key: "hr-permission", label: "Permission", icon: "timer", permission: canHRPermission },
        { key: "hr-pf-esi", label: "PF & ESI", icon: "account_balance", permission: canHRStatutory },
        { key: "hr-essl", label: "ESSL Sync", icon: "fingerprint", permission: canHRESSL },
        { key: "hr-payroll", label: "Payroll", icon: "payments", permission: canHRPayroll },
        { key: "hr-advance", label: "Advance / Loan", icon: "request_quote", permission: canHRPayroll },
        { key: "hr-salary-abstract", label: "Salary Abstract", icon: "summarize", permission: canHRPayroll },
      ],
    },
    {
      key: "pos-group",
      label: "Store / POS",
      icon: "storefront",
      permission: canPOSDashboard || canPOSRead,
      children: [
        { key: "pos-dashboard", label: "Dashboard", icon: "space_dashboard", permission: canPOSDashboard || canPOSRead },
        { key: "pos-items", label: "Items & Stores", icon: "inventory_2", permission: canPOSRead },
        { key: "pos-sales", label: "Sales (POS)", icon: "point_of_sale", permission: canPOSSell },
        { key: "pos-purchases", label: "Purchases", icon: "add_shopping_cart", permission: canPOSPurchase },
        { key: "pos-transfers", label: "Stock & Transfer", icon: "swap_horiz", permission: canPOSManage },
        { key: "pos-teacher-allowance", label: "Staff Allowance", icon: "redeem", permission: canPOSManage },
        { key: "pos-transactions", label: "Income / Expense", icon: "receipt_long", permission: canPOSManage },
      ],
    },
    {
      key: "doc-group",
      label: "Documents",
      icon: "description",
      permission: canDocRequest,
      children: [
        { key: "doc-requests", label: "Issue Desk", icon: "assignment", permission: canDocRequest },
      ],
    },
    {
      key: "house-group",
      label: "Houses",
      icon: "real_estate_agent",
      permission: canHouseRead,
      children: [
        { key: "house-management", label: "House Management", icon: "groups", permission: canHouseRead },
      ],
    },
  ];

  const isChildSelected = (children) => children?.some((c) => c.key === selectedKey);

  const toggleGroup = (groupKey) => {
    setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const renderContent = () => {
    switch (selectedKey) {
      case "dashboard":           return userRole === "STAFF" ? <StaffDashboard onNavigate={(key) => setSelectedKey(key)} /> : <DashboardSummary onNavigate={(key) => setSelectedKey(key)} />;
      case "admission":           return <AdmissionPage editData={editData} clearEditData={() => setEditData(null)} />;
      case "admission-view":      return <AdmissionView onEdit={(record) => { setEditData(record); setSelectedKey("admission"); }} />;
      case "admission-edit":      return <AdmissionEdit />;
      case "bulk-upload":         return <BulkUploadPage />;
      case "promotion":           return <PromotionPage />;
      case "students":            return <StudentView onCollectFee={(studentId) => { setFeeStudentId(studentId); setSelectedKey("fees-collect"); }} />;
      case "approval":            return <ApprovalsView />;
      case "profile":             return <ProfilePage />;
      case "admin-settings":      return <AdminSettings />;
      case "fees-structure":      return <FeeStructurePage />;
      case "fees-assign":         return <AssignFeePage initialStudentId={feeStudentId} onMounted={() => setFeeStudentId(null)} />;
case "fees-collect":
  return <CollectPaymentPage studentId={feeStudentId} />;      case "fees-dashboard":      return <FeesDashboardPage />;
      case "fees-view":           return <FeesViewPage />;
      case "fees-refund-report":  return <RefundCancellationReportPage />;
      case "fees-ledger":          return <StudentFeeLedgerPage />;
      case "fees-class-summary":   return <ClassFeeSummaryPage />;
      case "fees-kit-issue":        return <KitIssuePage />;
      case "transport-routes":    return <RouteManagementPage />;
      case "transport-assign":    return <AssignTransportPage />;
      case "transport-view":      return <TransportViewPage />;
      case "transport-live":      return <LiveTrackingPage />;
      case "staff-management":    return <StaffManagementPage />;
      case "hr-dashboard":        return <HRDashboardPage onNavigate={(key) => setSelectedKey(key)} />;
      case "hr-attendance":       return <AttendancePage />;
      case "hr-leaves":           return <LeaveManagementPage />;
      case "hr-permission":       return <PermissionPage />;
      case "hr-pf-esi":           return <PFESIPage />;
      case "hr-essl":             return <ESSLSyncPage />;
      case "hr-payroll":          return <PayrollPage />;
      case "hr-advance":          return <AdvanceRequestPage />;
      case "hr-salary-abstract":  return <SalaryAbstractPage />;
      case "pos-dashboard":       return <POSDashboardPage onNavigate={(key) => setSelectedKey(key)} />;
      case "pos-items":           return <StoreItemsPage />;
      case "pos-sales":           return <SalesPage />;
      case "pos-purchases":       return <PurchasesPage />;
      case "pos-transfers":       return <StockTransferPage />;
      case "pos-teacher-allowance": return <StaffAllowancePage />;
      case "pos-transactions":    return <IncomeExpensePage />;
      case "doc-requests":        return <DocRequestPage />;
      case "house-management":    return <HouseManagementPage />;
      default:                    return userRole === "STAFF" ? <StaffDashboard onNavigate={(key) => setSelectedKey(key)} /> : <DashboardSummary onNavigate={(key) => setSelectedKey(key)} />;
    }
  };

  const renderSidebarItem = (link) => {
    if (!link.permission) return null;

    // Group with children (accordion)
    if (link.children) {
      const childSelected = isChildSelected(link.children);
      const isExpanded = expandedGroups[link.key] !== undefined
        ? expandedGroups[link.key]
        : childSelected;

      return (
        <div key={link.key}>
          <button
            onClick={() => toggleGroup(link.key)}
            className={`w-full text-left mx-2 px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${
              childSelected
                ? "text-primary dark:text-surface font-semibold bg-surface-container-high/50 dark:bg-primary-container/30"
                : "text-on-surface-variant dark:text-surface-container/70 hover:bg-surface-container-high dark:hover:bg-primary-container/50"
            }`}
          >
            <span className="material-symbols-outlined text-xl">{link.icon}</span>
            <span className="font-headline tracking-tight flex-1 text-left">{link.label}</span>
            <span
              className="material-symbols-outlined text-base transition-transform duration-200"
              style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              expand_more
            </span>
          </button>

          {isExpanded && (
            <div className="ml-5 mt-0.5 mb-1 space-y-0.5 border-l-2 border-primary/20 pl-2">
              {link.children.map((child) => {
                if (!child.permission) return null;
                const isActive = selectedKey === child.key;
                return (
                  <button
                    key={child.key}
                    onClick={() => {
                      if (child.key === "admission") setEditData(null);
                      setSelectedKey(child.key);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition-all text-sm ${
                      isActive
                        ? "bg-white dark:bg-primary-container text-primary dark:text-surface font-semibold shadow-sm"
                        : "text-on-surface-variant dark:text-surface-container/70 hover:bg-surface-container-high dark:hover:bg-primary-container/40"
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[16px] ${isActive ? "text-primary" : ""}`}>
                      {child.icon}
                    </span>
                    <span className="font-headline tracking-tight">{child.label}</span>
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // Plain link
    const isActive = selectedKey === link.key;
    return (
      <button
        key={link.key}
        onClick={() => setSelectedKey(link.key)}
        className={`w-full text-left mx-2 px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${
          isActive
            ? "bg-white dark:bg-primary-container text-primary dark:text-surface border-l-4 border-primary dark:border-tertiary-fixed-dim font-semibold ml-0 pl-6 rounded-l-none"
            : "text-on-surface-variant dark:text-surface-container/70 hover:bg-surface-container-high dark:hover:bg-primary-container/50 sm:mx-2"
        }`}
      >
        <span className="material-symbols-outlined text-xl">{link.icon}</span>
        <span className="font-headline tracking-tight">{link.label}</span>
      </button>
    );
  };

  return (
    <div className="flex bg-surface min-h-screen">
      {/* Sidebar */}
      <aside className="h-screen w-64 fixed left-0 top-0 overflow-y-auto bg-surface-container-low dark:bg-primary flex flex-col py-6 z-50 border-r border-outline-variant/10">
        <div className="px-6 mb-8">
          <h1 className="text-xl font-bold text-primary dark:text-surface font-headline">Academic Architect</h1>
          <p className="text-xs font-semibold tracking-tight text-on-surface-variant dark:text-surface-container/70">{userRole === "STAFF" ? "Staff Portal" : userRole === "STUDENT" ? "Student Portal" : "Admin Dashboard"}</p>
        </div>

        <nav className="flex-1 space-y-0.5 px-2">
          {sidebarLinks.map((link) => renderSidebarItem(link))}
        </nav>

        <div className="mt-auto pt-4 border-t border-outline-variant/20 mx-4 space-y-1">
          {canReadSettings && (
            <button
              onClick={() => setSelectedKey("admin-settings")}
              className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${
                selectedKey === "admin-settings"
                  ? "bg-white text-primary font-semibold"
                  : "text-on-surface-variant dark:text-surface-container/70 hover:bg-surface-container-high"
              }`}
            >
              <span className="material-symbols-outlined text-xl">settings</span>
              <span className="font-headline tracking-tight">Settings</span>
            </button>
          )}
          <button
            onClick={onLogout}
            className="w-full text-left text-on-surface-variant dark:text-surface-container/70 hover:bg-surface-container-high dark:hover:bg-primary-container/50 px-4 py-3 rounded-xl flex items-center gap-3 transition-all"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
            <span className="font-headline tracking-tight">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Header */}
        <header className="fixed top-0 right-0 left-64 h-16 z-40 bg-white/80 dark:bg-primary/80 backdrop-blur-md shadow-[0_20px_40px_rgba(1,29,53,0.06)] flex items-center justify-between px-8">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-full max-w-md focus-within:ring-2 focus-within:ring-primary rounded-full transition-all">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
              <input
                className="w-full bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-0 placeholder:text-on-surface-variant/60"
                placeholder="Search applicants, ID, or status..."
                type="text"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <button className="hover:bg-surface-container-low dark:hover:bg-primary-container rounded-full p-2 transition-colors relative">
                <span className="material-symbols-outlined text-primary dark:text-surface">notifications</span>
                <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
              </button>
              <button className="hover:bg-surface-container-low dark:hover:bg-primary-container rounded-full p-2 transition-colors">
                <span className="material-symbols-outlined text-primary dark:text-surface">help_outline</span>
              </button>
            </div>
            <div className="h-8 w-[1px] bg-outline-variant/30"></div>
            <Dropdown menu={{ items: userMenu, onClick: onUserMenuClick }} trigger={["click"]}>
              <div className="flex items-center gap-3 cursor-pointer">
                <div className="text-right hidden xl:block">
                  <p className="text-xs font-bold text-primary">{displayName}</p>
                  <p className="text-[10px] text-on-surface-variant">{userRole}</p>
                </div>
                <Avatar
                  src={logo}
                  className="w-10 h-10 rounded-full object-cover border-2 border-primary-fixed shadow-sm"
                />
              </div>
            </Dropdown>
          </div>
        </header>

        <main className="mt-16 p-8 flex-1">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;