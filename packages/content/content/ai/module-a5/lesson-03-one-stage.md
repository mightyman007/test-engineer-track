+++
id = "ai-m5-one-stage"
module = "ai-m5-object-detection"
title = "One-Stage Detection — and the Trade-Off"
minutes = 14
objectives = ["A5-5", "A5-6"]
videos = [
  { title = "How computers learn to recognize objects instantly | Joseph Redmon (TED)", url = "https://www.youtube.com/watch?v=Cgxsv1riJhI" },
]
diagrams = [
  { title = "One-stage vs two-stage: the speed–accuracy trade-off on two axes", file = "diagrams/one-vs-two-stage.svg" },
]
+++

## The counter-idea: look once (A5-5)

Two-stage detection asks *where might objects be?* and only then *what is here?* The one-stage family collapses both questions into one pass. **[YOLO](https://en.wikipedia.org/wiki/YOLO_(object_detection))** — *You Only Look Once* — is the name that stuck: instead of looking at an image thousands of times (once per proposal), a single network evaluation produces every detection.

The mechanism, in intuition form: divide the image into a **grid** of cells. Each cell is responsible for objects whose center falls inside it, and **predicts, in one shot, the boxes and class probabilities** for its share of the scene. Every cell answers simultaneously — boxes and classes straight from one forward pass, no separate proposal stage, no per-region classifier. **SSD** (*Single Shot Detector*, unlinked here because it has no Wikipedia article worth forcing) runs the same single-pass idea over feature maps of several scales, which helps it catch objects of different sizes.

One pass over the whole image is why these models are **fast** — fast enough for real-time video, which is where you have already seen them: bounding boxes drawn live on camera feeds, the YOLO creator's live demo included.

## The trade-off, plainly (A5-6)

So why did two-stage survive? Because for years, careful beat quick — **historically, one-stage models were slightly less accurate**, especially on small objects. The reasons are structural, not accidental:

- **Grid coarseness.** A tiny, distant object occupies only a cell or two, and its box must be predicted from very little evidence — two-stage's dedicated per-region look handles that better.
- **Background imbalance.** Most grid cells contain no object, so the one-shot predictor spends most of its effort learning to say "nothing here" — a hard starting handicap that proposals never face.

Modern one-stage models (better anchor designs, better loss functions) have narrowed the gap substantially, which is exactly why the trade-off is a *trade-off* rather than a verdict. Here is the comparison the whole module turns on:

| | Two-stage (R-CNN family) | One-stage (YOLO / SSD) |
|---|---|---|
| **How it works** | propose candidate regions, then classify each one | one pass: grid cells predict boxes + classes directly |
| **Speed** | slower — thousands of proposals plus a second stage | fast — single network evaluation, often real-time |
| **Accuracy** | historically the higher, especially on small objects | historically slightly lower; the gap has narrowed |
| **Natural fit** | offline analysis, accuracy-first budgets | on-vehicle / on-device, latency-first budgets |

![One-stage vs two-stage: the speed–accuracy trade-off on two axes](diagrams/one-vs-two-stage.svg)

Neither family wins everywhere. They buy the same thing — detections — with different currencies: two-stage spends compute to be careful; one-stage spends a little accuracy to be fast.

## Which one would you test? (A5-6)

Put the trade-off where a tester meets it. An autonomous vehicle's perception module must produce detections on a **latency budget** — the planning stack needs perception output every few dozen milliseconds, on a power-bounded computer. That pressure points at one-stage. An offline analyst mining recorded footage for rare failure cases has no per-frame budget and wants maximum recall — that points at two-stage. The *same* detection task, two defensible choices, decided by requirements — and previewing module A7: this is exactly the choice AV perception teams live inside, which is why both families still exist in the field.

## What testers take away

- **Speed is a requirement you can measure.** "Fast enough" means a latency budget on target hardware — test the detector's throughput where it will run, not on a benchmark rig chosen by the vendor.
- **The paradigm choice is configuration with system consequences.** Swapping a two-stage detector for a one-stage one (or the reverse) changes latency, accuracy profile, and failure patterns — a regression-testing event even if the interface stays identical.
- **Accuracy claims are incomplete without a metric.** "More accurate" means nothing until the IoU threshold and the dataset are pinned down — module A8 makes those metrics precise.

## In plain terms

- One-stage = one pass: the image is divided into a grid; every cell predicts boxes and class probabilities simultaneously.
- YOLO = You Only Look Once — the name is the architecture's whole argument.
- Historically slightly less accurate (small objects, background imbalance); modern versions narrowed the gap.
- The trade-off: two-stage buys accuracy with compute; one-stage buys speed with a small accuracy cost.
- Requirements decide: latency budgets favor one-stage; accuracy-first offline work favors two-stage.

## Check yourself

1. In YOLO's grid, what does a single cell output, and why does covering the whole image this way require only one network pass?
2. Explain both structural reasons the table gives for one-stage's historical small-object weakness — in your own words, no jargon.
3. Your team's perception feature must detect pedestrians at 20+ frames per second on the vehicle's own computer. Which family does the requirement push toward, and what accuracy question must you still pin down before believing the choice is safe?
