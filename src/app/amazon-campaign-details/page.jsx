import Breadcrumb from "../../components/Breadcrumb";
import AmazonCampaignDetailsLayer from "../../components/AmazonCampaignDetailsLayer";
import MasterLayout from "../../masterLayout/MasterLayout";

export const metadata = {
  title: "Amazon Campaign Details - Admin Dashboard",
  description:
    "Amazon Campaign Details for viewing adgroup data of a specific Amazon Ads campaign.",
};

const Page = () => {
  return (
    <>
      {/* MasterLayout */}
      <MasterLayout>
        {/* Breadcrumb */}
        <Breadcrumb title="Components / Amazon Campaign Details" />

        {/* AmazonCampaignDetailsLayer */}
        <AmazonCampaignDetailsLayer />
      </MasterLayout>
    </>
  );
};

export default Page;
