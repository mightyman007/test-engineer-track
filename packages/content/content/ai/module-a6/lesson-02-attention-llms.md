+++
id = "ai-m6-attention-llms"
module = "ai-m6-transformers-llms"
title = "Attention — and the LLM Features You'll Be Asked to Test"
minutes = 12
objectives = ["A6-4", "A6-5"]
videos = [
  { title = "Attention in transformers, step-by-step | Deep Learning Chapter 6 (3Blue1Brown)", url = "https://www.youtube.com/watch?v=eMlx5fFNoYc" },
  { title = "Why Large Language Models Hallucinate (IBM Technology)", url = "https://www.youtube.com/watch?v=cfqtFvWOfg0" },
]
diagrams = [
  { title = "Attention: every word weighs the words around it", file = "diagrams/attention-weights.svg" },
]
+++

## Attention: weighing the relevant context (A6-4)

The sentence "The animal did not cross the street because it was too tired" contains a small miracle: you instantly know *it* means the animal. Swap the ending — "because it was too wide" — and the same pronoun now means the street. Nothing changed but one word, and every competent reader re-resolves the reference without noticing.

**[Attention](https://en.wikipedia.org/wiki/Attention_(machine_learning))** is the mechanism that lets a model do the same. At each position, attention scores every earlier token for relevance — it *weighs* the context — and builds the current token's representation out of that weighted mixture. For "it", the candidates "animal" and "street" both get weight; "too tired" tips the weights toward "animal", "too wide" toward "street". Same word, different weights, different reading.

The architecture that put attention at the center is the **[transformer](https://en.wikipedia.org/wiki/Transformer_(deep_learning_architecture))** (2017). Its crucial property is scale: attention processes the whole context in parallel — every token can weigh every other token (in the causal LLMs this course describes, each token weighs the earlier tokens only) — which is what made training on mountains of text feasible. The LLMs behind today's features are transformers trained on next-token prediction (the previous lesson's loop).

![Attention: every word weighs the words around it](diagrams/attention-weights.svg)

## The LLM features arriving in your backlog (A6-5)

This is not futuristic technology — it is in the products you already test:

- **[Chatbots](https://en.wikipedia.org/wiki/Chatbot)** — support assistants and "ask our docs" boxes that answer in free text.
- **Copilots** — coding assistants in the [GitHub Copilot](https://en.wikipedia.org/wiki/GitHub_Copilot) mold that draft and complete code inside your IDE.
- **Summarization** — features that condense tickets, threads, and documents ([automatic summarization](https://en.wikipedia.org/wiki/Automatic_summarization)).

All three are the same machinery: context in, next tokens out. And all three share a failure mode with its own name.

## Hallucination: fluent is not true (A6-5)

A **[hallucination](https://en.wikipedia.org/wiki/Hallucination_(artificial_intelligence))** is output that is fluent, confident — and fabricated: a summary containing a "detail" that appears nowhere in the source document, a chatbot citing a policy with the wrong amount, a copilot calling a function that does not exist. The mechanism follows from the training objective you already know: the model predicts *plausible* continuations, and plausibility is a property of the text's shape, not its truth.

For a tester this reframes the whole job. Hallucination is not an occasional glitch to log when noticed — it is a **first-class failure mode you design tests for**: probe many inputs, count how often outputs are ungrounded, and treat "the answer reads smoothly" as *zero* evidence. The A1 myth applies at full strength here: the model is not lying or dreaming — it is doing exactly what it was trained to do, and the measure of that behavior is your deliverable.

## What testers take away

- **Attention is weighing, not lookup.** Interpretation depends on context, and the weights shift with it — which is why near-identical inputs can deserve separate test cases.
- **LLM features are generators, not calculators.** Chatbot, copilot, summarizer — the output space is unbounded text, so "expected result" must be defined by criteria, not by exact strings.
- **Hallucination is the signature failure of the feature class.** Confident-wrong answers are the thing to measure — and the thing your test report must make visible.

## In plain terms

- Attention lets each token weigh which other tokens matter — "it" reads as the animal when the context says *tired*, the street when it says *wide*.
- The transformer architecture made attention parallel, which made LLM scale possible.
- Chatbots, copilots, and summarizers are the same next-token machinery wearing different interfaces.
- A hallucination is confident, fluent output that is fabricated — the model predicted a plausible continuation, not a verified fact.
- Test the generator by measured performance across many inputs, never by the smoothness of one answer.

## Check yourself

1. Explain in one sentence, without using the word "AI", why a summarizer could invent a detail that isn't in its source document.
2. Why do "it was too tired" and "it was too wide" deserve to be tested as two separate cases rather than one?
3. Your team's copilot generated a plausible-looking call to a function that doesn't exist in the codebase. Which failure mode is this, and what would you measure before calling the feature "ready"?
