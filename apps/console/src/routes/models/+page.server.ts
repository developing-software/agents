import type { PageServerLoad } from "./$types";
import { Models } from "@agents/core/models/index";

export const load: PageServerLoad = async () => {
  const [models, providerList] = await Promise.all([Models.allModels(), Models.providers()]);
  const providers = providerList.map((p) => ({
    id: p.id,
    name: p.name,
    modelCount: p.models ? Object.keys(p.models).length : 0,
  }));

  return { models, providers };
};
