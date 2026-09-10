import { defineConfig } from "orval";

export default defineConfig({
  api: {
    input: {
      // springdoc/knife4j OpenAPI JSON exposed by the backend (see ../pom.xml)
      target: "http://localhost:8123/api/v3/api-docs",
    },
    output: {
      mode: "tags-split",
      target: "./lib/api/generated",
      schemas: "./lib/api/generated/model",
      client: "react-query",
      httpClient: "fetch",
      clean: true,
      override: {
        mutator: {
          path: "./lib/api/mutator/custom-fetch.ts",
          name: "customFetch",
        },
      },
    },
  },
});
