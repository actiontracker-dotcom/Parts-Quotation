"use client";

import { useEffect, useState } from "react";

export function useMasterData() {
  const [divisions, setDivisions] = useState([]);
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [deliveryTerms, setDeliveryTerms] = useState([]);
  const [enquirySources, setEnquirySources] = useState([]);
  const [locations, setLocations] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/master")
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success) {
          setDivisions(json.data.divisions || []);
          setPaymentTerms(json.data.paymentTerms || []);
          setDeliveryTerms(json.data.deliveryTerms || []);
          setEnquirySources(json.data.enquirySources || []);
          setLocations(json.data.locations || []);
          setEngineers(json.data.engineers || []);
        } else {
          setError(json.message || "Failed to fetch master data.");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    divisions,
    paymentTerms,
    deliveryTerms,
    enquirySources,
    locations,
    engineers,
    loading,
    error,
  };
}
