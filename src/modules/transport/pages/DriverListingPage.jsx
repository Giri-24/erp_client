import React, { useEffect, useMemo, useState } from "react";
import { Input, message, Tag, Drawer, Modal, Form, Select, Popconfirm } from "antd";
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { getAllDrivers, getAllTransportRoutes, getAllBuses, createDriver, updateDriver, deleteDriver } from "../transport.service";
import { usePermissionHelpers, PERMISSIONS } from "../../../utils/permissions";

const DriverListingPage = () => {
  const [drivers, setDrivers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedBus, setSelectedBus] = useState("all");
  const [selectedRoute, setSelectedRoute] = useState("all");
  const [selectedDriver, setSelectedDriver] = useState(null);

  /* ── add / edit modal state ── */
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const { hasPermission } = usePermissionHelpers();
  const canCreate = hasPermission(PERMISSIONS.TRANSPORT_ROUTE_CREATE);
  const canUpdate = hasPermission(PERMISSIONS.TRANSPORT_ROUTE_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.TRANSPORT_ROUTE_DELETE);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [driverData, routeData, busData] = await Promise.all([
        getAllDrivers(),
        getAllTransportRoutes(),
        getAllBuses(),
      ]);
      setDrivers(driverData || []);
      setRoutes(routeData || []);
      setBuses(busData || []);
    } catch {
      message.error("Failed to load drivers");
    }
    setLoading(false);
  };

/* ── small helper components ── */
const DetailSection = ({ title, children }) => (
  <div className="rounded-xl bg-surface-container-low p-4">
    <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/60 mb-3">{title}</h4>
    <div className="space-y-2.5">{children}</div>
  </div>
);

const DetailRow = ({ icon, label, value }) => (
  <div className="flex items-center gap-3 text-sm">
    <span className="material-symbols-outlined text-[18px] text-on-surface-variant/50">{icon}</span>
    <span className="text-on-surface-variant w-24 shrink-0">{label}</span>
    <span className="text-on-surface font-medium truncate">{value}</span>
  </div>
);

  useEffect(() => {
    fetchData();
  }, []);

  /* ── build route map for quick lookup ── */
  const routeMap = useMemo(() => {
    const map = {};
    (routes || []).forEach((r) => {
      map[r.id || r._id] = r;
    });
    return map;
  }, [routes]);

  const filtered = useMemo(() => {
    let list = drivers;
    if (selectedRoute !== "all") {
      list = list.filter((d) => {
        const dRoute = d.route?.id || d.route?._id || d.route;
        return String(dRoute) === String(selectedRoute);
      });
    }
    if (selectedBus !== "all") {
      list = list.filter((d) => {
        return d.bus && d.bus.number === selectedBus;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          (d.name || "").toLowerCase().includes(q) ||
          (d.phone || d.mobile || "").toLowerCase().includes(q) ||
          (d.busNumber || d.vehicleNo || "").toLowerCase().includes(q) ||
          (d.licenseNo || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [drivers, selectedRoute, selectedBus, search]);
  /* ── stats per route ── */
  const routeDriverCounts = useMemo(() => {
    const counts = {};
    drivers.forEach((d) => {
      const rId = d.route?.id || d.route?._id || d.route;
      if (rId) counts[rId] = (counts[rId] || 0) + 1;
    });
    return counts;
  }, [drivers]);

  const getRouteName = (driver) => {
    const rId = driver.route?.id || driver.route?._id || driver.route;
    if (!rId) return "Unassigned";
    const r = routeMap[rId];
    return r ? r.routeName || `Route #${r.routeNo}` : "Unknown Route";
  };

  const getRouteNo = (driver) => {
    const rId = driver.route?.id || driver.route?._id || driver.route;
    const r = rId ? routeMap[rId] : null;
    return r?.routeNo || "—";
  };

  /* ── modal helpers ── */
  const openAddModal = () => {
    setEditingDriver(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditModal = (driver, e) => {
    if (e) e.stopPropagation();
    setEditingDriver(driver);
    form.setFieldsValue({
      name: driver.name || "",
      phone: driver.phone || driver.mobile || "",
      email: driver.email || "",
      address: driver.address || "",
      busId: driver.bus?.id || driver.busId || undefined,
      licenseNo: driver.licenseNo || "",
      bloodGroup: driver.bloodGroup || undefined,
      route: driver.route?.id || driver.route?._id || driver.route || undefined,
      status: driver.status || "ACTIVE",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      // Only send relevant fields
      const payload = {
        ...values,
        busId: values.busId || null,
        route: values.route || null,
      };
      if (editingDriver) {
        await updateDriver(editingDriver.id || editingDriver._id, payload);
        message.success("Driver updated");
      } else {
        await createDriver(payload);
        message.success("Driver added");
      }
      setModalOpen(false);
      form.resetFields();
      setEditingDriver(null);
      fetchData();
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || "Failed to save driver");
    }
    setSaving(false);
  };

  const handleDelete = async (driver, e) => {
    if (e) e.stopPropagation();
    try {
      await deleteDriver(driver.id || driver._id);
      message.success("Driver deleted");
      fetchData();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to delete driver");
    }
  };

  return (
    <div className="flex gap-6 min-h-[calc(100vh-8rem)]">
      {/* ═══════════════ LEFT — ROUTE FILTER PANEL ═══════════════ */}
      <aside className="w-72 shrink-0 flex flex-col gap-4">
        {/* summary card */}
        <section className="rounded-2xl bg-primary/10 dark:bg-primary-container/20 p-5">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-1">Total Drivers</p>
          <p className="text-3xl font-bold text-primary">{drivers.length}</p>
          <p className="text-xs text-on-surface-variant mt-1">{routes.length} route(s) configured</p>
        </section>

        {/* route filter list */}
        <section className="rounded-2xl bg-surface-container-low dark:bg-surface-container-low p-4 flex-1 overflow-y-auto shadow-sm">
          <h3 className="text-sm font-semibold text-on-surface mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">filter_list</span>
            Filter by Route
          </h3>

          {/* All routes pill */}
          <button
            onClick={() => setSelectedRoute("all")}
            className={`w-full text-left px-3 py-2.5 rounded-xl mb-1.5 text-sm transition-all flex items-center justify-between ${
              selectedRoute === "all"
                ? "bg-primary text-on-primary font-semibold shadow-sm"
                : "text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">select_all</span>
              All Routes
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              selectedRoute === "all" ? "bg-on-primary/20 text-on-primary" : "bg-surface-container-high text-on-surface-variant"
            }`}>
              {drivers.length}
            </span>
          </button>

          {routes.map((route) => {
            const rId = route.id || route._id;
            const isActive = String(selectedRoute) === String(rId);
            const count = routeDriverCounts[rId] || 0;
            return (
              <button
                key={rId}
                onClick={() => setSelectedRoute(rId)}
                className={`w-full text-left px-3 py-2.5 rounded-xl mb-1.5 text-sm transition-all flex items-center justify-between ${
                  isActive
                    ? "bg-primary text-on-primary font-semibold shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <span className="material-symbols-outlined text-[18px]">route</span>
                  <span className="truncate">{route.routeName || `Route #${route.routeNo}`}</span>
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                  isActive ? "bg-on-primary/20 text-on-primary" : "bg-surface-container-high text-on-surface-variant"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}

          {routes.length === 0 && !loading && (
            <p className="text-xs text-on-surface-variant/60 text-center mt-6">No routes found</p>
          )}
        </section>
      </aside>

      {/* ═══════════════ RIGHT — DRIVER LISTING ═══════════════ */}
      <div className="flex-1 flex flex-col gap-5 min-w-0">
        {/* header bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">person</span>
              Driver Directory
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
                {selectedRoute === "all"
                    ? "All routes"
                    : `Route: ${routeMap[selectedRoute]?.routeName || "Route"}`}
              </p>
              <Select
                value={selectedBus}
                onChange={setSelectedBus}
                style={{ minWidth: 160 }}
                size="small"
                allowClear={false}
                placeholder="Filter by Bus"
                className="ml-2"
              >
                <Select.Option value="all">All Buses</Select.Option>
                {buses.map((bus) => (
                  <Select.Option key={bus.id} value={bus.number}>
                    {bus.number} {bus.routeName ? `(${bus.routeName})` : ""}
                  </Select.Option>
                ))}
              </Select>
              <span className="text-xs text-on-surface-variant ml-2">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
          </div>

          <div className="flex items-center gap-3">
            {canCreate && (
              <button
                onClick={openAddModal}
                style={{ background: "linear-gradient(to right, #00152a, #102a43)" }}
                className="flex items-center gap-2 px-4 py-2 text-white rounded-full text-xs font-bold shadow-md hover:opacity-90 transition-opacity active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Add Driver
              </button>
            )}
            <Input
              placeholder="Search name, phone, vehicle…"
              prefix={<SearchOutlined className="text-on-surface-variant/50" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
              className="w-72! rounded-xl"
            />
          </div>
        </div>

        {/* driver cards grid */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant/50 gap-2">
            <span className="material-symbols-outlined text-5xl">no_accounts</span>
            <p className="text-sm">No drivers found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto pb-4">
            {filtered.map((driver) => {
              const dId = driver.id || driver._id;
              return (
                <div
                  key={dId}
                  onClick={() => setSelectedDriver(driver)}
                  className="rounded-2xl bg-surface-container-low dark:bg-surface-container-low shadow-sm border border-outline-variant/30 p-5 cursor-pointer hover:shadow-md hover:border-primary/40 transition-all group"
                >
                  {/* top row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-primary text-xl">person</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-on-surface text-sm group-hover:text-primary transition-colors">
                          {driver.name || "Unnamed Driver"}
                        </h4>
                        <p className="text-xs text-on-surface-variant">{driver.phone || driver.mobile || "—"}</p>
                      </div>
                    </div>
                    <Tag
                      color={driver.status === "INACTIVE" ? "red" : "green"}
                      className="text-[10px]! px-2! py-0! rounded-full! m-0!"
                    >
                      {driver.status || "ACTIVE"}
                    </Tag>
                  </div>

                  {/* action buttons */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                    {canUpdate && (
                      <button
                        onClick={(e) => openEditModal(driver, e)}
                        className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-primary/10 text-on-surface-variant hover:text-primary transition-colors"
                        title="Edit"
                      >
                        <EditOutlined className="text-xs" />
                      </button>
                    )}
                    {canDelete && (
                      <Popconfirm
                        title="Delete this driver?"
                        onConfirm={(e) => handleDelete(driver, e)}
                        onCancel={(e) => e?.stopPropagation()}
                        okText="Delete"
                        okButtonProps={{ danger: true }}
                      >
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-error/10 text-on-surface-variant hover:text-error transition-colors"
                          title="Delete"
                        >
                          <DeleteOutlined className="text-xs" />
                        </button>
                      </Popconfirm>
                    )}
                  </div>

                  {/* details grid */}
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                    <div>
                      <p className="text-on-surface-variant/60 uppercase tracking-wider text-[10px]">Route</p>
                      <p className="text-on-surface font-medium truncate">{getRouteName(driver)}</p>
                    </div>
                    <div>
                      <p className="text-on-surface-variant/60 uppercase tracking-wider text-[10px]">Route #</p>
                      <p className="text-on-surface font-medium">{getRouteNo(driver)}</p>
                    </div>
                    <div>
                      <p className="text-on-surface-variant/60 uppercase tracking-wider text-[10px]">Vehicle</p>
                      <p className="text-on-surface font-medium">{driver.bus?.number || driver.vehicleNo || "—"}</p>
                    </div>
                    <div>
                      <p className="text-on-surface-variant/60 uppercase tracking-wider text-[10px]">License</p>
                      <p className="text-on-surface font-medium">{driver.licenseNo || "—"}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════════════ ADD / EDIT MODAL ═══════════════ */}
      <Modal
        title={
          <div className="flex items-center gap-3">
            <div
              style={{ background: "linear-gradient(to right, #00152a, #102a43)" }}
              className="h-9 w-9 rounded-xl flex items-center justify-center shadow"
            >
              <span className="material-symbols-outlined text-white text-lg">
                {editingDriver ? "edit" : "person_add"}
              </span>
            </div>
            <span className="font-bold text-on-surface">
              {editingDriver ? "Edit Driver" : "Add Driver"}
            </span>
          </div>
        }
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); setEditingDriver(null); }}
        onOk={handleSave}
        confirmLoading={saving}
        okText={editingDriver ? "Update" : "Add Driver"}
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="mt-4" requiredMark={false}>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="name" label="Driver Name" rules={[{ required: true, message: "Name is required" }]}>
              <Input placeholder="Full name" />
            </Form.Item>
            <Form.Item name="phone" label="Phone Number" rules={[{ required: true, message: "Phone is required" }]}>
              <Input placeholder="10-digit mobile" />
            </Form.Item>
            <Form.Item name="email" label="Email">
              <Input placeholder="driver@email.com" />
            </Form.Item>
            <Form.Item name="busId" label="Assign Bus">
              <Select
                placeholder="Select bus"
                allowClear
                showSearch
                optionFilterProp="children"
              >
                {buses.map((bus) => (
                  <Select.Option key={bus.id} value={bus.id}>
                    {bus.number} ({bus.plateNo})
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="licenseNo" label="License Number">
              <Input placeholder="DL-XXXXXXXXXX" />
            </Form.Item>
            <Form.Item name="bloodGroup" label="Blood Group">
              <Select placeholder="Select" allowClear options={["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((g) => ({ label: g, value: g }))} />
            </Form.Item>
            <Form.Item name="route" label="Assign Route">
              <Select
                placeholder="Select route"
                allowClear
                showSearch
                optionFilterProp="label"
                options={routes.map((r) => ({
                  label: r.routeName || `Route #${r.routeNo}`,
                  value: r.id || r._id,
                }))}
              />
            </Form.Item>
            <Form.Item name="status" label="Status" initialValue="ACTIVE">
              <Select options={[{ label: "Active", value: "ACTIVE" }, { label: "Inactive", value: "INACTIVE" }]} />
            </Form.Item>
          </div>
          <Form.Item name="address" label="Address">
            <Input.TextArea rows={2} placeholder="Full address" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ═══════════════ DETAIL DRAWER ═══════════════ */}
      <Drawer
        title={null}
        placement="right"
        width={400}
        open={!!selectedDriver}
        onClose={() => setSelectedDriver(null)}
        className="driver-detail-drawer"
      >
        {selectedDriver && (
          <div className="flex flex-col gap-6">
            {/* driver header */}
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-3xl">person</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-on-surface">{selectedDriver.name || "Unnamed"}</h3>
                <Tag
                  color={selectedDriver.status === "INACTIVE" ? "red" : "green"}
                  className="text-xs! mt-1!"
                >
                  {selectedDriver.status || "ACTIVE"}
                </Tag>
              </div>
            </div>

            {/* info sections */}
            <div className="space-y-4">
              <DetailSection title="Contact">
                <DetailRow icon="call" label="Phone" value={selectedDriver.phone || selectedDriver.mobile || "—"} />
                <DetailRow icon="mail" label="Email" value={selectedDriver.email || "—"} />
                <DetailRow icon="home" label="Address" value={selectedDriver.address || "—"} />
              </DetailSection>

              <DetailSection title="Route Assignment">
                <DetailRow icon="route" label="Route" value={getRouteName(selectedDriver)} />
                <DetailRow icon="tag" label="Route No" value={getRouteNo(selectedDriver)} />
                <DetailRow icon="directions_bus" label="Bus" value={selectedDriver.bus?.number || selectedDriver.busNumber || selectedDriver.vehicleNo || "—"} />
              </DetailSection>

              <DetailSection title="License & Documents">
                <DetailRow icon="badge" label="License No" value={selectedDriver.licenseNo || "—"} />
                <DetailRow icon="event" label="License Expiry" value={selectedDriver.licenseExpiry ? new Date(selectedDriver.licenseExpiry).toLocaleDateString("en-IN") : "—"} />
                <DetailRow icon="bloodtype" label="Blood Group" value={selectedDriver.bloodGroup || "—"} />
              </DetailSection>

              {selectedDriver.emergencyContact && (
                <DetailSection title="Emergency Contact">
                  <DetailRow icon="person" label="Name" value={selectedDriver.emergencyContact.name || "—"} />
                  <DetailRow icon="call" label="Phone" value={selectedDriver.emergencyContact.phone || "—"} />
                </DetailSection>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
export default DriverListingPage;
