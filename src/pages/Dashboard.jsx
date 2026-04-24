import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
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
import BusManagementPage from "../modules/transport/pages/BusManagementPage";
import BussesPage from "../modules/transport/pages/BussesPage";

import RouteManagementPage from "../modules/transport/pages/RouteManagementPage";
import AssignTransportPage from "../modules/transport/pages/AssignTransportPage";
import TransportViewPage from "../modules/transport/pages/TransportViewPage";
import LiveTrackingPage from "../modules/transport/pages/LiveTrackingPage";
import BusReportPage from "../modules/transport/pages/BusReportPage";
import AllBusReportsPage from "../modules/transport/pages/AllBusReportsPage";
import DriverListingPage from "../modules/transport/pages/DriverListingPage";
import TransportExpensePage from "../modules/transport/pages/TransportExpensePage";
import TransportExpenseDashboardPage from "../modules/transport/pages/TransportExpenseDashboardPage";
import ActingDriverSalaryPage from "../modules/transport/pages/ActingDriverSalaryPage";

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
import SubjectCreationPage from "../modules/exam/pages/SubjectCreationPage";
import RollGenerationPage from "../modules/exam/pages/RollGenerationPage";
import HallCreationPage from "../modules/exam/pages/HallCreationPage";
import ExamTimetablePage from "../modules/exam/pages/ExamTimetablePage";
import SeatAllocationPage from "../modules/exam/pages/SeatAllocationPage";
import StaffDashboard from "./StaffDashboard";
import AdmissionDeskDashboard from "./AdmissionDeskDashboard";
import POSStorekeeperDashboard from "./POSStorekeeperDashboard";
import TransportManagerDashboard from "./TransportManagerDashboard";
import TeacherDashboard from "./TeacherDashboard";
import { getAdminSettings } from "../modules/settings/settings.service";
import { hasPermission, hasAnyPermission, PERMISSIONS, getCurrentUser } from "../utils/permissions";


const TRANSPORT_MANAGER_KEYS = new Set([
  "dashboard",
  "profile",
  "transport-routes",
  "transport-assign",
  "transport-view",
  "transport-live",
  "transport-report",
  "transport-all-reports",
  "transport-drivers",
  "transport-buses",
  "transport-expense",
  "transport-expense-dashboard",
  "transport-acting-driver-salary",
  "pos-transactions",
]);

const Dashboard = () => {
  const navigate = useNavigate();
  const [selectedKey, setSelectedKey] = useState("dashboard");
  const [editData, setEditData] = useState(null);
  const [feeStudentId, setFeeStudentId] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [adminSettings, setAdminSettings] = useState(null);
  const currentUser = getCurrentUser();
  const displayName = currentUser?.name || currentUser?.email || "User";
  const userRole = currentUser?.role || "STAFF";
  const isTeacher = (userRole === "STAFF" &&
    (currentUser?.designation || "").toLowerCase() === "teacher") ||
    (userRole === "STAFF" && hasPermission(PERMISSIONS.HR_LEAVE_MANAGE) && !hasPermission(PERMISSIONS.FEES_DASHBOARD) && !hasPermission(PERMISSIONS.SETTINGS_UPDATE));
  const isTeacherOrStaffSelf = isTeacher || userRole === "TEACHER" || userRole === "STAFF";

  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getAdminSettings();
        setAdminSettings(settings);
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    };
    loadSettings();
  }, []);

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
  const canHRAttendance = hasPermission(PERMISSIONS.HR_ATTENDANCE_READ) || isTeacherOrStaffSelf;
  const canHRLeave = hasPermission(PERMISSIONS.HR_LEAVE_READ) || isTeacherOrStaffSelf;
  const canHRPermission = hasPermission(PERMISSIONS.HR_PERMISSION_READ) || isTeacherOrStaffSelf;
  const canHRStatutory = hasPermission(PERMISSIONS.HR_STATUTORY_READ);
  const canHRESSL = hasPermission(PERMISSIONS.HR_ESSL_READ);
  const canHRPayroll = hasPermission(PERMISSIONS.HR_PAYROLL_READ);
  const canHRAdvanceSelf = isTeacherOrStaffSelf;

  const canPOSDashboard = hasPermission(PERMISSIONS.POS_DASHBOARD);
  const canPOSRead = hasPermission(PERMISSIONS.POS_READ);
  const canPOSManage = hasPermission(PERMISSIONS.POS_MANAGE);
  const canPOSSell = hasPermission(PERMISSIONS.POS_SELL);
  const canPOSPurchase = hasPermission(PERMISSIONS.POS_PURCHASE);
  const canDocRequest = hasPermission(PERMISSIONS.DOC_REQUEST_READ);
  const canHouseRead = hasPermission(PERMISSIONS.HOUSE_READ);
  const canExamRead = hasPermission(PERMISSIONS.EXAM_READ);
  const canExamCreate = hasPermission(PERMISSIONS.EXAM_CREATE);
  const canExamSubjectManage = hasPermission(PERMISSIONS.EXAM_SUBJECT_MANAGE);
  const canExamHallManage = hasPermission(PERMISSIONS.EXAM_HALL_MANAGE);
  const canExamTimetableManage = hasPermission(PERMISSIONS.EXAM_TIMETABLE_MANAGE);
  const canExamRollGenerate = hasPermission(PERMISSIONS.EXAM_ROLL_GENERATE);
  const canExamSeatAllocate = hasPermission(PERMISSIONS.EXAM_SEAT_ALLOCATE);
  const isTransportManager = userRole === "TRANSPORT_MANAGER";

  React.useEffect(() => {
    if (isTransportManager && !TRANSPORT_MANAGER_KEYS.has(selectedKey)) {
      setSelectedKey("dashboard");
    }
  }, [isTransportManager, selectedKey]);

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
    ...(!isTransportManager
      ? [{ key: "settings", label: "Settings", icon: <SettingOutlined />, disabled: !canReadSettings }]
      : []),
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
        { key: "admission", label: "Applications", icon: "add_circle", permission: canAdmissionRead },
        { key: "approval", label: "Approvals Queue", icon: "rule", permission: canAdmissionRead && (adminSettings?.requireApprovalForAdmission ?? true) },
        { key: "bulk-upload", label: "Bulk", icon: "upload", permission: canAdmissionRead },
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
        { key: "transport-report", label: "Bus Report", icon: "analytics", permission: canLocationRead },
        { key: "transport-all-reports", label: "All Bus Reports", icon: "summarize", permission: canLocationRead },
        { key: "transport-drivers", label: "Drivers", icon: "person", permission: canTransportRouteAccess },
        { key: "transport-buses", label: "Buses", icon: "directions_bus_filled", permission: canTransportRouteAccess },
        { key: "transport-expense", label: "Add Expense", icon: "payments", permission: canTransportRouteAccess },
        { key: "transport-expense-dashboard", label: "Expense Dashboard", icon: "analytics", permission: canTransportRouteAccess },
        { key: "transport-acting-driver-salary", label: "Acting Driver Salary", icon: "request_quote", permission: canTransportRouteAccess },
      ],
    },
    { key: "staff-management", label: "Staff", icon: "badge", permission: canStaffAccess },
    {
      key: "hr-group",
      label: "HR",
      icon: "work",
      permission: canHRDashboard || isTeacherOrStaffSelf,
      children: [
        { key: "hr-dashboard", label: "Dashboard", icon: "space_dashboard", permission: canHRDashboard && !isTeacherOrStaffSelf },
        { key: "hr-attendance", label: "My Attendance", icon: "schedule", permission: canHRAttendance },
        { key: "hr-leaves", label: "My Leaves", icon: "event_busy", permission: canHRLeave },
        { key: "hr-permission", label: "Permission", icon: "timer", permission: canHRPermission },
        { key: "hr-pf-esi", label: "PF & ESI", icon: "account_balance", permission: canHRStatutory && !isTeacherOrStaffSelf },
        { key: "hr-essl", label: "ESSL Sync", icon: "fingerprint", permission: canHRESSL && !isTeacherOrStaffSelf },
        { key: "hr-payroll", label: "My Payslip", icon: "payments", permission: canHRPayroll || isTeacherOrStaffSelf },
        { key: "hr-advance", label: "Advance / Loan", icon: "request_quote", permission: canHRPayroll || canHRAdvanceSelf },
        { key: "hr-salary-abstract", label: "Salary Abstract", icon: "summarize", permission: canHRPayroll && !isTeacherOrStaffSelf },
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
    {
      key: "exam-group",
      label: "Exams",
      icon: "school",
      permission: canExamRead || canExamCreate || canExamSubjectManage || canExamHallManage || canExamTimetableManage || canExamRollGenerate || canExamSeatAllocate,
      children: [
        { key: "exam-subjects", label: "Subject Creation", icon: "menu_book", permission: canExamSubjectManage || canExamCreate },
        { key: "exam-rolls", label: "Auto Roll Generation", icon: "badge", permission: canExamRollGenerate },
        { key: "exam-halls", label: "Hall Creation", icon: "meeting_room", permission: canExamHallManage },
        { key: "exam-timetable", label: "Exam Timetable", icon: "event_note", permission: canExamTimetableManage },
        { key: "exam-seats", label: "Seat Allocation", icon: "airline_seat_recline_normal", permission: canExamSeatAllocate || canExamRead },
      ],
    },
  ];

  const visibleSidebarLinks = isTransportManager
    ? sidebarLinks.filter((link) => link.key === "dashboard" || link.key === "transport-group")
    : sidebarLinks;

  const isChildSelected = (children) => children?.some((c) => c.key === selectedKey);

  const toggleGroup = (groupKey) => {
    setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const getRoleDashboard = () => {
    const nav = (key) => setSelectedKey(key);
    if (userRole === "TEACHER" || isTeacher) return <TeacherDashboard onNavigate={nav} />;
    if (userRole === "STAFF") return <StaffDashboard onNavigate={nav} />;
    if (userRole === "ADMISSION_DESK") return <AdmissionDeskDashboard onNavigate={nav} />;
    if (userRole === "STORE_KEEPER") return <POSStorekeeperDashboard onNavigate={nav} />;
    if (userRole === "TRANSPORT_MANAGER") return <TransportManagerDashboard onNavigate={nav} />;
    // Permission-based fallback for non-role-specific users
    if (hasAnyPermission([PERMISSIONS.ADMISSION_READ, PERMISSIONS.ADMISSION_CREATE]) && !hasPermission(PERMISSIONS.FEES_DASHBOARD) && !hasPermission(PERMISSIONS.POS_DASHBOARD)) {
      return <AdmissionDeskDashboard onNavigate={nav} />;
    }
    if (hasPermission(PERMISSIONS.POS_DASHBOARD) && !hasPermission(PERMISSIONS.FEES_DASHBOARD)) {
      return <POSStorekeeperDashboard onNavigate={nav} />;
    }
    if (hasPermission(PERMISSIONS.TRANSPORT_ROUTE_READ) && !hasPermission(PERMISSIONS.FEES_DASHBOARD) && !hasPermission(PERMISSIONS.ADMISSION_READ)) {
      return <TransportManagerDashboard onNavigate={nav} />;
    }
    return <DashboardSummary onNavigate={nav} />;
  };

  const renderContent = () => {
    switch (selectedKey) {
      case "dashboard":           return getRoleDashboard();
      case "admission":           return <AdmissionPage editData={editData} clearEditData={() => setEditData(null)} />;
      case "admission-view":      return <AdmissionView onEdit={(record) => { setEditData(record); setSelectedKey("admission"); }} />;
      case "admission-edit":      return <AdmissionEdit />;
      case "bulk-upload":         return <BulkUploadPage />;
      case "promotion":           return <PromotionPage />;
      case "students":            return <StudentView 
                                          onCollectFee={(studentId) => { setFeeStudentId(studentId); setSelectedKey("fees-collect"); }} 
                                          onEdit={(record) => { setEditData(record); setSelectedKey("admission"); }}
                                        />;
      case "approval":            return <ApprovalsView />;
      case "profile":             return <ProfilePage />;
      case "admin-settings":      return isTransportManager ? getRoleDashboard() : <AdminSettings />;
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
      case "transport-report":    return <BusReportPage />;
      case "transport-all-reports": return <AllBusReportsPage />;
      case "transport-drivers":   return <DriverListingPage />;
      case "transport-buses":     return <BussesPage />;
      case "transport-expense": return <TransportExpensePage />;
      case "transport-expense-dashboard": return <TransportExpenseDashboardPage />;
      case "transport-acting-driver-salary": return <ActingDriverSalaryPage />;
      case "staff-management":    return <StaffManagementPage />;
      case "hr-dashboard":        return <HRDashboardPage onNavigate={(key) => setSelectedKey(key)} />;
      case "hr-attendance":       return <AttendancePage selfOnly={isTeacherOrStaffSelf} />;
      case "hr-leaves":           return <LeaveManagementPage selfOnly={isTeacherOrStaffSelf} />;
      case "hr-permission":       return <PermissionPage selfOnly={isTeacherOrStaffSelf} />;
      case "hr-pf-esi":           return <PFESIPage />;
      case "hr-essl":             return <ESSLSyncPage />;
      case "hr-payroll":          return <PayrollPage selfOnly={isTeacherOrStaffSelf} />;
      case "hr-advance":          return <AdvanceRequestPage selfOnly={isTeacherOrStaffSelf} />;
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
      case "exam-subjects":       return <SubjectCreationPage />;
      case "exam-rolls":          return <RollGenerationPage />;
      case "exam-halls":          return <HallCreationPage />;
      case "exam-timetable":      return <ExamTimetablePage />;
      case "exam-seats":          return <SeatAllocationPage />;
      default:                    return getRoleDashboard();
    }
  };

  const renderSidebarItem = (link, collapsed = false) => {
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
            {!collapsed && <span className="font-headline tracking-tight flex-1 text-left">{link.label}</span>}
            <span
              className="material-symbols-outlined text-base transition-transform duration-200"
              style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              expand_more
            </span>
          </button>

          {isExpanded && (
            <div className={`ml-2 mt-0.5 mb-1 space-y-0.5 border-l-2 border-primary/20 pl-2 ${collapsed ? "" : "ml-5"}`}>
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
                    {!collapsed && <span className="font-headline tracking-tight">{child.label}</span>}
                    {isActive && !collapsed && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
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
        {!collapsed && <span className="font-headline tracking-tight">{link.label}</span>}
      </button>
    );
  };

  return (
    <div className="flex bg-surface min-h-screen">
      {/* Sidebar */}
      <Sidebar
        sidebarLinks={visibleSidebarLinks}
        renderSidebarItem={renderSidebarItem}
        canReadSettings={isTransportManager ? false : canReadSettings}
        selectedKey={selectedKey}
        setSelectedKey={setSelectedKey}
        onLogout={onLogout}
        userRole={isTeacher ? "TEACHER" : userRole}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-200 ${sidebarCollapsed ? "ml-16" : "ml-64"}`}>
        {/* Header */}
        <header className={`fixed top-0 right-0 ${sidebarCollapsed ? "left-16" : "left-64"} h-16 z-40 bg-white/80 dark:bg-primary/80 backdrop-blur-md shadow-ambient flex items-center justify-between px-8 transition-all duration-200`}>
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
            <div className="h-8 w-px bg-outline-variant/30"></div>
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