import Breadcrumb from "@/components/Breadcrumb";
import ProductSpendSummaryLayer from "@/components/ProductSpendSummaryLayer";
import MasterLayout from "@/masterLayout/MasterLayout";

export const metadata = {
  title: "NEXT JS - Admin Dashboard Multipurpose Bootstrap 5 Template",
  description:
    "NEXT JS is a developer-friendly, ready-to-use admin template designed for building attractive, scalable, and high-performing web applications.",
};

const Page = () => {
  return (
    <>
      <MasterLayout>
        <Breadcrumb title="Components / Product Spend Summary" />
        <ProductSpendSummaryLayer />
      </MasterLayout>
    </>
  );
};

export default Page;
