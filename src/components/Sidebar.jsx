import React from "react";

const Sidebar = ({
  sidebarLinks = [],
  renderSidebarItem,
  canReadSettings,
  selectedKey,
  setSelectedKey,
  onLogout,
  userRole,
  collapsed,
  setCollapsed,
}) => {
  return (
    <aside
      className={`h-screen ${collapsed ? "w-16" : "w-64"} fixed left-0 top-0 overflow-y-auto bg-surface-container-low dark:bg-primary flex flex-col py-6 z-50 border-r border-outline-variant/10 transition-all duration-200`}
    >
      <div className={`px-2 mb-8 flex items-center justify-between ${collapsed ? "px-2" : "px-6"}`}>
        <h1 className={`text-xl font-bold text-primary dark:text-surface font-headline ${collapsed ? "hidden" : "block"}`}>Academic Architect</h1>
        <p className={`text-xs font-semibold tracking-tight text-on-surface-variant dark:text-surface-container/70 ${collapsed ? "hidden" : "block"}`}>
          {({ STAFF: "Staff Portal", STUDENT: "Student Portal", TEACHER: "Teacher Portal", ADMISSION_DESK: "Admission Desk", STORE_KEEPER: "Store Management", TRANSPORT_MANAGER: "Transport Ops", PRINCIPAL: "Principal Portal" })[userRole] || "Admin Dashboard"}
        </p>
        <button
          className="ml-auto p-1 rounded hover:bg-surface-container-high"
          title={collapsed ? "Expand" : "Collapse"}
          onClick={() => setCollapsed((v) => !v)}
        >
          <span className="material-symbols-outlined text-lg">{collapsed ? "chevron_right" : "chevron_left"}</span>
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 px-2">
        {sidebarLinks.map((link) => renderSidebarItem(link, collapsed))}
      </nav>

      <div className={`mt-auto pt-4 border-t border-outline-variant/20 ${collapsed ? "mx-1" : "mx-4"} space-y-1`}>
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
            {!collapsed && <span className="font-headline tracking-tight">Settings</span>}
          </button>
        )}
        <button
          onClick={onLogout}
          className="w-full text-left text-on-surface-variant dark:text-surface-container/70 hover:bg-surface-container-high dark:hover:bg-primary-container/50 px-4 py-3 rounded-xl flex items-center gap-3 transition-all"
        >
          <span className="material-symbols-outlined text-xl">logout</span>
          {!collapsed && <span className="font-headline tracking-tight">Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
