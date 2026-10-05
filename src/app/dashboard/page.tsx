import { Metadata } from "next";
import DashboardClient from "@/components/dashboard/DashboardClient";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Dashboard | CRM Laser Inova",
};

export default function DashboardPage() {
  return <DashboardClient />;
}
