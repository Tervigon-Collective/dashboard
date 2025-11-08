"use client";

import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

const Html5QrScanner = ({
  onScan,
  onError,
  fps = 10,
  qrbox = 250,
  disableFlip = false,
  verbose = false,
  className = "",
}) => {
  const containerIdRef = useRef(
    `html5-qrcode-${Math.random().toString(36).slice(2)}`
  );
  const scannerRef = useRef(null);
  const isRunningRef = useRef(false);

  const safeClear = async (instance) => {
    if (instance && typeof instance.clear === "function") {
      try {
        const result = instance.clear();
        if (result && typeof result.catch === "function") {
          await result.catch(() => {});
        }
      } catch (_) {
        // ignore
      }
    }
  };

  useEffect(() => {
    const containerId = containerIdRef.current;
    const html5QrCode = new Html5Qrcode(containerId, { verbose });
    scannerRef.current = html5QrCode;

    html5QrCode
      .start(
        { facingMode: "environment" },
        { fps, qrbox, disableFlip },
        (decodedText) => {
          if (onScan) {
            onScan(decodedText);
          }
        },
        (errorMessage) => {
          if (onError) {
            onError(errorMessage);
          }
        }
      )
      .then(() => {
        isRunningRef.current = true;
      })
      .catch(async (err) => {
        if (onError) {
          onError(err?.message || "Failed to start camera");
        }
        await safeClear(html5QrCode);
      });

    return () => {
      const instance = scannerRef.current;
      if (!instance) {
        return;
      }

      if (isRunningRef.current) {
        const stopPromise = instance.stop();
        const stopHandled =
          stopPromise && typeof stopPromise.catch === "function"
            ? stopPromise.catch(() => {})
            : Promise.resolve();

        stopHandled
          .catch(() => {})
          .finally(async () => {
            await safeClear(instance);
            scannerRef.current = null;
            isRunningRef.current = false;
          });
      } else {
        safeClear(instance).then(() => {
          scannerRef.current = null;
        });
      }
    };
  }, [onScan, onError, fps, qrbox, disableFlip, verbose]);

  return <div id={containerIdRef.current} className={className} />;
};

export default Html5QrScanner;
