import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function Handoff({ onTokenReceived }: { onTokenReceived: (token: string, fieldRole: string) => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const hasFetchedRef = React.useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    const params = new URLSearchParams(location.search);
    const code = params.get("code");


    if (!code) {
      setError("Invalid or missing handoff code.");
      return;
    }

    const exchangeCode = async () => {
      try {
        const res = await fetch("/api/internal/exchange-handoff-code/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        if (res.ok) {
          const data = await res.json();
          const accessToken = data.access;
          let base64Url = accessToken.split('.')[1];
          let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(atob(base64));

          onTokenReceived(accessToken, payload.field_role || "EMPLOYEE");
          navigate("/", { replace: true });
        } else {
          const err = await res.json();
          setError(err.detail || "Handoff code is invalid, expired, or already used.");
        }
      } catch (e) {
        setError("Network error during authentication handoff.");
      }
    };

    exchangeCode();
  }, [location, navigate, onTokenReceived]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      {error ? (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm max-w-sm text-center">
          <p className="font-bold">Authentication Failed</p>
          <p className="text-xs mt-1 text-red-400">{error}</p>
        </div>
      ) : (
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-slate-400 font-medium">Securing Mobile Workforce Session...</p>
        </div>
      )}
    </div>
  );
}
