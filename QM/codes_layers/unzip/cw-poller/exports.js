"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendQuotaUtilizationEventsToBridge = exports.createTestQuotaUtilizationEvents = exports.createQuotaUtilizationEvents = exports.getCWDataForQuotaUtilization = exports.generateMetricQueryIdMap = exports.generateCWQueriesForAllQuotas = exports.getQuotasForService = exports.QUOTA_STATUS = exports.FREQUENCY = exports.METRIC_STATS_PERIOD = void 0;
const solutions_utils_1 = require("solutions-utils");
exports.METRIC_STATS_PERIOD = 3600;
var FREQUENCY;
(function (FREQUENCY) {
    FREQUENCY["06_HOUR"] = "rate(6 hours)";
    FREQUENCY["12_HOUR"] = "rate(12 hours)";
    FREQUENCY["24_HOUR"] = "rate(1 day)";
})(FREQUENCY || (exports.FREQUENCY = FREQUENCY = {}));
var QUOTA_STATUS;
(function (QUOTA_STATUS) {
    QUOTA_STATUS["OK"] = "OK";
    QUOTA_STATUS["WARN"] = "WARN";
    QUOTA_STATUS["ERROR"] = "ERROR";
})(QUOTA_STATUS || (exports.QUOTA_STATUS = QUOTA_STATUS = {}));
function getFrequencyInHours(rate = process.env.POLLER_FREQUENCY) {
    if (rate == FREQUENCY["06_HOUR"])
        return 6;
    if (rate == FREQUENCY["12_HOUR"])
        return 12;
    else
        return 24;
}
async function getQuotasForService(table, service) {
    const ddb = new solutions_utils_1.DynamoDBHelper();
    const items = await ddb.queryQuotasForService(table, service);
    return items ?? [];
}
exports.getQuotasForService = getQuotasForService;
function generateCWQueriesForAllQuotas(quotas) {
    const sq = new solutions_utils_1.ServiceQuotasHelper();
    const queries = [];
    quotas.forEach((quota) => {
        try {
            queries.push(...sq.generateCWQuery(quota, 3600));
        }
        catch (_) {
        }
    });
    return queries;
}
exports.generateCWQueriesForAllQuotas = generateCWQueriesForAllQuotas;
function generateMetricQueryIdMap(quotas) {
    const sq = new solutions_utils_1.ServiceQuotasHelper();
    const dict = {};
    for (const quota of quotas) {
        const metricQueryId = sq.generateMetricQueryId(quota.UsageMetric, quota.QuotaCode);
        dict[metricQueryId] = quota;
    }
    return dict;
}
exports.generateMetricQueryIdMap = generateMetricQueryIdMap;
async function getCWDataForQuotaUtilization(queries) {
    const cw = new solutions_utils_1.CloudWatchHelper();
    const BATCH_SIZE = 100;
    const allDataPoints = [];
    const batchQueries = (queries) => {
        const batches = [];
        while (queries.length > 0) {
            batches.push(queries.splice(0, BATCH_SIZE));
        }
        return batches;
    };
    const batches = batchQueries(queries);
    for (const batch of batches) {
        try {
            const dataPoints = await cw.getMetricData(new Date(Date.now() - getFrequencyInHours() * 60 * 60 * 1000), new Date(), batch);
            allDataPoints.push(...dataPoints);
        }
        catch (error) {
            if (error.name === "CloudWatchServiceException") {
                solutions_utils_1.logger.error(`Error occurred while getting metric data: ${error.message}`);
            }
            else {
                throw error;
            }
        }
    }
    return allDataPoints;
}
exports.getCWDataForQuotaUtilization = getCWDataForQuotaUtilization;
function getMetricQueryIdFromMetricData(metricData) {
    return metricData.Id.split("_pct_utilization")[0];
}
function createQuotaUtilizationEvents(metricData, metricQueryIdToQuotaMap) {
    const metricQueryId = getMetricQueryIdFromMetricData(metricData);
    const quota = metricQueryIdToQuotaMap[metricQueryId];
    const utilizationValues = metricData.Values;
    const items = [];
    const sendOKNotifications = (0, solutions_utils_1.stringEqualsIgnoreCase)(process.env.SQ_REPORT_OK_NOTIFICATIONS, "Yes");
    utilizationValues.forEach((value, index) => {
        const quotaEvents = {
            status: QUOTA_STATUS.OK,
            "check-item-detail": {
                "Limit Code": quota.QuotaCode,
                "Limit Name": quota.QuotaName,
                Resource: quota.UsageMetric?.MetricDimensions?.Resource,
                Service: quota.UsageMetric?.MetricDimensions?.Service,
                Region: process.env.AWS_REGION,
                "Current Usage": "",
                "Limit Amount": "100%",
            },
        };
        if (value >= 100) {
            quotaEvents.status = QUOTA_STATUS.ERROR;
        }
        else if (value > +process.env.THRESHOLD) {
            quotaEvents.status = QUOTA_STATUS.WARN;
        }
        else {
            quotaEvents.status = QUOTA_STATUS.OK;
        }
        quotaEvents["check-item-detail"]["Current Usage"] = "" + value + "%";
        quotaEvents["check-item-detail"].Timestamp = metricData.Timestamps[index];
        if (sendOKNotifications || quotaEvents.status != QUOTA_STATUS.OK) {
            items.push(quotaEvents);
        }
    });
    return items;
}
exports.createQuotaUtilizationEvents = createQuotaUtilizationEvents;
function createTestQuotaUtilizationEvents(testStatus) {
    let usage;
    if (testStatus == QUOTA_STATUS.WARN) {
        usage = process.env.THRESHOLD + "%";
    }
    else {
        usage = "100%";
    }
    const quotaEvents = [
        {
            status: testStatus,
            "check-item-detail": {
                "Limit Code": "L-testquota",
                "Limit Name": "QM Test Quota",
                Resource: "QM test resource",
                Service: "QmTestService",
                Region: "qm-test-region",
                "Current Usage": usage,
                "Limit Amount": "100%",
                Timestamp: new Date(),
            },
        },
    ];
    return quotaEvents;
}
exports.createTestQuotaUtilizationEvents = createTestQuotaUtilizationEvents;
async function sendQuotaUtilizationEventsToBridge(eventBridge, utilizationEvents) {
    const events = new solutions_utils_1.EventsHelper();
    const putEventEntries = [];
    utilizationEvents.forEach((event) => {
        putEventEntries.push({
            Source: "aws-solutions.quota-monitor",
            DetailType: "Service Quotas Utilization Notification",
            Detail: JSON.stringify(event),
            EventBusName: eventBridge,
        });
    });
    await events.putEvent(putEventEntries);
}
exports.sendQuotaUtilizationEventsToBridge = sendQuotaUtilizationEventsToBridge;
