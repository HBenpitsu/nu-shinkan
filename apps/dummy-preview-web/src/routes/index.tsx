import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import reactImg from "@/assets/react.svg";
import {
  DUMMY_PREVIEW_API_BINDING,
  DUMMY_PREVIEW_API_WORKER,
} from "@repo/dummy-preview-api/interface";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [connection, setConnection] = useState("");
  async function checkConnection() {
    try {
      const response = await fetch("/__connection");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setConnection(await response.text());
    } catch (error) {
      setConnection(String(error));
    }
  }
  return (
    <div className="p-2">
      <h3>Welcome Home!</h3>
      <p>
        This frontend depends on <code>{DUMMY_PREVIEW_API_WORKER}</code> through
        the <code>{DUMMY_PREVIEW_API_BINDING}</code> service binding.
      </p>
      <button
        onClick={() => {
          void checkConnection();
        }}
      >
        Check API connection
      </button>
      <pre role="status">{connection}</pre>
      <img src={reactImg} alt="React" />
    </div>
  );
}
