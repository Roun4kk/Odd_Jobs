import { useEffect, useState } from "react";
import axios from "axios";

export default function CookieDisclaimer() {
  const [needs3PC, setNeeds3PC] = useState(false);

  useEffect(() => {
    const runProbe = async () => {
      try {
        // Step 1: set a cookie
        await axios.get(`${import.meta.env.VITE_API_BASE_URL}/probe/start`);

        // Step 2: check if cookie comes back
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/probe/check`);
        if (!res.data.hasCookie) setNeeds3PC(true);
        console.log("3PC probe result:", res.data);
      } catch (err) {
        console.error("3PC probe failed:", err);
        // Optional: setNeeds3PC(true) if you want to assume blocked on error
      }
    };

    runProbe();
  }, []);

  if (!needs3PC) return null;

  return (
    <div className="bg-yellow-100 text-yellow-800 border border-yellow-300 rounded-lg p-3 text-sm mt-3 flex justify-between items-center">
      <span>
        ⚠️ Please enable <b>third-party cookies</b> in your browser for login to
        work while JobDone is in testing.{" "}
        <a
          className="underline"
          href="https://www.whatismybrowser.com/guides/how-to-enable-cookies/"
          target="_blank"
          rel="noreferrer"
        >
          Learn how
        </a>
      </span>
    </div>
  );
}