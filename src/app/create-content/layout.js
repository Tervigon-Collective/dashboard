import MasterLayout from "@/masterLayout/MasterLayout";
import { BrandkitProvider } from "@/contexts/BrandkitContext";

export const metadata = {
  title: "Create Content - AI Content Generator",
  description: "AI-powered content generation for video and graphic content",
};

export default function CreateContentLayout({ children }) {
  return (
    <MasterLayout>
      <BrandkitProvider>{children}</BrandkitProvider>
    </MasterLayout>
  );
}
