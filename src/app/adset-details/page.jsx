import Breadcrumb from "../../components/Breadcrumb";
import AdsetDetailsLayer from "../../components/AdsetDetailsLayer";
import MasterLayout from "../../masterLayout/MasterLayout";

export const metadata = {
  title: "Adset Details - Admin Dashboard",
  description:
    "Adset Details for viewing ad data of a specific Meta Ads adset.",
};

const Page = () => {
  return (
    <>
      {/* MasterLayout */}
      <MasterLayout>
        {/* Breadcrumb */}
        <Breadcrumb title="Components / Adset Details" />

        {/* AdsetDetailsLayer */}
        <AdsetDetailsLayer />
      </MasterLayout>
    </>
  );
};

export default Page;
