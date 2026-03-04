"use client";

import { useState } from "react";

export default function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(window.location.href).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="btn-ghost"
      style={{
        height: 32,
        padding: "6px 12px",
        borderRadius: 8,
        fontSize: 13,
        cursor: "pointer",
      }}
    >
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}
