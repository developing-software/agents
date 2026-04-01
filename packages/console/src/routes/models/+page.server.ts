import type { PageServerLoad } from "./$types";
import { ModelsDev } from "@agents/core/models-dev/index";

export const load: PageServerLoad = async () => {
  const [models, providerList] = await Promise.all([
    ModelsDev.allModels(),
    ModelsDev.providers(),
  ]);
  const providers = providerList.map((p) => ({
    id: p.id,
    name: p.name,
    modelCount: p.models ? Object.keys(p.models).length : 0,
  }));

  return { models, providers };
};
