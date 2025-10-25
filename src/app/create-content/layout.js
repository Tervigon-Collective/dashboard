import MasterLayout from "@/masterLayout/MasterLayout";

export const metadata = {
  title: "Create Content - AI Content Generator",
  description: "AI-powered content generation for video and graphic content",
};

export default function CreateContentLayout({ children }) {
  return <MasterLayout>{children}</MasterLayout>;
}
