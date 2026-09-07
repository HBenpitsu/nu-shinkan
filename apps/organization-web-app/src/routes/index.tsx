import { createFileRoute } from "@tanstack/react-router";
import reactImg from "@/assets/react.svg";
import {
  ORGANIZATION_USER_SERVICE_BINDING,
  ORGANIZATION_USER_SERVICE_WORKER,
} from "@repo/organization-user-service/interface";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="p-2">
      <h3>Welcome Home!</h3>
      <p>
        This representative frontend consumes{" "}
        <code>{ORGANIZATION_USER_SERVICE_WORKER}</code>
        via the <code>{ORGANIZATION_USER_SERVICE_BINDING}</code> binding.
      </p>
      <img src={reactImg} alt="React" />
    </div>
  );
}
