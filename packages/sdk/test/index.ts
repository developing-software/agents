import { DevAgentSdk, } from "../src/agents"
import { createClient } from '../src/agents/client'

async function test() {
  const sdk = new DevAgentSdk({
    client: createClient({
      auth: () => "",
      baseUrl: "http://localhost:5173/api"
    })
  })

  const { data } = await sdk.getApp({

  })
  console.log(data)
  // sdk.
  // const profile = getProfile({
  //   async auth(auth) {
  //     return ""
  //   },
  // })

  // putProfile({})

}

await test()
