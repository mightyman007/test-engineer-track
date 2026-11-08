+++
id = "ai-m4-convolutions-cnns"
module = "ai-m4-computer-vision"
title = "Filters Slide, Layers Stack"
minutes = 14
objectives = ["A4-2", "A4-3"]
videos = [
  { title = "Neural Networks Part 8: Image Classification with CNNs (StatQuest)", url = "https://www.youtube.com/watch?v=HGwBXDKFk9I" },
]
diagrams = [
  { title = "A 3×3 filter sliding over a 5×5 image, writing a 3×3 feature map", file = "diagrams/conv-slide.svg" },
]
+++

## A filter is a tiny pattern matcher (A4-2)

Six million raw numbers is no way to see. The trick that made modern [computer vision](https://en.wikipedia.org/wiki/Computer_vision) work is almost embarrassingly small: a **filter** — a tiny grid of numbers, typically 3 × 3 — that slides across the image one position at a time. At each stop, the filter's numbers are multiplied against the image patch underneath and the products are summed. One number comes out: the **response**.

A high response means "the pattern this filter encodes lives here." A filter weighted to respond to a bright-left, dark-right step is a *vertical-edge detector*; flip it and you detect the opposite edge; other number patterns respond to corners, stripes, or blobs. This slide-multiply-sum operation is called [convolution](https://en.wikipedia.org/wiki/Convolution), and the small number grid itself is called a [kernel](https://en.wikipedia.org/wiki/Kernel_(image_processing)). Crucially, the filter's numbers are not written by a human — they are **weights**, learned by gradient descent exactly like module A3's neuron weights.

## Sliding produces a feature map (A4-2)

Run one filter over the whole image and it leaves one response number at every stop. The grid of those responses is the **feature map** — a new image, thinner than the original, whose brightness shows *where the pattern was found*.

The arithmetic is checkable by hand, and worth doing once. A 5 × 5 image with a 3 × 3 filter, sliding one pixel at a time (stride 1, no padding): the filter's top-left corner can sit at rows 1–3 and columns 1–3, so it stops at 3 × 3 = **9 positions**, and the feature map is 3 × 3. Generalizing per side: stops = image side − filter side + 1. A 6 × 6 image with the same 3 × 3 filter gives 6 − 3 + 1 = 4, so a 4 × 4 feature map.

![A 3×3 filter sliding over a 5×5 image, writing a 3×3 feature map](diagrams/conv-slide.svg)

## Stack the layers: edges → textures → parts → objects (A4-3)

One filter finds one pattern — useless alone. A **[convolutional neural network](https://en.wikipedia.org/wiki/Convolutional_neural_network)** (CNN) stacks many filters in layers, and here is the beautiful part: **each layer's filters read the previous layer's feature maps**, not the raw image. So the network builds a hierarchy:

1. **Early layers** find edges and simple color blobs.
2. **Middle layers** combine edges into textures and motifs — corners, grids of stripes, curves.
3. **Deeper layers** combine textures into parts — a wheel, an eye, a window.
4. **The deepest layers** combine parts into whole-object evidence.

Nobody programs that hierarchy; it emerges from training, because combining small patterns is the cheapest way to reduce loss. Each filter also only *sees* a small window of its input — its [receptive field](https://en.wikipedia.org/wiki/Receptive_field) — which keeps the arithmetic local.

Two more properties make convolutions the natural fit for images. **Weight sharing**: the identical filter runs at every position, so a few dozen numbers do the work of millions, and the same pattern is detected wherever it appears — a car in any corner triggers the same car-parts filters. Translation robustness comes free from that sharing. And **[pooling](https://en.wikipedia.org/wiki/Max_pooling)** shrinks each feature map by keeping the strongest response in each small window — keeping "the pattern is here," dropping exact address.

## What testers take away

- **The hierarchy is emergent, not authored** — so *what a layer actually learned* is worth asking for. Models can lean on misleading shortcuts (background texture instead of object shape); inspecting filters and feature maps is how that gets caught.
- **Configuration changes geometry, testably.** Filter size, stride, and padding determine feature-map dimensions. A config that silently produces a different shape than intended — or clips edges it should not — is an ordinary off-by-one defect hiding in an AI system.
- **Distribution shift reads clearly through filters.** A network trained on studio product photos misreads night footage because the night images simply do not contain the patterns its filters learned — module A2's data-quality lens, seen from inside the network.

## In plain terms

- A filter is a tiny learned pattern; convolution = slide it across the image, multiply and sum at each stop.
- The responses form a feature map: a new grid showing where the pattern was found.
- Feature-map size per side = image side − filter side + 1 (stride 1, no padding); a 6 × 6 image with a 3 × 3 filter gives 4 × 4.
- Stacked layers combine patterns upward: edges → textures → parts → objects.
- Weight sharing means one filter checks every position — fewer learned numbers, and patterns found anywhere in the frame.

## Check yourself

1. In the 5 × 5 / 3 × 3 worked example, where does the "+1" in the stops formula come from?
2. Why does weight sharing make a CNN robust to an object moving to a different part of the image?
3. A teammate proposes doubling the filter size from 3 × 3 to 5 × 5 "to see more." What happens to the feature-map dimensions of a fixed input, and what testable config risk appears?
