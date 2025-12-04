"use client";
import React from "react";
import HourlySpendSalesGraph from "./child/HourlySpendSalesGraph";
import HourlyEfficiencyHeatmap from "./child/HourlyEfficiencyHeatmap";
import CustomerDistributionWidget from "./child/CustomerDistributionWidget";
import ReturnCancelTrendsWidget from "./child/ReturnCancelTrendsWidget";

const AdvancedAnalyticsLayer = () => {
  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          {/* Row 1 - Hourly Spend & Sales and Return & Cancel Trends */}
          <div className="row g-4 mb-4">
            <div className="col-lg-6 col-md-12">
              <HourlySpendSalesGraph />
            </div>
            <div className="col-lg-6 col-md-12">
              <ReturnCancelTrendsWidget />
            </div>
          </div>

          {/* Row 2 - ROAS Heatmap and Customer Distribution */}
          <div className="row g-4">
            <div className="col-lg-6 col-md-12">
              <HourlyEfficiencyHeatmap />
            </div>
            <div className="col-lg-6 col-md-12">
              <CustomerDistributionWidget />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalyticsLayer;

