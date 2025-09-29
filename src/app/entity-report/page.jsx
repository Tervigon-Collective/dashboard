import Breadcrumb from "@/components/Breadcrumb";
import EntityReportLayer from "@/components/EntityReportLayer";
import MasterLayout from "@/masterLayout/MasterLayout";

export const metadata = {
  title: "Entity Report - Admin Dashboard",
  description:
    "Entity Report for analyzing Google Ads, Meta Ads, and Organic Attribution data.",
};

const Page = () => {
  return (
    <>
      {/* MasterLayout */}
      <MasterLayout>
        {/* Breadcrumb */}
        <Breadcrumb title="Components / Entity Report" />

        {/* EntityReportLayer */}
        <EntityReportLayer />
      </MasterLayout>
    </>
  );
};

export default Page;
