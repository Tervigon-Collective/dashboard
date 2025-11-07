import React, { createContext, useContext, useEffect, useState } from "react";
import { apiClient } from "@/api/api";
import { useUser } from "@/helper/UserContext";

const TimeframeDataContext = createContext();

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const TimeframeDataProvider = ({ children }) => {
  const { user, loading: userLoading } = useUser();
  const [data, setData] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("timeframeData");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.timestamp && Date.now() - parsed.timestamp < ONE_DAY_MS) {
            return parsed.data;
          }
        } catch (error) {
          localStorage.removeItem("timeframeData");
        }
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(!data);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // Wait until the auth state is resolved
    if (userLoading) {
      return;
    }

    // If user is not signed in, clear cached data and stop
    if (!user) {
      localStorage.removeItem("timeframeData");
      setData(null);
      setLoading(false);
      return;
    }

    const stored = localStorage.getItem("timeframeData");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.timestamp && Date.now() - parsed.timestamp < ONE_DAY_MS) {
          setData(parsed.data);
          setLoading(false);
          return;
        }
      } catch (error) {
        localStorage.removeItem("timeframeData");
      }
    }

    let isMounted = true;
    setLoading(true);

    Promise.all([
      apiClient.get("/api/net_sales/year"),
      apiClient.get("/api/net_sales/month"),
      apiClient.get("/api/net_sales/week"),
    ])
      .then(([year, month, week]) => {
        if (!isMounted) return;
        const result = {
          Year: year.data,
          Month: month.data,
          Week: week.data,
        };
        setData(result);
        localStorage.setItem(
          "timeframeData",
          JSON.stringify({ data: result, timestamp: Date.now() })
        );
      })
      .catch(() => {
        if (!isMounted) return;
        setData(null);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user, userLoading]);

  const refresh = async () => {
    if (userLoading || !user) {
      return;
    }

    setLoading(true);
    try {
      const [year, month, week] = await Promise.all([
        apiClient.get("/api/net_sales/year"),
        apiClient.get("/api/net_sales/month"),
        apiClient.get("/api/net_sales/week"),
      ]);

      const result = {
        Year: year.data,
        Month: month.data,
        Week: week.data,
      };
      setData(result);
      localStorage.setItem(
        "timeframeData",
        JSON.stringify({ data: result, timestamp: Date.now() })
      );
    } catch (error) {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TimeframeDataContext.Provider value={{ data, loading, refresh }}>
      {children}
    </TimeframeDataContext.Provider>
  );
};

export const useTimeframeData = () => useContext(TimeframeDataContext);
