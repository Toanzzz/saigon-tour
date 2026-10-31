# Meta Global AI Developer Hackathon — Participant Guide

> Reference notes extracted from the [official event details page (Cerebral Valley)](https://cerebralvalley.ai/e/meta-ai-developer-hackathon/details). Last updated 28 Oct.

## 1. Goal: Problem Statements

Your project must build towards one of the following:

- **Build for Your World** — Bring Meta's models into your domain. Solve a problem you know
  firsthand, free up time and mental space, and make something possible that wasn't before.
- **Push the Frontier** — Use Meta's models to tackle challenges in software, robotics,
  manufacturing, energy, materials and beyond. Give a machine a new capability, accelerate a
  scientific experiment, or unlock a better way to understand and control a physical system.

**Your project MUST incorporate Meta's models:**

- **Via Meta Model API:** Muse Spark series, Muse Wonder, Muse Image, Muse Voice, Transcribe,
  SAM 3.1
- **Run open weights models:** Muse Glimmer, Muse Spark Open
- **Code faster with:** Muse Code coding agent

## 2. Community

- Hackathon Discord for updates, team formation (max team size 4).
- Key channels: `#general`, `#announcements`, `#intros`, `#team-search`, `#questions`,
  `#office-hours`.

## 3. Schedule (all times Eastern Time)

| Date                       | Event                                                                  |
| -------------------------- | ---------------------------------------------------------------------- |
| Mon, Oct 26, 12:00 PM      | Kickoff — opening remarks, rules, prizes, judging, Meta speaker        |
| Tue, Oct 27, 12:00–1:00 PM | Agents 101: Build a Multimodal AI Agent (Suraj Subramanian)            |
| Wed, Oct 28, 12:00–1:00 PM | Agents 102: Best Practices for Verifiable Agents (Yash Khare)          |
| Fri, Oct 30, 12:00–1:00 PM | Building Specialized Intelligence on Fireworks (Sinan Ozdemir)         |
| Daily (weekdays) 10–11 AM  | Discord office hours (text, `#office-hours`)                           |
| Tue, Nov 3                 | Last full day for submission questions / troubleshooting               |
| **Wed, Nov 4, 9:00 PM**    | **Final office hours; SUBMISSIONS DUE via CV platform**                |
| Thu Nov 5 – Sun Nov 8      | Judging period                                                         |
| Mon, Nov 9, 12:00 PM       | Closing ceremony; top 10 announced (5 per track); community vote opens |
| Mon, Nov 16                | Community vote winner announced                                        |

**Building period: Oct 27 – Nov 4.**

## 4. Rules

- **Open source:** Repositories must be **public**.
- **Team size:** Max 4 participants. Solo allowed.
- **Demo requirements:** Demo must only highlight features/code/functionality built during
  the Hackathon. Judges must clearly identify what was created during the event. Failure to
  identify original contributions = immediate disqualification.
- **New work only:** What you present must have been built during the event. Startups may
  build on existing products/codebases but must clearly identify what was newly developed.
- **Banned projects:** Disqualified if they violate legal/ethical/platform policies or use
  code/data/assets you don't have rights to.

### Sample Anti-Projects (avoid)

AI medical advice; basic RAG apps; simple image analyzers; simple "AI for Education"
chatbots; AI job application screeners; AI nutrition coaches; personality analyzers; sports
analyzers/coaches; anything political or involving war.

## 5. Meta Provided Resources

- **$150 in Meta Model API credits** per participant. Apply via the credit claims form.
  Must be claimed individually. **Claim by Wed Nov 4, 9:00 PM ET.** A credit card must be on
  file to make API calls (temporary pre-auth charge, auto-released). A spend limit can be set.
- Helpful resources: Docs Overview, Quickstart, Model list, Cookbook, API fundamentals,
  Muse Code recipes, OSS model cookbook.

## 6. Inference Partner Resources (credits not guaranteed)

- **Baseten:** $100 credits + 2M TPM rate limit (up to 2,000 participants, reviewed by use
  case). Note: use `meta-models/muse-spark-open-1026` (not the plain `muse-spark-open` in docs).
- **Modal:** $100 credits (first 1,000 participants) for running Meta open-weight models via
  Endpoints, plus serverless GPUs, sandboxes, LLM training tools.
- **Fireworks:** $25 credits for select shortlisted teams.

## 7. Submission

- Submit by **Nov 4, 9:00 PM EST** via the CV platform. One project per team.
- Appoint one **Representative** per team.
- Repo must be publicly accessible; video link accessible; all contributors listed.
- **Requires a 3-minute demo video** highlighting features/code/functionality built during
  the Hackathon. The video is a **primary artifact** judges use (alongside code + live product).

## 8. Judging

**Stage One (pass/fail):** Does the idea meet baseline viability? Does it fit a problem
statement and reasonably use Meta Model API and/or open-weight models?

**Stage Two (0–10 scale, weighted):**

| Category                        | Weight | Description                                                                                 |
| ------------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| **Impact**                      | 30%    | Real-world potential. Who benefits? Could people actually use it? Fits a problem statement? |
| **Use of Meta AI Tooling**      | 25%    | Creative use beyond basic integration. Did they surface surprising capabilities?            |
| **Technical Depth & Execution** | 20%    | Sound, refined engineering. Real craft.                                                     |
| **Demo**                        | 25%    | Working, impressive, holds up live. Is the demo video genuinely cool to watch?              |

**Stage Three:** Top 5 per track → final round, judges watch video demos live and rank with
the same rubric.

## 9. Prizes

**Total pool: $1,000,000 across 2 tracks.**

### Track: Indie Developer ($400,000)

| Place | Prize |
| ----- | ----- |
| 1st   | $150K |
| 2nd   | $100K |
| 3rd   | $75K  |
| 4th   | $50K  |
| 5th   | $25K  |

### Track: Startups ($550,000)

| Place | Prize |
| ----- | ----- |
| 1st   | $250K |
| 2nd   | $150K |
| 3rd   | $75K  |
| 4th   | $50K  |
| 5th   | $25K  |

### Bonus Prizes from Meta ($50K)

| Prize                                 | Amount  | Rewards                                                                            | Judged by                                                       |
| ------------------------------------- | ------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Most Viral Project                    | $20,000 | Highest engagement on X after the event                                            | Likes/reposts/comments on submitted X post, until Nov 8 EOD     |
| Best Build on Meta Open Weight Models | $10,000 | Best project on Muse Glimmer / Muse Spark Open (own hardware or partner inference) | Infra partner verifies it runs on an eligible open-weight model |
| Community Vote                        | $10,000 | Most votes in public gallery (announced Nov 16)                                    | One vote per verified account                                   |
| **Best Agentic Use-Case**             | $5,000  | Strongest use of AI agents for meaningful tasks / decisions / multi-step workflows | Autonomy, effectiveness, practical usefulness                   |
| Best Creative Build                   | $5,000  | Most original creative project using Muse Image or Muse Wonder                     | Creative originality, execution, model use                      |
