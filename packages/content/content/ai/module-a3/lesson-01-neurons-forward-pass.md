+++
id = "ai-m3-neurons-forward-pass"
module = "ai-m3-neural-networks"
title = "A Neuron Is a Weighted Sum"
minutes = 12
objectives = ["A3-1", "A3-2"]
videos = [
  { title = "But what is a neural network? (3Blue1Brown)", url = "https://www.youtube.com/watch?v=aircAruvnKk" },
]
diagrams = [
  { title = "One neuron: weighted sum, then activation, with hand-computed numbers", file = "diagrams/neuron-forward-pass.svg" },
]
+++

## The smallest piece of a neural network (A3-1)

Strip away the mystique and a [neuron](https://en.wikipedia.org/wiki/Artificial_neuron) is a tiny arithmetic machine. It does exactly two things, in order:

1. **A weighted sum.** Multiply each input by that input's **weight** — the number saying how much this input matters — and add the results together with a **bias**, a constant that shifts the total up or down. Weights and bias are the neuron's *settings*; training's whole job (next two lessons) is adjusting them.
2. **An [activation](https://en.wikipedia.org/wiki/Activation_function).** Pass that total through a fixed one-line function. The classic choice, [ReLU](https://en.wikipedia.org/wiki/Rectifier_(neural_networks)), simply clamps negatives to zero: `max(0, z)`. Activations matter because a stack of purely linear steps collapses into one big linear step — the activation is what lets layers of neurons learn *curved* patterns instead of just one long straight-line formula.

That is the entire neuron: **weighted sum, then activation.** Everything else in this module is thousands of these, wired together and tuned.

## Worked example: one neuron by hand (A3-1)

Give the neuron two inputs — x1 = 2 and x2 = 4 — with weights w1 = 0.5 and w2 = 0.25, and bias −1.5, using ReLU:

- Weighted part: 2 × 0.5 + 4 × 0.25 = 1 + 1 = 2
- Add the bias: 2 + (−1.5) = **0.5**
- Apply ReLU: max(0, 0.5) = **0.5** — the neuron's output

![One neuron: weighted sum, then activation, with hand-computed numbers](diagrams/neuron-forward-pass.svg)

Notice the roles. The weights said *how much* each input mattered; the bias said *where the threshold sits*; the activation shaped the result. Do this arithmetic once by hand and "neural network" starts sounding like what it is: math you could, in principle, check with a calculator.

## From one neuron to layers (A3-2)

One neuron can only draw one weighted boundary. The trick of a [neural network](https://en.wikipedia.org/wiki/Multilayer_perceptron) is wiring neurons into **layers**: a column of neurons that all read the same inputs, then feed *their outputs* into the next layer, whose neurons feed the next, until a final layer produces the answer.

- The middle layers are called **hidden layers** — nothing mystical, just "between input and output".
- Each neuron in a layer sees the *previous* layer's outputs, weights them, adds its bias, applies its activation.
- "Deep learning" (module A1's third ring) just means many layers stacked this way.

## A forward pass through a tiny network (A3-2)

Running an input through the whole stack is the **forward pass** — the network *thinking*. Here is a complete one, small enough to check by hand. Inputs x1 = 2, x2 = 3; two hidden neurons (ReLU) feeding one output neuron (no activation):

- **h1** uses weights (1, −1), bias 0: z = 2·1 + 3·(−1) = −1 → ReLU kills the negative → h1 = **0**
- **h2** uses weights (1, 1), bias 0: z = 2 + 3 = 5 → h2 = **5**
- **output** weights h1 by 2, h2 by 1, bias −3: 2·0 + 1·5 − 3 = **2**

Read what happened: h1 *tried* to contribute and was silenced by ReLU (a "dead" neuron for this input); h2 passed straight through; the output neuron mixed what survived. The forward pass is always this — waves of weighted sums and activations flowing toward the answer.

## Why testers should care

Here is the payoff of all that arithmetic. A trained, shipped network is **frozen**: weights and biases are fixed numbers. So the forward pass is a pure function — the same input *always* produces the same output. That is exactly what makes an AI feature testable at the example level: for inference, you can build expected results by recording what the frozen model does, and any deviation from a prior run is a defect signal (or an undocumented retrain — also a finding).

The non-determinism and drift testers fear lives in *training* — which is where the next lesson goes.

## In plain terms

- A neuron = weighted sum (weights say how much each input matters; bias shifts the threshold) + activation.
- ReLU, the standard activation, clamps negatives to zero — and is what keeps stacked layers from collapsing into one straight-line formula.
- Layers chain neurons: each layer reads the previous layer's outputs; "deep" just means many layers.
- A forward pass = one sweep of weighted sums and activations from input to output.
- With frozen weights the forward pass is deterministic — the same input always yields the same output.

## Check yourself

1. In the worked example, what would the neuron output if the bias were +1.5 instead of −1.5?
2. Why does h1 contribute nothing to the final output in the tiny network?
3. A teammate calls a deployed model "non-deterministic because it's AI." Under what condition is the forward pass actually deterministic — and when does that stop holding?
