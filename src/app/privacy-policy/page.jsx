import PrivacyPolicyLayer from "@/components/PrivacyPolicyLayer";
import PublicLayout from "@/components/PublicLayout";

export const metadata = {
  title: "Privacy Policy - Seleric Dashboard",
  description:
    "Privacy Policy for Seleric Dashboard - Learn how we collect, use, and protect your personal information.",
};

const Page = () => {
  return (
    <PublicLayout>
      {/* PrivacyPolicyLayer */}
      <PrivacyPolicyLayer />
    </PublicLayout>
  );
};

export default Page;
