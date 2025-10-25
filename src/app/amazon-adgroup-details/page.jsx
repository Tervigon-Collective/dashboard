import Breadcrumb from "../../components/Breadcrumb";
import AmazonAdgroupDetailsLayer from "../../components/AmazonAdgroupDetailsLayer";
import MasterLayout from "../../masterLayout/MasterLayout";

export const metadata = {
  title: "Amazon Adgroup Details - Admin Dashboard",
  description:
    "Amazon Adgroup Details for viewing product data of a specific Amazon Ads adgroup.",
};

const Page = () => {
  return (
    <>
      {/* MasterLayout */}
      <MasterLayout>
        {/* Breadcrumb */}
        <Breadcrumb title="Components / Amazon Adgroup Details" />

        {/* AmazonAdgroupDetailsLayer */}
        <AmazonAdgroupDetailsLayer />
      </MasterLayout>
    </>
  );
};

export default Page;
