import Breadcrumb from "@/components/Breadcrumb";
import TermsOfServiceLayer from "@/components/TermsOfServiceLayer";
import MasterLayout from "@/masterLayout/MasterLayout";

export const metadata = {
  title: "Terms of Service - Seleric Dashboard",
  description:
    "Terms of Service for Seleric Dashboard - Comprehensive service terms and user agreements.",
};

const Page = () => {
  return (
    <>
      {/* MasterLayout */}
      <MasterLayout>
        {/* Breadcrumb */}
        <Breadcrumb title='Terms of Service' />

        {/* TermsOfServiceLayer */}
        <TermsOfServiceLayer />
      </MasterLayout>
    </>
  );
};

export default Page;
