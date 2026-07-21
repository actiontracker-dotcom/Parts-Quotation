"use client";

import { useEffect, useState } from "react";

async function fetchMaster(endpoint) {
  const res = await fetch(endpoint);
  const json = await res.json();
  return json.success ? json.data : [];
}

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

    Promise.all([
      fetchMaster("/api/master/divisions"),
      fetchMaster("/api/master/payment-terms"),
      fetchMaster("/api/master/delivery-terms"),
      fetchMaster("/api/master/enquiry-sources"),
      fetchMaster("/api/master/locations"),
      fetchMaster("/api/master/engineers"),
    ])
      .then(([d, pt, dt, es, l, e]) => {
        if (cancelled) return;
        setDivisions(d);
        setPaymentTerms(pt);
        setDeliveryTerms(dt);
        setEnquirySources(es);
        setLocations(l);
        setEngineers(e);
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
