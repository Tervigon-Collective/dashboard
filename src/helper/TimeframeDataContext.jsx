"use client";

import React, { createContext, useContext } from "react";
import { useUser } from "@/helper/UserContext";
import { useNetSalesTimeframesQuery } from "@/hooks/dashboard/useNetSalesTimeframesQuery";

const TimeframeDataContext = createContext();

export const TimeframeDataProvider = ({ children }) => {
  const { user, loading: userLoading } = useUser();
  const { data, loading, isFetching, refresh, dataUpdatedAt } =
    useNetSalesTimeframesQuery({
      enabled: !userLoading && !!user,
    });

  return (
    <TimeframeDataContext.Provider
      value={{
        data: user ? data ?? null : null,
        loading: userLoading || loading,
        isFetching,
        refresh,
        dataUpdatedAt,
      }}
    >
      {children}
    </TimeframeDataContext.Provider>
  );
};

export const useTimeframeData = () => useContext(TimeframeDataContext);
