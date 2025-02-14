"use strict";
process.on("unhandledRejection", (reason) => {
    throw reason;
});
process.env.LOG_LEVEL = "none";
process.env.SEND_METRIC = "Yes";
process.env.SOLUTION_ID = "MyId";
process.env.SOLUTION_UUID = "Uuid";
process.env.METRICS_ENDPOINT = "MyEndpoint";

process.env.AWS_REGION = "ap-southeast-1";  // default region for testing
process.env.VPC_ENABLED = "true";  // flag to enable/disable VPC discovery in tests