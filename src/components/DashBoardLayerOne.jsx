import GeneratedContent from "./child/GeneratedContent";
import IndiaSalesHeatMap from "./child/IndiaSalesHeatMap";
import LatestRegisteredOne from "./child/LatestRegisteredOne";
import SalesStatisticOne from "./child/SalesStatisticOne";
import SourceVisitors from "./child/SourceVisitors";
import TopPerformerOne from "./child/TopPerformerOne";
import TotalSubscriberOne from "./child/TotalSubscriberOne";
import UnitCountOne from "./child/UnitCountOne";
import UsersOverviewOne from "./child/UsersOverviewOne";

const DashBoardLayerOne = () => {
  return (
    <>
      {/* UnitCountOne */}
      <UnitCountOne />

      <section className='row gy-4 mt-1'>
        {/* SalesStatisticOne */}
        <SalesStatisticOne />

        {/* TotalSubscriberOne */}
        <TotalSubscriberOne />

        {/* UsersOverviewOne */}
        {/* <UsersOverviewOne /> */}

        {/* LatestRegisteredOne */}
        <LatestRegisteredOne />

        {/* TopPerformerOne */}
        <TopPerformerOne />

        {/* GeneratedContent */}
        <GeneratedContent />


        <SourceVisitors/>

        {/* IndiaSalesHeatMap */}
        <IndiaSalesHeatMap />

        {/* TopCountries */}
        {/* <TopCountries /> */}


      </section>
    </>
  );
};

export default DashBoardLayerOne;
