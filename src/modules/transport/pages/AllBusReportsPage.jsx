import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Image,
  message,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import {
  CarOutlined,
  CameraOutlined,
  DashboardOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FireOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  exportBusFuelReport,
  exportBusMileageReport,
  getAllBuses,
  getAllDrivers,
  getBusFuelReport,
  getBusMileageReport,
  getDailyTripSummary,
  getFuelLogs,
} from '../transport.service';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const DEFAULT_RANGE = [dayjs().subtract(30, 'day'), dayjs()];

const fmt = (value, digits = 2) => {
  if (value == null || Number.isNaN(Number(value))) return '-';
  return Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
};

const fmtDate = (value) => {
  if (!value) return '-';
  return dayjs(value).format('DD MMM YYYY, hh:mm A');
};

const AllBusReportsPage = () => {
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [range, setRange] = useState(DEFAULT_RANGE);
  const [selectedBusId, setSelectedBusId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingReports, setLoadingReports] = useState(false);
  const [fleetData, setFleetData] = useState([]);
  const [fuelLogs, setFuelLogs] = useState([]);
  const [tripSummary, setTripSummary] = useState([]);
  const [downloading, setDownloading] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const params = useMemo(
    () => ({
      from: range?.[0]?.format('YYYY-MM-DD'),
      to: range?.[1]?.format('YYYY-MM-DD'),
    }),
    [range],
  );

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [busData, driverData] = await Promise.all([getAllBuses(), getAllDrivers()]);
        setBuses(Array.isArray(busData) ? busData : []);
        setDrivers(Array.isArray(driverData) ? driverData : []);
      } catch (err) {
        message.error(err?.response?.data?.message || 'Failed to load buses');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!params.from || !params.to || buses.length === 0) return;
    loadAllReports();
  }, [params, buses.length]);

  const loadAllReports = async () => {
    setLoadingReports(true);
    try {
      const busesToLoad = selectedBusId
        ? buses.filter((b) => b.id === selectedBusId)
        : buses;

      const [logsData, todayTrips] = await Promise.all([
        getFuelLogs({ busId: selectedBusId || undefined, from: params.from, to: params.to }),
        getDailyTripSummary(dayjs().format('YYYY-MM-DD')),
      ]);

      setFuelLogs(Array.isArray(logsData) ? logsData : []);
      setTripSummary(Array.isArray(todayTrips) ? todayTrips : []);

      const results = await Promise.allSettled(
        busesToLoad.map(async (bus) => {
          const [fuel, mileage] = await Promise.all([
            getBusFuelReport(bus.id, params),
            getBusMileageReport(bus.id, params),
          ]);
          return { bus, fuel, mileage };
        }),
      );

      const fleet = results
        .filter((r) => r.status === 'fulfilled')
        .map((r) => r.value);

      setFleetData(fleet);
    } catch (err) {
      message.error(err?.response?.data?.message || 'Failed to load reports');
    } finally {
      setLoadingReports(false);
    }
  };

  /* ── Aggregated stats ── */
  const totals = useMemo(() => {
    let totalFuel = 0;
    let totalCost = 0;
    let totalDistance = 0;
    let totalEntries = 0;
    let weightedMileageNum = 0;
    let weightedMileageDen = 0;

    fleetData.forEach(({ fuel, mileage }) => {
      totalFuel += Number(fuel?.summary?.totalLitres || 0);
      totalCost += Number(fuel?.summary?.totalCost || 0);
      totalDistance += Number(mileage?.summary?.totalDistanceKm || 0);
      totalEntries += Number(fuel?.summary?.fuelEntries || 0);
      const dist = Number(mileage?.summary?.totalDistanceKm || 0);
      const litres = Number(mileage?.summary?.totalFuelConsumedLitres || fuel?.summary?.totalFuelConsumedLitres || 0);
      if (dist > 0 && litres > 0) {
        weightedMileageNum += dist;
        weightedMileageDen += litres;
      }
    });

    return {
      totalFuel,
      totalCost,
      totalDistance,
      totalEntries,
      avgMileage: weightedMileageDen > 0 ? weightedMileageNum / weightedMileageDen : 0,
      busCount: fleetData.length,
    };
  }, [fleetData]);

  /* ── Fleet overview table data ── */
  const fleetTableData = useMemo(
    () =>
      fleetData.map(({ bus, fuel, mileage }) => ({
        key: bus.id,
        busId: bus.id,
        busNumber: bus.number,
        routeName: bus.routeName || '-',
        fuelEntries: fuel?.summary?.fuelEntries || 0,
        totalLitres: fuel?.summary?.totalLitres || 0,
        totalCost: fuel?.summary?.totalCost || 0,
        totalDistanceKm: mileage?.summary?.totalDistanceKm || 0,
        avgMileage: mileage?.summary?.averageKmPerLitre || 0,
        lastOdometer: fuel?.summary?.lastOdometer || 0,
      })),
    [fleetData],
  );

  const handleExport = async (busId, type, format) => {
    const key = `${busId}-${type}-${format}`;
    setDownloading(key);
    try {
      if (type === 'fuel') {
        await exportBusFuelReport(busId, format, params);
      } else {
        await exportBusMileageReport(busId, format, params);
      }
      message.success('Report exported');
    } catch (err) {
      message.error(err?.response?.data?.message || 'Export failed');
    } finally {
      setDownloading('');
    }
  };

  /* ── Column definitions ── */

  const fleetColumns = [
    {
      title: 'Bus',
      dataIndex: 'busNumber',
      key: 'busNumber',
      fixed: 'left',
      width: 120,
      render: (val) => <Tag color="blue">{val}</Tag>,
    },
    { title: 'Route', dataIndex: 'routeName', key: 'routeName', width: 160 },
    {
      title: 'Fuel Entries',
      dataIndex: 'fuelEntries',
      key: 'fuelEntries',
      sorter: (a, b) => a.fuelEntries - b.fuelEntries,
      render: (val) => fmt(val, 0),
    },
    {
      title: 'Fuel Used (L)',
      dataIndex: 'totalLitres',
      key: 'totalLitres',
      sorter: (a, b) => a.totalLitres - b.totalLitres,
      render: (val) => fmt(val),
    },
    {
      title: 'Total Cost (₹)',
      dataIndex: 'totalCost',
      key: 'totalCost',
      sorter: (a, b) => a.totalCost - b.totalCost,
      render: (val) => `₹${fmt(val)}`,
    },
    {
      title: 'Distance (km)',
      dataIndex: 'totalDistanceKm',
      key: 'totalDistanceKm',
      sorter: (a, b) => a.totalDistanceKm - b.totalDistanceKm,
      render: (val) => `${fmt(val)} km`,
    },
    {
      title: 'Avg Mileage',
      dataIndex: 'avgMileage',
      key: 'avgMileage',
      sorter: (a, b) => a.avgMileage - b.avgMileage,
      render: (val) => (val ? `${fmt(val)} km/L` : '-'),
    },
    {
      title: 'Last Odometer',
      dataIndex: 'lastOdometer',
      key: 'lastOdometer',
      render: (val) => (val ? `${fmt(val)} km` : '-'),
    },
    {
      title: 'Export',
      key: 'actions',
      fixed: 'right',
      width: 180,
      render: (_, row) => (
        <Space size="small">
          <Button
            size="small"
            icon={<FileExcelOutlined />}
            loading={downloading === `${row.busId}-fuel-excel`}
            onClick={() => handleExport(row.busId, 'fuel', 'excel')}
          >
            Fuel
          </Button>
          <Button
            size="small"
            icon={<FilePdfOutlined />}
            loading={downloading === `${row.busId}-mileage-pdf`}
            onClick={() => handleExport(row.busId, 'mileage', 'pdf')}
          >
            Mileage
          </Button>
        </Space>
      ),
    },
  ];

  const fuelLogColumns = [
    {
      title: 'Filled At',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (val) => fmtDate(val),
      sorter: (a, b) => dayjs(a.timestamp).unix() - dayjs(b.timestamp).unix(),
    },
    {
      title: 'Bus',
      dataIndex: ['bus', 'number'],
      key: 'bus',
      render: (val) => val ? <Tag color="blue">{val}</Tag> : '-',
    },
    {
      title: 'Driver',
      dataIndex: ['driver', 'name'],
      key: 'driver',
      render: (val) => val || '-',
    },
    {
      title: 'Odometer',
      dataIndex: 'odometer',
      key: 'odometer',
      render: (val) => `${fmt(val)} km`,
    },
    {
      title: 'Distance Since Prev Fill',
      dataIndex: 'distanceSincePreviousFill',
      key: 'distanceSincePreviousFill',
      render: (val) => (val == null ? '-' : `${fmt(val)} km`),
    },
    {
      title: 'Litres',
      dataIndex: 'litres',
      key: 'litres',
      render: (val) => fmt(val),
    },
    {
      title: 'Mileage',
      dataIndex: 'kmPerLitre',
      key: 'kmPerLitre',
      render: (val) => (val == null ? '-' : `${fmt(val)} km/L`),
    },
    {
      title: 'Cost',
      dataIndex: 'totalCost',
      key: 'totalCost',
      render: (val) => (val == null ? '-' : `₹${fmt(val)}`),
    },
    {
      title: 'Receipt',
      dataIndex: 'imageUrl',
      key: 'imageUrl',
      width: 90,
      render: (val) =>
        val ? (
          <Image
            src={`${import.meta.env.VITE_API_URL || ''}${val}`}
            alt="Receipt"
            width={40}
            height={40}
            style={{ objectFit: 'cover', borderRadius: 6, cursor: 'pointer' }}
            preview={{
              mask: <EyeOutlined style={{ fontSize: 14 }} />,
              src: `${import.meta.env.VITE_API_URL || ''}${val}`,
            }}
            fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJjZW50cmFsIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjYmZiZmJmIiBmb250LXNpemU9IjEwIj5OL0E8L3RleHQ+PC9zdmc+"
          />
        ) : (
          <span style={{ color: '#bfbfbf', fontSize: 12 }}>—</span>
        ),
    },
  ];

  const tripColumns = [
    {
      title: 'Bus / Plate',
      dataIndex: 'plateNo',
      key: 'plateNo',
      render: (val) => <Tag color="processing">{val}</Tag>,
    },
    {
      title: 'Trips Today',
      dataIndex: 'tripCount',
      key: 'tripCount',
      sorter: (a, b) => (a.tripCount || 0) - (b.tripCount || 0),
      render: (val) => fmt(val, 0),
    },
    {
      title: 'Distance Today',
      dataIndex: 'totalDistanceKm',
      key: 'totalDistanceKm',
      sorter: (a, b) => (a.totalDistanceKm || 0) - (b.totalDistanceKm || 0),
      render: (val) => (val != null ? `${fmt(val)} km` : '-'),
    },
    {
      title: 'Running Hours',
      dataIndex: 'runningHours',
      key: 'runningHours',
      render: (val) => (val != null ? `${fmt(val, 1)} hrs` : '-'),
    },
    {
      title: 'First Ignition',
      dataIndex: 'firstIgnitionOn',
      key: 'firstIgnitionOn',
      render: (val) => fmtDate(val),
    },
    {
      title: 'Last Ignition Off',
      dataIndex: 'lastIgnitionOff',
      key: 'lastIgnitionOff',
      render: (val) => fmtDate(val),
    },
  ];

  const tabItems = [
    {
      key: 'overview',
      label: (
        <span>
          <DashboardOutlined /> Fleet Overview
        </span>
      ),
      children: (
        <Table
          rowKey="key"
          columns={fleetColumns}
          dataSource={fleetTableData}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1300 }}
          loading={loadingReports}
        />
      ),
    },
    {
      key: 'fuel-logs',
      label: (
        <span>
          <FireOutlined /> All Fuel Logs
        </span>
      ),
      children: (
        <Table
          rowKey={(r) => r.id || `${r.timestamp}-${r.odometer}`}
          columns={fuelLogColumns}
          dataSource={fuelLogs}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1200 }}
          loading={loadingReports}
        />
      ),
    },
    {
      key: 'trips',
      label: (
        <span>
          <CarOutlined /> Today's Trip Summary
        </span>
      ),
      children: tripSummary.length > 0 ? (
        <Table
          rowKey={(r) => r.plateNo || r.busId}
          columns={tripColumns}
          dataSource={tripSummary}
          pagination={false}
          scroll={{ x: 900 }}
        />
      ) : (
        <Empty description="No trip data available for today" />
      ),
    },
  ];

  if (loading) {
    return (
      <Card>
        <div className="py-16 text-center">
          <Spin size="large" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold font-headline text-primary">
              All Bus Reports
            </h2>
            <p className="text-on-surface-variant mt-1">
              Fleet-wide fuel, mileage, and trip reports across all buses.
            </p>
          </div>
          <Space wrap>
            <Select
              allowClear
              showSearch
              placeholder="All buses"
              style={{ width: 240 }}
              value={selectedBusId}
              optionFilterProp="label"
              onChange={(val) => setSelectedBusId(val || null)}
              options={buses.map((bus) => ({
                value: bus.id,
                label: `${bus.number}${bus.routeName ? ` • ${bus.routeName}` : ''}`,
              }))}
            />
            <RangePicker
              allowClear={false}
              value={range}
              onChange={(val) => val && setRange(val)}
              format="DD-MM-YYYY"
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setRange([...range]);
              }}
            >
              Refresh
            </Button>
          </Space>
        </div>
      </Card>

      {/* Summary Stats */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic title="Buses" value={totals.busCount} prefix={<CarOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic title="Fuel Entries" value={totals.totalEntries} prefix={<DownloadOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic title="Fuel Used" value={totals.totalFuel} suffix="L" precision={1} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic title="Total Cost" value={totals.totalCost} prefix="₹" precision={0} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic title="Distance" value={totals.totalDistance} suffix="km" precision={1} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title="Avg Mileage"
              value={totals.avgMileage}
              suffix="km/L"
              precision={2}
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Tabs */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>
    </div>
  );
};

export default AllBusReportsPage;
