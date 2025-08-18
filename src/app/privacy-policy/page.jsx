import Breadcrumb from "@/components/Breadcrumb";
import PrivacyPolicyLayer from "@/components/PrivacyPolicyLayer";
import MasterLayout from "@/masterLayout/MasterLayout";

export const metadata = {
  title: "Privacy Policy - Seleric Dashboard",
  description:
    "Privacy Policy for Seleric Dashboard - Learn how we collect, use, and protect your personal information.",
};

const Page = () => {
  return (
    <>
      {/* MasterLayout */}
      <MasterLayout>
        {/* Breadcrumb */}
        <Breadcrumb title='Privacy Policy' />

        {/* PrivacyPolicyLayer */}
        <PrivacyPolicyLayer />
      </MasterLayout>
    </>
  );
};

export default Page;
