// Each component maps to a Datadog monitor TAG. Tag every relevant monitor
// in Datadog with the matching tag (e.g. service:merchant-portal-web) and
// this service will roll all of them up into one component status.
//
// Status priority when a component has multiple monitors, worst wins:
//   Alert > Warn > No Data > OK
//
// Add/remove/rename entries here to match what you actually want to show
// merchants. Keep "id" stable once published — it's used as the DB key for
// historical uptime, so renaming it starts a fresh history for that row.

module.exports = [
  {
    id: "merchant-portal",
    name: "Merchant Portal",
    description: "Login, dashboard, and account management",
    datadogTag: "service:merchant-portal-web",
  },
  {
    id: "payments-api",
    name: "Payments API",
    description: "Card and ACH payment processing",
    datadogTag: "service:payments-api",
  },
  {
    id: "payouts",
    name: "Payouts & Settlements",
    description: "Merchant payouts and settlement reporting",
    datadogTag: "service:payouts-service",
  },
  {
    id: "webhooks",
    name: "Webhooks",
    description: "Outbound event notifications",
    datadogTag: "service:webhooks-dispatcher",
  },
  {
    id: "reporting",
    name: "Reporting & Analytics",
    description: "Transaction reports and dashboards",
    datadogTag: "service:reporting-service",
  },
];
