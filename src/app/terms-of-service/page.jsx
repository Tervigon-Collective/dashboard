import TermsOfServiceLayer from "@/components/TermsOfServiceLayer";
import PublicLayout from "@/components/PublicLayout";

export const metadata = {
  title: "Terms of Service - Seleric Dashboard",
  description:
    "Terms of Service for Seleric Dashboard - Comprehensive service terms and user agreements.",
};

const Page = () => {
  return (
    <PublicLayout>
      {/* TermsOfServiceLayer */}
      <TermsOfServiceLayer />
    </PublicLayout>
  );
};

export default Page;
