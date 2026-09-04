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
  return (
    <div className="p-2">
      <h3>Welcome Home!</h3>
      <p>
        This frontend depends on <code>{DUMMY_PREVIEW_API_WORKER}</code> through
        the <code>{DUMMY_PREVIEW_API_BINDING}</code> service binding.
      </p>
      <img src={reactImg} alt="React" />
    </div>
  );
}
