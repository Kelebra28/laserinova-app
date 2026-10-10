import { getAgentRules } from "@/server/actions/agent-rules.actions";
import { KnowledgeClient } from "./KnowledgeClient";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  const response = await getAgentRules();
  const initialRules = response.data || [];

  return <KnowledgeClient initialRules={initialRules} />;
}
