# Approach for CheetCode v2

## 1. Problem framing - What went wrong with v1

Cheetcode v1 was a cool test, but I wouldn't say that it necessarily accomplished the goal of evaluating the agent orchestration abilities of challengers. I understand that the intended solution the challenge promoted was the use of parallel agents to solve each of the 10 questions in rapid succession, but this ends up measuring how quickly you could automate LeetCode questions, the orchestration just extract + parallel calls once you understood the challenge.

Some of the exploits also made it possible to solve everything with one agent being slow and still get a max score which shouldn't be possible in a challenge trying to evaluate a person's ability to orchestrate agents. Exploiting site weaknesses became a better route than building a good agent.

To break down specific failures:

- The hidden exploits were all discoverable by reading server code
- The two landmines (prompt injection in problem text, fake server instruction in API responses) were binary so either your agent was vulnerable or it wasn't. No gradient of quality measured.
- All game state lived in React `useState` hooks in a single `page.tsx`. React fiber injection gave full control over the timer and game flow. My winning agent walked the fiber tree and bypassed everything.

The agent that topped the leaderboard demonstrated source code analysis and request exploitation instead of good orchestration.

**What is agent-orchestration? - first thoughts I had about framing the problem**

To fully frame the problem it's key to understand what is agent-orchestration at its core. There's a million ways to describe what an agent orchestrator is, but at its most basic it just describes a system that conducts multiple agents to solve a goal. Uses of orchestrators span from speeding up workflows, breaking up complex tasks, and enabling long running autonomous tasks. Agent orchestrator also refers to someone who builds agents which is the case here, we are trying to find good agent orchestrators (like me)

The backbone of a well orchestrated agent is its harness, I believe it's the most important design piece and it influences the overall quality of an agent by magnitudes. The harness enables autonomous work through containing a set of capabilities that work together to curate agent behavior and I chose to focus on the following capabilities that I deem most important inside a harness:

**Multi-step Reasoning** — Can the agent chain together operations where steps rely on each other?

**Data synthesis** — Can the agent take in data from different sources and distill the information into one answer?

**Parallel work** — Can the agent use multiple subagents at the same time to speed up the completion of a task by delegating sub tasks to different agents?

**Task prioritization** — Can the agent understand the big picture of its goal and correctly prioritize which tasks should be completed before others?

**Tool Use** — Is the agent able to recognize that it has tools available to it, what the tools do, and when it should use them?

**Adaptiveness** — Is the agent able to adapt when faced with an issue that initially goes wrong?

There are many other things that go into creating a great agent, for example **memory/context** might be the biggest factor in more complex agents but for the scope of the challenge I chose to focus my evaluation on these capabilities. The capabilities became the primary driver in how I chose to design the evaluation.

## 2. Design goals - how to effectively evaluate the capabilities

When thinking about designing a better challenge compared to v1 a simple approach would be to just create more code challenges that have to be solved while still having a strict time limit. The issue with that is that llm's are incredibly good at solving code problems so it doesn't end up providing a good signal for a well orchestrated agent. It just leaves us relying on speed as the only thing that matters for scoring after the challenges are complete.

The correct approach would be creating challenges that can test the capabilities I described, which is exactly what I aimed for while designing my own challenges. I've had experience with plenty of evaluation methods that aim to score how well agents do things and the one I drew most inspiration from was WebGames by Convergence AI. It consists of isolated tasks that appear on a page and the model attempts to solve them while they vary in difficulty and tools needed to solve them such as interacting with the live browser instead of with a headless one.

I chose to go with a web browser challenge format as it felt natural given the challenge is for Firecrawl which scrapes the web and you guys just released the browser sandbox that allows agents to navigate the web.

Still there were issues with how the capabilities would be evaluated without knowing the method/code used by participants, WebGames evaluates on task success alone, but I don't have the time to create a large dataset of tasks to make that evaluation method give out a good signal. On top of that I had to create the design so it had a strong anti-gaming strategy and also a way to calculate contestant scores other than correct answers and time.

## 3. The solution — anti-gaming, architecture, and scoring tied together

I discovered that I could manipulate the browser navigation challenges to actually solve all my problems with what I believe to be quite an elegant solution that touched on architecture, anti-gaming, and scoring/evaluation strategy. They all are connected with each other closely so I'm going to walk through them as one thing and point out each piece.

### Anti-gaming strategy

Starting off with how I tackled anti-gaming within browser challenges and what I wanted to do first was make sure no important source code could be easily retrieved from the site like v1 allowed. As I thought about it more though I asked myself "What if it didn't matter if they could see the source code?" which ended up being a key piece to my solution for an anti-gaming strategy.

Instead of creating challenges that had a set bank of problems to pick from, I created my challenges to be seed based. They were designed to include reasoning, thousands of configurations, and be solvable server-side with a secret seed hash. Even though the structure of each question was similar session to session, the answers and questions varied slightly. Building the questions out this way effectively stopped the strategy of hardcoding a solution and set a strict requirement for needing the use of llms, something that could be bypassed in v1 with a script.

This requirement was imposed by the reasoning based questions in each challenge. The ordering and language would be changed depending on the seed so parsing a question for info would also fail. Each challenge has multiple instruction variants selected by the seed which gives different phrasings of the same task so agents can't pattern-match on exact instruction strings across sessions.

This change also meant that it didn't matter if my source code was exposed. Even if someone got the source code and saw how the challenges were structured, creating a solution that could solve every single seed would be more work than just doing agent-orchestration. And honestly if someone reads the source, understands every challenge type, and builds an agent that actually navigates the UI and solves dynamically generated problems then that's the exact skill we are testing.

I think coming up with this design and implementing it was my favorite part of the challenge due to how it was able to solve so many issues with the exploitability as long as I kept the secret seed safe.

### Architecture and data flow

I kept the same base architecture that was in v1 opting to use Convex with Next.js hosted on Vercel. What I did do was change as much of the functions and code to be server-side only. This was to minimize the information that could be gathered by probing around the site.

I removed the QuickJS WASM sandbox entirely since it was ~10MB of binary for executing user code that was no longer needed since the challenges are browser interaction, not code execution.

The challenge generation function would return three objects:

- `pageData` — sent to the client as the question and supporting data
- `hiddenData` — info gated behind interaction endpoints
- `answer` — never sent anywhere, stays server-side

The agent would have to submit their answer which would fire an API call to `/api/validate/[challengeId]`. The server recomputes the answer from the seed and compares. The answer is never seen client-side.

But I went further than just keeping answers server-side. I added several more layers:

**Interact-gated data.** 18 of 20 challenges hide critical data behind 'interact' api endpoints. Paginated table rows, modal details, hidden form fields, flaky data sources which means you have to actually interact with the page to get the data you need. You can't just parse the initial API response and skip the browser.

**Render tokens.** When a challenge page loads, the server generates an HMAC-SHA256 token binding the session, challenge, and timestamp together. Every interact call needs this token, and it expires after 60 seconds so you can't call interact endpoints without actually loading the challenge page first.

**Minimum solve times.** 3 seconds for Tier 1, 5s for Tier 2, 8s for Tier 3, 10s for Tier 4. Submit before the minimum and it gets rejected. Prevents pre-computation even if someone somehow derived the answer. I do think that people could theoretically answer them faster than 8-10 seconds but I just chose those arbitrarily, easy to adjust down the line.

**Rate limiting on interactions.** 500ms minimum between consecutive interact calls. Can't machine-gun the API to dump all hidden data at once.

**3 attempts per challenge.** Wrong answers don't subtract points but instead consume attempts. Three wrong and the challenge locks for the rest of the session. This leads to one of the pillars on how I'm able to spot good agent orchestration, the dependency graph.

### The dependency graph (DAG)

This is probably the single most important design decision in v2 and the thing that ties the scoring and evaluation strategy together.

In v1 all challenges were independent. An orchestrator's job was basically `Promise.all([...challenges])`. Spin up N browsers, fire everything in parallel, collect results.

I structured the 20 challenges as a dependency graph. Challenges have prerequisites such as not being able to attempt a Tier 2 challenge until you've solved the Tier 1 challenge it depends on. The session API returns the full `dependsOn` array for every challenge so the agent has all the information it needs to plan. This effectively gives the agent the ability to map out how it will use its resources to solve the challenges, a good agent should be able to recognize the order it must do things to maximize parallel calls and minimize downtime.

Here's how it looks:

```
Wave 0 (all start immediately):
  table-sort (1pt) ── nothing downstream
  form-fill (1pt) ───→ linked-data-lookup ─┬─→ constraint-solver (5pt) ──→ red-herring (4pt)
  dropdown-select (1pt) ──→ multi-step-wizard     ├─→ fan-out-aggregator (4pt)
  tab-navigation (1pt) ─┬─→ sequential-calc ──┬───├─→ inventory-reconciliation (4pt)
                         │                     ├──→ data-dashboard (4pt) ──┐
                         │                     ├──→ price-negotiator (5pt) │
                         │                     └──→ event-sourcing (4pt)   │
                         └─→ resilient-collector ──→ trace-analyzer (4pt)  │
  filter-search (1pt) ──→ config-debugger ────────────────────────────────┼─→ calculation-audit (4pt)
  modal-interaction (1pt) ── nothing downstream                           │
                                                             (requires both)
```

This forces real orchestration decisions. Not all Tier 1 challenges are equal — `form-fill` gates 19+ points downstream while `table-sort` gates nothing. An agent that doesn't read the DAG and just starts solving challenges randomly wastes time on dead-end branches. A good agent sorts them out immediately and hits the critical path roots first.

The 3-attempt lockout can be devastating here since if you fail `tier1-form-fill` you permanently lose access to linked-data-lookup, constraint-solver, red-herring, fan-out-aggregator, and inventory-reconciliation. That's 5 challenges wiped out from failing a 1-point challenge. A careful agent double-checks answers on high-fan-out nodes instead of being reckless and killing entire branches.

### Scoring and evaluation

v1 used ELO and was opaque, two agents could reach the same score either by solving problems or by exploiting the timer. The number didn't decompose into anything meaningful for finding good agent-orchestration.

I created a composite score that combines two things:

```
compositeScore = completionScore * 0.60 + orchestrationScore * 0.40
```

Completion is the percentage of total possible points earned by solving challenges while orchestration is a bit more interesting.

The orchestration metrics system (`src/lib/orchestration-metrics.ts`) computes five sub-scores from the event stream without ever seeing inside the agent:

- **Parallelization (25%)** — measures maximum overlapping work windows. If an agent is working on many challenges simultaneously, the windows overlap. Serial agents show zero overlap.
- **DAG Efficiency (25%)** — were the critical path roots among the first challenges viewed? How tight was the pipeline between solving a prerequisite and starting its dependent?
- **Critical Path Speed (20%)** — ratio of theoretical minimum chain time to actual completion time across 12 defined critical chains
- **Submission Confidence (15%)** — ratio of correct to total submissions. Rewards accuracy over brute-forcing.
- **Failure Recovery (15%)** — after a wrong answer, what did the agent do? Investigate then succeed gets a 1.0. Quick brute-force retry that fails gets 0.0. Pivoting to a different challenge gets 0.5. Each behavior is classified and scored.

Tiebreakers go: (1) higher composite score, (2) higher completion %, (3) fewer wrong submissions, (4) earlier last correct answer, (5) fewer API calls.

To explain how this data is collected I will go over the telemetry/observability I created for the site

### Telemetry and observability

Telemetry collected from the actions of agents was my solution to being able to evaluate the abilities of agents. The awesome thing about this is that it lets me measure orchestration quality from behavior without having to see the agent's code or its prompts. I can reconstruct its strategy from the timestamps of what it viewed, interacted with, and submitted. An agent that pipelines dependencies tightly, parallelizes effectively, and recovers intelligently from failures scores higher in orchestration which is the exact signal we want.

These are all collected with timestamps and challenge IDs: `challenge_viewed`, `challenge_interacted`, `answer_submitted`, `answer_correct`, `answer_wrong`, `challenge_locked`

From this I can reconstruct an agent's entire strategy. Which challenges did it view first? Were they critical path roots? How many challenges overlapped in work windows? How quickly did it start a dependent after solving its prerequisite? After a wrong answer, did it investigate and retry or just brute-force?

I built a few tools on top of this:

**Admin dashboard** (`/admin`) — gated behind an API key. Shows per-challenge success rates, average solve times, lock rates, and the top wrong answers (useful for identifying when a challenge is confusing vs genuinely hard). Sessions are expandable with inline Gantt charts and event timelines. You can also select two sessions for head-to-head comparison with overlaid Gantt charts.

**Live spectator mode** (`/spectate/[sessionId]`) — watch an agent solve challenges in real time. Shows an interactive DAG with nodes changing state (idle → viewing → working → solved), a live Gantt chart with a pulsing "now" marker, an event feed with auto-scroll, and a score panel with live countdown. Events are bucketed into 30-second windows so competitors watching can't extract exact solve times.

**Shareable report cards** (`/results/[sessionId]`) — server-rendered page with overall score, letter grade, rank, orchestration sub-grades, per-challenge breakdown, and timeline summary. I created this as a way to promote sharing scores on twitter which would boost overall engagement to the challenge. Every completed session becomes shareable marketing content for Firecrawl.

The spectator mode and report cards are features I'm really proud of because they transform the platform from a testing tool into something that can get people to actually want to share and watch, turning evaluation into content.

## 4. The challenge suite

20 challenges across 4 tiers. Like I mentioned, every challenge generates unique data per session from the seed, gates critical info behind interact endpoints, and validates answers server-side. I made sure no two challenges use the same interaction pattern so agents can't reuse a single DOM scraping strategy for everything.

### Tier 1 — Browser Fundamentals (6 challenges, 1pt each)

Baseline for what the agent should be able to do.

### Tier 2 — Multi-Step Workflows (5 challenges, 2-4pts)

Output of one step feeds the next. Some steps are only revealed after the agent reaches them.

### Tier 3 — Complex Synthesis (7 challenges, 4-5pts)

These require pulling data from multiple sources and computing derived answers with slight traps in some questions.

### Tier 4 — Advanced Analysis (2 challenges, 4pts each)

Complex synthesis plus deliberate misdirection.

## 5. What changed vs v1

Keeping it short since I've covered most of this already:

**Removed entirely:** QuickJS WASM sandbox, the exploit/landmine system, client-side game state, the static problem bank, ELO scoring.

**Kept:** Next.js App Router, Convex for real-time DB, GitHub OAuth via NextAuth, the concept of a timed leaderboard challenge, goal of evaluating agent orchestrators.

**Added:** Seed-based dynamic data generation, 20 browser interaction challenges across 4 tiers, the DAG dependency structure, interact-gated data, render token system, minimum solve times and interact rate limiting, orchestration quality metrics, admin dashboard, live spectator mode, shareable report cards, instruction variant system, and an E2E test harness.

The biggest philosophical shift is that v2 trusts the client for nothing and the security relies on the fact that there's nothing useful to hide. The source code is public. The answers are still impossible to precompute without the server secret.

## 6. Challenge hardening

I ran dozens of rounds (probably close to 50) of testing with Playwright-based test agents to calibrate difficulty. The goal during this process was to harden my initial challenges to a point where the challenge set couldn't be one shot and took so long to solve without a proper harness that it made one a necessity. For some insight on how the performance of the agents evolved over time, during versions 1-4 of the questions Opus and Sonnet were completing the solution set in 12-20 minutes. This is still slow for the challenge but they weren't using any special harness, eventually it got to the point where neither of these models could finish the problems without heavy guidance or a large amount of time 45min-2hrs, by then I would just label that as a fail and test with an agent I actually orchestrated. If my agent was able to pass the same challenges the heavy models would fail in a fraction of the time I settled believing the site and challenges were sufficiently hardened.

- **Constraint solver** went from 100% → 75% after adding relative constraints ("below average price"). The threshold depends on the dataset itself so items can't be evaluated independently.
- **Data dashboard** went from 88% → 71% by tuning the misleading Quick Stats card to be more consistently wrong.
- **Red herring** went from 79% → 67% by renaming tabs to "Report A"/"Report B" (no semantic hints), adding an Annual column check, and making the decoy error subtler — off by 1-3 in a single quarter of a non-target metric.
- **Form fill** went from 86% → 71% by adding field transformations. Raw values no longer work as answers.
- **Calculation audit** stayed at 93% — the formula is too mechanical. I'd need multi-variable formulas or interpolation to make this harder. Didn't have time, but didn't affect the overall goal much.

Even the best sessions I had with 100% completion didn't maximize the orchestration side of things. This is great as it leads to different scores across people that manage to solve every question which just leave them to focus on improving the harness while keeping their high completion rate. It leads to a better gradient of scores than relying on correctness alone.

## 7. Firecrawl alignment

Every challenge maps to a real-world web interaction pattern that Firecrawl might encounter:

Paginated data extraction (table-sort, filter-search, data-dashboard)
Form automation (form-fill, multi-step-wizard)
Dynamic content behind tabs, modals, and accordions (tab-navigation, modal-interaction, config-debugger)
Flaky sources (resilient-collector)
Multi-source synthesis (inventory-reconciliation, trace-analyzer)
Adversarial content (red-herring, calculation-audit)

If CheetCode v2 were a public benchmark, it would simultaneously measure agent quality and demonstrate ability in the problem space Firecrawl solves. The agent that scores highest would correlate to navigating sites well.

## 8. Tradeoffs and limitations

I do have things that I would change with more time:

**Add more challenges/standardized solve rates.** I would like to include more challenges in the future, to be honest I think 20 is a good number considering they are all affected by seeds so the number of unique challenge combinations is much much higher than 20, but more variation in challenge types couldn't hurt. Also having the challenges have a more standardized solve rate within tiers.

**The 3-minute window might need adjustment.** I started testing at 30 minutes but eventually got my time under 5. After that I got my time under 2 minutes. I didn't do anything crazy in orchestrating the agent either and I didn't allow it to view the source code on my mac, I acted as if I were a realistic challenger.

**No multi-page challenges.** Every challenge is self-contained on one page, lots of web nav relies on multi page navigation but I scoped these out because the routing infrastructure and challenge set up for those would be risky given the time constraint.

**Half of Tier 4 is too easy.** Calculation-audit at 93% is too high. I'd need more complex formulas. Red-herring at 67% is better but I'd like to target around 40% for tier 4. Adversarial challenges take long to design well, they need to be unsolvable by shortcutting but solvable by thorough reasoning.

**The orchestration metrics are proxies.** I'm inferring quality from behavioral telemetry. An agent that gets lucky looks confident. An agent that pauses to think looks idle. Best I can do without instrumenting the agent, but in the end they're still proxies and I want to acknowledge that. I think a lot of the tuning could be improved massively with more data from people trying over time so it continuously gets better.

Small note I only did full end2end tests on the original 13 challenges since I was able to verify the ability of the other ones passing with my actual agent and challenge verification with the seed system was really heavy

What I'd do next: expand the challenge set (I have plenty of potential ideas documented `local-dev/challenge-ideas.md`), add auto-calibration of difficulty based on population success rates, and track how agents improve across retries. The foundation supports all of this: the seed system, interact-gating, orchestration metrics, and spectator infrastructure all generalize beyond the current challenge set.

I also had many ideas I just couldn't explore well due to the limited amount of time I had to work on the project, for example other than my agent I orchestrated to use llm calls + interactions with the site, I wanted to create one that solved the challenge set using the Firecrawl Browser tool as a parallel navigation + scraping tool that the agent could use instead of navigating through the api or playwright. I actually might still make it because I started it, I just knew I had to place more attention on the approach document before doing more extra building.

Another one was the whole player tracking system, having the best session for each user be saved to their profile and having the ability to look their sessions up and see how they have improved over time

I do think there would be limitations of running the infrastructure on the free plans I have now if there was a lot of traffic all starting tests at the same time which is something important to consider.
