import { useEffect, useState } from "react";

export default function CookieDisclaimer() {
  const [cookiesEnabled, setCookiesEnabled] = useState(true);

  useEffect(() => {
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = "https://jobdone-ecru.vercel.app/cookie-check.html"; // replace with your deployed domain
    document.body.appendChild(iframe);

    const handleMessage = (event) => {
      if (event.data === "3pc-enabled") {
        setCookiesEnabled(true);
      } else if (event.data === "3pc-disabled") {
        setCookiesEnabled(false);
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
      document.body.removeChild(iframe);
    };
  }, []);

  if (cookiesEnabled) return null;

  return (
    <div className="bg-yellow-100 text-yellow-800 border border-yellow-300 rounded-lg p-3 text-sm flex items-center justify-between mt-2">
      <span>
        ⚠️ Please enable <b>third-party cookies</b> in your browser for login to
        work while JobDone is in testing phase.{" "}
        <a
          href="https://www.whatismybrowser.com/guides/how-to-enable-cookies/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-yellow-900"
        >
          Learn how
        </a>
      </span>
    </div>
  );
}