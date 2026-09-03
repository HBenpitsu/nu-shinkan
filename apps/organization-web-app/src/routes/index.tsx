import { createFileRoute } from "@tanstack/react-router";
import reactImg from "@/assets/react.svg";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="p-2">
      <h3>Welcome Home!</h3>
      <img src={reactImg} alt="React" />
    </div>
  );
}
