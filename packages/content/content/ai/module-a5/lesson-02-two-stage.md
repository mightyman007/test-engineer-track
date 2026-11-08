+++
id = "ai-m5-two-stage"
module = "ai-m5-object-detection"
title = "Two-Stage Detection: Propose, Then Classify"
minutes = 12
objectives = ["A5-4"]
videos = [
  { title = "Object Detection using R-CNN, Fast R-CNN, and Faster R-CNN (Vizuara)", url = "https://www.youtube.com/watch?v=MKfyEe1ITeg" },
]
diagrams = [
  { title = "The two-stage pipeline: propose regions, then classify each one", file = "diagrams/two-stage-pipeline.svg" },
]
+++

## The obvious idea, and why it is too slow (A5-4)

How would you detect objects if you had to write the algorithm by hand? The direct approach: slide a window over *every possible position and size* in the image, and run a classifier on each window. That works — and it is ruinously expensive. An image offers hundreds of thousands of window placements; running a full neural network on each is out of the question.

The insight that made detection practical is to **split the work into two stages**: first, cheaply generate a *short list* of places that plausibly contain an object; then, spend the expensive classifier only on that short list. That is the **two-stage** design, and its founding family is [R-CNN](https://en.wikipedia.org/wiki/R-CNN) — *Regions with CNN features*.

## The pipeline, stage by stage (A5-4)

**Stage 1 — propose.** A region-proposal algorithm suggests candidate regions: maybe two thousand rectangles that *might* contain an object, from likely-object shapes down to long shots. Original R-CNN used a classic algorithm ([selective search](https://en.wikipedia.org/wiki/Object_detection)) for this; what matters is that proposals are cheap and plentiful — the stage's job is to *not miss* an object, not to be tidy.

**Stage 2 — classify.** Each proposal is cropped out, resized, and passed through a convolutional network (module A4's machinery) that answers: what is in here, if anything? A background proposal is rejected; a real one gets its class, a confidence, and a refined box position.

![The two-stage pipeline: propose regions, then classify each one](diagrams/two-stage-pipeline.svg)

The R-CNN family then spent years attacking its own cost without changing the two-stage shape. **Fast R-CNN**: run the convolutional network *once* on the whole image and share its feature maps among all proposals, instead of re-running it per crop. **Faster R-CNN**: let the network propose regions itself — a **region proposal network** (RPN) inside the model — so proposals became nearly free. Each generation kept "propose, then classify" and cut the price of doing it.

## Accurate but slower (A5-4)

Why does this design earn its accuracy reputation? Because stage 2 examines **focused, well-cropped evidence**: real candidate regions, sized consistently, with the background mostly excluded. The classifier makes fewer, better-informed decisions instead of guessing about every square meter of the image. The price is exactly what stage 1 buys: thousands of proposals to process, plus the coordination between two stages. Early versions of the family took *seconds* per image; even the fast descendants remain heavier than the single-pass rivals the next lesson introduces.

One more consequence matters more than any speed figure: **stage 1's recall is the ceiling**. If no proposal ever covers an object, stage 2 cannot classify it — the error is unrecoverable downstream. Two-stage accuracy rests on proposals being generous enough to rarely miss.

## What testers take away

- **There are two interfaces to test, not one.** Proposal quality (does stage 1 ever miss the object entirely?) and classification quality (given a good proposal, is the label right?) are separable defects — and the first one masquerades as "the model can't see it" when it is really "stage 1 never handed it over."
- **Proposal recall bounds end accuracy.** A missed proposal is invisible in stage 2's metrics; test the ceiling, not just the final output.
- **Slowness is a defect too.** If a feature's latency budget assumes one-stage speeds but the vendor shipped two-stage, that mismatch surfaces as missed deadlines under load — measure it, don't read it off a datasheet.

## In plain terms

- Two-stage = propose first (cheap, plentiful candidate regions), classify second (expensive, focused decisions).
- R-CNN → Fast R-CNN (shared features) → Faster R-CNN (in-network proposals): same shape, falling cost.
- Accurate because the classifier sees focused, cropped candidates; slower because thousands of proposals must be processed.
- Stage 1's recall is the accuracy ceiling — a proposal that never covers the object can never be classified.

## Check yourself

1. In the sliding-window strawman, what exactly made the cost explode — and which stage of the two-stage design answers that problem?
2. Why is a missed proposal (stage 1) a different kind of defect than a wrong label (stage 2), and why can stage 2 never recover from the first?
3. A vendor says their two-stage detector "achieves 95% accuracy." Why is that number meaningless to you as a tester until two other things are specified?
