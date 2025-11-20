import EntityReportLayer from "../../components/EntityReportLayer";
import MasterLayout from "../../masterLayout/MasterLayout";
import SidebarPermissionGuard from "../../components/SidebarPermissionGuard";

export const metadata = {
  title: "Entity Report - Admin Dashboard",
  description:
    "Entity Report for analyzing Google Ads, Meta Ads, and Organic Attribution data.",
};

const Page = () => {
  return (
    <>
      <SidebarPermissionGuard requiredSidebar="entityReport">
        {/* MasterLayout */}
        <MasterLayout>
          {/* EntityReportLayer */}
          <EntityReportLayer />
        </MasterLayout>
      </SidebarPermissionGuard>
    </>
  );
};

export default Page;
