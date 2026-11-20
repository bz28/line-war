// OWNER: botsim track. Headless bot matches + balance report.
export * from './types';
export { runMatch, buildConfig, longestMatchTicks, ARENAS, arenaById, type RunMatchOptions, type CreateBots } from './runner';
export { Collector, dishesInProgress, hasDishFor, isSubMultiset, STILL_RADIUS, type CollectorOptions } from './collector';
export { aggregate, CLOSE_MARGIN, type ScenarioAggregate, type RecipeAggregate } from './aggregate';
export { wilson, mean, ratio, type Interval } from './stats';
export { BUILTIN_SCENARIOS, parseCustomScenario, selectScenarios, type ScenarioDef } from './scenarios';
export { MatchPool, defaultWorkers } from './pool';
export { runSpec, loadCreateBots } from './spec';
export { deriveSeed } from './seeds';
export * from './suite';
export { renderMarkdown, renderJson, type ReportMeta } from './report';
export { parseArgs, parseSkillGrid, USAGE, type CliOptions } from './args';
