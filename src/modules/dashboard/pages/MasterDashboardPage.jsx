import React, { useEffect, useState } from 'react';
import AlertBanner from '../components/AlertBanner';
import StrategicInsights from '../components/StrategicInsights';
import CommandCenter from '../components/CommandCenter';
import AdmissionsCard from '../components/AdmissionsCard';
import FeesCard from '../components/FeesCard';
import TransportCard from '../components/TransportCard';
import StaffCard from '../components/StaffCard';
import ShopCard from '../components/ShopCard';
import DocumentsCard from '../components/DocumentsCard';
import HouseChampionship from '../components/HouseChampionship';
import { getMasterDashboardSummary } from '../dashboard.service';
import { Spin } from 'antd';

export default function MasterDashboardPage({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getMasterDashboardSummary();
        setData(result);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="py-4 mx-auto max-w-7xl">
      <AlertBanner />

      <div className="flex flex-col gap-8 mb-8 lg:flex-row">
        <StrategicInsights data={data} />
        <CommandCenter onNavigate={onNavigate} />
      </div>

      <div className="grid grid-cols-1 gap-8 mb-8 md:grid-cols-2 lg:grid-cols-3">
        <AdmissionsCard data={data?.admissions} />
        <FeesCard data={data?.fees} />
        <TransportCard data={data?.transport} />
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        <StaffCard data={data?.staff} />
        <ShopCard data={data?.shop} />
        <DocumentsCard data={data?.documents} />
      </div>

      <HouseChampionship houses={data?.houses} />
    </div>
  );
}
