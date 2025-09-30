import Breadcrumb from "../../components/Breadcrumb";
import CampaignDetailsLayer from "../../components/CampaignDetailsLayer";
import MasterLayout from "../../masterLayout/MasterLayout";

export const metadata = {
  title: "Campaign Details - Admin Dashboard",
  description:
    "Campaign Details for viewing adset data of a specific Meta Ads campaign.",
};

const Page = () => {
  return (
    <>
      {/* MasterLayout */}
      <MasterLayout>
        {/* Breadcrumb */}
        <Breadcrumb title="Components / Campaign Details" />

        {/* CampaignDetailsLayer */}
        <CampaignDetailsLayer />
      </MasterLayout>
    </>
  );
};

export default Page;

