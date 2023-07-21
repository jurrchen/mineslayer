import { HoneycombSDK } from "@honeycombio/opentelemetry-node";

import 'dotenv/config'

export const sdk = new HoneycombSDK({
  serviceName: 'voyager2',
  instrumentations: [],
});
sdk.start();
console.warn('HONEYCOMB STARTED');
