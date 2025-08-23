import TermsConditionLayer from "@/components/TermsConditionLayer";
import PublicLayout from "@/components/PublicLayout";

export const metadata = {
  title: "Terms & Conditions - Seleric Dashboard",
  description:
    "Terms & Conditions for Seleric Dashboard - Comprehensive terms and conditions for users.",
};

const Page = () => {
  return (
    <PublicLayout>
      {/* TermsConditionLayer */}
      <TermsConditionLayer />
    </PublicLayout>
  );
};

export default Page;
