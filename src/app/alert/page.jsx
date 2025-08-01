import AlertLayer from "@/components/AlertLayer";
import Breadcrumb from "@/components/Breadcrumb";
import MasterLayout from "@/masterLayout/MasterLayout";

// Metadata removed for client component compatibility

const Page = () => {
  return (
    <>
      {/* MasterLayout */}
      <MasterLayout>
        {/* Breadcrumb */}
        <Breadcrumb title='Components / Alerts' />

        {/* AlertLayer */}
        <AlertLayer />
      </MasterLayout>
    </>
  );
};

export default Page;
