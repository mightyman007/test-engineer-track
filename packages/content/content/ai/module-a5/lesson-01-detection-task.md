+++
id = "ai-m5-detection-task"
module = "ai-m5-object-detection"
title = "Boxes, Classes, Confidence — and How to Score Them"
minutes = 12
objectives = ["A5-1", "A5-2", "A5-3"]
videos = [
  { title = "Intersection over Union (IoU) — 2 Minute Tutorial (Daniel Krei)", url = "https://www.youtube.com/watch?v=keCNf79dTC4" },
]
diagrams = [
  { title = "What a detector outputs: boxes, labels, confidences — plus one duplicate waiting for NMS", file = "diagrams/detection-output.svg" },
]
+++

## What detection must output (A5-1)

Module A4 ended by saying detection has two failure directions. Now make that concrete. For every object it finds, a detector outputs a triple:

- a **[bounding box](https://en.wikipedia.org/wiki/Bounding_box)** — the rectangle convention for "where": coordinates of the box that encloses the object;
- a **class label** — "what": pedestrian, car, cyclist;
- a **confidence** — "how sure": a number between 0 and 1 attached to that specific finding.

Read a real line of detector output and it looks like: box (12, 15)–(60, 90), class *pedestrian*, confidence 0.91 — "I am 91% sure there is a pedestrian inside this rectangle." That is fundamentally harder than classification, for one structural reason: **the model does not know in advance how many objects the scene contains**. It must find every object, place a box on each, name each, and score each — and nothing about that count is given.

![What a detector outputs: boxes, labels, confidences — plus one duplicate waiting for NMS](diagrams/detection-output.svg)

## IoU: scoring a box against the truth (A5-2)

"A wrong box" sounds vague. [Intersection over Union](https://en.wikipedia.org/wiki/Jaccard_index) (IoU) makes it exact. For a predicted box and a ground-truth box, IoU = (area where they overlap) ÷ (area they cover together). A perfect match scores 1.0; two boxes that do not touch score 0. It is the standard way to say *how good a box is* — used both to judge detections against truth and (in a moment) to compare a detector's boxes with each other.

Work it once on a grid and it sticks. Say the ground-truth box covers columns 1–4, rows 1–2 of a grid: 4 × 2 = **8 cells**. A predicted box covers columns 3–6, rows 1–2: also **8 cells**. Where do they overlap? Columns 3–4, rows 1–2: **4 cells**. Then:

- Intersection = 4
- Union = 8 + 8 − 4 = **12** (add both boxes, subtract the overlap counted twice)
- **IoU = 4 ÷ 12 ≈ 0.33**

About a third of the union is shared — a loose, half-off box. Teams set a **threshold** (commonly 0.5): a prediction only *counts* as a match if its IoU with the truth reaches the threshold. That one number turns "wrong box" into a decidable test assertion.

## NMS: deleting duplicate boxes (A5-3)

Detectors evaluate many positions across the image, so one object often triggers **several boxes** — three overlapping "pedestrian" boxes around one pedestrian, each with its own confidence. **Non-maximum suppression** (NMS) cleans this up: keep the highest-confidence box in an overlapping cluster, discard the others that overlap it above an IoU threshold, and repeat for the next remaining box. The result is roughly one box per real object.

The "non-maximum" in the name is the rule: among near-duplicate answers, only the *maximum* (the most confident) survives; the rest are *suppressed*. NMS leans directly on IoU — the overlap measure you just learned is the same number that decides which boxes are duplicates.

## What testers take away

- **Thresholds are configuration with behavior.** The IoU match threshold and the NMS threshold are settings, not facts of nature — loosening them changes which detections count and which boxes survive. They belong in test configuration, and changing them is a regression event.
- **The oracle needs IoU-style matching.** With frozen weights (module A3) a detector is deterministic — but "the same box" is still not the right expectation: a prediction covering 70% of the object is legitimately *better* than one covering 30%. Expect box quality measured by IoU, not box coordinates compared character by character.
- **Confidence is a calibrated promise.** "0.91" claims how sure the model is about *this* finding — a testable claim when you check how often confident findings turn out right.

## In plain terms

- Detection outputs, per object: box + class + confidence — and the object count is never known in advance.
- IoU = overlap ÷ union of two boxes; 1.0 perfect, 0 untouched; the standard "how good is this box" measure.
- Worked check: 8-cell box and 8-cell box overlapping in 4 cells → union 12 → IoU 4/12 ≈ 0.33.
- A match threshold (commonly 0.5) turns box quality into a decidable assertion.
- NMS keeps the most confident box per overlapping cluster and suppresses the duplicates — using IoU as its overlap test.

## Check yourself

1. Recompute the worked example when the predicted box covers columns 4–6 instead of 3–6. What is the intersection, union, and IoU?
2. Why can't a detection test suite simply compare predicted box coordinates against expected coordinates, the way a classification suite compares labels?
3. Two "car" boxes overlap with IoU 0.7; confidences 0.4 and 0.9. What does NMS do, and what would change if the NMS threshold were set above 0.7?
