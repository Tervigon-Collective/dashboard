import SkuTableDataLayer from "@/components/SkuTableDataLayer";
import MasterLayout from "@/masterLayout/MasterLayout";
import SidebarPermissionGuard from "@/components/SidebarPermissionGuard";

export const metadata = {
  title: "NEXT JS - Admin Dashboard Multipurpose Bootstrap 5 Template",
  description:
    "NEXT JS is a developer-friendly, ready-to-use admin template designed for building attractive, scalable, and high-performing web applications.",
};

const Page = () => {
  return (
    <>
      <SidebarPermissionGuard requiredSidebar="skuList">
        {/* MasterLayout */}
        <MasterLayout>
          {/* StarRatingLayer */}
          <SkuTableDataLayer />
        </MasterLayout>
      </SidebarPermissionGuard>
    </>
  );
};

export default Page;
