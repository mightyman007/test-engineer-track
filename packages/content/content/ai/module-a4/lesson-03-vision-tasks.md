+++
id = "ai-m4-vision-tasks"
module = "ai-m4-computer-vision"
title = "Four Tasks, Four Output Shapes"
minutes = 10
objectives = ["A4-4", "A4-5"]
videos = [
  { title = "Image classification vs Object detection vs Image Segmentation (codebasics)", url = "https://www.youtube.com/watch?v=taC5pMCm70U" },
]
diagrams = [
  { title = "The same scene, four different output shapes", file = "diagrams/vision-tasks.svg" },
]
+++

## The output shape is the task (A4-4)

Everything in the last two lessons — grids, filters, feature maps — feeds models that answer *questions about images*. But which question? In [computer vision](https://en.wikipedia.org/wiki/Computer_vision), the task is defined less by the network than by **what shape of answer it must produce**, and there are four classic shapes:

- **Classification** — one label for the whole image, usually with a confidence: "this is a cat, 0.97." The simplest output; nothing is said about *where*.
- **Classification with localization** — still one main object, but now a box around it: one label **plus** one location.
- **[Object detection](https://en.wikipedia.org/wiki/Object_detection)** — *many* objects at once, each getting a box, a class label, and a confidence: "car 0.94 here, pedestrian 0.87 there, cyclist 0.79 there." The count of answers is not known in advance — it depends on the scene.
- **[Image segmentation](https://en.wikipedia.org/wiki/Image_segmentation)** — the finest grain: a class for **every pixel**, producing masks that trace each object's exact outline instead of a loose rectangle. (Semantic segmentation labels each pixel's class; instance segmentation additionally separates individual objects of the same class.)

One scene, four different answers — same pixels, different questions. The diagram shows the same street corner answered all four ways.

![The same scene, four different output shapes](diagrams/vision-tasks.svg)

A quick sorting rule ties them together: **is the object count known?** One known object → classification (or classification-with-localization, when you also need its box). Unknown count → detection. And if you need the *shape*, not just the whereabouts → segmentation.

## Why the output shape matters to testers (A4-5)

Here is why this lesson earns its ten minutes: **the oracle follows the output shape.** A test's expected result must be shaped like the model's output, so each task changes what a test suite even looks like:

- **Classification** gives you one label and one confidence to check — clean, table-shaped expectations. "Is 'pedestrian' the top label for this image?" is a complete test.
- **Detection** gives you a *set* of box–label–confidence triples, and "wrong" now has two independent directions: the wrong class on a right box, or the right class on a wrong box. A stop sign's box that only covers its lower half is a defect even though the class is perfect — so location quality needs a judgment of its own. The standard measure (called IoU) is exactly where the next module starts.
- **Segmentation** needs per-pixel truth to check against — the most expensive kind of label to produce, which directly shapes how much ground truth a team can afford.

And for this track's destination: an autonomous vehicle's perception system needs **detection**, not classification — "there is a pedestrian *somewhere* in this image" is not actionable; "a pedestrian is in *that* box, 0.87" is. That is why the next module spends all three of its lessons on detection alone.

## In plain terms

- Classification: one label (with confidence) for the whole image.
- Localization: one label plus one box — a single, known object.
- Detection: many boxes + classes + confidences; the count depends on the scene.
- Segmentation: a class for every pixel — masks that trace true shapes.
- The test oracle follows the output shape; detection's two failure directions (wrong class, wrong box) each need checking.

## Check yourself

1. A model outputs exactly one label per input image. A reviewer calls it a "detector." What is the correct task name, and what output would a detector add?
2. A detection test case expects "one car." The model finds the car but also a box labeled 'bus' over a wall. Explain why both the count difference and the extra box make oracle design harder than for classification.
3. Why is per-pixel ground truth for segmentation expensive — and how does that cost show up in a team's test coverage?
