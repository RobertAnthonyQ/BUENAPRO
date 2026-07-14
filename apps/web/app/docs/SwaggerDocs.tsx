"use client";

import Script from "next/script";
import { useCallback } from "react";

declare global {
  interface Window {
    SwaggerUIBundle?: (config: {
      url: string;
      dom_id: string;
      deepLinking: boolean;
      layout: string;
    }) => unknown;
  }
}

export function SwaggerDocs() {
  const initSwagger = useCallback(() => {
    if (!window.SwaggerUIBundle) return;
    window.SwaggerUIBundle({
      url: "/api/openapi.json",
      dom_id: "#swagger-ui",
      deepLinking: true,
      layout: "BaseLayout",
    });
  }, []);

  return (
    <main className="docs-page">
      <link
        rel="stylesheet"
        href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"
      />
      <div id="swagger-ui" />
      <Script
        src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"
        strategy="afterInteractive"
        onLoad={initSwagger}
      />
    </main>
  );
}
