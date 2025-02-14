"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const solutions_utils_1 = require("solutions-utils");
const exports_1 = require("./exports");
const MODULE_NAME = __filename.split("/").pop();
const handleCreateEvent = async (event) => {
    const newProps = event.ResourceProperties || {};
    const sageMakerMonitoring = newProps.SageMakerMonitoring === "Yes";
    const connectMonitoring = newProps.ConnectMonitoring === "Yes";
    solutions_utils_1.logger.info({
        label: `${MODULE_NAME}/handleCreateEvent`,
        message: `Start putting supported services. SageMaker: ${sageMakerMonitoring ? "Enabled" : "Disabled"}, Connect: ${connectMonitoring ? "Enabled" : "Disabled"}`,
    });
    await (0, exports_1.putServiceMonitoringStatus)({
        serviceTable: process.env.SQ_SERVICE_TABLE,
        refresh: false,
        sageMakerMonitoring: sageMakerMonitoring,
        connectMonitoring: connectMonitoring,
    });
};
const handleUpdateEvent = async (event) => {
    const newProps = event.ResourceProperties || {};
    const oldProps = event.OldResourceProperties || {};
    const sageMakerMonitoring = newProps.SageMakerMonitoring === "Yes";
    const connectMonitoring = newProps.ConnectMonitoring === "Yes";
    const sageMakerChanged = oldProps.SageMakerMonitoring !== newProps.SageMakerMonitoring;
    const connectChanged = oldProps.ConnectMonitoring !== newProps.ConnectMonitoring;
    await (0, exports_1.putServiceMonitoringStatus)({
        serviceTable: process.env.SQ_SERVICE_TABLE,
        refresh: false,
        sageMakerMonitoring: sageMakerChanged ? sageMakerMonitoring : undefined,
        connectMonitoring: connectChanged ? connectMonitoring : undefined,
    });
};
const sleepForResourceProvisioning = async () => {
    const delay = parseInt(process.env.RESOURCES_WAIT_TIME_SECONDS ?? "120") * 1000;
    solutions_utils_1.logger.info({
        label: `${MODULE_NAME}/handler`,
        message: `Sleeping for ${delay / 1000} seconds to make sure all resources are provisioned`,
    });
    await (0, solutions_utils_1.sleep)(delay);
};
const handleCloudFormationEvent = async (event) => {
    await sleepForResourceProvisioning();
    if (event.RequestType === "Create") {
        await handleCreateEvent(event);
    }
    else if (event.RequestType === "Update") {
        await handleUpdateEvent(event);
    }
};
const handler = async (event) => {
    solutions_utils_1.logger.debug({
        label: `${MODULE_NAME}/handler`,
        message: JSON.stringify(event),
    });
    if (solutions_utils_1.LambdaTriggers.isCfnEvent(event)) {
        await handleCloudFormationEvent(event);
    }
    else if (solutions_utils_1.LambdaTriggers.isDynamoDBStreamEvent(event)) {
        await (0, exports_1.handleDynamoDBStreamEvent)(event);
    }
    else if (solutions_utils_1.LambdaTriggers.isScheduledEvent(event)) {
        await (0, exports_1.putServiceMonitoringStatus)({
            serviceTable: process.env.SQ_SERVICE_TABLE,
            refresh: true,
        });
    }
    else {
        solutions_utils_1.logger.error({
            label: `${MODULE_NAME}/handler`,
            message: `Unsupported event type: ${JSON.stringify(event)}`,
        });
        throw new solutions_utils_1.UnsupportedEventException("this event type is not supported");
    }
};
exports.handler = handler;
