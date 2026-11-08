+++
id = "ai-m8-metrics"
module = "ai-m8-testing-ai-systems"
title = "Scoring AI: Precision, Recall, IoU, and mAP"
minutes = 14
objectives = ["A8-1", "A8-2", "A8-3", "A8-4"]
videos = [
  { title = "Machine Learning Fundamentals: The Confusion Matrix (StatQuest)", url = "https://www.youtube.com/watch?v=Kdsp6soqA7o" },
  { title = "Precision and Recall | 3 Minute Tutorial (Daniel Krei)", url = "https://www.youtube.com/watch?v=zm3QLpjeIpk" },
  { title = "What is Mean Average Precision (mAP)? (Roboflow)", url = "https://www.youtube.com/watch?v=oqXDdxF_Wuw" },
]
diagrams = [
  { title = "The confusion matrix: four ways a classifier can land", file = "diagrams/confusion-matrix.svg" },
]
+++

## The confusion matrix: four ways to land (A8-1)

A single score like "the model is 80% accurate" is a summary — and a summary is exactly what a tester should refuse to grade a system on. The evidence underneath is the **[confusion matrix](https://en.wikipedia.org/wiki/Confusion_matrix)**: one small table of the four ways a yes/no judgment can land. For a model that flags [ground truth](https://en.wikipedia.org/wiki/Ground_truth) positives (a pedestrian frame, a defect, a spam email):

- **TP** (true positive) — flagged, and right;
- **FP** (false positive) — flagged, but wrong: a false alarm;
- **FN** (false negative) — there, but missed;
- **TN** (true negative) — absent, and correctly left alone.

Every metric you will meet is just a ratio over these four cells, so compute them once and read three numbers off the same table. Take a detector evaluated on 100 frames: 60 truly contain a pedestrian, 40 do not. The model flags 50 frames; 45 of those flags are correct. Fill the matrix: TP = 45, FP = 5, and the 15 pedestrians it never flagged are FN; the remaining 35 empty frames it correctly ignored are TN.

![The confusion matrix: four ways a classifier can land](diagrams/confusion-matrix.svg)

Three reads off that one table, formulas stated in full:

- **Precision** = TP ÷ (TP + FP) = 45 ÷ 50 = **0.90** — of everything the model *flagged*, the share that was right.
- **Recall** = TP ÷ (TP + FN) = 45 ÷ 60 = **0.75** — of everything *truly there*, the share the model found.
- **Accuracy** = (TP + TN) ÷ everything = 80 ÷ 100 = **0.80** — the share of all frames judged correctly.

Same table, three different questions answered. The discipline is to know which question you are asking.

## Two ways to be wrong — and which one you can afford (A8-2)

Precision and recall are not rivals for "best metric"; they are the prices of the two possible mistakes. Precision's cost is the **false alarm** (FP): every flag it counts is trust the model did not deserve. Recall's cost is the **miss** (FN): every point it drops is an object that was real. Which metric a team defends is therefore not a technical preference — it is a statement about which error they can afford. A missed pedestrian is unrecoverable; a phantom flag that triggers an early, gentle brake is annoying but cheap. That asymmetry pins the priority on **recall**.

The dial that moves both numbers is the **confidence threshold** from module A5. Raise it, so only very confident flags survive, and precision rises (fewer false alarms) while recall falls (shakier true objects go unflagged). Lower it and the reverse: more true objects found, more false alarms admitted. Thresholds are configuration with behavior — moving one is a regression event, and the metrics are how you document the trade.

One more trap lives in the same table. **[Accuracy](https://en.wikipedia.org/wiki/Precision_and_recall)** collapses all four cells into one number, so on *skewed* data it flatters a useless model. A night-scene classifier evaluated on 1,000 frames — 990 without pedestrians, 10 with — that flags *nothing* scores 990 ÷ 1,000 = 99% accuracy while missing every pedestrian (recall 0%). When classes are imbalanced, read precision and recall; treat accuracy alone as a red flag in itself. When the two errors cost roughly the same and you want one balanced number, the **[F-score](https://en.wikipedia.org/wiki/F-score)** combines them: F1 = 2 × (precision × recall) ÷ (precision + recall) — a mean that punishes imbalance, so a lopsided 0.90/0.30 lands far below the naive average.

## IoU is back: when does a detection count? (A8-3)

Module A5's box-quality measure returns, now as the gatekeeper of the confusion matrix itself. **[Intersection over Union](https://en.wikipedia.org/wiki/Jaccard_index)** (IoU) = overlap ÷ union of the predicted and true boxes: 1.0 for a perfect match, 0 for no contact. Work a fresh grid example: the ground-truth box covers columns 1–3, rows 1–2 — 3 × 2 = **6 cells**; the predicted box covers columns 2–4, rows 1–2 — also **6 cells**; they share columns 2–3 — **4 cells**. Union = 6 + 6 − 4 = 8, so **IoU = 4 ÷ 8 = 0.50**.

For detection, a prediction counts as a TP only when **both** clauses of the match rule hold:

1. its IoU with a ground-truth box reaches the match threshold (commonly 0.5), **and**
2. the class label agrees.

Everything else the model output lands as an FP — wrong class, low overlap, a confident flag on empty road — and every true object with no qualifying detection is an FN. So the confusion matrix for detection is *built from* IoU judgments; the threshold that decides which boxes are good enough is the same configuration-with-behavior you learned to test in A5, now one layer up the metric stack.

## mAP: the mean over classes and confidences (A8-4)

Detection needs a scoreboard that respects two complications at once: several classes, and a confidence number attached to every finding. The construction is a two-step mean. First, **per class**: sweep the confidence threshold from strict to loose, trace precision against recall, and summarize that curve as one number — the class's **average precision (AP)**. A detector good only at high confidence earns a low AP even if its best flags are pristine, because the curve sags as looser flags enter. Then **across classes**: **mean average precision ([mAP](https://en.wikipedia.org/wiki/Evaluation_measures_(information_retrieval)))** is the mean of the per-class APs.

The arithmetic is ordinary: car 0.90, pedestrian 0.60, cyclist 0.30 → mAP = (0.90 + 0.60 + 0.30) ÷ 3 = **0.60**. And the mean is exactly where a tester leans in: **0.60 could be three middling classes, or two strong ones hiding a nearly useless cyclist detector.** The mean is the headline; the per-class APs are the evidence. Ask for both — a stack whose pedestrian AP quietly sags is an AV problem no aggregate number should be allowed to blur.

## What testers take away

- **The confusion matrix is the evidence; every metric is a ratio over it.** Demand the table before you accept any summary score — and remember all four cells, because the FN column is where safety lives.
- **Precision and recall price the two errors.** Which one to defend is a decision about failure costs, made visible by moving the confidence threshold — configuration, not fate.
- **Accuracy flatters skewed data.** A 99%-accurate model that misses every pedestrian is the canonical trap; read precision and recall on imbalanced classes.
- **A detection is a TP only when IoU clears the threshold *and* the class agrees** — A5's threshold, now deciding the confusion matrix's contents.
- **mAP is a mean over classes and confidences.** Always ask which class the mean is hiding.

## In plain terms

- Confusion matrix: TP (flagged, right), FP (flagged, wrong), FN (missed), TN (correctly ignored).
- Precision = TP/(TP+FP): of the flags, the right share. Recall = TP/(TP+FN): of the truth, the found share.
- Worked run: TP 45, FP 5, FN 15, TN 35 → precision 0.90, recall 0.75, accuracy 0.80 — three different stories, one table.
- Raising the confidence threshold: precision up, recall down. Skewed data: accuracy lies; F1 balances when costs are equal.
- IoU = overlap ÷ union (worked: 4 ÷ 8 = 0.50); a detection counts only at IoU ≥ threshold with the class right.
- mAP = mean of per-class APs (worked: (0.90+0.60+0.30)/3 = 0.60) — and a mean can hide a failing class.

## Check yourself

1. A rerun flags 60 frames, 45 of them correct, with 15 pedestrians missed. Recompute precision and recall from those three numbers.
2. A predicted box reaches IoU 0.55 with a ground-truth *car* box at the 0.5 threshold — but the model labels it "truck". Does it count? Which cell does it land in, and is there a second cell it also affects?
3. Two detectors both post mAP 0.62. Name two questions you would ask before calling them equally good.
