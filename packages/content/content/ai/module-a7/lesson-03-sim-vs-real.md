+++
id = "ai-m7-sim-vs-real"
module = "ai-m7-av-stack"
title = "Simulation vs the Real World"
minutes = 10
objectives = ["A7-5", "A7-6"]
videos = [
  { title = "Training Autonomous Vehicles to drive from the comfort of home with CARLA (Silicon Valley Deep Learning Group)", url = "https://www.youtube.com/watch?v=ZiBYf7wrhig" },
]
diagrams = [
  { title = "Simulation vs the real world: coverage buys, fidelity costs", file = "diagrams/sim-vs-real.svg" },
]
+++

## Why simulate at all (A7-5)

How many real road miles does it take to *demonstrate* that an AV is safe? Reliability math gives an uncomfortable answer: because severe failures are (thankfully) rare, statistically credible safety claims demand **hundreds of millions of miles**. Driven at highway speed, around the clock, that is decades of fleet driving — for one design, once. No program can road-test its way to a safety case at that scale.

[Simulation](https://en.wikipedia.org/wiki/Simulation) breaks the bind, three ways at once:

- **Safety** — a child darting out between parked cars is the scenario you most need to test and the one you least can rehearse on public roads. In a simulator, the crash is free.
- **Scale** — thousands of scenario variants run overnight: same intersection, different sun angle, different fog density, different pedestrian speed. No fleet can enumerate variants like that; a simulator grinds through them.
- **Coverage** — simulators let you steer *deliberately* toward the dangerous tail of the distribution: the rare, weird, adversarial setups that real miles almost never serve up but real accidents are made of.

Open-source simulators such as [CARLA](https://carla.org/) are why you can try this yourself: a whole virtual city, sensors included, scriptable scenario by scenario.

![Simulation vs the real world: coverage buys, fidelity costs](diagrams/sim-vs-real.svg)

## What simulation can't fully capture (A7-6)

If sim were perfect, the problem would be solved. It isn't, for one structural reason: **the sensor data is synthetic.** A simulator's camera, radar, and lidar returns are *models of* the real returns — and reality keeps edges the model misses: how glare actually blooms on a wet windshield, how rain really scars a lidar point cloud, how a tire worn to the legal limit changes braking. A model can **ace the simulator and still fail on real hardware**; that distance between sim performance and road performance has a name — the **sim-to-real gap** — and closing it is an engineering discipline of its own (one classic trick is [domain randomization](https://en.wikipedia.org/wiki/Domain_randomization): train across deliberately randomized simulated conditions so reality falls inside the range the model has seen).

The tester's summary: simulation **complements** road testing; it does not replace it. The coverage axis is won in sim, the fidelity axis is won on the road — and a mature program closes the loop with both, using sim to find and fix failures cheaply and road miles to verify that the fixes survive reality.

## What testers take away

- **Sim scenarios are test cases at industrial scale.** A scenario library — intersection, weather, actor behavior, failure injection — is configuration with enormous regression value.
- **"Passed in sim" is a claim about the simulator.** Always ask how faithfully the sim models the sensors and physics that matter for the scenario — that is the sim-to-real gap, and it is where sim-passing models go to fail.
- **Coverage numbers deserve skepticism in both directions.** "Millions of simulated miles" is real evidence about the *simulated* scenarios — and only as good as the scenarios' realism and reach.

## In plain terms

- Simulation exists because the required safety evidence — hundreds of millions of miles — cannot be driven.
- It buys safety (dangerous scenarios rehearsed freely), scale (thousands of variants overnight), and coverage (deliberate steering into rare, hard cases).
- Its ceiling is fidelity: synthetic sensor data and modeled physics can't fully match reality, so a model that aces sim can fail on the road — the sim-to-real gap.
- Sim and road miles complement each other; "the simulator covers everything" is the overclaim to push back on.

## Check yourself

1. Why can't "just drive more real miles" settle the safety question, even with a large fleet?
2. Name three things a simulator buys, and the one thing it cannot fully provide.
3. A release note says "validated over 10 million simulated miles." Which two questions would you ask before being reassured?
