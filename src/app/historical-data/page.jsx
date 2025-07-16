import HistoricalDashBoardLayerOne from "@/components/HistoricalDashboardLayerOne";
import MasterLayout from "@/masterLayout/MasterLayout";
import { Breadcrumb } from "react-bootstrap";


export const metadata = {
  title: "NEXT JS - Admin Dashboard Multipurpose",
  description:
    "NEXT JS is a developer-friendly, ready-to-use admin template designed for building attractive, scalable, and high-performing web applications.",
};

const Page = () => {

  return (
    <>
      {/* MasterLayout */}
      <MasterLayout>
       
        {/* Breadcrumb */}
        <Breadcrumb title='Historical Data' />

        {/* DashBoardLayerOne */}
        <HistoricalDashBoardLayerOne />
      </MasterLayout>
    </>
  );
};

export default Page;
