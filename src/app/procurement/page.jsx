import Breadcrumb from "@/components/Breadcrumb";
import ProcurementTableDataLayer from "@/components/ProcurementTableDataLayer";
import SidebarPermissionGuard from "@/components/SidebarPermissionGuard";

export const metadata = {
  title: "Procurement - Admin Dashboard",
  description:
    "Procurement product management system for managing products, variants, and pricing.",
};

const Page = () => {
  return (
    <SidebarPermissionGuard requiredSidebar="procurement">
      {/* Breadcrumb */}
      <Breadcrumb title="Components / Procurement" />

      {/* ProcurementTableDataLayer */}
      <ProcurementTableDataLayer />
    </SidebarPermissionGuard>
  );
};

export default Page;
