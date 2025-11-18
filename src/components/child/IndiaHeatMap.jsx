"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";

const IndiaHeatMap = ({ salesData = [] }) => {
  const svgRef = useRef(null);
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, text: "" });
  const [hoveredState, setHoveredState] = useState(null);

  // Map province names to state codes (ISO 3166-2:IN)
  const provinceToStateCode = {
    "Haryana": "IN-HR",
    "Delhi": "IN-DL",
    "Uttar Pradesh": "IN-UP",
    "Tamil Nadu": "IN-TN",
    "Maharashtra": "IN-MH",
    "Karnataka": "IN-KA",
    "West Bengal": "IN-WB",
    "Punjab": "IN-PB",
    "Himachal Pradesh": "IN-HP",
    "Rajasthan": "IN-RJ",
    "Meghalaya": "IN-ML",
    "Andhra Pradesh": "IN-AP",
    "Assam": "IN-AS",
    "Bihar": "IN-BR",
    "Chhattisgarh": "IN-CT",
    "Goa": "IN-GA",
    "Gujarat": "IN-GJ",
    "Jharkhand": "IN-JH",
    "Jammu and Kashmir": "IN-JK",
    "Kerala": "IN-KL",
    "Madhya Pradesh": "IN-MP",
    "Manipur": "IN-MN",
    "Mizoram": "IN-MZ",
    "Nagaland": "IN-NL",
    "Odisha": "IN-OR",
    "Sikkim": "IN-SK",
    "Telangana": "IN-TG",
    "Tripura": "IN-TR",
    "Uttarakhand": "IN-UT",
    "Arunachal Pradesh": "IN-AR",
    "Andaman and Nicobar Islands": "IN-AN",
    "Chandigarh": "IN-CH",
    "Dadra and Nagar Haveli and Daman and Diu": "IN-DD",
    "Lakshadweep": "IN-LD",
    "Puducherry": "IN-PY",
  };

  // Create a map of state codes to sales data
  const stateSalesMap = useMemo(() => {
    const map = {};
    salesData.forEach((item) => {
      const stateCode = provinceToStateCode[item.province];
      if (stateCode) {
        map[stateCode] = item.total_sales;
      }
    });
    return map;
  }, [salesData]);

  // Calculate min and max sales for color scaling
  const { minSales, maxSales } = useMemo(() => {
    if (!salesData || salesData.length === 0) {
      return { minSales: 0, maxSales: 1 };
    }
    const salesValues = salesData.map((item) => item.total_sales || 0);
    if (salesValues.length === 0) {
      return { minSales: 0, maxSales: 1 };
    }
    return {
      minSales: Math.min(...salesValues),
      maxSales: Math.max(...salesValues) || 1,
    };
  }, [salesData]);

  // Function to get color based on sales value
  const getColorForSales = useMemo(() => {
    return (sales) => {
      if (!sales || sales === 0) {
        return "#F3F4F6"; // Light gray for no data
      }

      // Normalize sales value between 0 and 1
      const normalized = (sales - minSales) / (maxSales - minSales || 1);

      // Theme-based color gradient using primary colors
      // From light primary blue (low) to dark primary blue (high)
      const colors = [
        "#e4f1ff", // primary-50 - Very light blue
        "#bfdcff", // primary-100 - Light blue
        "#95c7ff", // primary-200 - Lighter blue
        "#6bb1ff", // primary-300 - Medium light blue
        "#519fff", // primary-400 - Medium blue
        "#458eff", // primary-500 - Blue
        "#487fff", // primary-600 - Brand blue (main)
        "#486cea", // primary-700 - Dark blue
        "#4759d6", // primary-800 - Darker blue
        "#4536b6", // primary-900 - Very dark blue
      ];

      // Use more precise color interpolation
      const colorIndex = Math.min(
        Math.floor(normalized * (colors.length - 1)),
        colors.length - 1
      );
      
      // Interpolate between colors for smoother gradient
      const nextIndex = Math.min(colorIndex + 1, colors.length - 1);
      const fraction = (normalized * (colors.length - 1)) - colorIndex;
      
      if (fraction === 0 || colorIndex === nextIndex) {
        return colors[colorIndex];
      }
      
      // Simple interpolation between two colors
      const color1 = colors[colorIndex];
      const color2 = colors[nextIndex];
      
      // Convert hex to RGB
      const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : null;
      };
      
      const rgb1 = hexToRgb(color1);
      const rgb2 = hexToRgb(color2);
      
      if (!rgb1 || !rgb2) return colors[colorIndex];
      
      const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * fraction);
      const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * fraction);
      const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * fraction);
      
      return `rgb(${r}, ${g}, ${b})`;
    };
  }, [minSales, maxSales]);

  // Cache SVG content
  const svgCache = React.useRef(null);

  useEffect(() => {
    const eventHandlers = [];
    let isMounted = true;
    
    const loadSVG = async () => {
      try {
        // Use cached SVG if available
        let svgText = svgCache.current;
        
        if (!svgText) {
          const response = await fetch("/assets/svg/india.svg");
          svgText = await response.text();
          svgCache.current = svgText; // Cache it
        }
        
        if (!isMounted || !svgRef.current) return;
        
        // Only update innerHTML if it's empty or data changed
        if (!svgRef.current.innerHTML || svgRef.current.innerHTML !== svgText) {
          svgRef.current.innerHTML = svgText;
        }
        
        // Get all path elements (states)
        const paths = svgRef.current.querySelectorAll("path[id^='IN-']");
        
        paths.forEach((path) => {
          const stateId = path.getAttribute("id");
          const sales = stateSalesMap[stateId] || 0;
          const provinceName = path.getAttribute("title") || stateId;
          
          // Set initial color with smooth transitions
          const fillColor = getColorForSales(sales);
          path.setAttribute("fill", fillColor);
          path.setAttribute("stroke", "#ffffff");
          path.setAttribute("stroke-width", "0.5");
          path.style.cursor = "pointer";
          path.style.transition = "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)";
          path.style.filter = "none";

            // Mouse enter event
            const handleMouseEnter = (e) => {
              // Enhanced hover effect with scale
              path.setAttribute("fill", "#FBBF24"); // Highlight color on hover
              path.setAttribute("stroke", "#F59E0B");
              path.setAttribute("stroke-width", "2.5");
              path.style.filter = "brightness(1.1) drop-shadow(0 2px 4px rgba(251, 191, 36, 0.3))";
              
              setHoveredState(stateId);
              
              // Show tooltip with formatted text
              const formattedSales = sales > 0 
                ? `₹${sales.toLocaleString('en-IN')}` 
                : "No data";
              
              setTooltip({
                show: true,
                x: e.clientX,
                y: e.clientY,
                text: `${provinceName}: ${formattedSales}`,
              });
            };

            // Mouse leave event
            const handleMouseLeave = () => {
              // Reset to original state
              path.setAttribute("fill", getColorForSales(sales));
              path.setAttribute("stroke", "#ffffff");
              path.setAttribute("stroke-width", "0.5");
              path.style.filter = "none";
              
              setHoveredState(null);
              setTooltip({ show: false, x: 0, y: 0, text: "" });
            };

            // Mouse move event for tooltip positioning
            const handleMouseMove = (e) => {
              setTooltip((prev) => ({
                ...prev,
                x: e.clientX,
                y: e.clientY,
              }));
            };

            path.addEventListener("mouseenter", handleMouseEnter);
            path.addEventListener("mouseleave", handleMouseLeave);
            path.addEventListener("mousemove", handleMouseMove);

            // Store handlers for cleanup
            eventHandlers.push({
              element: path,
              handlers: {
                mouseenter: handleMouseEnter,
                mouseleave: handleMouseLeave,
                mousemove: handleMouseMove,
              },
            });
          });
      } catch (error) {
        console.error("Error loading SVG:", error);
      }
    };

    loadSVG();

    // Cleanup function
    return () => {
      isMounted = false;
      eventHandlers.forEach(({ element, handlers }) => {
        if (element) {
          element.removeEventListener("mouseenter", handlers.mouseenter);
          element.removeEventListener("mouseleave", handlers.mouseleave);
          element.removeEventListener("mousemove", handlers.mousemove);
        }
      });
    };
  }, [salesData, stateSalesMap, getColorForSales]);

  return (
    <div className="position-relative" style={{ width: "100%", height: "100%", minHeight: "400px" }}>
      <div
        ref={svgRef}
        className="india-map-container"
        style={{
          width: "100%",
          height: "auto",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "8px 0",
          overflow: "hidden",
        }}
      >
        <style>{`
          .india-map-container svg {
            width: 100%;
            height: auto;
            max-width: 100%;
            display: block;
          }
          @media (max-width: 768px) {
            .india-map-container svg {
              transform: scale(0.9);
              transform-origin: center;
            }
          }
          @media (max-width: 576px) {
            .india-map-container svg {
              transform: scale(0.85);
              transform-origin: center;
            }
          }
        `}</style>
      </div>
      
      {/* Enhanced Tooltip - Minimal */}
      {tooltip.show && (
        <div
          className="position-fixed bg-dark text-white rounded shadow-lg border-0"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            pointerEvents: "none",
            zIndex: 1000,
            fontSize: "12px",
            fontWeight: "500",
            whiteSpace: "nowrap",
            transform: "translate(-50%, calc(-100% - 10px))",
            padding: "6px 10px",
            borderRadius: "5px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div className="d-flex align-items-center" style={{ gap: "6px" }}>
            <div
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#FBBF24",
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: "12px" }}>{tooltip.text}</span>
          </div>
          <div
            className="position-absolute"
            style={{
              bottom: "-5px",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "5px solid #1a1a1a",
            }}
          />
        </div>
      )}

      {/* Enhanced Legend - Vertical & Space Efficient */}
      <div
        className="position-absolute"
        style={{
          top: "8px",
          right: "8px",
          background: "rgba(255, 255, 255, 0.98)",
          backdropFilter: "blur(10px)",
          padding: "8px 6px",
          borderRadius: "6px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          zIndex: 100,
          border: "1px solid #F3F4F6",
          minWidth: "60px",
        }}
      >
        <div className="d-flex flex-column align-items-center gap-2">
          {/* High - Top */}
          <div className="d-flex flex-column align-items-center gap-1">
            <div className="fw-semibold" style={{ fontSize: "clamp(9px, 1vw, 10px)", color: "#111827", lineHeight: "1.2" }}>
              High
            </div>
            <div style={{ color: "#6B7280", fontSize: "clamp(8px, 0.9vw, 9px)", lineHeight: "1.2", fontWeight: "500" }}>
              ₹{maxSales.toLocaleString()}
            </div>
          </div>
          
          {/* Vertical Color gradient bar */}
          <div 
            style={{
              width: "10px",
              height: "clamp(100px, 15vh, 140px)",
              background: "linear-gradient(to bottom, #4536b6, #4759d6, #486cea, #487fff, #458eff, #519fff, #6bb1ff, #95c7ff, #bfdcff, #e4f1ff)",
              borderRadius: "5px",
              flexShrink: 0,
              border: "1px solid #E5E7EB",
            }}
          />
          
          {/* Low - Bottom */}
          <div className="d-flex flex-column align-items-center gap-1">
            <div className="fw-semibold" style={{ fontSize: "clamp(9px, 1vw, 10px)", color: "#111827", lineHeight: "1.2" }}>
              Low
            </div>
            <div style={{ color: "#6B7280", fontSize: "clamp(8px, 0.9vw, 9px)", lineHeight: "1.2", fontWeight: "500" }}>
              ₹{minSales.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(IndiaHeatMap);
