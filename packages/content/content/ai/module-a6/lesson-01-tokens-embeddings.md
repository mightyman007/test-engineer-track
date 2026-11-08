+++
id = "ai-m6-tokens-embeddings"
module = "ai-m6-transformers-llms"
title = "Tokens, Embeddings, and Next-Token Prediction"
minutes = 12
objectives = ["A6-1", "A6-2", "A6-3"]
videos = [
  { title = "Transformers, the tech behind LLMs | Deep Learning Chapter 5 (3Blue1Brown)", url = "https://www.youtube.com/watch?v=wjZofJX0v4M" },
]
diagrams = [
  { title = "From text to numbers: tokens become embeddings", file = "diagrams/token-embedding.svg" },
]
+++

## Text enters as tokens (A6-1)

Modules A3–A5 taught you that networks compute on numbers. But a chatbot receives *text* — so before any network runs, something has to turn language into numbers. That something is **[tokenization](https://en.wikipedia.org/wiki/Language_model)**: a tokenizer chops the input into **tokens** — small chunks of text, each mapped to an ID number — and the model consumes the sequence of IDs.

The chunking is worth understanding precisely, because it defies a natural assumption: **a token is not a word**. Common words often map to one token each ("the", "test"), but rarer words get split into subword pieces — *unbelievable* may arrive as *un* + *believ* + *able*. Modern tokenizers, built on schemes like **[byte pair encoding](https://en.wikipedia.org/wiki/Byte_pair_encoding)** (BPE), learn these splits from data. One consequence a tester meets immediately: the same sentence can produce *different token counts* in different models and different languages — "token count" is not "word count".

And token counts are not trivia. API limits, pricing, and a model's **context window** — how much text it can consider at once — are all denominated in tokens. A prompt that "fits" in one model can overflow another; the overflow behavior (truncation? error?) is observable, testable behavior.

## Embeddings: meaning as geometry (A6-2)

A token ID is just an address. The model's real handle on meaning is the **[embedding](https://en.wikipedia.org/wiki/Word_embedding)**: a learned list of numbers — a vector — attached to each token. Every token ID looks up a row in a huge table of learned vectors, and that vector is what flows into the network.

What makes embeddings remarkable is the **geometry**: the training process arranges the vector space so that **similar meanings sit near each other**. "physician" and "doctor" end up as neighboring points; "physician" and "banana" land far apart. Early systems learned such vectors with [Word2vec](https://en.wikipedia.org/wiki/Word2vec); today's LLMs learn them as part of training the whole network — but the principle is unchanged: **meaning becomes position in a numeric space**, and everything the model later "understands" is arithmetic over that geometry.

![From text to numbers: tokens become embeddings](diagrams/token-embedding.svg)

## Next-token prediction (A6-3)

So what does a [large language model](https://en.wikipedia.org/wiki/Large_language_model) actually *do*? One thing, at colossal scale: **predict the next token**. Trained on enormous amounts of text, the model learns, for every context it has seen, a probability for each candidate next token. "The test suite passed because the flaky test was ___" — the model assigns probabilities to "skipped", "fixed", "deleted", "unlucky"…

Generation is that loop, run one step at a time: predict a distribution over the next token, emit one token, append it to the context, predict again. A fluent paragraph is thousands of iterations of a next-token loop. Two tester-facing consequences fall straight out of this design:

- **Sampling makes outputs non-deterministic by design.** The model doesn't always emit the single top token — it *samples* from the distribution (tuned by a setting called temperature). The same prompt can yield different outputs across runs. That is not a bug; it is the generator's contract — and it changes how oracles work (module A8's business).
- **Plausible is not the same as true.** The training objective rewards *likely continuations*, not *verified facts*. Hold that thought — it is the seed of the failure mode the next lesson names.

## What testers take away

- **Tokenization is observable behavior.** Splits affect limits, cost, latency, and occasionally the answer itself — the tokenization step is part of the feature under test, not plumbing to ignore.
- **Embeddings are the model's meaning space.** Similarity in vector space is the machinery behind search, clustering, and "the model thinks X resembles Y" — measurable, probeable geometry.
- **Next-token prediction explains both the magic and the failures.** One mechanism generates fluent code and fabricated "facts"; the mechanism doesn't distinguish them.

## In plain terms

- Text → tokens (subword chunks, mapped to IDs) → embeddings (learned vectors). The model only ever sees numbers.
- A token is not a word: rare words split into pieces, and token counts vary across models and languages.
- Embeddings give meaning a geometry — similar meanings sit near each other.
- An LLM generates one token at a time, each time predicting the most plausible continuation and sampling from it.
- Sampling injects designed-in variability; plausibility is not truth.

## Check yourself

1. Why can the same 500-word document produce different token counts in two different models — and name one test-relevant consequence.
2. In a trained embedding space, why would "physician" and "doctor" end up near each other without anyone programming that fact?
3. A stakeholder says "the model retrained itself between my two identical prompts — that's why the answers differed." What is the more likely mechanism, and what setting controls it?
