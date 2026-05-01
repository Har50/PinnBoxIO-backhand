import React, { useEffect, useState } from "react";

const EXPO_DEV_DOMAIN = "38defd90-5362-4523-ab8a-d909d0a8000a-00-rdlmxu7tmz57.expo.picard.replit.dev";
const EXPO_URL = `exp://${EXPO_DEV_DOMAIN}`;
const QR_API = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(EXPO_URL)}`;

export default function ExpoConnect() {
  const [copied, setCopied] = useState(false);

  function copyUrl() {
    navigator.clipboard.writeText(EXPO_URL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#0f0f0f",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px 20px",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      <div style={{
        backgroundColor: "#1a1a1a",
        borderRadius: "20px",
        border: "1px solid #2a2a2a",
        padding: "40px 36px",
        maxWidth: "400px",
        width: "100%",
        textAlign: "center",
      }}>
        <div style={{
          width: "48px",
          height: "48px",
          borderRadius: "14px",
          backgroundColor: "#6366f1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          fontSize: "24px",
        }}>
          📱
        </div>

        <h1 style={{ color: "#ffffff", fontSize: "22px", fontWeight: "700", margin: "0 0 8px" }}>
          Open in Expo Go
        </h1>
        <p style={{ color: "#888", fontSize: "14px", margin: "0 0 32px", lineHeight: "1.5" }}>
          Open the <strong style={{ color: "#ccc" }}>Expo Go</strong> app on your iPhone,
          tap <strong style={{ color: "#ccc" }}>Scan QR Code</strong>, then scan this:
        </p>

        <div style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          padding: "16px",
          display: "inline-block",
          marginBottom: "28px",
        }}>
          <img
            src={QR_API}
            alt="Expo Go QR code"
            width={260}
            height={260}
            style={{ display: "block", borderRadius: "4px" }}
          />
        </div>

        <p style={{ color: "#666", fontSize: "12px", marginBottom: "16px" }}>
          Or copy the URL and paste it into Expo Go manually:
        </p>

        <div style={{
          backgroundColor: "#111",
          border: "1px solid #2a2a2a",
          borderRadius: "10px",
          padding: "12px 16px",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}>
          <code style={{
            color: "#a78bfa",
            fontSize: "11px",
            wordBreak: "break-all",
            textAlign: "left",
            flex: 1,
          }}>
            {EXPO_URL}
          </code>
          <button
            onClick={copyUrl}
            style={{
              backgroundColor: copied ? "#22c55e" : "#6366f1",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "8px 14px",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
              transition: "background-color 0.2s",
            }}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        <div style={{
          backgroundColor: "#1e1a00",
          border: "1px solid #3a3000",
          borderRadius: "10px",
          padding: "14px 16px",
          textAlign: "left",
        }}>
          <p style={{ color: "#facc15", fontSize: "12px", fontWeight: "600", margin: "0 0 6px" }}>
            How to enter URL in Expo Go:
          </p>
          <ol style={{ color: "#a89a60", fontSize: "12px", margin: 0, paddingLeft: "18px", lineHeight: "1.8" }}>
            <li>Open Expo Go on your iPhone</li>
            <li>Tap the <strong style={{ color: "#ccc" }}>+</strong> button or <strong style={{ color: "#ccc" }}>Scan QR Code</strong></li>
            <li>If scanning doesn't work, look for <strong style={{ color: "#ccc" }}>"Enter URL manually"</strong> below the scanner</li>
            <li>Paste the URL above and tap Go</li>
          </ol>
        </div>
      </div>

      <p style={{ color: "#444", fontSize: "11px", marginTop: "24px" }}>
        PinnboxIO · Development build
      </p>
    </div>
  );
}
