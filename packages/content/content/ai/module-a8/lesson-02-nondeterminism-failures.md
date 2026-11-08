+++
id = "ai-m8-nondeterminism-failures"
module = "ai-m8-testing-ai-systems"
title = "Same Input, Different Output — Testing Non-Deterministic AI"
minutes = 12
objectives = ["A8-5", "A8-6"]
videos = [
  { title = "LLM Temperature Explained in 5 Minutes (KodeKloud)", url = "https://www.youtube.com/watch?v=IWSutLJbURU" },
  { title = "The Secret Controls for your LLM: Temperature, Top-K, Top-P, etc (Gary Explains)", url = "https://www.youtube.com/watch?v=MkaazQttbpc" },
]
diagrams = [
  { title = "Same input, different output: sampling fans one prompt into three answers", file = "diagrams/nondeterminism-spread.svg" },
]
+++

## Same input, different output (A8-5)

Classical testing rests on a quiet promise: the same input exercising the same code produces the same output, so a failing test fails again on rerun and a passing one stays passed. Generative AI breaks that promise **on purpose**. An LLM does not emit the single most likely continuation — it holds a probability distribution over tokens and *samples* from it, token by token (module A6's next-token loop). **[Temperature](https://en.wikipedia.org/wiki/Boltzmann_distribution)** is the dial on that distribution: low temperature keeps the likeliest token, high temperature flattens it so less-certain picks survive too. Same prompt, same weights — different answers, by design.

![Same input, different output: sampling fans one prompt into three answers](diagrams/nondeterminism-spread.svg)

Sampling is the headline source, not the only one. Even a "deterministic" classifier can drift: parallel floating-point arithmetic rounds differently across [GPU](https://en.wikipedia.org/wiki/Graphics_processing_unit) models, and the deployed *model itself* changes — every retrained checkpoint is a new system under test wearing the old name. The tester's move is to name which regime you are in and pick the contract that matches:

- **When a test needs a repeatable answer, pin the knobs.** Run at temperature 0 (or fix the [random seed](https://en.wikipedia.org/wiki/Random_seed) the sampler draws from), and version-pin the model so the system under test cannot drift mid-suite. Determinism is configured, not owed.
- **Where variation is the product, assert statistics, not strings.** Run N times and measure a rate: "ungrounded answers in under 2% of runs", "correct class in over 95%". An assertion against one lucky pass at high temperature is [flaky](https://en.wikipedia.org/wiki/Flaky_test) by construction — and flakiness here is the system working, not the test being broken.

## Failures live in the data (A8-6)

When a classical program misbehaves, you look for the bug in the code. A learned system misbehaves for a second reason that code review cannot reach: **the behavior was written by the training data** (module A2's first lesson). The failure modes that follow are data-shaped:

- **One bad frame.** A single training image labeled "empty road" that actually shows a pedestrian in the far lane teaches the model a wrong lesson — and one image among two million still lands, because the network memorizes its tail cases too. No stack trace points at it; the defect lives in a data file, not a function. Its malicious cousin is **[data poisoning](https://en.wikipedia.org/wiki/Data_poisoning)**: deliberately planted bad examples.
- **Distribution shift.** The model only knows the data distribution it learned. Deploy it where lane markings, sign shapes, or vehicle types differ from its training world, and performance drops with no fault anywhere — the world moved, also called [concept drift](https://en.wikipedia.org/wiki/Concept_drift) when it moves over time.
- **The long tail.** The rarest situations are underrepresented in any dataset *by definition* — so the scenarios you most need the model to survive are the ones it trained on least. (Module A7's sim rationale is this sentence, operationalized.)

The contrast with a code bug is the takeaway: a code bug is a property of the code — fix the line, the bug is gone everywhere. A data-driven failure is a property of the (weights ← data) pair — it hides across millions of records, reproduces only under the *right* input, and returns with the next training run unless the data is fixed. When an AI system is wrong, ask "what data taught this?" before "what code did this?"

## What testers take away

- **Reproducibility is a choice you configure.** Pin temperature/seed and model version for tests that need repeatability; measure rates over many runs where variation is by design.
- **A model version is a system under test.** Results from checkpoint v3 do not transfer to v4 — re-run the suite when the weights change.
- **Data failures have no stack trace.** Hunt them in the dataset: mislabels, poison, drift, and the long tail — not in the code review.
- **"Works on my machine" now includes the GPU and the sampling knobs** — log the configuration alongside the results, or the rerun proves nothing.

## In plain terms

- Same input ≠ same output, because generative models *sample*; temperature is the dial that sets how wildly.
- Two regimes, two contracts: pin the knobs (temperature 0, fixed seed, version-pinned model) or assert statistics over N runs.
- Failures come from data, not only code: one bad frame, poisoning, distribution shift, the long tail.
- A code bug is fixed once; a data failure recurs with every training run until the data is fixed.
- Coverage of *code* is the wrong ruler — which is exactly where the next lesson picks up.

## Check yourself

1. Your regression suite asserts an exact summary string from a chatbot at temperature 0.7, and it fails on reruns. Is the model broken? Rewrite the test contract.
2. A bicycle detector trained on summer footage fails on bikes with winter lights and reflectors. Name the failure mode and one concrete data fix.
3. Why can one mislabeled image among two million still change production behavior — and why would no code review ever find it?
