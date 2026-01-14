import { createClient } from "tinacms/dist/client";
import { queries } from "./types";
export const client = createClient({ url: 'http://localhost:4001/graphql', token: '7e9087929ae922aad7e3eeab06ff8655790787bd', queries,  });
export default client;
  