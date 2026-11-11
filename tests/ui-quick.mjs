// Snabb delmängd av regressionen: de React-prov som läser appens vyer och texter.
// Hela sviten körs fortfarande av tests/outlook.mjs i CRM checks.
import './role-navigation.mjs';
await (await import('./production-date-overview.mjs')).verifyProductionDateOverview();
await (await import('./prospect-results.mjs')).verifyProspectResults();
await (await import('./order-guide-next-step.mjs')).verifyOrderGuideNextStep();
await (await import('./customer-import-preview.mjs')).verifyCustomerImportPreview();
await (await import('./my-day-profile-link.mjs')).verifyMyDayProfileLink();
await (await import('./my-day-customer-scope.mjs')).verifyMyDayCustomerScope();
await (await import('./account-identity-details.mjs')).verifyAccountIdentityDetails();
await (await import('./calendar-profile-link.mjs')).verifyCalendarProfileLink();
await (await import('./sales-task-profile.mjs')).verifySalesTaskProfile();
await (await import('./followup-draft-resume.mjs')).verifyFollowupDraftResume();
await (await import('./onboarding-scope.mjs')).verifyOnboardingScope();
await (await import('./customer-issue-scope.mjs')).verifyCustomerIssueScope();
await (await import('./customer-scope.mjs')).verifyCustomerScope();
await (await import('./deal-scope.mjs')).verifyDealScope();
await (await import('./order-scope.mjs')).verifyOrderScope();
await (await import('./yearwheel-scope.mjs')).verifyYearwheelScope();
await (await import('./result-deal-scope.mjs')).verifyResultDealScope();
await (await import('./result-order-scope.mjs')).verifyResultOrderScope();
await (await import('./customer-risk-scope.mjs')).verifyCustomerRiskScope();
await (await import('./prospect-customer-scope.mjs')).verifyProspectCustomerScope();
await (await import('./notice-work-scope.mjs')).verifyNoticeWorkScope();
await (await import('./customer-picker-scope.mjs')).verifyCustomerPickerScope();
console.log('ui-quick: ok');
