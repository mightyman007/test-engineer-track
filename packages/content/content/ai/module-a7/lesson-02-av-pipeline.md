+++
id = "ai-m7-av-pipeline"
module = "ai-m7-av-stack"
title = "The Pipeline: Perception → Prediction → Planning → Control"
minutes = 14
objectives = ["A7-3", "A7-4"]
videos = [
  { title = "Sense, Solve, and Go: The Magic of the Waymo Driver (Waymo)", url = "https://www.youtube.com/watch?v=hA_-MkU0Nfw" },
]
diagrams = [
  { title = "The AV software pipeline: sense → foresee → decide → act", file = "diagrams/av-pipeline.svg" },
]
+++

## The four stages (A7-3)

Sensor streams in, steering and braking out. Between those two ends sits the pipeline — the canonical four stages of an AV software stack:

1. **Perception** — build the world model: *what is where, right now.* [Machine perception](https://en.wikipedia.org/wiki/Machine_perception) fuses the sensor data into objects and surfaces — including running the **object detectors** you studied in module A5.
2. **Prediction** — for every agent in that world model, forecast *what it will do next*: the pedestrian leaning toward the curb, the car drifting toward your lane.
3. **Planning** — decide *what we will do*: choose the trajectory through the predicted world. This is [motion planning](https://en.wikipedia.org/wiki/Motion_planning) — lane choice, gaps, yields, the path itself.
4. **Control** — *do it:* turn the chosen trajectory into steering, braking, and throttle, executed by drive-by-wire actuators ([drive-by-wire](https://en.wikipedia.org/wiki/Drive_by_wire)).

The chain matters more than the labels: **each stage consumes the previous stage's output.** Prediction can only forecast the objects perception reported; planning can only plan around the futures prediction produced. That dependency is why errors compound — a missed detection doesn't stay a perception problem: downstream stages plan confidently around a world that no longer contains a real pedestrian.

![The AV software pipeline: sense → foresee → decide → act](diagrams/av-pipeline.svg)

## Where detection sits — and which paradigm gets the keys (A7-4)

Object detection lives **inside perception**. Its output triple from module A5 — bounding box + class + confidence per object — is the pipeline's raw material about every road user: prediction forecasts *those boxes*, planning steers around *those boxes*. Perception also runs other models (lane estimation, traffic-light reading), but detection is the part that answers "what objects exist around me," and everything downstream leans on it.

Now the question module A5 planted: **one-stage or two-stage?** On the vehicle, perception runs every frame against a hard latency budget — the planning stack needs detections every few dozen milliseconds, on a power-bounded computer. That pressure points at the **one-stage** family, exactly as the A5 rule predicted. And yet two-stage detectors have not disappeared from the field — because the *same task* shows up in a second place: **offline**. An analytics team mining recorded drives for rare failure cases has no per-frame budget and wants maximum recall — two-stage's natural fit. Production programs like [Waymo](https://en.wikipedia.org/wiki/Waymo) live inside exactly these constraints (its "Sense, Solve, Go" framing is this lesson's pipeline in three words) — and they all face the same fork:

| | On the vehicle | Offline analysis |
|---|---|---|
| **Budget** | hard per-frame latency, power-bounded hardware | no per-frame budget; throughput matters only in bulk |
| **Priority** | fast enough *and* accurate enough within the budget | maximum recall on rare, hard cases |
| **Natural fit** | one-stage (single pass) | two-stage (careful, per-region looks) |

The A5 trade-off — *two-stage buys accuracy with compute; one-stage buys speed with a single pass, the gap having narrowed but not vanished* — is not a trivia answer here. It is the reason a production stack can contain both families at once, each placed where its currency buys the most.

## What testers take away

- **The pipeline is a dependency chain — test the boundaries.** Each stage's output is the next stage's input; a contract change at one boundary (different object format, different latency) is a regression event for everything downstream.
- **Latency is a first-class requirement.** "The detections are correct" is incomplete without "and they arrive in time on the vehicle's hardware."
- **The paradigm choice is a system decision with testable consequences.** Swapping one-stage for two-stage changes latency, accuracy profile, and failure patterns — you saw the mechanism in A5; here is where it lands.

## In plain terms

- Four stages: perception (what is where), prediction (what happens next), planning (what we do), control (do it).
- Each stage consumes the previous stage's output — errors compound, and a missed detection blinds everything downstream.
- Detection sits inside perception, feeding the box+class+confidence triples the rest of the stack consumes.
- On-vehicle latency budgets lean one-stage; offline recall-first analysis can afford two-stage — that's why both paradigms exist in the field.

## Check yourself

1. Recite the four stages and, for each, name one thing it consumes and one thing it produces.
2. A detection model is swapped for a more accurate but slower one. The detector's own metrics improve. Why might the *vehicle's* behavior nonetheless get worse?
3. Your team runs a one-stage detector on the car and a two-stage detector over recorded drives. In one sentence, why is that combination sensible rather than wasteful?
